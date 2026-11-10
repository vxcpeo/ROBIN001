<script setup>
import { ref, computed } from 'vue';
import qrcode from 'qrcode-generator';
import AccountGate from './AccountGate.vue';
import AssetIcon from './AssetIcon.vue';
import { app, badgeSnippets, openModal, receiveLink, register, requestLink, setRequestAmount, setRequestMemo, MEMO_MAX } from '../../lib/store.js';
import { copy, short } from '../../lib/ui.js';

const showQr = ref(false);
const qrHtml = ref('');
const showReqQr = ref(false);
const reqQrHtml = ref('');
const registering = ref(false);
const regError = ref('');

const link = computed(() => receiveLink());
const reqLink = computed(() => requestLink());
const isRegistered = computed(() => !!app.registered && !app.keyMismatch);
const snippets = computed(() => badgeSnippets());
const canShare = typeof navigator !== 'undefined' && !!navigator.share;

function makeQr(data) {
  const q = qrcode(0, 'M');
  q.addData(data);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}
function toggleQr() {
  showQr.value = !showQr.value;
  if (showQr.value) qrHtml.value = makeQr(link.value);
}
function toggleReqQr() {
  showReqQr.value = !showReqQr.value;
  if (showReqQr.value) reqQrHtml.value = makeQr(reqLink.value);
}
function shareLink() {
  navigator.share({ title: 'Pay me privately with Receiva', url: link.value }).catch(() => {});
}
function shareReq() {
  navigator.share({ title: 'Payment request · Receiva', url: reqLink.value }).catch(() => {});
}
async function doRegister() {
  registering.value = true;
  regError.value = '';
  try { await register(); }
  catch (e) { regError.value = e?.shortMessage || e?.message || String(e); }
  finally { registering.value = false; }
}
function pickRequestAsset() {
  openModal({ type: 'asset', target: 'request' });
}
</script>

