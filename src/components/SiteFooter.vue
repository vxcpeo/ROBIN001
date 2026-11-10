<script setup>
import { computed } from 'vue';
import Brand from './Brand.vue';
import { runtime } from '../lib/chain.js';

defineProps({ compact: { type: Boolean, default: false } });
const cfg = computed(() => runtime.config);
const ca = computed(() => runtime.live.ca || '');
</script>

<template>
  <div v-if="compact" class="tc-foot tc-foot--slim">
    <p class="tc-foot__note">Receiva is open-source software, not a bank or broker. Unaudited; use at your own risk.</p>
    <div class="tc-foot__word" aria-hidden="true">Receiva</div>
  </div>
  <div v-else class="tc-foot">
    <div class="tc-foot__id">
      <Brand />
      <p>Private receive links on Robinhood Chain.</p>
    </div>
    <div class="tc-foot__col" role="group" aria-label="Product">
      <span class="tc-label">Product</span>
      <a href="/receive">Receive</a>
      <a href="/send">Send</a>
      <a href="/inbox">Inbox</a>
    </div>
    <div class="tc-foot__col" role="group" aria-label="Trust">
      <span class="tc-label">Trust</span>
      <a href="/transparency">Transparency</a>
      <a href="#faq">FAQ</a>
      <a :href="`${cfg.explorer}/address/${cfg.router}?tab=contract`" target="_blank" rel="noopener">Router source</a>
      <a :href="cfg.github" target="_blank" rel="noopener">GitHub</a>
    </div>
    <div class="tc-foot__col" role="group" aria-label="Official links">
      <span class="tc-label">Official links</span>
      <a :href="cfg.x" target="_blank" rel="noopener">X · @receiva_rh</a>
      <a :href="cfg.telegram" target="_blank" rel="noopener">Telegram</a>
      <a :href="cfg.github" target="_blank" rel="noopener">GitHub</a>
      <a :href="ca ? `https://www.ponsfamily.com/launchpad/${ca.toLowerCase()}` : undefined" target="_blank" rel="noopener">Pons</a>
      <a :href="ca ? `https://dexscreener.com/robinhood/${ca.toLowerCase()}` : undefined" target="_blank" rel="noopener">DexScreener</a>
    </div>
    <p class="tc-foot__note">Receiva is open-source software, not a bank or broker. Amounts and senders remain public on-chain. Not financial advice. Unaudited; use at your own risk.</p>
    <div class="tc-foot__word" aria-hidden="true">Receiva</div>
  </div>
</template>
