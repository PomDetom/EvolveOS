import { icon } from '../icon/icon.js';

/**
 * 渲染气泡（trigger 按钮 + 绝对定位面板）。
 * @param {{ trigger: string, content: string, placement?: 'bottom'|'right' }} opts
 */
export function renderPopover({ trigger, content, placement = 'bottom' } = {}) {
  return `
  <div class="c-popover">
    <button class="c-popover__trigger c-btn c-btn--secondary" aria-expanded="false" type="button">
      ${trigger}${icon('chevron-down', 16)}</button>
    <div class="c-popover__panel c-popover__panel--${placement} glass" aria-hidden="true">${content}</div>
  </div>`;
}

/**
 * 挂载交互：trigger 点击切换开/闭（stopPropagation 避免触发外层 document 关闭监听），
 * document 任意点击（外部）关闭。
 */
export function mountPopover(root) {
  root.querySelectorAll('.c-popover').forEach((wrap) => {
    const trigger = wrap.querySelector('.c-popover__trigger');
    const panel = wrap.querySelector('.c-popover__panel');
    const setOpen = (open) => {
      wrap.classList.toggle('c-popover--open', open);
      trigger.setAttribute('aria-expanded', String(open));
      panel.setAttribute('aria-hidden', String(!open));
    };
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!wrap.classList.contains('c-popover--open'));
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) setOpen(false);
    });
  });
}
