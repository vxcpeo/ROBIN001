<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Brand from '../components/Brand.vue';
import XIcon from '../components/XIcon.vue';
import TelegramIcon from '../components/TelegramIcon.vue';
import GithubIcon from '../components/GithubIcon.vue';
import SiteFooter from '../components/SiteFooter.vue';
import TokenSection from '../components/TokenSection.vue';
import { runtime, STOCKS } from '../lib/chain.js';
import { apiStats } from '../lib/runtime.js';
import { copy, short, reducedMotion, clamp, ease } from '../lib/ui.js';
import { createVault } from '../lib/vault3d.js';

const cfg = computed(() => runtime.config);
const live = computed(() => runtime.live);
const ca = computed(() => live.value.ca || '');
const ex = computed(() => cfg.value.explorer || 'https://robinhoodchain.blockscout.com');
const proof = computed(() => cfg.value.proof || {});
const navSolid = ref(false);
const now = ref(Date.now());
const stats = reactive({ viaReceiva: null, announcements: null, head: null });
const flash = reactive({ viaReceiva: false, announcements: false });
const routerBalance = ref('0.000000');
const scene = ref(null);
const storyEl = ref(null);
const statementEl = ref(null);
const finalEl = ref(null);
const finalSpaceEl = ref(null);
const heroFigureEl = ref(null);
const holdEl = ref(null);
const act = ref(0);
const progress = ref(0);
const hooded = ref(false);
const landedOn = ref(false);
const mineOn = ref(false);
const sending = ref(false);
const hold = ref(0);
const reduced = reducedMotion();
let hood = null;
let hoodedState = false;
let lifting = false;
let scrollRaf = 0;
let statsTimer;
let balanceTimer;
let countdownTimer;
let holdRaf = 0;
let holding = false;
let mounted = false;

const mask = (s) => String(s).replace(/[0-9A-Za-z]/g, '•');
const shortAddr = (a, n = 4) => short(a, n);
const statusLive = computed(() => !!ca.value);
const countdown = computed(() => {
  if (ca.value) return { main: 'Live', small: 'ROBINHOOD CHAIN' };
  const s = Math.max(0, Math.floor((Date.parse(live.value.launchAt || '2026-10-19T13:00:00Z') - now.value) / 1000));
  if (!s) return { main: 'Launching', small: 'NOW' };
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return { main: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`, small: 'TO LAUNCH' };
});

const links = computed(() => ({
  pons: ca.value ? `https://www.ponsfamily.com/launchpad/${ca.value.toLowerCase()}` : undefined,
  dex: ca.value ? `https://dexscreener.com/robinhood/${ca.value.toLowerCase()}` : undefined,
  token: ca.value ? `${ex.value}/token/${ca.value}` : undefined,
  router: `${ex.value}/address/${cfg.value.router}?tab=contract`,
  routerBalance: `${ex.value}/address/${cfg.value.router}`,
  announcer: `${ex.value}/address/${cfg.value.announcer}`,
  registry: `${ex.value}/address/${cfg.value.registry}`,
  routerDeployTx: proof.value.routerDeployTx ? `${ex.value}/tx/${proof.value.routerDeployTx}` : undefined,
  firstSendTx: proof.value.firstSendTx ? `${ex.value}/tx/${proof.value.firstSendTx}` : undefined,
  firstWithdrawTx: proof.value.firstWithdrawTx ? `${ex.value}/tx/${proof.value.firstWithdrawTx}` : undefined,
  firstStealth: proof.value.firstStealth ? `${ex.value}/address/${proof.value.firstStealth}` : undefined,
}));

const proofTime = (name, fallback) => {
  const iso = proof.value[name];
  if (!iso) return fallback;
  const d = new Date(iso);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${mon[d.getUTCMonth()]} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};

const assets = computed(() => STOCKS.slice(0, 22));
const extraStocks = computed(() => Math.max(0, STOCKS.length - 22));
const landed = [
  '0x7f3e…b91a', '0x0c41…77de', '0x9b2d…04f1', '0x51aa…e930',
  '0xd8c0…1b7e', '0x2e96…c38a', '0xa413…5f02', '0x66b7…d0c9',
  '0x3f08…a2e4', '0xc9e1…7731', '0x18d5…9fb0', '0xe0a7…4c16',
].map((a, i) => ({ a, me: [2, 5, 11].includes(i) }));

function railFill(i) {
  return clamp(progress.value - i).toFixed(3);
}

