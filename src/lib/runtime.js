// Network config and API helpers. Static fallbacks keep the page complete when
// the optional indexer is not running locally.
const json = (path, options) => fetch(path, { cache: 'no-store', ...options }).then((r) => {
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
});

export async function loadRuntime() {
  const [config, live] = await Promise.all([
    json('/config.json'),
    json('/live.json').catch(() => ({ ca: '', launchAt: '2026-10-19T13:00:00Z' })),
  ]);
  return { config, live };
}

export async function apiStats() {
  try { return await json('/api/stats'); }
  catch { return json('/fallback/stats.json'); }
}

export async function apiToken() {
  try { return await json('/api/token'); }
  catch { return json('/fallback/token.json'); }
}

export async function apiAnnouncements(since = 0) {
  try { return await json(`/api/announcements?since=${since}`); }
  catch {
    const data = await json('/fallback/announcements.json');
    if (since === 0) return data;
    return { ...data, items: data.items.slice(since), total: data.total };
  }
}

export const fmtUsd = (v) => (v == null ? '—' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v.toFixed(2));
export const fmtNum = (v, d = 0) => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
export const fmtEth = (v) => (v == null ? '—' : v >= 1 ? v.toFixed(3) : v >= 0.01 ? v.toFixed(4) : v.toFixed(5));
export function ago(t) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t));
  return s < 60 ? s + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd';
}
