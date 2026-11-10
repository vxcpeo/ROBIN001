// This module is intentionally framework-agnostic: a small reactive store powers
// the Receive / Send / Inbox panes while all key material stays in memory.
import { reactive, markRaw } from 'vue';
import {
  SIGN_MESSAGE, keysFromSignature, generateStealth, checkAnnouncement, parseMetadata, parseMetaAddress,
} from './stealth.js';
import {
  ethers, STOCKS, runtime, readProvider, broadcastProvider, safeGasPrice, discoverWallets, listWallets,
  ensureChain, ABI, ETH, tokenInfo, fmtAmount, niceError,
} from './chain.js';
import { apiAnnouncements } from './runtime.js';
import { toast } from './ui.js';

const ZERO_META = '0x';
const MEMO_MAX = 80;
const KNOWN_KEY = 'receiva:wallet';
const bound = new WeakSet();
let inboxTimer = null;
let resolveTimer = null;
let mounted = false;

export const app = reactive({
  init: false,
  view: 'receive',
  wallet: null,
  account: null,
  keys: null,
  registered: '',
  keyMismatch: false,
  send: { to: '', meta: null, resolved: null, asset: markRaw(ETH), amount: '', busy: false, step: 0, result: null, req: null, balance: null },
  request: { amount: '', asset: markRaw(ETH), memo: '' },
  badge: 'dark',
  inbox: { since: 0, scanned: 0, items: [], syncing: false, total: 0, err: '', loadedOnce: false },
  ui: { modal: null, view: 'receive' },
});

const seen = new Set();

export function initStore() {
  if (mounted) return;
  mounted = true;
  discoverWallets();
  setTimeout(autoReconnect, 300);
}

export function setView(view) {
  app.view = view;
  app.ui.view = view;
  if (view === 'inbox' && app.keys) syncInbox();
}

export function openModal(modal) { app.ui.modal = modal; }
export function closeModal() { app.ui.modal = null; }

export async function connect(w) {
  const accs = await w.provider.request({ method: 'eth_requestAccounts' });
  if (!accs?.length) throw new Error('No account');
  setWallet(w, accs[0]);
  try { localStorage.setItem(KNOWN_KEY, w.info.rdns); } catch { /* private mode */ }
}

export function setWallet(w, acc) {
  const changed = app.account && app.account.toLowerCase() !== acc.toLowerCase();
  app.wallet = markRaw(w);
  app.account = ethers.getAddress(acc);
  if (changed) resetKeys();
  if (!bound.has(w.provider)) {
    bound.add(w.provider);
    w.provider.on?.('accountsChanged', (a) => {
      if (a?.length) setWallet(w, a[0]);
      else { app.account = null; resetKeys(); }
    });
    w.provider.on?.('chainChanged', () => window.location.reload());
  }
}

function resetKeys() {
  app.keys = null;
  app.registered = '';
  app.keyMismatch = false;
  app.inbox = { since: 0, scanned: 0, items: [], syncing: false, total: 0, err: '', loadedOnce: false };
  seen.clear();
}

async function autoReconnect() {
  let rdns = null;
  try { rdns = localStorage.getItem(KNOWN_KEY); } catch { /* ignore */ }
  if (!rdns) return;
  await new Promise((r) => setTimeout(r, 250));
  const w = listWallets().find((x) => x.info.rdns === rdns);
  if (!w) return;
  try {
    const accs = await w.provider.request({ method: 'eth_accounts' });
    if (accs?.length) setWallet(w, accs[0]);
  } catch { /* ignore */ }
}

export async function signer() {
  await ensureChain(app.wallet.provider);
  return new ethers.BrowserProvider(app.wallet.provider).getSigner(app.account);
}

export async function unlock() {
  const msg = ethers.hexlify(ethers.toUtf8Bytes(SIGN_MESSAGE));
  const sig = await app.wallet.provider.request({ method: 'personal_sign', params: [msg, app.account] });
  app.keys = markRaw(keysFromSignature(sig));
  await refreshRegistry();
}