// ---- live stats & router balance ----
let lastStats = {};
async function pollStats() {
  try {
    const s = await apiStats();
    for (const k of ['viaReceiva', 'announcements', 'head']) {
      if (s[k] == null) continue;
      const v = Number(s[k]);
      if (lastStats[k] !== undefined && lastStats[k] !== v && k !== 'head') {
        flash[k] = false;
        requestAnimationFrame(() => { flash[k] = true; setTimeout(() => (flash[k] = false), 1200); });
      }
      stats[k] = v;
      lastStats[k] = v;
    }
  } catch { /* keep last values */ }
}

async function pollRouterBalance() {
  if (!cfg.value.router) return;
  for (const rpc of cfg.value.rpcs || []) {
    try {
      const r = await fetch(rpc, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [cfg.value.router, 'latest'] }),
        signal: AbortSignal.timeout(8000),
      });
      const j = await r.json();
      if (j.result == null) continue;
      routerBalance.value = (Number(BigInt(j.result)) / 1e18).toFixed(6);
      return;
    } catch { /* try the next RPC */ }
  }
}

// ---- 3D vault + scroll story ----
const heroPoseCache = {};
const isMobile = () => window.innerWidth <= 960;
const lerp = (a, b, t) => a + (b - a) * t;
const mixPose = (A, B, t) => { const o = {}; for (const k in A) o[k] = lerp(A[k], B[k] ?? A[k], t); return o; };

function heroPose() {
  if (!hood || !heroFigureEl.value) return null;
  if (isMobile()) {
    if (!heroPoseCache.v || heroPoseCache.w !== window.innerWidth) {
      const fig = heroFigureEl.value.getBoundingClientRect();
      const c = hood.screenToWorld(fig.width / 2, fig.height / 2);
      const sc = (fig.height * c.per) / 4.2;
      heroPoseCache.v = { x: c.x, y: c.y - 0.3 * sc, scale: sc, open: 0, dissolve: 0, mine: 0, opacity: 1 };
      heroPoseCache.w = window.innerWidth;
    }
    return { ...heroPoseCache.v };
  }
  return { x: 0, y: -0.02, scale: window.innerWidth / window.innerHeight > 1.25 ? 0.74 : 0.62, open: 0, dissolve: 0, mine: 0, opacity: 1 };
}

function bgPose(base, o) {
  return Object.assign({ x: 0, y: -0.02, scale: base.scale, open: 0, dissolve: 0, mine: 0, opacity: 1 }, o);
}

function setHooded(on) {
  if (on === hoodedState) return;
  hoodedState = on;
  hooded.value = on;
}

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    if (!mounted) return;
    const y = window.scrollY, vh = window.innerHeight;
    navSolid.value = y > 40;
    if (!storyEl.value) return;
    const r = storyEl.value.getBoundingClientRect();
    const total = storyEl.value.offsetHeight - vh;
    const p = clamp(-r.top / total);
    progress.value = p;
    const pos = p * 4;
    const a = Math.min(3, Math.floor(pos));
    const t = pos - a;
    act.value = a;
    const inStory = r.top <= 0 && r.bottom >= vh;
    setHooded(inStory && (a > 1 || (a === 1 && t > 0.35)));
    landedOn.value = inStory && a >= 2 && !lifting;
    mineOn.value = inStory && a === 3 && t > 0.15;

    // hero wordmark/figure parallax
    const hero = document.querySelector('.tc-hero');
    if (hero) {
      const hp = clamp(y / Math.max(1, vh));
      hero.style.setProperty('--hy', String(1 - hp));
    }

    if (!hood) return;
    const H = heroPose();
    if (!H) return;
    const big = H.scale * 1.06;
    const docH = document.documentElement.scrollHeight - vh;
    const spin = (y / Math.max(1, docH)) * Math.PI * 1.2;
    const fr = finalEl.value.getBoundingClientRect();
    let pose;
    if (r.top > 0) {
      const k = ease(clamp(1 - r.top / vh));
      pose = bgPose(H, { x: H.x, y: H.y, scale: H.scale + (big - H.scale) * k, open: 0.65 * k, opacity: 1 - 0.7 * k });
    } else if (inStory) {
      if (a === 0) pose = bgPose(H, { scale: big, open: 0.65, opacity: 0.3 });
      else if (a === 1) pose = bgPose(H, { scale: big, open: 0.65 * (1 - ease(clamp(t / 0.7))), opacity: 0.3 });
      else if (a === 2) pose = bgPose(H, { scale: big, dissolve: ease(clamp(t / 0.85)), opacity: 0.45 });
      else pose = bgPose(H, { scale: big, dissolve: 1, mine: ease(clamp(t / 0.6)), opacity: 0.6 });
    } else if (fr.top < vh * 0.95) {
      const s2 = finalSpaceEl.value.getBoundingClientRect();
      const cw = scene.value ? scene.value.clientWidth : window.innerWidth;
      const ch = scene.value ? scene.value.clientHeight : window.innerHeight;
      const c = hood.screenToWorld(cw / 2, ch / 2);
      const sc = (Math.min(s2.height, ch) * c.per) / 3.6;
      const k = ease(clamp((vh - fr.top) / (vh * 0.9)));
      pose = bgPose(H, { x: 0, y: c.y - 0.32 * sc, scale: big + (sc - big) * k, dissolve: 1 - k, opacity: 0.35 + 0.65 * k });
    } else {
      pose = bgPose(H, { scale: big, dissolve: 1, opacity: 0.2 });
    }
    pose.spin = spin;
    if (lifting && inStory && a === 1) pose.opacity = 0.15;
    hood.setPose(pose);
  });
}

