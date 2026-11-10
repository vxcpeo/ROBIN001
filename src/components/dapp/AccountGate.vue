<script setup>
import { ref } from 'vue';
import { app, openModal, unlock } from '../../lib/store.js';

defineProps({ title: { type: String, default: 'Receive' }, lead: { type: String, default: 'Get paid without your wallet on-chain.' } });

const unlocking = ref(false);
const error = ref('');

async function doUnlock() {
  unlocking.value = true;
  error.value = '';
  try { await unlock(); }
  catch (e) { error.value = e?.shortMessage || e?.message || String(e); }
  finally { unlocking.value = false; }
}
</script>

<template>
  <div v-if="!app.account" class="tc-card tc-gate">
    <span class="tc-label">{{ title }}</span>
    <h1>{{ lead }}</h1>
    <p class="tc-lead">Connect the wallet you want to be paid in. Receiva never asks for a transaction to look around.</p>
    <button class="tc-btn tc-btn--go" type="button" @click="openModal({ type: 'wallet' })">Connect wallet <span class="tc-btn__arrow">→</span></button>
  </div>
  <div v-else-if="!app.keys" class="tc-card tc-gate">
    <span class="tc-label">{{ title }}</span>
    <h1>Unlock your hood.</h1>
    <p class="tc-lead">One free signature turns your wallet into two private keys: one to find payments, one to move them.</p>
    <ol class="tc-gate-steps">
      <li><b>1</b><span>Your wallet signs a fixed message. No gas, no transaction.</span></li>
      <li><b>2</b><span>Your browser derives the keys from that signature. They never leave this tab.</span></li>
      <li><b>3</b><span>Sign again on any device and the same keys come back.</span></li>
    </ol>
    <button class="tc-btn tc-btn--go" type="button" :disabled="unlocking" @click="doUnlock">
      {{ unlocking ? 'Check your wallet…' : 'Sign to unlock' }} <span class="tc-btn__arrow">→</span>
    </button>
    <p class="tc-note">Use a regular wallet (MetaMask, Rabby, Phantom). Smart-contract wallets may produce different signatures each time.</p>
    <p v-if="error" class="tc-note bad">{{ error }}</p>
  </div>
</template>
