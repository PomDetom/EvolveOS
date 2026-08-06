import { icon } from '../components/icon/icon.js';
import { toast } from '../components/toast/toast.js';

// 窗口控制桥（Task I2 + Task B1-2 浏览器降级）：Tauri 环境把 TitleBar 三按钮接真实窗口 API，
// 浏览器环境降级为提示通道（按钮保留、点击 toast「桌面端生效」、拖拽区轻量反馈）。
// - 双通道：`bindWindowControls(api)` 接受注入的 windowApi（测试可注入 mock，
//   Playwright 无法测真实 Tauri API，按计划书「桥接可测」设计）；
//   api 缺省时探测 `window.__TAURI__?.window?.getCurrentWindow()`（withGlobalTauri 全局通道）。
// - 绑定策略：页面上所有 `.c-titlebar` 实例（titlebar-demo / 场景模板 / 组件矩阵）
//   统一绑定 —— 同一 getCurrentWindow() 句柄对每个实例操作同一个主窗口，重复绑定无副作用。
// - 失败静默降级：各 API 调用 .catch 忽略，最大化图标按真实 isMaximized() 状态同步。
// - 浏览器降级（B1-2）：无 API 时三按钮（min/max/close，不含 --settings 真实功能按钮）
//   click → toast 提示；拖拽区加标记类启用 CSS :active 反馈；返回 'browser' 标记降级态。
export function bindWindowControls(api) {
  const win = api || probeTauriWindow();
  if (!win) return bindBrowserFallback();

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

// 浏览器降级绑定（B1-2）：三窗口控制按钮 click → 桌面端提示 toast；拖拽区加标记类
// 启用 CSS :active 轻量反馈（transform/opacity，红线内）。只绑定 min/max/close ——
// 设置按钮（--settings）在应用壳有真实功能，不劫持。
// 幂等：WeakSet 按按钮元素去重 —— bindWindowControls 可能被多次调用（docs/app 各自入口 +
// 测试注入直调），重复绑定会弹双 toast；拖拽区标记类 classList.add 天然幂等。
const browserBoundButtons = new WeakSet();

function bindBrowserFallback() {
  document.querySelectorAll('.c-titlebar__control').forEach((btn) => {
    const isWindowControl = btn.classList.contains('c-titlebar__control--min')
      || btn.classList.contains('c-titlebar__control--max')
      || btn.classList.contains('c-titlebar__control--close');
    if (!isWindowControl || browserBoundButtons.has(btn)) return;
    browserBoundButtons.add(btn);
    btn.addEventListener('click', () => {
      toast('此功能在桌面端生效', { variant: 'info' });
    });
  });
  document.querySelectorAll('.c-titlebar__drag').forEach((drag) => {
    drag.classList.add('c-titlebar__drag--browser');
  });
  return 'browser';
}

function probeTauriWindow() {
  if (typeof window !== 'undefined' && window.__TAURI__?.window?.getCurrentWindow) {
    return window.__TAURI__.window.getCurrentWindow();
  }
  return null;
}
