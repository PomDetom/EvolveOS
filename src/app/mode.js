// 模式解析（Task A1，规格：模式入口）：决定浏览器进 docs / Tauri 进应用壳 / ?mode=strip 悬浮条。
// 纯函数 —— 不读全局；hasTauri 由调用方（main.js 探测 window.__TAURI__）注入，便于单测。
// 规则：显式 ?mode=app|docs|strip 优先；无参数 + hasTauri → 'app'；无参数浏览器 → 'docs'；非法值回落 'docs'。
// params 为 URLSearchParams 或等价对象（含字符串 '?mode=...'）。
export function resolveMode(params, hasTauri) {
  const sp = toSearchParams(params);
  const mode = sp?.get('mode') ?? null;
  if (mode === 'app' || mode === 'docs' || mode === 'strip') return mode;
  // 显式参数存在但非法 → 回落 docs（不落入 Tauri 探测，避免 bogus 参数把桌面端切进 app）
  if (mode != null) return 'docs';
  return hasTauri ? 'app' : 'docs';
}

/** 归一化 params 为 URLSearchParams（null/undefined → null，等价对象/字符串兜底） */
function toSearchParams(params) {
  if (params == null) return null;
  if (params instanceof URLSearchParams) return params;
  if (typeof params === 'string') return new URLSearchParams(params);
  if (typeof params.get === 'function') return params;
  return new URLSearchParams(params);
}
