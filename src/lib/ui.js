// Shared design tokens, toasts, and formatting helpers.
export const short = (a, n = 4) => (a ? a.slice(0, 2 + n) + '…' + a.slice(-n) : '');

export function toast(msg) {
  window.dispatchEvent(new CustomEvent('receiva:toast', { detail: String(msg) }));
}

export async function copy(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
  } catch {
    toast('Copy failed — select and copy manually');
  }
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (t) => t * t * (3 - 2 * t);