export async function refreshRegistry() {
  try {
    const reg = new ethers.Contract(runtime.config.registry, ABI.registry, readProvider());
    const stored = await reg.stealthMetaAddressOf(app.account, 1).catch(() => ZERO_META);
    app.registered = stored && stored !== ZERO_META ? stored.toLowerCase() : '';
    app.keyMismatch = !!(app.registered && app.keys && app.registered !== app.keys.metaBytes.toLowerCase());
  } catch {
    app.registered = '';
    app.keyMismatch = false;
  }
}

export async function register() {
  const s = await signer();
  const reg = new ethers.Contract(runtime.config.registry, ABI.registry, s);
  const tx = await reg.registerKeys(1, app.keys.metaBytes);
  toast('Registering…');
  await tx.wait();
  await refreshRegistry();
  toast('Your link is live');
}

export function receiveLink() {
  if (!app.keys) return '';
  const tail = app.registered && !app.keyMismatch ? app.account : app.keys.metaAddress;
  return `${location.origin}/pay/${tail}`;
}

export function assetParam(a) {
  if (a.address === 'eth') return 'ETH';
  if (STOCKS.some((x) => x.address.toLowerCase() === a.address.toLowerCase()) || a.symbol === 'RECEIVA') return a.symbol;
  return a.address;
}

export function requestLink() {
  const r = app.request;
  if (!app.keys) return '';
  const q = new URLSearchParams();
  if (r.amount) q.set('amount', r.amount);
  if (r.amount || r.asset.address !== 'eth') q.set('asset', assetParam(r.asset));
  if (r.memo.trim()) q.set('memo', r.memo.trim().slice(0, MEMO_MAX));
  const qs = q.toString();
  return receiveLink() + (qs ? '?' + qs : '');
}

export async function resolveAssetParam(v) {
  if (!v || v.toUpperCase() === 'ETH') return ETH;
  const hit = assetList().find((a) => a.symbol.toLowerCase() === v.toLowerCase() || (a.address !== 'eth' && a.address.toLowerCase() === v.toLowerCase()));
  if (hit) return hit;
  if (ethers.isAddress(v)) return tokenInfo(v);
  throw new Error('Unknown asset in this request');
}

export function badgeSnippets() {
  const link = receiveLink();
  const url = `${location.origin}/assets/badge-${app.badge}.svg`;
  return {
    html: `<a href="${link}" target="_blank" rel="noopener"><img src="${url}" alt="Pay me privately with Receiva" width="232" height="48"></a>`,
    md: `[![Pay me privately with Receiva](${url})](${link})`,
    bio: `Pay me privately: ${link.replace(/^https?:\/\//, '')}`,
  };
}

export function setRequestAmount(v) {
  const clean = String(v).replace(',', '.');
  if (/^\d*\.?\d*$/.test(clean)) app.request.amount = clean;
}
export function setRequestMemo(v) {
  app.request.memo = String(v).slice(0, MEMO_MAX);
}

export function assetList() {
  const list = [markRaw(ETH)];
  if (runtime.live.ca) list.push(markRaw({ symbol: 'RECEIVA', name: 'Receiva', address: ethers.getAddress(runtime.live.ca), decimals: 18 }));
  return list.concat(STOCKS.map((s) => markRaw(s)));
}

export async function refreshBalance() {
  if (!app.account) { app.send.balance = null; return; }
  try {
    const b = app.send.asset.address === 'eth'
      ? await readProvider().getBalance(app.account)
      : await new ethers.Contract(app.send.asset.address, ABI.erc20, readProvider()).balanceOf(app.account);
    app.send.balance = b;
  } catch {
    app.send.balance = null;
  }
}

export function setMax() {
  if (app.send.balance == null) return;
  let v = app.send.balance;
  if (app.send.asset.address === 'eth') v = v > ethers.parseEther('0.0002') ? v - ethers.parseEther('0.0002') : 0n;
  app.send.amount = ethers.formatUnits(v, app.send.asset.decimals);
}

export function setSendTo(value) {
  app.send.to = value;
  app.send.meta = null;
  app.send.resolved = null;
  clearTimeout(resolveTimer);
  resolveTimer = setTimeout(resolveRecipient, 350);
}

