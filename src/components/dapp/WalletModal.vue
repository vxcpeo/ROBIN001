<script setup>
import BaseModal from './BaseModal.vue';

defineProps({ wallets: { type: Array, default: () => [] } });
defineEmits(['close', 'pick']);
</script>

<template>
  <BaseModal @close="$emit('close')">
    <h3>Connect a wallet</h3>
    <p>Receiva works with any EVM wallet on Robinhood Chain.</p>
    <div v-if="wallets.length" class="tc-wallets">
      <button v-for="(w, i) in wallets" :key="w.info.rdns" class="tc-wallet" type="button" @click="$emit('pick', w)">
        <img v-if="w.info.icon" :src="w.info.icon" alt="">
        <span v-else class="tc-tok">W</span>
        <span>{{ w.info.name }}</span>
      </button>
    </div>
    <div v-else class="tc-empty">No wallet found in this browser.<br>Install MetaMask, Rabby or Phantom, then reload.</div>
    <p class="tc-note">Phantom users: enable Robinhood Chain in Settings → Active Networks.</p>
  </BaseModal>
</template>