<template>
  <AccountGate v-if="!app.account || !app.keys" title="Receive" lead="Get paid without your wallet on-chain." />
  <template v-else>
    <section class="tc-card" aria-labelledby="tc-receive-head">
      <span class="tc-label">Your private receive link</span>
      <h1 id="tc-receive-head">Share this. <span class="tc-faint">Stay hooded.</span></h1>
      <p class="tc-lead">Every payment to this link lands in a brand-new address that only you can open.</p>
      <div class="tc-linkline">
        <span class="tc-linkline__url" :title="link">{{ link.replace(/^https?:\/\//, '') }}</span>
        <button class="tc-btn tc-btn--sm tc-btn--go" type="button" @click="copy(link, 'Link copied')">Copy</button>
      </div>
      <div class="tc-acts">
        <button class="tc-btn tc-btn--sm" type="button" @click="toggleQr">QR code</button>
        <button v-if="canShare" class="tc-btn tc-btn--sm" type="button" @click="shareLink">Share</button>
        <RouterLink class="tc-btn tc-btn--sm" to="/inbox">Open Inbox →</RouterLink>
      </div>
      <div class="tc-qr" :class="{ show: showQr }" v-html="qrHtml"></div>
      <p v-if="!isRegistered" class="tc-note">This long link works right now. Register once to shorten it to your wallet address.</p>
    </section>

    <section class="tc-card" aria-labelledby="tc-short-head">
      <div class="tc-row">
        <h2 id="tc-short-head" class="tc-k">Short link (ERC-6538 registry)</h2>
        <span class="tc-v">
          <span v-if="app.keyMismatch" class="tc-pill tc-pill--warn">Different keys on record</span>
          <span v-else-if="app.registered" class="tc-pill tc-pill--ok">● Registered</span>
          <span v-else class="tc-pill">Not registered</span>
        </span>
      </div>
      <p v-if="app.keyMismatch" class="tc-note warn">This wallet registered different keys earlier, so senders using your address would pay keys you cannot open here. Re-register to point your address at the keys you just unlocked.</p>
      <button v-if="!isRegistered" class="tc-btn tc-btn--block" type="button" :disabled="registering" @click="doRegister">
        {{ registering ? 'Confirm in wallet…' : (app.keyMismatch ? 'Re-register these keys' : 'Register short link · one transaction') }}
      </button>
      <p v-if="!isRegistered" class="tc-note">Publishes your public receive keys so anyone can pay <span class="tc-mono">{{ short(app.account) }}</span> privately. Incoming payments stay unlinkable on-chain, but the short link itself shows your wallet address to whoever you give it to. Share the long link if that matters.</p>
      <p v-if="regError" class="tc-note bad">{{ regError }}</p>
      <details class="tc-details">
        <summary>Stealth meta-address</summary>
        <div class="tc-details__text">{{ app.keys.metaAddress }}</div>
      </details>
    </section>

    <section class="tc-card" id="req-card" aria-labelledby="tc-req-head">
      <span class="tc-label">Payment request</span>
      <h2 id="tc-req-head">Ask for an exact amount.</h2>
      <p class="tc-lead">Set the amount, the asset and a note. The payer opens the link and everything is filled in.</p>
      <div class="tc-field">
        <div class="tc-field__lab"><span>Amount</span><span>optional</span></div>
        <div class="tc-amount">
          <input class="tc-input" inputmode="decimal" aria-label="Amount" placeholder="0.00" :value="app.request.amount" @input="setRequestAmount($event.target.value)">
          <button type="button" class="tc-asset-btn" @click="pickRequestAsset">
            <AssetIcon :asset="app.request.asset" /><span>{{ app.request.asset.symbol }}</span><span aria-hidden="true">▾</span>
          </button>
        </div>
      </div>
      <div class="tc-field">
        <div class="tc-field__lab"><label for="req-memo">Note</label><span>{{ app.request.memo.length }}/{{ MEMO_MAX }}</span></div>
        <input id="req-memo" class="tc-input" :maxlength="MEMO_MAX" placeholder="Invoice #12 · design work" :value="app.request.memo" @input="setRequestMemo($event.target.value)">
      </div>
      <div class="tc-linkline">
        <span class="tc-linkline__url" :title="reqLink">{{ reqLink.replace(/^https?:\/\//, '') }}</span>
        <button class="tc-btn tc-btn--sm tc-btn--go" type="button" @click="copy(reqLink, 'Request link copied')">Copy</button>
      </div>
      <div class="tc-acts">
        <button class="tc-btn tc-btn--sm" type="button" @click="toggleReqQr">QR code</button>
        <button v-if="canShare" class="tc-btn tc-btn--sm" type="button" @click="shareReq">Share</button>
      </div>
      <div class="tc-qr" :class="{ show: showReqQr }" v-html="reqQrHtml"></div>
      <p class="tc-note">The note lives only in the link. It is never written on-chain. Amounts are public once paid, like any transfer.</p>
    </section>

    <section class="tc-card" aria-labelledby="tc-badge-head">
      <span class="tc-label">Pay me privately button</span>
      <h2 id="tc-badge-head">Put it on your site or profile.</h2>
      <p class="tc-lead">Anyone who clicks it pays a one-time address. Your wallet never appears in the payment on-chain.</p>
      <div class="tc-badge-preview" :class="app.badge">
        <a :href="link" target="_blank" rel="noopener"><img :src="`/assets/badge-${app.badge}.svg`" alt="Pay me privately with Receiva" width="232" height="48"></a>
      </div>
      <div class="tc-seg" role="group" aria-label="Button style">
        <button type="button" :aria-pressed="app.badge === 'dark'" @click="app.badge = 'dark'">Dark</button>
        <button type="button" :aria-pressed="app.badge === 'light'" @click="app.badge = 'light'">Light</button>
      </div>
      <div v-for="[k, label] in [['html', 'Website (HTML)'], ['md', 'GitHub / Markdown'], ['bio', 'X or Telegram bio']]" :key="k" class="tc-snip">
        <div class="tc-snip__head"><span>{{ label }}</span><button type="button" class="tc-btn tc-btn--sm" @click="copy(snippets[k], 'Copied')">Copy</button></div>
        <pre class="tc-snip__code">{{ snippets[k] }}</pre>
      </div>
      <p v-if="!isRegistered" class="tc-note warn">Your link is long until you register the short link above. Register first for a bio-friendly link.</p>
    </section>
  </template>
</template>
