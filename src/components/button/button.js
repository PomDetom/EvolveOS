import { icon } from '../icon/icon.js';

export function renderButton({ label, variant = 'primary', size = 'md', iconName = null, disabled = false, title = '' } = {}) {
  const cls = ['c-btn', `c-btn--${variant}`];
  if (size !== 'md') cls.push(`c-btn--${size}`);
  if (disabled) cls.push('c-btn--disabled');
  return `<button class="${cls.join(' ')}"${disabled ? ' disabled' : ''}${title ? ` title="${title}"` : ''}>
    ${iconName ? icon(iconName) : ''}${label}</button>`;
}
