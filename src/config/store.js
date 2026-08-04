import { DEFAULTS } from './defaults.js';

const KEY = 'ui-design-config';
const listeners = new Set();

export function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function getConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return deepMerge(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveConfig(patch) {
  const next = deepMerge(getConfig(), patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* 隐私模式：仅内存生效 */ }
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
