<script setup>
import { computed, onMounted, watch } from 'vue';
import AssetIcon from './AssetIcon.vue';
import { runtime } from '../../lib/chain.js';
import { fmtAmount } from '../../lib/chain.js';
import { app, doSend, openModal, refreshBalance, resetSendResult, resolveRecipient, setMax, setSendTo } from '../../lib/store.js';
import { short } from '../../lib/ui.js';

const cfg = computed(() => runtime.config);
const s = app.send;
const isToken = computed(() => s.asset.address !== 'eth');
const routerReady = computed(() => !!cfg.value.router);
const label = computed(() => {
  if (!routerReady.value) return 'Sending opens at launch';
  if (!app.account) return 'Connect wallet';
  if (s.busy) return 'Confirm in wallet…';
  if (isToken.value && s.step <= 1) return `Approve & send ${s.asset.symbol}`;
  return 'Send privately';
});
const resolveClass = computed(() => s.resolved?.type ? `tc-note ${s.resolved.type}` : 'tc-note');

function onAmount(e) { s.amount = e.target.value.replace(',', '.'); }
function pickAsset() { openModal({ type: 'asset', target: 'send' }); }
function submit() { doSend(); }

watch(() => [app.account, s.asset.address], refreshBalance, { immediate: true });
onMounted(() => { if (s.to && !s.meta) resolveRecipient(); });
</script>

<template>
  <section v-if="s.result" class="tc-card" aria-labelledby="tc-sent-head">
    <span class="tc-label">Sent privately</span>
    <h1 id="tc-sent-head">Delivered under the hood.</h1>
    <p class="tc-lead">{{ s.result.amount }} {{ s.result.symbol }} landed in a one-time address. Only the recipient can find it.</p>
    <div class="tc-summary">
      <div class="tc-row"><span>One-time address</span><a class="tc-mono" :href="`${cfg.explorer}/address/${s.result.stealth}`" target="_blank" rel="noopener">{{ short(s.result.stealth, 6) }} ↗</a></div>
      <div class="tc-row"><span>Transaction</span><a class="tc-mono" :href="`${cfg.explorer}/tx/${s.result.tx}`" target="_blank" rel="noopener">{{ short(s.result.tx, 6) }} ↗</a></div>
    </div>
    <button class="tc-btn" type="button" @click="resetSendResult">Send another</button>
  </section>
  <section v-else class="tc-card" aria-labelledby="tc-send-head">
    <span class="tc-label">Send privately</span>
    <h1 id="tc-send-head">Pay a link, <span class="tc-faint">not a wallet.</span></h1>
    <p class="tc-lead">Paste a Receiva link or the recipient's wallet address. A fresh one-time address is made for this payment only.</p>
    <div v-if="s.req" class="tc-req">
      <span class="tc-label">Payment request</span>
      <b v-if="s.req.memo">{{ s.req.memo }}</b>
      <span v-if="s.req.amount" class="tc-mono">Requested {{ s.req.amount }} {{ s.asset.symbol }}</span>
      <small>The note comes from the link you opened. It is not written on-chain.</small>
    </div>
    <form class="tc-form" @submit.prevent="submit" autocomplete="off">
      <div class="tc-field">
        <label for="to">Recipient</label>
        <input id="to" class="tc-input tc-mono" placeholder="receiva.xyz/pay/0x… or 0x…" :value="s.to" spellcheck="false" @input="setSendTo($event.target.value)">
        <div class="tc-resolve">
          <span v-if="s.resolved" :class="resolveClass">{{ s.resolved.text }}</span>
        </div>
      </div>
      <div class="tc-field">
        <div class="tc-field__lab"><span>Amount</span><span v-if="app.account && s.balance != null">Balance <span class="tc-num">{{ fmtAmount(s.balance, s.asset.decimals) }}</span> · <button type="button" class="tc-max" @click="setMax">Max</button></span></div>
        <div class="tc-amount">
          <input class="tc-input" inputmode="decimal" aria-label="Amount" placeholder="0.00" :value="s.amount" @input="onAmount">
          <button type="button" class="tc-asset-btn" @click="pickAsset">
            <AssetIcon :asset="s.asset" /><span>{{ s.asset.symbol }}</span><span aria-hidden="true">▾</span>
          </button>
        </div>
      </div>
      <div class="tc-summary">
        <div class="tc-row"><span>Recipient wallet on-chain</span><span class="tc-v tc-good">Hidden</span></div>
        <div class="tc-row"><span>You pay to</span><span class="tc-v tc-mono">new one-time address</span></div>
        <div v-if="isToken" class="tc-row"><span>Withdraw gas for recipient</span><span class="tc-v tc-num">{{ cfg.gasTipEth }} ETH</span></div>
        <div class="tc-row"><span>Receiva fee</span><span class="tc-v">None</span></div>
      </div>
      <div v-if="isToken" class="tc-stepper">
        <span :class="{ on: s.step === 1, done: s.step > 1 }"><b>1</b>Approve</span><i></i><span :class="{ on: s.step === 2, done: s.step > 2 }"><b>2</b>Send privately</span>
      </div>
      <button class="tc-btn tc-btn--go tc-btn--block" type="submit" :disabled="!routerReady || s.busy">
        {{ label }} <span class="tc-btn__arrow">→</span>
      </button>
      <p class="tc-note" :class="{ bad: !!s.error }">{{ s.error || 'Amounts and your wallet stay public. Only the link between this payment and the recipient is hidden.' }}</p>
    </form>
  </section>
</template>
