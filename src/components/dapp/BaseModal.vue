<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['close']);
const dialog = ref(null);
function onBackdrop(e) { if (e.target === dialog.value) emit('close'); }
onMounted(() => { if (dialog.value && !dialog.value.open) dialog.value.showModal(); });
onBeforeUnmount(() => { if (dialog.value?.open) dialog.value.close(); });
</script>

<template>
  <dialog ref="dialog" class="tc-modal" @click="onBackdrop" @cancel.prevent="emit('close')">
    <div class="tc-modal__body">
      <button class="tc-modal__close" aria-label="Close" type="button" @click="emit('close')">✕</button>
      <slot />
    </div>
  </dialog>
</template>
