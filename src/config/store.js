import { DEFAULTS } from './defaults.js';

export const KEY = 'ui-design-config';
const listeners = new Set();
// Task I4 Step 2（规格 §13）：localStorage 不可用（隐私模式）时一次性通知 UI 层。
// store 保持纯配置层 —— 只发事件，不依赖任何 UI 模块；toast 由 main.js 注册接线。
const storageErrorListeners = new Set();
let storageErrorReported = false; // 模块级 flag：同会话只提示一次

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
  } catch {
    // 隐私模式：仅内存生效；首次写失败起通知一次（后续失败静默）
    if (!storageErrorReported) {
      storageErrorReported = true;
      storageErrorListeners.forEach((fn) => fn());
    }
  }
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 存储写失败回调（一次性触发）—— UI 层（main.js）注册 toast，配置层不感知 UI */
export function onStorageError(fn) {
  storageErrorListeners.add(fn);
  return () => storageErrorListeners.delete(fn);
}

/** 广播配置变更（不写入存储）—— 重置等绕过 saveConfig 的路径用，语义与 saveConfig 通知一致 */
export function notify(cfg) {
  listeners.forEach((fn) => fn(cfg));
}
