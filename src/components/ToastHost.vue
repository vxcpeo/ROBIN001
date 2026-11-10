<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

const msg = ref('');
const show = ref(false);
let timer;

function onToast(e) {
  msg.value = e.detail;
  show.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (show.value = false), 2000);
}
onMounted(() => window.addEventListener('receiva:toast', onToast));
onBeforeUnmount(() => window.removeEventListener('receiva:toast', onToast));
</script>

<template>
  <div class="tc-toast" :class="{ show }" role="status" aria-live="polite">{{ msg }}</div>
</template>
