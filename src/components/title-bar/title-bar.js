import { icon } from '../icon/icon.js';

// data-tauri-drag-region：Tauri 场景下由系统接管拖动窗口，
// 页面内模拟不做真实拖动（测试契约要求挂根元素，drag 区同时提供）
export function renderTitleBar({ title = 'UI Design System', iconName = 'palette' } = {}) {
  return `
  <div class="c-titlebar" data-tauri-drag-region>
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
