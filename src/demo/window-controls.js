import { icon } from '../components/icon/icon.js';

// 窗口控制桥（Task I2）：Tauri 环境把 TitleBar 三按钮接真实窗口 API，浏览器环境不绑定。
// - 双通道：`bindWindowControls(api)` 接受注入的 windowApi（测试可注入 mock，
//   Playwright 无法测真实 Tauri API，按计划书「桥接可测」设计）；
//   api 缺省时探测 `window.__TAURI__?.window?.getCurrentWindow()`（withGlobalTauri 全局通道）。
// - 绑定策略：页面上所有 `.c-titlebar` 实例（titlebar-demo / 场景模板 / 组件矩阵）
//   统一绑定 —— 同一 getCurrentWindow() 句柄对每个实例操作同一个主窗口，重复绑定无副作用。
// - 失败静默降级：各 API 调用 .catch 忽略，最大化图标按真实 isMaximized() 状态同步。
// - 浏览器无 API：不绑定（返回 false），mountTitleBar 的演示行为原样保持。
export function bindWindowControls(api) {
  const win = api || probeTauriWindow();
  if (!win) return false;

  document.querySelectorAll('.c-titlebar__control').forEach((btn) => {
    if (btn.classList.contains('c-titlebar__control--min')) {
      btn.addEventListener('click', () => {
        Promise.resolve(win.minimize()).catch(() => {});
      });
    } else if (btn.classList.contains('c-titlebar__control--max')) {
      btn.addEventListener('click', async () => {
        try {
          await win.toggleMaximize();
          // 按真实窗口状态同步图标（与 mountTitleBar 的演示切换同款图标/标记）
          if (typeof win.isMaximized === 'function') {
            const maxed = await win.isMaximized();
            btn.innerHTML = icon(maxed ? 'restore' : 'maximize', 12);
            btn.dataset.maxed = maxed ? '1' : '';
          }
        } catch {
          /* 静默降级：失败时保留按钮当前状态，不抛错 */
        }
      });
    } else if (btn.classList.contains('c-titlebar__control--close')) {
      btn.addEventListener('click', () => {
        Promise.resolve(win.close()).catch(() => {});
      });
    }
  });
  return true;
}

function probeTauriWindow() {
  if (typeof window !== 'undefined' && window.__TAURI__?.window?.getCurrentWindow) {
    return window.__TAURI__.window.getCurrentWindow();
  }
  return null;
}
