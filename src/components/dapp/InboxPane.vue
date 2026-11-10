<script setup>
import { computed, onMounted } from 'vue';
import AccountGate from './AccountGate.vue';
import AssetIcon from './AssetIcon.vue';
import { fmtAmount, timeAgo } from '../../lib/chain.js';
import { app, openModal, syncInbox } from '../../lib/store.js';
import { short } from '../../lib/ui.js';

const ib = app.inbox;
const pct = computed(() => ib.total ? Math.round((ib.scanned / ib.total) * 100) : (ib.syncing ? 5 : 100));
const items = computed(() => [...ib.items].sort((a, b) => b.t - a.t));
const dust = 2000000000000n;

function amountView(it) {
  const has = it.balance > 0n || it.eth > dust;
  const leftoverOnly = it.kind === 'token' && it.balance === 0n && has;
  const amt = it.kind === 'eth' || leftoverOnly ? it.eth : it.balance;
  const sym = leftoverOnly ? 'ETH left for gas' : it.token.symbol;
  const shown = it.loaded ? fmtAmount(has ? amt : it.amount, leftoverOnly ? 18 : it.token.decimals) : '…';
  return { has, leftoverOnly, sym, shown };
}

onMounted(() => syncInbox());
</script>

<template>
  <AccountGate v-if="!app.account || !app.keys" title="Inbox" lead="Find what was sent to your hood." />
  <section v-else class="tc-card" aria-labelledby="tc-inbox-head">
    <span class="tc-label">Inbox</span>
    <h1 id="tc-inbox-head">Only you can see this list.</h1>
    <p class="tc-lead">Your browser downloads every public announcement and checks each one with your viewing key. The server never learns which are yours.</p>
    <div class="tc-scan"><div class="tc-scan__bar"><i :style="{ width: pct + '%' }"></i></div></div>
    <div class="tc-scan">
      <span v-if="ib.err" class="tc-note bad">{{ ib.err }}</span>
      <span v-else>{{ ib.syncing ? 'Scanning' : 'Scanned' }} {{ ib.scanned.toLocaleString('en-US') }} announcements on Robinhood Chain · {{ items.length }} yours</span>
    </div>
    <div class="tc-inbox">
      <template v-if="items.length">
        <div v-for="it in items" :key="it.addr" class="tc-inbox__item" :class="{ 'tc-inbox__item--empty': it.loaded && !amountView(it).has }">
          <AssetIcon :asset="it.token" />
          <div>
            <div class="tc-inbox__amt">{{ amountView(it).shown }} <span>{{ amountView(it).sym }}</span></div>
            <div class="tc-inbox__sub">{{ timeAgo(it.t) }} · <a :href="`https://robinhoodchain.blockscout.com/address/${it.addr}`" target="_blank" rel="noopener" class="tc-mono">{{ short(it.addr) }}</a>{{ it.loaded && !amountView(it).has ? ' · withdrawn' : '' }}</div>
          </div>
          <button v-if="it.loaded && amountView(it).has" class="tc-btn tc-btn--sm tc-btn--go" type="button" @click="openModal({ type: 'withdraw', item: it })">Withdraw</button>
          <span v-else></span>
        </div>
      </template>
      <div v-else class="tc-empty">
        <img src="/assets/receiva-mark.svg" alt=""><br>
        {{ ib.syncing ? 'Looking under every hood…' : 'Nothing yet. Share your link from Receive.' }}
      </div>
    </div>
  </section>
</template>
