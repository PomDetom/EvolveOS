// 模式解析（Task B1-4，模式简化）：只返回 'app'|'strip' —— 显式 ?mode=app|strip 优先；
// 无参数 / 非法值 / ?mode=docs → 一律 'app'（浏览器与 Tauri 一致；docs 渲染已删除）。
// 纯函数 —— 不读全局；hasTauri 由调用方（main.js 探测 window.__TAURI__）注入，便于单测。
// params 为 URLSearchParams 或等价对象（含字符串 '?mode=...'）。
export function resolveMode(params, hasTauri) {
  const sp = toSearchParams(params);
  const mode = sp?.get('mode') ?? null;
  if (mode === 'app' || mode === 'strip') return mode;
  return 'app'; // 无参数 / 非法 / docs → 一律应用壳
}

/** 归一化 params 为 URLSearchParams（null/undefined → null，等价对象/字符串兜底） */
function toSearchParams(params) {
  if (params == null) return null;
  if (params instanceof URLSearchParams) return params;
  if (typeof params === 'string') return new URLSearchParams(params);
  if (typeof params.get === 'function') return params;
  return new URLSearchParams(params);
}
