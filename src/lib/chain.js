// Network constants, wallet discovery (EIP-6963), read providers, and formatting.
import { ethers } from 'ethers';
import { reactive } from 'vue';
import STOCKS from './stocks.json';
import { loadRuntime } from './runtime.js';

export { ethers, STOCKS };

const FALLBACK_CONFIG = {
  chainId: 4663,
  chainName: 'Robinhood Chain',
  explorer: 'https://robinhoodchain.blockscout.com',
  rpcs: ['https://robinhood-rpc.publicnode.com', 'https://robinhood.api.pocket.network', 'https://robinhood.drpc.org'],
  walletRpc: 'https://rpc.mainnet.chain.robinhood.com',
  announcer: '0x55649E01B5Df198D18D95b5cc5051630cfD45564',
  registry: '0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538',
  router: '',
  startBlock: 16159684,
  gasTipEth: '0.00002',
  site: 'https://receiva.xyz',
  x: 'https://x.com/receiva_rh',
  telegram: 'https://t.me/receiva',
  github: 'https://github.com/receivapro/receiva',
  proof: {},
  token: null,
};

export const runtime = reactive({
  ready: false,
  config: FALLBACK_CONFIG,
  live: { ca: '', launchAt: '2026-10-19T13:00:00Z' },
});

export async function loadConfig() {
  if (runtime.ready) return runtime;
  try {
    const { config, live } = await loadRuntime();
    runtime.config = { ...FALLBACK_CONFIG, ...config };
    runtime.live = { ...runtime.live, ...live };
  } catch {
    // Keep the complete static config so the interface still works offline.
  }
  runtime.ready = true;
  return runtime;
}

export const CFG = new Proxy({}, {
  get(_t, key) { return runtime.config[key]; },
  has(_t, key) { return key in runtime.config; },
  ownKeys() { return Reflect.ownKeys(runtime.config); },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});
export const LIVE = new Proxy({}, {
  get(_t, key) { return runtime.live[key]; },
});
export const config = () => runtime.config;
export const live = () => runtime.live;

export function readProvider() {
  if (readProvider._cache) return readProvider._cache;
  const cfg = runtime.config;
  const net = new ethers.Network(cfg.chainName, cfg.chainId);
  const list = cfg.rpcs.map((u) => new ethers.JsonRpcProvider(u, net, { staticNetwork: net, batchMaxCount: 20 }));
  readProvider._cache = list.length > 1
    ? new ethers.FallbackProvider(list.map((p, i) => ({ provider: p, priority: i + 1, weight: 1, stallTimeout: 2500 })), net, { quorum: 1 })
    : list[0];
  return readProvider._cache;
}

export function broadcastProvider() {
  if (broadcastProvider._cache) return broadcastProvider._cache;
  const cfg = runtime.config;
  const net = new ethers.Network(cfg.chainName, cfg.chainId);
  broadcastProvider._cache = new ethers.JsonRpcProvider(cfg.rpcs[0], net, { staticNetwork: net });
  return broadcastProvider._cache;
}

export async function safeGasPrice(provider = broadcastProvider()) {
  const b = await provider.getBlock('latest');
  const base = b?.baseFeePerGas ?? (await provider.getFeeData()).gasPrice;
  return base * 2n;
}

const wallets = new Map();
let walletDiscoveryStarted = false;
export function discoverWallets() {
  if (walletDiscoveryStarted) return;
  walletDiscoveryStarted = true;
  window.addEventListener('eip6963:announceProvider', (e) => {
    const d = e.detail;
    if (d?.info?.rdns && d.provider) wallets.set(d.info.rdns, d);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}
export function listWallets() {
  const out = [...wallets.values()];
  if (!out.length && window.ethereum) {
    out.push({ info: { name: 'Browser wallet', rdns: 'injected', icon: '' }, provider: window.ethereum });
  }
  return out;
}

export async function ensureChain(eip) {
  const cfg = runtime.config;
  const hex = '0x' + cfg.chainId.toString(16);
  const cur = await eip.request({ method: 'eth_chainId' });
  if (cur?.toLowerCase() === hex) return;
  try {
    await eip.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
  } catch (e) {
    if (e?.code === 4001) throw new Error('Network switch was rejected.');
    try {
      await eip.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hex,
          chainName: cfg.chainName,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [cfg.walletRpc, cfg.rpcs[0]],
          blockExplorerUrls: [cfg.explorer],
        }],
      });
    } catch {
      if (eip.isPhantom) throw new Error('In Phantom, enable Robinhood Chain: Settings → Active Networks.');
      throw new Error('Please add Robinhood Chain to your wallet.');
    }
  }
}

export const ABI = {
  erc20: [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function transfer(address,uint256) returns (bool)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
  ],
  registry: [
    'function registerKeys(uint256 schemeId, bytes stealthMetaAddress)',
    'function stealthMetaAddressOf(address registrant, uint256 schemeId) view returns (bytes)',
  ],
  router: [
    'function sendEth(address stealth, bytes ephemeralPubKey, bytes1 viewTag) payable',
    'function sendToken(address token, uint256 amount, address stealth, bytes ephemeralPubKey, bytes1 viewTag) payable',
  ],
};

const tokenCache = new Map();
export const ETH = { symbol: 'ETH', name: 'Ether', address: 'eth', decimals: 18 };
export async function tokenInfo(address) {
  if (!address || address === 'eth' || /^0xe{40}$/i.test(address)) return ETH;
  const key = address.toLowerCase();
  if (tokenCache.has(key)) return tokenCache.get(key);
  const known = STOCKS.find((s) => s.address.toLowerCase() === key);
  if (known) { tokenCache.set(key, known); return known; }
  const c = new ethers.Contract(address, ABI.erc20, readProvider());
  const [symbol, decimals, name] = await Promise.all([c.symbol().catch(() => 'TOKEN'), c.decimals().catch(() => 18), c.name().catch(() => '')]);
  const info = { symbol, decimals: Number(decimals), name, address: ethers.getAddress(address) };
  tokenCache.set(key, info);
  return info;
}

export function fmtAmount(v, decimals = 18, max = 6) {
  const s = ethers.formatUnits(v, decimals);
  const [i, f = ''] = s.split('.');
  const ff = f.replace(/0+$/, '').slice(0, max);
  return Number(i).toLocaleString('en-US') + (ff ? '.' + ff : '');
}
export function timeAgo(ts) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
export const txUrl = (h) => `${runtime.config.explorer}/tx/${h}`;
export const addrUrl = (a) => `${runtime.config.explorer}/address/${a}`;

export function niceError(e) {
  const m = e?.shortMessage || e?.info?.error?.message || e?.message || String(e);
  if (e?.code === 'ACTION_REJECTED' || e?.code === 4001 || /rejected|denied/i.test(m)) return 'Request rejected in wallet.';
  if (/insufficient funds/i.test(m)) return 'Not enough ETH for this transaction.';
  return m.length > 140 ? m.slice(0, 140) + '…' : m;
}
