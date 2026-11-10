// GET /api/token — live $RECEIVA snapshot straight from Robinhood Chain.
//
// The static build only ships a frozen snapshot (public/fallback/token.json).
// This function reads the Pons bonding curve on demand instead: trade logs for
// the series, curve reserves for price, the token contract for supply, and an
// ETH/USD quote for the dollar numbers. Vercel caches the response at the edge,
// so the chain is hit once per cache window, not once per visitor.
//
// Deploy note: with the Vercel project's Root Directory set to `website`, this
// file becomes /api/token automatically.

import { readFileSync } from 'node:fs';

const RPC_URLS = [
  'https://robinhood.api.pocket.network',
  'https://robinhood-rpc.publicnode.com',
  'https://rpc.mainnet.chain.robinhood.com',
];

const BUY_TOPIC = '0xec36bf571f136799e8dc0b0b8bea4b04d8bd3d43de838aab0d5fc21d4cbfc455';
const SELL_TOPIC = '0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df';
const SEL_RESERVES = '0x0902f1ac';
const SEL_SUPPLY = '0x18160ddd';
const SEL_TRACKED = '0xca52b0b7';
const SEL_GRADUATED = '0xe7c2b772';

// Mirrors public/config.json -> token. The file is read first so the site keeps
// one source of truth; the literals are the fallback if the bundle omits it.
const DEFAULTS = {
  ca: '0xd113264443Ce28135d789b5638e0c6b730BE8107',
  curve: '0x5eb21578d12ef22bcb4c0570e99c91f134886b40',
  launchBlock: 110725617,
  launchSupply: 1000000000,
  graduationEth: 4.2,
  launchpad: 'Pons V2',
};

function loadTokenConfig() {
  try {
    const cfg = JSON.parse(readFileSync(new URL('../public/config.json', import.meta.url), 'utf8'));
    return { ...DEFAULTS, ...(cfg.token || {}), rpcs: cfg.rpcs };
  } catch {
    return { ...DEFAULTS };
  }
}

const TOKEN = loadTokenConfig();
const RPCS = [process.env.RECEIVA_RPC, ...RPC_URLS, ...(TOKEN.rpcs || [])].filter(Boolean);

