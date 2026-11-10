<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import Brand from '../components/Brand.vue';
import XIcon from '../components/XIcon.vue';
import TelegramIcon from '../components/TelegramIcon.vue';
import GithubIcon from '../components/GithubIcon.vue';
import ReceivePane from '../components/dapp/ReceivePane.vue';
import SendPane from '../components/dapp/SendPane.vue';
import InboxPane from '../components/dapp/InboxPane.vue';
import WalletModal from '../components/dapp/WalletModal.vue';
import AssetModal from '../components/dapp/AssetModal.vue';
import WithdrawModal from '../components/dapp/WithdrawModal.vue';
import { runtime } from '../lib/chain.js';
import {
  app, initStore, setView, connect, closeModal, openModal, prepareRequest, parseRequestFromQuery,
  resolveRecipient, inboxCount, refreshBalance, setWallet,
} from '../lib/store.js';
import { copy, short, toast } from '../lib/ui.js';
import { listWallets } from '../lib/chain.js';

const route = useRoute();
const cfg = computed(() => runtime.config);
const ca = computed(() => runtime.live.ca || '');
const view = computed(() => (route.name === 'send' || route.name === 'pay') ? 'send' : route.name === 'inbox' ? 'inbox' : 'receive');
const pane = computed(() => view.value === 'send' ? SendPane : view.value === 'inbox' ? InboxPane : ReceivePane);
const badge = computed(() => inboxCount());
const senderAddr = computed(() => (view.value === 'send' && app.account ? short(app.account, 6) + ' · public' : '0xSender… · public'));
const stealthAddr = computed(() => app.send.stealthPreview ? short(app.send.stealthPreview, 6) + ' · new' : '0x7f3e… · new every time');
const wallets = ref([]);
const footRouter = computed(() => cfg.value.router ? `${cfg.value.explorer}/address/${cfg.value.router}` : '');

function openWallet() {
  wallets.value = listWallets();
  openModal({ type: 'wallet' });
}
function onWalletClick() {
  if (app.account) copy(app.account, 'Address copied');
  else openWallet();
}
async function pickWallet(w) {
  try { await connect(w); closeModal(); if (app.view === 'inbox') setView('inbox'); }
  catch (e) { toast(e?.shortMessage || e?.message || String(e)); }
}
function openAsset(target) { openModal({ type: 'asset', target }); }
function onAsset(a) {
  const target = app.ui.modal?.target;
  closeModal();
  if (target === 'request') app.request.asset = a;
  else { app.send.asset = a; app.send.step = 0; refreshBalance(); }
}

let mounted = false;
async function syncRoute() {
  if (!mounted) return;
  app.send.req = null;
  if (route.name === 'pay') {
    setView('send');
    app.send.to = decodeURIComponent(route.params.recipient || '');
    app.send.meta = null;
    app.send.resolved = null;
    const req = parseRequestFromQuery(route.query);
    if (req) await prepareRequest(req);
    await resolveRecipient();
  } else {
    setView(view.value);
  }
  if (view.value === 'inbox') setView('inbox');
}
watch(() => route.fullPath, syncRoute);
watch(() => app.ui.modal, (m) => { if (m?.type === 'wallet') wallets.value = listWallets(); });

onMounted(async () => {
  mounted = true;
  document.body.classList.add('tc-console-mode');
  document.title = 'Receiva App · Private receive links on Robinhood Chain';
  initStore();
  if (route.name === 'pay') await syncRoute();
  else setView(view.value);
  if (route.name === 'inbox') setView('inbox');
  await nextTick();
});
onBeforeUnmount(() => { mounted = false; document.body.classList.remove('tc-console-mode'); });
</script>