export async function resolveRecipient() {
  let raw = app.send.to.trim();
  app.send.meta = null;
  if (!raw) { app.send.resolved = null; return; }
  const m = raw.match(/\/pay\/([^/?#\s]+)/);
  if (m) raw = decodeURIComponent(m[1]);
  try {
    if (/^st:|^0x[0-9a-fA-F]{132}$/.test(raw)) {
      app.send.meta = markRaw(parseMetaAddress(raw));
      app.send.resolved = { text: '✓ Private receive keys found. A one-time address will be made on send.', type: 'ok' };
      return;
    }
    if (ethers.isAddress(raw)) {
      app.send.resolved = { text: "Looking up this wallet's Receiva link…", type: '' };
      const reg = new ethers.Contract(runtime.config.registry, ABI.registry, readProvider());
      const stored = await reg.stealthMetaAddressOf(raw, 1);
      if (!stored || stored === ZERO_META) {
        app.send.resolved = { text: 'This wallet has no Receiva link yet. Ask them to open receiva.xyz → Receive and register.', type: 'warn' };
        return;
      }
      app.send.meta = markRaw(parseMetaAddress(stored));
      app.send.resolved = { text: `✓ ${ethers.getAddress(raw).slice(0, 6)}…${raw.slice(-4)} has a private link. Their wallet will not appear in this payment.`, type: 'ok' };
      return;
    }
    app.send.resolved = { text: 'Paste a Receiva link, a stealth meta-address, or a 0x wallet address.', type: 'warn' };
  } catch (e) {
    app.send.resolved = { text: niceError(e), type: 'bad' };
  }
}

export async function prepareRequest(req) {
  if (!req) return;
  app.send.req = req;
  if (req.amount) app.send.amount = req.amount;
  if (req.asset) {
    try { app.send.asset = markRaw(await resolveAssetParam(req.asset)); }
    catch (e) { toast(niceError(e)); }
  }
}

export async function doSend() {
  const s = app.send;
  s.error = '';
  if (!app.account) { openModal({ type: 'wallet' }); return; }
  if (!s.meta) { await resolveRecipient(); if (!s.meta) return toast('Add a valid recipient first'); }
  let amount;
  try { amount = ethers.parseUnits(String(s.amount || '0'), s.asset.decimals); }
  catch { return toast('Enter a valid amount'); }
  if (amount <= 0n) return toast('Enter an amount');
  s.busy = true;
  try {
    const sg = await signer();
    const router = new ethers.Contract(runtime.config.router, ABI.router, sg);
    const st = generateStealth(s.meta);
    s.stealthPreview = st.stealthAddress;
    const tag = ethers.toBeHex(st.viewTag, 1);
    let tx;
    if (s.asset.address === 'eth') {
      tx = await router.sendEth(st.stealthAddress, st.ephemeralPubKey, tag, { value: amount });
    } else {
      const tip = ethers.parseEther(runtime.config.gasTipEth);
      const token = new ethers.Contract(s.asset.address, ABI.erc20, sg);
      const allowance = await token.allowance(app.account, runtime.config.router);
      if (allowance < amount) {
        s.step = 1;
        const ap = await token.approve(runtime.config.router, amount);
        toast('Approving…');
        await ap.wait();
      }
      s.step = 2;
      tx = await router.sendToken(s.asset.address, amount, st.stealthAddress, st.ephemeralPubKey, tag, { value: tip });
    }
    toast('Sending privately…');
    await tx.wait();
    s.result = { tx: tx.hash, stealth: st.stealthAddress, amount: fmtAmount(amount, s.asset.decimals), symbol: s.asset.symbol };
    s.step = 3;
  } catch (e) {
    toast(niceError(e));
    s.error = niceError(e);
  } finally {
    s.busy = false;
  }
}

export function resetSendResult() {
  app.send.result = null;
  app.send.amount = '';
  app.send.step = 0;
  app.send.error = '';
}

export async function syncInbox() {
  const ib = app.inbox;
  if (ib.syncing || !app.keys || app.view !== 'inbox') return;
  ib.syncing = true;
  const keysAtStart = app.keys;
  try {
    for (;;) {
      const d = await apiAnnouncements(ib.since);
      ib.total = d.total;
      for (const a of d.items) {
        const meta = parseMetadata(a.m) || {};
        const priv = checkAnnouncement({ stealthAddress: a.s, ephemeralPubKey: a.e, viewTag: meta.viewTag }, keysAtStart);
        if (priv && !seen.has(a.s)) {
          seen.add(a.s);
          ib.items.push({
            addr: a.s, priv, t: a.t, tx: a.x, kind: meta.kind,
            amount: meta.amount ?? 0n, tokenAddr: meta.kind === 'token' ? meta.token : 'eth',
            loaded: false, balance: 0n, eth: 0n, token: markRaw(ETH),
          });
        }
      }
      ib.since += d.items.length;
      ib.scanned = ib.since;
      if (app.keys !== keysAtStart) return;
      if (ib.since >= d.total || !d.items.length) break;
    }
    ib.err = '';
    await loadBalances();
    ib.loadedOnce = true;
  } catch (e) {
    ib.err = niceError(e);
  } finally {
    ib.syncing = false;
    clearTimeout(inboxTimer);
    inboxTimer = setTimeout(() => { if (app.view === 'inbox') syncInbox(); }, 15000);
  }
}

export async function loadBalances() {
  const rp = readProvider();
  await Promise.all(app.inbox.items.map(async (it) => {
    try {
      it.token = markRaw(await tokenInfo(it.tokenAddr).catch(() => ({ symbol: 'TOKEN', decimals: 18, address: it.tokenAddr, name: '' })));
      it.eth = await rp.getBalance(it.addr);
      it.balance = it.kind === 'token'
        ? await new ethers.Contract(it.tokenAddr, ABI.erc20, rp).balanceOf(it.addr)
        : it.eth;
      it.loaded = true;
    } catch {
      it.loaded = true;
    }
  }));
}

export function inboxCount() {
  return app.inbox.items.filter((i) => i.loaded && i.balance > 0n).length;
}

export async function withdrawItem(it, to, hooks = {}) {
  if (!ethers.isAddress(to)) return toast('Enter a valid 0x address');
  to = ethers.getAddress(to);
  hooks.start?.();
  const steps = it.kind === 'token' ? [`Send ${it.token.symbol}`, 'Sweep leftover ETH'] : ['Send ETH'];
  hooks.progress?.(steps);
  try {
    const bp = broadcastProvider();
    const w = new ethers.Wallet(it.priv, bp);
    const gp = await safeGasPrice(bp);
    let nonce = await bp.getTransactionCount(w.address, 'latest');
    let ethLeft = await bp.getBalance(w.address);
    let i = 0;
    if (it.kind === 'token') {
      hooks.mark?.(0, 'on');
      const c = new ethers.Contract(it.tokenAddr, ABI.erc20, w);
      const bal = await c.balanceOf(w.address);
      if (bal > 0n) {
        const gas = await c.transfer.estimateGas(to, bal);
        const limit = (gas * 13n) / 10n;
        const eth = await bp.getBalance(w.address);
        if (eth < limit * gp) throw new Error(`This address needs ${ethers.formatEther(limit * gp - eth)} more ETH for the network fee.`);
        const tx = await c.transfer(to, bal, { gasPrice: gp, gasLimit: limit, type: 0, nonce: nonce++ });
        const rc = await tx.wait();
        ethLeft -= rc.fee;
      }
      hooks.mark?.(0, 'done');
      i = 1;
    }
    hooks.mark?.(i, 'on');
    const fresh = await bp.getBalance(w.address);
    const eth = fresh < ethLeft ? fresh : ethLeft;
    const gl = await bp.estimateGas({ from: w.address, to, value: 1n });
    const limit = (gl * 13n) / 10n;
    const value = eth - limit * gp;
    if (value > 0n) {
      const tx = await w.sendTransaction({ to, value, gasLimit: limit, gasPrice: gp, type: 0, nonce: nonce++ });
      await tx.wait();
    }
    hooks.mark?.(i, 'done');
    toast('Withdrawn');
    it.loaded = false;
    await loadBalances();
    hooks.done?.();
  } catch (e) {
    hooks.error?.(niceError(e));
    toast(niceError(e));
  }
}

// Route helpers used by the app shell.
export function parseRequestFromQuery(query) {
  const amount = String(query.amount || '').replace(',', '.');
  const memo = String(query.memo || '').slice(0, MEMO_MAX);
  const asset = String(query.asset || '').trim();
  if (!amount && !memo && !asset) return null;
  return { amount: /^\d*\.?\d+$/.test(amount) ? amount : '', memo, asset };
}

export { MEMO_MAX };
