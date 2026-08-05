import { icon } from '../icon/icon.js';
import { renderButton } from '../button/button.js';

// 空状态 EmptyState —— action 为 renderButton 的选项对象
export function renderEmptyState({ iconName, title, desc, action } = {}) {
  return `<div class="c-empty">
    ${iconName ? `<div class="c-empty__icon">${icon(iconName, 32)}</div>` : ''}
    ${title ? `<div class="c-empty__title">${title}</div>` : ''}
    ${desc ? `<div class="c-empty__desc">${desc}</div>` : ''}
    ${action ? `<div class="c-empty__action">${renderButton(action)}</div>` : ''}
  </div>`;
}
