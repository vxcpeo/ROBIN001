<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import BaseModal from './BaseModal.vue';
import AssetIcon from './AssetIcon.vue';
import { ABI, ETH, STOCKS, ethers, readProvider, runtime, tokenInfo, niceError } from '../../lib/chain.js';
import { assetList } from '../../lib/store.js';
import { short } from '../../lib/ui.js';

const emit = defineEmits(['close', 'select']);
const query = ref('');
const search = ref(null);
const error = ref('');
const all = computed(() => assetList());
const hits = computed(() => {
  const q = query.value.trim().toLowerCase();
  return all.value.filter((a) => !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.address.toLowerCase() === q).slice(0, 80);
});
const custom = computed(() => {
  const q = query.value.trim();
  return !hits.value.length && ethers.isAddress(q) ? q : '';
});

async function pick(a) {
  try { emit('select', a); }
  catch (e) { error.value = niceError(e); }
}
async function pickCustom() {
  try {
    const a = await tokenInfo(custom.value);
    emit('select', a);
  } catch (e) { error.value = niceError(e); }
}
onMounted(() => nextTick(() => search.value?.focus()));
</script>

<template>
  <BaseModal @close="$emit('close')">
    <h3>Choose an asset</h3>
    <p>ETH, Robinhood stock tokens, or any ERC-20 by address.</p>
    <input ref="search" v-model="query" class="tc-input tc-asset-search" placeholder="Search NVDA, Tesla… or paste 0x token address" spellcheck="false">
    <div class="tc-assets-list">
      <button v-for="a in hits" :key="a.address" class="tc-asset-item" type="button" @click="pick(a)">
        <AssetIcon :asset="a" />
        <span class="nm"><b>{{ a.symbol }}</b><small>{{ a.name }}</small></span>
      </button>
      <button v-if="custom" class="tc-asset-item" type="button" @click="pickCustom">
        <span class="tc-tok">?</span>
        <span class="nm"><b>Custom token</b><small class="tc-mono">{{ short(custom, 6) }}</small></span>
      </button>
      <div v-if="!hits.length && !custom" class="tc-empty">No match.</div>
    </div>
    <p v-if="error" class="tc-note bad">{{ error }}</p>
  </BaseModal>
</template>
