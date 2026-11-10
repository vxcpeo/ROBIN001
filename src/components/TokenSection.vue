<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { runtime } from '../lib/chain.js';
import { apiToken, fmtUsd, fmtNum, fmtEth, ago } from '../lib/runtime.js';
import { copy, short } from '../lib/ui.js';

const cfg = computed(() => runtime.config);
const ex = computed(() => cfg.value.explorer || 'https://robinhoodchain.blockscout.com');
const T = computed(() => cfg.value.token || {});
const ca = computed(() => runtime.live.ca || T.value.ca || '');
const data = reactive({ value: null, error: '', loading: true });
const range = ref('all');
const section = ref(null);
const canvas = ref(null);
const tip = reactive({ show: false, left: 0, price: '', time: '', side: '', eth: '' });
let ro;
let timer;
let hover = null;

const links = computed(() => {
  const t = T.value;
  const c = ca.value;
  if (!c) return {};
  return {
    token: `${ex.value}/token/${c}`,
    curve: t.curve ? `${ex.value}/address/${t.curve}` : '#',
    dev: t.dev ? `${ex.value}/address/${t.dev}` : '#',
    devBuy: t.devBuyTx ? `${ex.value}/tx/${t.devBuyTx}` : '#',
    burn1: t.burnTxs?.[0] ? `${ex.value}/tx/${t.burnTxs[0]}` : '#',
    burn2: t.burnTxs?.[1] ? `${ex.value}/tx/${t.burnTxs[1]}` : '#',
    pons: `https://www.ponsfamily.com/launchpad/${c.toLowerCase()}`,
    dex: `https://dexscreener.com/robinhood/${c.toLowerCase()}`,
  };
});

const progressPct = computed(() => (data.value?.progress != null ? (data.value.progress * 100).toFixed(1) + '%' : '—'));
const tracked = computed(() => data.value?.trackedQuote != null ? `${data.value.trackedQuote.toFixed(2)} / ${data.value.graduationEth} ETH` : '—');
const status = computed(() => {
  if (data.error) return 'Live data unavailable. Use the links below.';
  if (!data.value) return 'Loading live data';
  return data.value.graduated ? 'Graduated to Uniswap v4' : 'Trading on the Pons bonding curve';
});
const recent = computed(() => data.value?.recent || []);

async function load() {
  try {
    data.value = await apiToken();
    data.error = '';
    await nextTick();
    draw();
  } catch (e) {
    data.error = String(e?.message || e);
  } finally {
    data.loading = false;
  }
}

function pick() {
  if (!data.value) return [];
  const now = Date.now() / 1000;
  const span = { '1h': 3600, '6h': 21600, '24h': 86400 }[range.value];
  const s = data.value.series || [];
  if (!span) return s;
  const from = now - span;
  const i = s.findIndex((p) => p[0] >= from);
  const prev = i > 0 ? s[i - 1] : null;
  const out = i < 0 ? [] : s.slice(i);
  if (prev) out.unshift([from, prev[1], -1, 0]);
  else if (!out.length && s.length) out.push([from, s[s.length - 1][1], -1, 0]);
  return out;
}

