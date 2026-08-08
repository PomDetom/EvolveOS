// FloatStrip 悬浮条入口（Task A5，规格 §5）：body 级独立渲染一个悬浮条实例（token 监测内容），
// 供 Tauri 独立透明窗口接入。main.js 在 ?mode=strip 时动态 import 本模块并调用 mountStripMode()。
// 组件 CSS 随本模块按需加载（docs 模式零冲击：docs 不 import 本模块，样式不进入 docs）。
import { renderFloatStrip, mountFloatStrip, renderTokenMonitor } from '../components/float-strip/float-strip.js';
import '../components/float-strip/float-strip.css';
import { getConfig } from '../config/store.js';
import { applyConfig } from '../config/apply.js';

/** 悬浮窗窗口尺寸（纯函数，可单测）：CSS 像素 → {width,height}（ceil + 至少 1px） */
export function computeFitSize(rect) {
  return {
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height)),
  };
}

export function mountStripMode() {
  applyConfig(getConfig()); // 独立 strip 窗口跟随保存的主题/强调色（Fix 3）
  const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: renderTokenMonitor({
      value: '97.2%',
      status: 'ok',
      trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
    }),
    showRestore: !!win, // 仅 Tauri 独立窗口渲染「恢复主窗」按钮
  });
  document.body.appendChild(root);
  // 恢复主窗按钮接线（Tauri 后台模式：主窗隐藏 → 点此唤回 main show+setFocus）
  const restoreBtn = root.querySelector('.c-strip__restore');
  restoreBtn?.addEventListener('click', () => {
    window.__TAURI__.window.getAllWindows()
      .then((wins) => {
        const main = wins.find((w) => w.label === 'main');
        if (main) { main.show().catch(() => {}); main.setFocus().catch(() => {}); }
      })
      .catch(() => {});
  });
  if (win) {
    // —— Tauri 独立窗口（B4-6）：铺满窗口 + 系统拖拽 + 尺寸贴合 + 位置持久化 ——
    root.classList.add('strip-root--window');
    document.body.style.background = 'transparent'; // 透明窗口：清掉 body 玻璃底（base.css body 背景），避免整窗半透明遮罩
    const strip = root.querySelector('.c-strip');
    const STORAGE_KEY = 'ui-design-strip-pos';
    // 位置恢复
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (Number.isFinite(x) && Number.isFinite(y)) win.setPosition({ x, y }).catch(() => {});
      }
    } catch { /* 损坏存档忽略 */ }
    // 尺寸贴合内容（初始 + 旋转）
    const fit = () => {
      const r = strip.getBoundingClientRect();
      const { LogicalSize } = window.__TAURI__.window;
      const size = computeFitSize(r);
      win.setSize(new LogicalSize(size.width, size.height)).catch(() => {});
      // 诊断（B4 收尾）：确认窗口尺寸与内容一致 + DPI 缩放
      win.outerSize?.().then((os) => {
        win.scaleFactor?.().then((sf) => {
          console.log('[strip] fit', JSON.stringify(size), 'outer', JSON.stringify(os), 'scaleFactor', sf);
        }).catch(() => {});
      }).catch(() => {});
    };
    fit();
    win.onShow?.(() => fit()); // 隐藏窗口可能尚未完成布局，显示后再贴合一次（B4 桌面缺陷修复）
    // 位置持久化（去抖 200ms）
    let saveTimer = null;
    win.onMoved?.(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        win.outerPosition?.().then(({ x, y }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
        }).catch(() => {});
      }, 200);
    });
    mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.hide().catch(() => {}) });
  } else {
    mountFloatStrip(root, { onClose: () => root.remove() });
  }
}
