// 密码管理器纯函数（可单测，无 DOM 依赖；localStorage 需 jsdom）。
export const VAULT_PATH_KEY = 'pwm.vaultPath';
export const REMEMBER_PATH_KEY = 'pwm.rememberPath';

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export function matchesQuery(entry, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return true;
  return (
    String(entry.name).toLowerCase().includes(q) ||
    String(entry.url || '').toLowerCase().includes(q) ||
    String(entry.username).toLowerCase().includes(q)
  );
}

export function matchesAnyTag(entry, activeTags) {
  const tags = activeTags || [];
  if (!tags.length) return true;
  const lower = (list) => list.map((t) => t.toLowerCase());
  const et = lower(entry.tags || []);
  return lower(tags).some((t) => et.includes(t));
}

export function filterEntries(entries, { query = '', activeTags = [] } = {}) {
  return (entries || []).filter((e) => matchesQuery(e, query) && matchesAnyTag(e, activeTags));
}

export function allTags(entries) {
  const set = new Set();
  (entries || []).forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'));
}

export function sortByName(entries) {
  return [...(entries || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'));
}

export function splitTags(str) {
  return String(str || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
}

export function isRememberPathEnabled() {
  return localStorage.getItem(REMEMBER_PATH_KEY) !== 'false';
}