function draw() {
  const cv = canvas.value;
  if (!cv || !data.value) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const d = data.value;
  const pts = pick();
  const usd = d.ethUsd || 0, sup = d.supply || d.launchSupply;
  const now = Date.now() / 1000;
  const ser = pts.map((p) => [p[0], p[1] * sup * usd, p[2], p[3]]);
  if (d.priceEth) ser.push([now, d.priceEth * sup * usd, -1, 0]);
  if (ser.length < 2) return;
  const padL = 8, padR = 64, padT = 16, padB = 26;
  const t0 = ser[0][0], t1 = ser[ser.length - 1][0];
  let lo = Math.min(...ser.map((p) => p[1])), hi = Math.max(...ser.map((p) => p[1]));
  const m = (hi - lo) * 0.12 || hi * 0.1; lo = Math.max(0, lo - m); hi += m;
  const X = (t) => padL + ((t - t0) / (t1 - t0 || 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
  g.font = '11px "Cascadia Mono", ui-monospace, monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4, y = Y(v);
    g.strokeStyle = 'rgba(143,163,181,0.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR + 6, y); g.stroke();
    g.fillStyle = '#8fa3b5'; g.fillText(fmtUsd(v), W - padR + 12, y + 4);
  }
  g.fillStyle = '#8fa3b5'; g.textAlign = 'center';
  for (let i = 0; i <= 3; i++) {
    const t = t0 + ((t1 - t0) * i) / 3;
    const date = new Date(t * 1000);
    const lab = t1 - t0 > 172800 ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : date.toISOString().slice(11, 16);
    g.textAlign = i === 0 ? 'left' : i === 3 ? 'right' : 'center';
    g.fillText(lab, i === 3 ? W - padR : X(t), H - 6);
  }
  const path = () => {
    g.beginPath(); g.moveTo(X(ser[0][0]), Y(ser[0][1]));
    for (let i = 1; i < ser.length; i++) { g.lineTo(X(ser[i][0]), Y(ser[i - 1][1])); g.lineTo(X(ser[i][0]), Y(ser[i][1])); }
  };
  path(); g.lineTo(X(t1), H - padB); g.lineTo(X(t0), H - padB); g.closePath();
  const grad = g.createLinearGradient(0, padT, 0, H - padB);
  grad.addColorStop(0, '#ff00002e'); grad.addColorStop(1, '#ff000000');
  g.fillStyle = grad; g.fill();
  path(); g.strokeStyle = '#ff4d4d'; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
  const real = ser.filter((p) => p[2] >= 0);
  if (real.length < 260) for (const p of real) { g.fillStyle = p[2] ? '#5ce1a0' : '#f2c94c'; g.beginPath(); g.arc(X(p[0]), Y(p[1]), 2, 0, 7); g.fill(); }
  const last = ser[ser.length - 1];
  g.fillStyle = '#f4f7fa'; g.beginPath(); g.arc(X(last[0]), Y(last[1]), 3.5, 0, 7); g.fill();
  g.strokeStyle = '#ff000055'; g.lineWidth = 6; g.beginPath(); g.arc(X(last[0]), Y(last[1]), 6, 0, 7); g.stroke();

  if (hover == null) { tip.show = false; return; }
  const tx = t0 + ((hover * W - padL) / (W - padL - padR)) * (t1 - t0);
  let k = 0; for (let i = 0; i < ser.length; i++) if (ser[i][0] <= tx) k = i;
  const p = ser[k], x = X(Math.min(tx, t1));
  g.strokeStyle = 'rgba(244,247,250,0.22)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, padT); g.lineTo(x, H - padB); g.stroke(); g.setLineDash([]);
  tip.show = true;
  tip.left = Math.min(W - 170, Math.max(0, x + 12)) + 'px';
  tip.price = fmtUsd(p[1]);
  tip.time = new Date(p[0] * 1000).toISOString().slice(5, 16).replace('T', ' ') + ' UTC';
  tip.side = p[2] >= 0 ? `${p[2] ? 'Buy' : 'Sell'} · ${fmtEth(p[3])} ETH` : '';
}

function setRange(r) {
  range.value = r;
  draw();
}
function onMove(e) {
  const cv = canvas.value;
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  hover = (e.clientX - r.left) / r.width;
  draw();
}
function onLeave() { hover = null; draw(); }

onMounted(async () => {
  ro = new ResizeObserver(() => draw());
  if (canvas.value) ro.observe(canvas.value);
  await load();
  timer = setInterval(() => { if (!document.hidden) load(); }, 20000);
});
onBeforeUnmount(() => { ro?.disconnect(); clearInterval(timer); });
</script>

<template>
  <section ref="section" class="tc-record" id="token">
    <div class="tc-record__head"><span class="tc-label">$RECEIVA</span></div>
    <h2>The token. <em>Same receipts.</em></h2>
    <p class="tc-lead">Every trade below is read straight from the Pons bonding curve on Robinhood Chain. No third-party feed, no rounding of the story.</p>
    <div class="tc-token">
      <article class="tc-panel tc-chart-card">
        <div class="tc-chart-head">
          <div>
            <span class="tc-label"><span class="tc-dot tc-dot--hot"></span> <span>{{ status }}</span></span>
            <div class="tc-big"><span>{{ fmtUsd(data.value?.mcUsd) }}</span> <small>market cap</small></div>
            <div class="tc-chart-sub"><span>{{ data.value?.mcEth ? fmtEth(data.value.mcEth) + ' ETH' : '—' }}</span> · price <span>{{ data.value?.priceUsd ? '$' + Number(data.value.priceUsd).toPrecision(3) : '—' }}</span></div>
          </div>
          <div class="tc-ranges" role="group" aria-label="Chart range">
            <button v-for="r in ['1h', '6h', '24h', 'all']" :key="r" type="button" :aria-pressed="range === r" @click="setRange(r)">{{ r.toUpperCase() }}</button>
          </div>
        </div>
        <div class="tc-chart-wrap">
          <canvas ref="canvas" aria-label="Receiva market cap chart" @pointermove="onMove" @pointerleave="onLeave"></canvas>
          <div v-show="tip.show" id="tk-tip" class="tc-tip" :style="{ left: tip.left }">
            <b>{{ tip.price }}</b><span>{{ tip.time }}</span><span v-if="tip.side" :class="tip.side.startsWith('Buy') ? 'b' : 's'">{{ tip.side }}</span>
          </div>
        </div>
        <div class="tc-chart-stats">
          <div><span class="tc-label">24h volume</span><b>{{ data.value ? fmtEth(data.value.vol24Eth) + ' ETH' : '—' }}</b></div>
          <div><span class="tc-label">24h trades</span><b>{{ fmtNum(data.value?.trades24) }}</b></div>
          <div><span class="tc-label">Buys / sells</span><b><span>{{ fmtNum(data.value?.buys) }}</span> <i>/</i> <span>{{ fmtNum(data.value?.sells) }}</span></b></div>
        </div>
        <div class="tc-progress">
          <div class="tc-progress__head"><span class="tc-label">Bonding curve</span><span class="tc-mono"><b>{{ progressPct }}</b> · <span>{{ tracked }}</span></span></div>
          <div class="tc-progress__track" :style="{ '--p': data.value?.progress ?? 0 }"><i></i></div>
          <p>At 4.2 ETH the curve completes and liquidity moves to Uniswap v4, where it is locked.</p>
        </div>
      </article>
      <div class="tc-token-side">
        <article class="tc-panel">
          <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> On-chain facts</span>
          <div class="tc-row"><span>Contract</span><span class="tc-ca-inline"><a class="tc-mono" :href="links.token" target="_blank" rel="noopener">{{ ca ? short(ca) + ' ↗' : '—' }}</a><button type="button" class="tc-copy" aria-label="Copy contract address" @click="copy(ca, 'Contract address copied')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button></span></div>
          <div class="tc-row"><span>Network</span><b>Robinhood Chain</b></div>
          <div class="tc-row"><span>Launchpad</span><b>Pons V2</b></div>
          <div class="tc-row"><span>Supply</span><b>{{ fmtNum(data.value?.supply) }}</b></div>
          <div class="tc-row"><span>Dev buy</span><span><b><span>{{ fmtNum(T.devBurned) }}</span> burned</b><small><a :href="links.devBuy" target="_blank" rel="noopener">buy ↗</a> <a :href="links.burn1" target="_blank" rel="noopener">burn 1 ↗</a> <a :href="links.burn2" target="_blank" rel="noopener">burn 2 ↗</a></small></span></div>
          <div class="tc-row"><span>Dev wallet holds</span><a class="tc-good" :href="links.dev" target="_blank" rel="noopener">0 Receiva ↗</a></div>
          <div class="tc-row"><span>Creator tax</span><b><span>{{ T.creatorTaxBps ? (T.creatorTaxBps / 100).toFixed(0) : 2 }}%</span> buy and sell, fixed at launch</b></div>
          <div class="tc-acts-row"><a class="tc-btn tc-btn--sm tc-btn--go" :href="links.pons" target="_blank" rel="noopener">Buy on Pons</a><a class="tc-btn tc-btn--sm" :href="links.dex" target="_blank" rel="noopener">DexScreener</a></div>
        </article>
        <article class="tc-panel">
          <span class="tc-label">Latest trades</span>
          <div class="tc-trades">
            <a v-for="t in recent" :key="t.x" class="tc-trade" :href="`${ex}/tx/${t.x}`" target="_blank" rel="noopener">
              <span :class="t.s ? 'b' : 's'">{{ t.s ? 'Buy' : 'Sell' }}</span>
              <span>{{ fmtEth(t.q) }} ETH</span>
              <span class="tc-trade__w">{{ short(t.w) }}</span>
              <span class="tc-trade__ago">{{ ago(t.t) }}</span>
            </a>
            <div v-if="!recent.length" class="tc-empty">No trades indexed yet.</div>
          </div>
        </article>
      </div>
    </div>
    <p class="tc-foot-note">You do not need $RECEIVA to use Receiva. The app, the Router and your keys work the same with or without it. Not financial advice.</p>
  </section>
</template>
