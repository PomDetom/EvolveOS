import { icon } from '../icon/icon.js';

// 标签 Tag —— closable 时渲染可关闭 ×
export function renderTag({ label, closable = false } = {}) {
  return `<span class="c-tag">${label}${
    closable ? `<button class="c-tag__close" aria-label="移除标签">${icon('close', 12)}</button>` : ''
  }</span>`;
}

// 点击 × 移除整个标签
export function mountTag(root) {
  root.addEventListener('click', (e) => {
    const close = e.target.closest('.c-tag__close');
    if (!close || !root.contains(close)) return;
    close.closest('.c-tag').remove();
  });
}