<template>
  <div class="tc-app">
    <header class="tc-term" role="banner">
      <Brand />
      <span class="tc-term__ca">
        <b>CA</b>
        <span class="tc-mono">{{ short(ca) }}</span>
        <button type="button" aria-label="Copy contract address" @click="copy(ca, 'Contract address copied')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button>
      </span>
      <span class="tc-term__glyphs">
        <a class="tc-glyph" :href="cfg.x" target="_blank" rel="noopener" aria-label="Receiva on X"><XIcon /></a>
        <a class="tc-glyph" :href="cfg.telegram" target="_blank" rel="noopener" aria-label="Receiva on Telegram"><TelegramIcon /></a>
        <a class="tc-glyph" :href="cfg.github" target="_blank" rel="noopener" aria-label="Receiva source on GitHub"><GithubIcon /></a>
      </span>
      <button class="tc-btn tc-btn--sm tc-btn--go" :class="{ 'tc-btn--go': !app.account }" type="button" @click="onWalletClick">{{ app.account ? short(app.account) : 'Connect wallet' }}</button>
    </header>

    <div class="tc-app__body">
      <nav class="tc-app__nav" aria-label="App sections">
        <a class="tc-app__nav-mark" href="/" aria-label="Receiva home"><img src="/assets/receiva-mark.svg" alt="" width="30" height="30"></a>
        <RouterLink to="/receive" :class="{ 'tc-on': view === 'receive' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4v11"/><path d="M7.5 11.5L12 16l4.5-4.5"/><path d="M4 19h16"/></svg>
          <span>Receive</span>
        </RouterLink>
        <RouterLink to="/send" :class="{ 'tc-on': view === 'send' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20V9"/><path d="M7.5 12.5L12 8l4.5 4.5"/><path d="M4 5h16"/></svg>
          <span>Send</span>
        </RouterLink>
        <RouterLink to="/inbox" :class="{ 'tc-on': view === 'inbox' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13l3-8h10l3 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/></svg>
          <span>Inbox <span v-if="badge" class="tc-count">{{ badge }}</span></span>
        </RouterLink>
      </nav>

      <main class="tc-app__main">
        <div class="tc-app__pane" aria-live="polite">
          <component :is="pane" @open-asset="openAsset" />
        </div>
      </main>

      <aside class="tc-app__side" aria-label="What the chain sees">
        <div class="tc-aside-head">
          <span class="tc-label">What the chain sees</span>
          <span class="tc-net"><span class="tc-dot tc-dot--ok"></span> Robinhood Chain</span>
        </div>
        <div class="tc-figure">
          <img src="/assets/hood-app.webp" alt="">
          <svg class="tc-chain" viewBox="0 0 340 300" role="img" aria-label="Sender pays a one-time address; the receiver's wallet is not linked">
            <defs><linearGradient id="tc-chain-line" x1="0" x2="1"><stop offset="0" stop-color="#4b5566" stop-opacity=".1"/><stop offset=".5" stop-color="#ff6060"/><stop offset="1" stop-color="#4b5566" stop-opacity=".1"/></linearGradient></defs>
            <g class="tc-chain-node"><rect x="20" y="22" width="300" height="58" rx="12"/><text x="40" y="46" class="tc-chain-t">Sender wallet</text><text x="40" y="66" class="tc-chain-s">{{ senderAddr }}</text><text x="300" y="46" class="tc-chain-tag" text-anchor="end">PUBLIC</text></g>
            <path class="tc-chain-flow" d="M170 80 V120"/>
            <circle class="tc-chain-pulse" r="3.5" cx="170" cy="80"><animate attributeName="cy" values="80;120" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite"/></circle>
            <g class="tc-chain-node tc-chain-node--accent"><rect x="20" y="120" width="300" height="58" rx="12"/><text x="40" y="144" class="tc-chain-t">One-time address</text><text x="40" y="164" class="tc-chain-s">{{ stealthAddr }}</text><text x="300" y="144" class="tc-chain-tag tc-chain-tag--accent" text-anchor="end">FRESH</text></g>
            <path class="tc-chain-hidden" d="M170 178 V220"/><text x="182" y="204" class="tc-chain-s">no on-chain link</text>
            <g class="tc-chain-node tc-chain-node--ghost"><rect x="20" y="220" width="300" height="58" rx="12"/><text x="40" y="244" class="tc-chain-t">Your wallet</text><text x="40" y="264" class="tc-chain-s">hidden under the hood</text><text x="300" y="244" class="tc-chain-tag" text-anchor="end">PRIVATE</text></g>
          </svg>
        </div>
        <ul class="tc-facts">
          <li><span>Amount &amp; asset</span><b>Public</b></li>
          <li><span>Sender wallet</span><b>Public</b></li>
          <li><span>Receiver wallet</span><b class="tc-good">Hidden</b></li>
          <li><span>Funds held by Receiva</span><b class="tc-good">Never</b></li>
        </ul>
        <a class="tc-side-more" href="/transparency">Read exactly what stays public →</a>
      </aside>
    </div>

    <div class="tc-hint">
      <span class="tc-hint__bar"></span>
      <span>Non-custodial · ERC-5564 / ERC-6538 · Keys never leave your browser</span>
      <span class="tc-hint__grow"></span>
      <span v-if="cfg.router">Router <a class="tc-mono" :href="footRouter" target="_blank" rel="noopener">{{ short(cfg.router) }}</a></span>
    </div>

    <WalletModal v-if="app.ui.modal?.type === 'wallet'" :wallets="wallets" @close="closeModal" @pick="pickWallet" />
    <AssetModal v-else-if="app.ui.modal?.type === 'asset'" @close="closeModal" @select="onAsset" />
    <WithdrawModal v-else-if="app.ui.modal?.type === 'withdraw'" :item="app.ui.modal.item" @close="closeModal" />
  </div>
</template>
