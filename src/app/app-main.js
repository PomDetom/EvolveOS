// 应用壳入口（Task A3 实现）—— 本任务仅动态 import 占位，保证 Vite build 可解析目标文件。
// main.js 在 ?mode=app / Tauri 探测命中时动态 import 本模块并调用 mountAppMode(root)。
export function mountAppMode(root) {
  // eslint-disable-next-line no-console
  console.info('[app] Task A3 实现：应用壳骨架（双窗口级联 + 标题栏上下文 + 7 模块）');
}