function initScene() {
  if (!scene.value) return;
  try {
    hood = createVault(scene.value, { lite: isMobile(), maxDpr: isMobile() ? 1.75 : 2, smooth: 0.06 });
  } catch {
    document.body.classList.add('tc-no-webgl');
    return;
  }
  hood.setPose(heroPose(), true);
  hood.step(0.016);
  requestAnimationFrame(() => scene.value?.classList.add('ready'));
  if (!reduced) hood.start(); else hood.step(0.016);
  window.__hood = hood;
}

function onPointerMove(e) {
  if (e.pointerType === 'mouse' && hood) hood.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
}

function onVisibility() {
  if (!hood) return;
  if (document.hidden) hood.stop();
  else if (!reduced) hood.start();
}

function onResize() {
  hood?.resize();
  if (hood) hood.setPose(heroPose(), true);
  onScroll();
}

// ---- hold to reveal sender view ----
function holdStep() {
  hold.value = clamp(hold.value + (holding ? 0.05 : -0.09));
  const show = holding && hold.value >= 1;
  if (show !== sending.value) {
    sending.value = show;
    lifting = show;
    onScroll();
    if (holdEl.value) holdEl.value.classList.toggle('active', show);
  }
  if (!holding && hold.value <= 0.0001) { holdRaf = 0; return; }
  holdRaf = requestAnimationFrame(holdStep);
}
function holdDown(e) {
  e.preventDefault();
  holding = true;
  if (!holdRaf) holdRaf = requestAnimationFrame(holdStep);
}
function holdUp() {
  holding = false;
  if (!holdRaf) holdRaf = requestAnimationFrame(holdStep);
}
function holdKey(e) {
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) holdDown(e);
}
function holdKeyUp(e) {
  if (e.key === ' ' || e.key === 'Enter') holdUp();
}

async function init() {
  mounted = true;
  document.body.classList.add('tc-land-mode');
  initScene();
  onScroll();
  await nextTick();
  onScroll();
  pollStats();
  statsTimer = setInterval(pollStats, 10000);
  pollRouterBalance();
  balanceTimer = setInterval(pollRouterBalance, 15000);
  countdownTimer = setInterval(() => (now.value = Date.now()), 1000);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
}

onMounted(init);
onBeforeUnmount(() => {
  mounted = false;
  hood?.stop();
  clearInterval(statsTimer);
  clearInterval(balanceTimer);
  clearInterval(countdownTimer);
  cancelAnimationFrame(scrollRaf);
  cancelAnimationFrame(holdRaf);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('visibilitychange', onVisibility);
  document.body.classList.remove('tc-land-mode', 'tc-no-webgl');
});
</script>

