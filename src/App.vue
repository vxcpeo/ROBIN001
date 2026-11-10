<script setup>
import ToastHost from './components/ToastHost.vue';
</script>

<template>
  <div class="tc-root">
    <div class="tc-status" aria-hidden="true">
      <span class="tc-status__dots"><i></i><i></i><i></i></span>
      <img class="tc-status__mark" src="/assets/receiva-mark.svg" alt="">
      <span class="tc-status__scan"></span>
      <span class="tc-status__right">
        <span class="tc-status__glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></svg>
        </span>
        <span class="tc-status__glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 15l4-4 3 3 5-6 4 4" /><path d="M4 20h16" /></svg>
        </span>
        <span class="tc-status__glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
        </span>
        <span class="tc-status__pulse"></span>
      </span>
    </div>
    <RouterView />
    <ToastHost />
  </div>
</template>
