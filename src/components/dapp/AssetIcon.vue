<script setup>
import { computed } from 'vue';
import { runtime } from '../../lib/chain.js';

const props = defineProps({ asset: { type: Object, required: true } });
const isReceiva = computed(() => runtime.live.ca && props.asset.address?.toLowerCase() === runtime.live.ca.toLowerCase());
</script>

<template>
  <span v-if="asset.address === 'eth'" class="tc-tok tc-tok--eth">ETH</span>
  <span v-else-if="isReceiva" class="tc-tok tc-tok--brand"><img src="/assets/receiva-mark.svg" alt=""></span>
  <span v-else class="tc-tok">{{ asset.symbol.slice(0, 4) }}</span>
</template>