<template>
  <div class="tc-land" id="top">
    <header class="tc-term" role="banner" :class="{ 'tc-term--solid': navSolid }">
      <Brand />
      <span class="tc-term__ca">
        <b>{{ ca ? 'CA' : 'LAUNCH' }}</b>
        <span class="tc-mono">{{ ca ? short(ca) : '19 Oct · 13:00 UTC' }}</span>
        <button v-if="ca" type="button" aria-label="Copy contract address" @click="copy(ca, 'Contract address copied')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>
        </button>
      </span>
      <span class="tc-term__glyphs">
        <a class="tc-glyph" :href="cfg.x" target="_blank" rel="noopener" aria-label="Receiva on X"><XIcon /></a>
        <a class="tc-glyph" :href="cfg.telegram" target="_blank" rel="noopener" aria-label="Receiva on Telegram"><TelegramIcon /></a>
        <a class="tc-glyph" :href="cfg.github" target="_blank" rel="noopener" aria-label="Receiva source on GitHub"><GithubIcon /></a>
      </span>
    </header>

    <div class="tc-land__body">
      <nav class="tc-index" aria-label="Primary">
        <a class="tc-index__mark" href="/" aria-label="Receiva home"><img src="/assets/receiva-mark.svg" alt="" width="22" height="22"></a>
        <a href="#how"><span>How it works</span></a>
        <a href="#proof"><span>Proof</span></a>
        <a href="#token"><span>Token</span></a>
        <a href="/transparency"><span>Transparency</span></a>
        <a href="#faq"><span>FAQ</span></a>
        <a class="tc-term__go" href="/receive"><span>Open app</span></a>
     </nav>

      <main class="tc-doc">
        <section class="tc-hero tc-record" aria-label="Receiva on Robinhood Chain">
          <div class="tc-wordmark" aria-hidden="true">Receiva</div>
          <div class="tc-hero__copy">
            <div class="tc-hero__eyebrow">
              <span class="tc-label tc-label--hot"><span class="tc-dot tc-dot--hot"></span> Live on Robinhood Chain</span>
              <span class="tc-label">Private receive links · Robinhood Chain</span>
              <span class="tc-label tc-mono">ERC-5564 / 4663</span>
            </div>
            <h1>Your wallet is a public statement. <em>Put a hood on it.</em></h1>
            <p class="tc-hero__lead">Receiva gives you a private receive link. Every payment lands in a fresh address that only you can open. No pool, no custody, no mixer.</p>
            <div class="tc-hero__acts">
              <a class="tc-btn tc-btn--go" href="/receive">Create your link <span class="tc-btn__arrow">→</span></a>
              <a class="tc-btn tc-btn--quiet" href="#how">How it works</a>
            </div>
            <div class="tc-hero__proof">
              <a :href="links.router" target="_blank" rel="noopener"><i class="tc-dot tc-dot--ok"></i>Source verified</a>
              <a href="#proof"><i class="tc-dot tc-dot--ok"></i>Tested on mainnet</a>
              <span><i class="tc-dot tc-dot--ok"></i>Holds 0 ETH</span>
              <span><i class="tc-dot tc-dot--ok"></i>0% fee</span>
              <a :href="cfg.github" target="_blank" rel="noopener"><i class="tc-dot tc-dot--ok"></i>Open source</a>
            </div>
          </div>

          <div class="tc-stage">
            <div class="tc-stage__bar">
              <span class="tc-dot tc-dot--hot"></span>
              <img src="/assets/receiva-mark.svg" alt="" width="14" height="14">
              <span class="tc-stage__grow"></span>
              <span>Chain 4663 · Non-custodial</span>
            </div>
            <div class="tc-stage__body">
              <img ref="heroFigureEl" class="tc-stage__fallback" src="/assets/hood-sm.webp" alt="">
              <canvas ref="scene" class="tc-hood-canvas" aria-hidden="true"></canvas>
              <div class="tc-stage__corners" aria-hidden="true"></div>
              <div class="tc-stage__hint"><span>Move to turn the vault</span></div>
            </div>
            <div class="tc-stage__foot">
              <span>Put a hood on your wallet</span>
            </div>
          </div>
        </section>

        <section class="tc-record" aria-label="Receiva token">
          <div class="tc-metrics" id="stats">
            <div class="tc-metric"><span class="tc-label">Payments via Receiva Router</span><b :class="{ 'tc-flash': flash.viaReceiva }">{{ stats.viaReceiva == null ? '—' : stats.viaReceiva.toLocaleString('en-US') }}</b></div>
            <div class="tc-metric"><span class="tc-label">ERC-5564 payments · all apps</span><b :class="{ 'tc-flash': flash.announcements }">{{ stats.announcements == null ? '—' : stats.announcements.toLocaleString('en-US') }}</b></div>
            <div class="tc-metric"><span class="tc-label">Funds held by Receiva</span><b>0</b></div>
            <div class="tc-metric"><span class="tc-label">Receiva fee</span><b>0%</b></div>
            <div class="tc-metric"><span class="tc-label">Latest block</span><b>{{ stats.head == null ? '—' : stats.head.toLocaleString('en-US') }}</b></div>
          </div>
        </section>

        <section ref="storyEl" class="tc-record tc-story" id="story" aria-label="How a hood works" :class="{ 'is-sending': sending }">
          <div class="tc-story__steps">
            <div class="tc-acts">
              <article class="tc-act" :class="{ 'is-on': act === 0 }">
                <span class="tc-label tc-label--hot">01 · Exposed</span>
                <h2>This is what <em>everyone</em> sees.</h2>
                <p>On Robinhood Chain an address is an open brokerage statement. Pay someone once and they can read every share you hold, every trade you made, every wallet you touch.</p>
              </article>
              <article class="tc-act" :class="{ 'is-on': act === 1 }">
                <span class="tc-label tc-label--hot">02 · Hooded</span>
                <h2>Share a link, <em>not an address.</em></h2>
                <p>Your Receiva link carries public receive keys, not your wallet. Senders pay the link. Your statement locks away.</p>
                <button ref="holdEl" class="tc-hold" type="button" :style="{ '--h': hold }" @pointerdown="holdDown" @pointerup="holdUp" @pointerleave="holdUp" @pointercancel="holdUp" @keydown="holdKey" @keyup="holdKeyUp">
                  <span class="tc-hold__ring"></span><span class="tc-hold__label">{{ sending ? 'Release to put it back' : 'Hold to see what a sender sees' }}</span>
                </button>
              </article>
              <article class="tc-act" :class="{ 'is-on': act === 2 }">
                <span class="tc-label tc-label--hot">03 · Landed</span>
                <h2>Every payment lands <em>somewhere new.</em></h2>
                <p>Each payment creates a one-time address, derived on the spot. Ten payments, ten addresses, and no thread between them.</p>
              </article>
              <article class="tc-act" :class="{ 'is-on': act === 3 }">
                <span class="tc-label tc-label--hot">04 · Only you</span>
                <h2>Only <em>your key</em> can find them.</h2>
                <p>Your browser checks every public announcement with your viewing key. The ones that light up are yours. Move them wherever you choose.</p>
              </article>
              <div class="tc-rail" aria-hidden="true"><i v-for="i in 4" :key="i" :style="{ '--fill': railFill(i - 1) }"></i></div>
            </div>
          </div>
          <div aria-hidden="true">
            <div ref="statementEl" class="tc-sheet" :class="{ 'is-hooded': hooded, 'is-landed': landedOn, 'is-mine': mineOn, 'is-sender': sending }">
             <div class="tc-sheet__head">
                <div><span class="tc-label">Wallet</span><b class="tc-mono">0x9A3f…e21C</b></div>
                <div class="tc-sheet__total"><span class="tc-label">Portfolio</span><b>{{ hooded ? mask('$48,212.40') : '$48,212.40' }}</b></div>
              </div>
              <div class="tc-sheet__rows">
                <div class="tc-sheet__row"><span class="tc-tok">NVDA</span><span>NVIDIA</span><b>{{ hooded ? mask('42.18') : '42.18' }}</b><b>{{ hooded ? mask('$7,941.30') : '$7,941.30' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok">TSLA</span><span>Tesla</span><b>{{ hooded ? mask('31.02') : '31.02' }}</b><b>{{ hooded ? mask('$13,420.08') : '$13,420.08' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok">SPCX</span><span>SpaceX</span><b>{{ hooded ? mask('118.40') : '118.40' }}</b><b>{{ hooded ? mask('$9,812.44') : '$9,812.44' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok">AAPL</span><span>Apple</span><b>{{ hooded ? mask('27.75') : '27.75' }}</b><b>{{ hooded ? mask('$6,903.21') : '$6,903.21' }}</b></div>
                <div class="tc-sheet__row"><span class="tc-tok tc-tok--eth">ETH</span><span>Ether</span><b>{{ hooded ? mask('4.120') : '4.120' }}</b><b>{{ hooded ? mask('$10,135.37') : '$10,135.37' }}</b></div>
              </div>
              <div class="tc-sheet__tx">
                <span class="tc-label">Recent</span>
                <div><span>Received 1,200 USDG</span><span>{{ hooded ? mask('from 0x51C7…2a7F') : 'from 0x51C7…2a7F' }}</span></div>
                <div><span>Sold 12 TSLA</span><span>{{ hooded ? mask('to 0x8366…0951') : 'to 0x8366…0951' }}</span></div>
              </div>
              <div class="tc-landed" aria-hidden="true">
                <span v-for="x in landed" :key="x.a" :class="{ me: x.me }">{{ x.a }}</span>
              </div>
              <div class="tc-sheet__sender"><span class="tc-label">What the sender sees</span><b>Paid → 0x7f3e…b91a</b><span>Owner: unknown · first seen just now</span></div>
            </div>
          </div>
        </section>

        <section class="tc-record" id="how">
          <div class="tc-record__head"><span class="tc-label">How it works</span></div>
          <h2>Three moves. <em>No new wallet.</em></h2>
          <div class="tc-moves">
            <article class="tc-move">
              <span class="tc-move__no">01</span>
              <h3>Unlock</h3>
              <p>Sign one fixed message with the wallet you already use. Free, no transaction. Your browser derives a viewing key and a spending key.</p>
              <div class="tc-mini"><div class="tc-mini__row"><span>Signature</span><b class="tc-good">Free · 0 gas</b></div><div class="tc-mini__row"><span>Keys leave browser</span><b class="tc-good">Never</b></div></div>
            </article>
            <article class="tc-move">
              <span class="tc-move__no">02</span>
              <h3>Share your link</h3>
              <p>Post it in your bio, send it to a client, print it as a QR. Anyone with ETH or a stock token on Robinhood Chain can pay it.</p>
              <div class="tc-mini"><div class="tc-mini__link tc-mono">receiva.xyz/pay/0x9A3f…e21C</div><div class="tc-mini__row"><span>Your wallet in the payment</span><b class="tc-good">Not on-chain</b></div></div>
            </article>
            <article class="tc-move">
              <span class="tc-move__no">03</span>
              <h3>Withdraw anywhere</h3>
              <p>Your Inbox finds each payment and moves it in one click, gas included by the sender. Send it to a fresh wallet to stay hooded.</p>
              <div class="tc-mini"><div class="tc-mini__row"><span><span class="tc-tok" style="width:22px;height:22px;font-size:8px">NVDA</span> 1.5 NVDA</span><b>Withdraw →</b></div><div class="tc-mini__row"><span>Receiva fee</span><b>0</b></div></div>
            </article>
          </div>
          <div class="tc-tools">
            <article class="tc-tool">
              <span class="tc-label">New · Payment requests</span>
              <h3>Ask for an exact amount.</h3>
              <p>Set 0.05 ETH, 2 NVDA or any amount, add a note like "Invoice #12", share the link or its QR. The payer opens it and everything is filled in.</p>
              <div class="tc-mini"><div class="tc-mini__row"><span>Invoice #12 · logo design</span><b>0.05 ETH</b></div><div class="tc-mini__row"><span>Note written on-chain</span><b class="tc-good">Never</b></div></div>
              <a class="tc-btn tc-btn--sm" href="/receive">Create a request <span class="tc-btn__arrow">→</span></a>
            </article>
            <article class="tc-tool">
              <span class="tc-label">New · Pay me privately button</span>
              <h3>Put it on your site or profile.</h3>
              <p>One line of HTML for your website, Markdown for GitHub, a short line for your bio. Anyone who clicks it pays a one-time address, not your wallet.</p>
              <div class="tc-badges"><img src="/assets/badge-dark.svg" alt="Pay me privately with Receiva, dark" width="232" height="48" loading="lazy"><img src="/assets/badge-light.svg" alt="Pay me privately with Receiva, light" width="232" height="48" loading="lazy"></div>
              <a class="tc-btn tc-btn--sm" href="/receive">Get your button <span class="tc-btn__arrow">→</span></a>
            </article>
          </div>
          <div class="tc-assets">
            <span class="tc-label">Send ETH, any ERC-20, and every Robinhood stock token</span>
            <div class="tc-chips">
              <span><span class="tc-tok tc-tok--eth">ETH</span>Ether</span>
              <span v-for="s in assets" :key="s.address"><span class="tc-tok">{{ s.symbol.slice(0, 4) }}</span>{{ s.symbol }}</span>
              <span style="padding-left:14px">+{{ extraStocks }} more stock tokens</span>
              <span style="padding-left:14px">any ERC-20</span>
            </div>
          </div>
        </section>

        <section class="tc-record" id="proof">
          <div class="tc-record__head"><span class="tc-label">Proof, not promises</span></div>
          <div class="tc-proof__lead">
            <h2>Don't trust us. <em>Verify it.</em></h2>
            <p>Everything below is live on Robinhood Chain. Every claim links to the block explorer, so you can check it without asking us.</p>
          </div>
          <div class="tc-proof-grid">
            <article class="tc-panel">
              <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> Source verified</span>
              <h3>Read the whole contract. <em>It is short.</em></h3>
              <p>The Receiva Router is under 80 lines. No owner, no fee, no admin switch, no upgrade path. It forwards a payment and logs one announcement. That is all it can do.</p>
              <div class="tc-row"><span>Router</span><a class="tc-mono" :href="links.router" target="_blank" rel="noopener">{{ short(cfg.router) }} ↗</a></div>
              <div class="tc-row"><span>Functions</span><b class="tc-mono">sendEth · sendToken</b></div>
              <div class="tc-row"><span>Owner / admin</span><b class="tc-good">None</b></div>
            </article>
            <article class="tc-panel">
              <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> Tested with real money</span>
              <h3>Sent, found, withdrawn. <em>On mainnet.</em></h3>
              <ol class="tc-steps">
                <li><span class="tc-mono">{{ proofTime('routerDeployedAt', '18 Oct · 20:44 UTC') }}</span><div><b>Router deployed</b><a class="tc-mono" :href="links.routerDeployTx" target="_blank" rel="noopener">tx ↗</a></div></li>
                <li><span class="tc-mono">{{ proofTime('firstSendAt', '18 Oct · 20:45 UTC') }}</span><div><b>0.0002 ETH sent to a one-time address</b><a class="tc-mono" :href="links.firstSendTx" target="_blank" rel="noopener">tx ↗</a> <a class="tc-mono" :href="links.firstStealth" target="_blank" rel="noopener">address ↗</a></div></li>
                <li><span class="tc-mono">{{ proofTime('firstWithdrawAt', '18 Oct · 20:45 UTC') }}</span><div><b>Found with the viewing key, withdrawn</b><a class="tc-mono" :href="links.firstWithdrawTx" target="_blank" rel="noopener">tx ↗</a></div></li>
              </ol>
              <p class="tc-foot-note">Network cost of the whole round trip: under one cent. Before mainnet, the router and the full app flow passed tests on a fork of Robinhood Chain with real NVDA stock tokens.</p>
            </article>
            <article class="tc-panel">
              <span class="tc-label"><i class="tc-dot tc-dot--ok"></i> Open standards</span>
              <h3>Not our invention. <em>That's the point.</em></h3>
              <p>Receiva is a thin layer over two Ethereum standards whose contracts were already live on Robinhood Chain before Receiva existed.</p>
              <div class="tc-row"><span><a href="https://eips.ethereum.org/EIPS/eip-5564" target="_blank" rel="noopener">ERC-5564</a> Announcer</span><a class="tc-mono" :href="links.announcer" target="_blank" rel="noopener">{{ short(cfg.announcer) }} ↗</a></div>
              <div class="tc-row"><span><a href="https://eips.ethereum.org/EIPS/eip-6538" target="_blank" rel="noopener">ERC-6538</a> Registry</span><a class="tc-mono" :href="links.registry" target="_blank" rel="noopener">{{ short(cfg.registry) }} ↗</a></div>
              <div class="tc-row"><span>Payments through the Receiva Router</span><b>{{ stats.viaReceiva == null ? '—' : stats.viaReceiva.toLocaleString('en-US') }}</b></div>
              <div class="tc-row"><span>ERC-5564 payments on the chain, every app <a href="/transparency">why both</a></span><b>{{ stats.announcements == null ? '—' : stats.announcements.toLocaleString('en-US') }}</b></div>
            </article>
            <article class="tc-panel tc-panel--deep">
              <span class="tc-label tc-label--hot">Verify it yourself in 60 seconds</span>
              <h3>Four checks. <em>No trust required.</em></h3>
              <div class="tc-verify">
                <ol>
                  <li><b>01</b><span>Open the Router on Blockscout and read the Code tab, or the full source on <a :href="cfg.github" target="_blank" rel="noopener">GitHub</a>. Look for an owner or a fee. There is none.</span></li>
                  <li><b>02</b><span>Check its balance. It is zero, and it stays zero after every payment.</span></li>
                  <li><b>03</b><span>Create your link and send yourself 0.0001 ETH from another wallet. Watch it land at an address that has never touched yours.</span></li>
                  <li><b>04</b><span>Open your Inbox and withdraw it. Your keys came from one signature and never left the tab.</span></li>
                </ol>
              </div>
            </article>
          </div>
        </section>

        <TokenSection />

        <section class="tc-record" id="honest">
          <div class="tc-record__head"><span class="tc-label">Honest by design</span></div>
          <h2>A hood hides a face, <em>not a crowd.</em></h2>
          <p class="tc-lead">Privacy tools fail when they overpromise. Here is exactly what Receiva changes on-chain and what it does not.</p>
          <div class="tc-ledger">
            <div class="tc-ledger__col"><span class="tc-label tc-label--hot">Hidden</span>
              <div class="tc-ledger__row"><b>Who received</b><span>Funds land in a one-time address, not your wallet.</span></div>
              <div class="tc-ledger__row"><b>Links between payments</b><span>Every payment gets its own address.</span></div>
              <div class="tc-ledger__row"><b>Your keys</b><span>Derived and used only inside your browser.</span></div>
            </div>
            <div class="tc-ledger__col tc-ledger__col--open"><span class="tc-label">Still public</span>
              <div class="tc-ledger__row"><b>Amount and asset</b><span>Visible on Blockscout like any transfer.</span></div>
              <div class="tc-ledger__row"><b>The sender's wallet</b><span>The payer is not hidden.</span></div>
              <div class="tc-ledger__row"><b>Your short link</b><span>The 0x short link names your wallet to whoever you share it with. The long link does not.</span></div>
              <div class="tc-ledger__row"><b>Where you withdraw to</b><span>Withdraw to your main wallet and the link is back.</span></div>
            </div>
          </div>
          <div class="tc-contracts">
            <div><span class="tc-label">ERC-5564 Announcer</span><a class="tc-mono" :href="links.announcer" target="_blank" rel="noopener">{{ short(cfg.announcer) }}</a><small>Standard contract, already live</small></div>
            <div><span class="tc-label">ERC-6538 Registry</span><a class="tc-mono" :href="links.registry" target="_blank" rel="noopener">{{ short(cfg.registry) }}</a><small>Standard contract. Maps a wallet to its public receive keys.</small></div>
            <div><span class="tc-label">Receiva Router</span><a class="tc-mono" :href="links.router" target="_blank" rel="noopener">{{ short(cfg.router) }}</a><small>No owner · no fee · holds nothing</small></div>
            <div><span class="tc-label">Audit</span><b>Not yet</b><small>Source verified and <a :href="cfg.github" target="_blank" rel="noopener">open on GitHub</a>.</small></div>
          </div>
        </section>

        <section class="tc-record" id="faq">
          <div class="tc-record__head"><span class="tc-label">FAQ</span></div>
          <h2>Questions, <em>answered plainly.</em></h2>
          <div class="tc-faq">
            <details><summary>Is Receiva a mixer?</summary><p>No. There is no shared pool and nothing is mixed. Each payment goes straight from the sender to a one-time address that belongs to the receiver. Receiva never holds funds.</p></details>
            <details><summary>Can Receiva take or freeze my money?</summary><p>No. The router has no owner and no admin functions, and it never holds a balance. Only your spending key can move funds out of your one-time addresses. Note that stock token issuers can still pause their own tokens.</p></details>
            <details><summary>What if receiva.xyz goes offline?</summary><p>Your funds stay where they are. Announcements live on Robinhood Chain, and your keys come back from one signature, so any ERC-5564 tool can find and move them.</p></details>
            <details><summary>Which wallets work?</summary><p>Any regular EVM wallet: MetaMask, Rabby, Phantom (enable Robinhood Chain under Active Networks) and others. Smart-contract wallets may sign differently each time, so they are not recommended.</p></details>
            <details><summary>Who pays gas to withdraw a token?</summary><p>The sender. Each token payment carries a tiny amount of ETH (0.00002) to the one-time address, so you can withdraw without funding it first.</p></details>
            <details><summary>What does $RECEIVA do?</summary><p>$RECEIVA is the community token for the project. The app is free and does not require it. Creator fees fund servers and, next, a relayer so withdrawals need no ETH at all.</p></details>
          </div>
        </section>

        <section ref="finalEl" class="tc-final tc-record">
          <div ref="finalSpaceEl" class="tc-final__space" aria-hidden="true"></div>
          <h2>Put a hood on <em>your wallet.</em></h2>
          <p>One signature. One link. Every payment, under the hood.</p>
          <a class="tc-btn tc-btn--go" href="/receive">Create your link <span class="tc-btn__arrow">→</span></a>
        </section>
      </main>

      <aside class="tc-live" aria-label="Receiva token">
        <article class="tc-card">
          <div class="tc-row"><span class="tc-token-tick">$RECEIVA</span><span class="tc-pill" :class="{ 'tc-pill--ok': statusLive }"><span class="tc-dot" :class="{ 'tc-dot--ok': statusLive }"></span> <span>{{ statusLive ? 'Live on Pons' : 'Launch 19 Oct · 13:00 UTC' }}</span></span></div>
          <div class="tc-big">{{ countdown.main }} <small>{{ countdown.small }}</small></div>
          <span class="tc-label">Contract address</span>
          <div class="tc-linkline">
            <code class="tc-linkline__url">{{ ca || 'Appears here at launch' }}</code>
            <button v-if="ca" type="button" class="tc-copy" aria-label="Copy contract address" @click="copy(ca, 'Contract address copied')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button>
          </div>
          <p class="tc-note">Verify this address before you buy. We only post it here and on <a :href="cfg.x" target="_blank" rel="noopener">@receiva</a>.</p>
          <div class="tc-acts-row">
            <a class="tc-btn tc-btn--sm tc-btn--go" :href="links.pons" :aria-disabled="!ca" target="_blank" rel="noopener">Buy on Pons</a>
            <a class="tc-btn tc-btn--sm" :href="links.dex" :aria-disabled="!ca" target="_blank" rel="noopener">Chart</a>
            <a class="tc-btn tc-btn--sm" :href="links.token" :aria-disabled="!ca" target="_blank" rel="noopener">Contract</a>
          </div>
        </article>

        <article class="tc-panel tc-panel--deep">
          <span class="tc-label"><span class="tc-dot tc-dot--plate"></span> Live balance</span>
          <h3>Funds held by Receiva</h3>
          <div class="tc-big">{{ routerBalance }} <small>ETH</small></div>
          <p>Read from the chain every few seconds. Payments go straight from the sender to a one-time address. Nothing waits in a pool.</p>
          <a class="tc-side-more" :href="links.routerBalance" target="_blank" rel="noopener">Check it on Blockscout ↗</a>
        </article>
      </aside>
    </div>

    <SiteFooter />
  </div>
</template>
