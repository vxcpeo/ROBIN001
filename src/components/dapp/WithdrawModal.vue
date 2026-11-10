<script setup>
import { ref, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import { app, withdrawItem } from '../../lib/store.js';
import { fmtAmount } from '../../lib/chain.js';

const props = defineProps({ item: { type: Object, required: true } });
const emit = defineEmits(['close']);
const dest = ref('');
const note = ref('Tip: withdrawing to your public wallet links this payment back to you.');
const noteClass = ref('tc-note');
const steps = ref([]);
const classes = ref([]);
const busy = ref(false);
const error = ref('');
const amt = computed(() => props.item.kind === 'eth' ? props.item.eth : props.item.balance);

function onDest() {
  const v = dest.value.trim();
  if (app.account && v.toLowerCase() === app.account.toLowerCase()) {
    noteClass.value = 'tc-note warn';
    note.value = 'This is your connected public wallet. The withdrawal will link this payment to it. Use a fresh wallet to stay hidden.';
  } else {
    noteClass.value = 'tc-note';
    note.value = 'Tip: withdrawing to your public wallet links this payment back to you.';
  }
}

async function go() {
  if (!dest.value.trim()) return;
  busy.value = true;
  error.value = '';
  await withdrawItem(props.item, dest.value.trim(), {
    start: () => { steps.value = props.item.kind === 'token' ? [`Send ${props.item.token.symbol}`, 'Sweep leftover ETH'] : ['Send ETH']; classes.value = []; },
    progress: (s) => { steps.value = s; },
    mark: (i, cls) => { classes.value[i] = cls; },
    done: () => { busy.value = false; emit('close'); },
    error: (msg) => { busy.value = false; error.value = msg; note.value = msg; noteClass.value = 'tc-note bad'; },
  });
}
</script>

<template>
  <BaseModal @close="$emit('close')">
    <h3>Withdraw {{ fmtAmount(amt, item.token.decimals) }} {{ item.token.symbol }}</h3>
    <p>Signed in this browser with the one-time key. Network fee is paid from the ETH inside this address.</p>
    <div class="tc-field">
      <label for="dest">Send to</label>
      <input id="dest" v-model="dest" class="tc-input tc-mono" placeholder="0x… (a fresh wallet keeps you hidden)" spellcheck="false" @input="onDest">
    </div>
    <p :class="noteClass" style="margin:-6px 0 16px">{{ note }}</p>
    <ul v-if="steps.length" class="tc-prog">
      <li v-for="(s, i) in steps" :key="s" :class="classes[i]">{{ s }}</li>
    </ul>
    <button class="tc-btn tc-btn--go tc-btn--block" type="button" :disabled="busy" @click="go">
      {{ busy ? 'Withdrawing…' : 'Withdraw' }} <span class="tc-btn__arrow">→</span>
    </button>
  </BaseModal>
</template>