async function rpcOnce(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${method} ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

async function rpc(method, params) {
  let lastError;
  for (const url of [...new Set(RPCS)]) {
    try {
      return await rpcOnce(url, method, params);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('no RPC');
}

const toNum = (value, decimals = 18) => Number(value) / 10 ** decimals;
const hex = (n) => '0x' + n.toString(16);

async function blockTimes(blocks) {
  if (!blocks.length) return new Map();
  const payload = blocks.map((b, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_getBlockByNumber', params: [b, false] }));
  let lastError;
  for (const url of [...new Set(RPCS)]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const rows = await res.json();
      const out = new Map();
      for (const row of rows) {
        if (row.result) out.set(blocks[row.id], Number(row.result.timestamp));
      }
      return out;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('no RPC for block timestamps');
}

async function ethUsd() {
  const sources = [
    async () => Number((await (await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', { signal: AbortSignal.timeout(6000) })).json()).data.amount),
    async () => Number((await (await fetch('https://api.kraken.com/0/public/Ticker?pair=ETHUSD', { signal: AbortSignal.timeout(6000) })).json()).result.XETHZUSD.c[0]),
    async () => Number((await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(6000) })).json()).ethereum.usd),
  ];
  for (const source of sources) {
    try {
      const value = await source();
      if (value > 0) return value;
    } catch { /* next source */ }
  }
  return null;
}

export async function buildSnapshot() {
  const head = Number(await rpc('eth_blockNumber', []));
  const from = Math.max(0, Number(TOKEN.launchBlock) - 50);

  const logs = await rpc('eth_getLogs', [{
    address: TOKEN.curve,
    topics: [[BUY_TOPIC, SELL_TOPIC]],
    fromBlock: hex(from),
    toBlock: hex(head),
  }]);

  const times = await blockTimes([...new Set(logs.map((l) => l.blockNumber))]);
  const trades = logs.map((log) => {
    const words = log.data.slice(2).match(/.{64}/g).map((w) => BigInt('0x' + w));
    const buy = log.topics[0] === BUY_TOPIC;
    const quote = buy ? words[0] : words[1];
    const tokens = buy ? words[1] : words[0];
    const fee = words[2];
    const tax = words[3];
    const net = buy ? quote - fee - tax : quote + fee + tax;
    const block = Number(log.blockNumber);
    return {
      t: times.get(log.blockNumber) || 0,
      b: block,
      x: log.transactionHash,
      s: buy ? 1 : 0,
      w: '0x' + log.topics[1].slice(26),
      q: toNum(quote),
      k: toNum(tokens),
      p: Number(net) / Number(tokens),
    };
  });

  const [reservesHex, supplyHex, trackedHex, graduatedHex] = await Promise.all([
    rpc('eth_call', [{ to: TOKEN.curve, data: SEL_RESERVES }, 'latest']),
    rpc('eth_call', [{ to: TOKEN.ca, data: SEL_SUPPLY }, 'latest']),
    rpc('eth_call', [{ to: TOKEN.curve, data: SEL_TRACKED }, 'latest']).catch(() => null),
    rpc('eth_call', [{ to: TOKEN.curve, data: SEL_GRADUATED }, 'latest']).catch(() => null),
  ]);

  const words = reservesHex.slice(2).match(/.{64}/g).map((w) => BigInt('0x' + w));
  const reserveEth = toNum(words[0]);
  const reserveToken = toNum(words[1]);
  const supply = toNum(BigInt(supplyHex));
  const trackedQuote = trackedHex && trackedHex !== '0x' ? toNum(BigInt(trackedHex)) : null;
  const graduated = graduatedHex && graduatedHex !== '0x' ? BigInt(graduatedHex) !== 0n : false;
  const usd = await ethUsd();

  const priceEth = reserveToken ? reserveEth / reserveToken : null;
  const launchSupply = Number(TOKEN.launchSupply) || supply;
  const dayAgo = Date.now() / 1000 - 86400;
  const last24 = trades.filter((trade) => trade.t >= dayAgo);
  const graduationEth = Number(TOKEN.graduationEth) || 4.2;

  return {
    ca: TOKEN.ca,
    curve: TOKEN.curve,
    launchpad: TOKEN.launchpad,
    ethUsd: usd,
    priceEth,
    priceUsd: priceEth && usd ? priceEth * usd : null,
    mcEth: priceEth && supply ? priceEth * supply : null,
    mcUsd: priceEth && supply && usd ? priceEth * supply * usd : null,
    supply,
    launchSupply,
    burned: supply ? launchSupply - supply : null,
    trackedQuote,
    graduationEth,
    graduated,
    progress: trackedQuote != null ? Math.min(1, trackedQuote / graduationEth) : null,
    reservesEth: reserveEth,
    reservesToken: reserveToken,
    trades: trades.length,
    buys: trades.filter((trade) => trade.s).length,
    sells: trades.filter((trade) => !trade.s).length,
    vol24Eth: last24.reduce((sum, trade) => sum + trade.q, 0),
    trades24: last24.length,
    series: trades.map((trade) => [trade.t, trade.p, trade.s, +trade.q.toFixed(6)]),
    recent: trades.slice(-10).reverse().map((trade) => ({ t: trade.t, s: trade.s, q: trade.q, k: trade.k, w: trade.w, x: trade.x })),
    indexed: head,
    updated: Math.floor(Date.now() / 1000),
    source: 'chain',
  };
}

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method && req.method !== 'GET') {
    res.setHeader('allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const snapshot = await buildSnapshot();
    // One chain read per cache window, not one per visitor.
    res.setHeader('cache-control', 'public, s-maxage=20, stale-while-revalidate=60');
    return res.status(200).json(snapshot);
  } catch (error) {
    res.setHeader('cache-control', 'no-store');
    return res.status(502).json({ error: String(error?.message || error) });
  }
}
