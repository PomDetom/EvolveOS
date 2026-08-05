import { icon } from '../icon/icon.js';

// data-tauri-drag-region：Tauri 场景下由系统接管拖动窗口。
// 只挂在 .c-titlebar__drag（最小安全拖区）—— 不挂根元素：整条 .c-titlebar 含三按钮，
// 若挂根元素则按钮 mousedown 会被原生拖拽劫持（真实点击被吞、最小化/最大化后会被
// 拖拽动作立即还原 —— 接入指南 §2 明确此坑；真机验证 I2 实测复现后按指南修正）。
export function renderTitleBar({ title = 'UI Design System', iconName = 'palette' } = {}) {
  return `
  <div class="c-titlebar">
    <div class="c-titlebar__drag" data-tauri-drag-region>
      ${icon(iconName, 16)}<span class="c-titlebar__title">${title}</span>
    </div>
    <div class="c-titlebar__controls">
      <button class="c-titlebar__control c-titlebar__control--min" aria-label="最小化">${icon('minus', 14)}</button>
      <button class="c-titlebar__control c-titlebar__control--max" aria-label="最大化">${icon('maximize', 12)}</button>
      <button class="c-titlebar__control c-titlebar__control--close" aria-label="关闭">${icon('close', 14)}</button>
    </div>
  </div>`;
}

export function mountTitleBar(root) {
  const maxBtn = root.querySelector('.c-titlebar__control--max');
  maxBtn.addEventListener('click', () => {
    maxBtn.innerHTML = maxBtn.dataset.maxed
      ? icon('maximize', 12) : icon('restore', 12);
    maxBtn.dataset.maxed = maxBtn.dataset.maxed ? '' : '1';
  });
}
