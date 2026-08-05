import { renderButton } from '../button/button.js';
import { icon } from '../icon/icon.js';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 渲染对话框结构（含遮罩）。事件与生命周期由 openDialog 管理。
 */
export function renderDialog({ title, content, confirmLabel = '确定', cancelLabel = '取消', danger = false } = {}) {
  return `
  <div class="c-dialog__mask">
    <div class="c-dialog" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="c-dialog__header"><h3>${title}</h3>
        <button class="c-dialog__close" data-action="cancel" aria-label="关闭" type="button">${icon('close', 16)}</button></div>
      <div class="c-dialog__body">${content}</div>
      <div class="c-dialog__footer">
        ${renderButton({ label: cancelLabel, variant: 'ghost' })}
        ${renderButton({ label: confirmLabel, variant: danger ? 'danger' : 'primary' })}
      </div>
    </div>
  </div>`;
}

/**
 * 打开对话框，返回 Promise<boolean>（确认 → true；取消/遮罩/Esc → false）。
 * 焦点圈定：打开时聚焦关闭按钮，Tab/Shift+Tab 在对话框内循环。
 */
export function openDialog(opts) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    mask.innerHTML = renderDialog(opts);
    const dialog = mask.querySelector('.c-dialog');

    const done = (ok) => {
      document.removeEventListener('keydown', onKey);
      mask.remove();
      resolve(ok);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { done(false); return; }
      if (e.key !== 'Tab') return;
      // 焦点圈定：Tab / Shift+Tab 在对话框内循环
      const focusables = [...dialog.querySelectorAll(FOCUSABLE)]
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    mask.querySelectorAll('[data-action="cancel"]').forEach((b) =>
      b.addEventListener('click', () => done(false)));
    mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', () => done(false));
    mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', () => done(true));
    mask.addEventListener('click', (e) => { if (e.target === mask) done(false); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    dialog.querySelector('.c-dialog__close').focus();
  });
}
