import { icon } from '../icon/icon.js';

let wrap;

/**
 * 全局消息提示。容器 .c-toast-wrap 固定于右下角（--z-toast），
 * 每条 .c-toast 从底部滑入（--ease-spring），duration 后淡出移除。
 * @param {string} message 文案（按文本插入，防注入）
 * @param {{ variant?: 'default'|'success'|'warning'|'danger'|'info', duration?: number }} opts
 * @returns {HTMLElement} 单条 toast 元素（可提前手动 remove）
 */
export function toast(message, { variant = 'default', duration = 2500 } = {}) {
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'c-toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `c-toast c-toast--${variant}`;
  const iconEl = document.createElement('span');
  iconEl.innerHTML = icon('info', 16);
  const text = document.createElement('span');
  text.textContent = message;
  el.append(iconEl, text);
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220); // 与 transition 时长一致（--dur-base 名义值）
  }, duration);
  return el;
}
