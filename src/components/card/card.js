// 卡片 Card —— glass 为 true 时切换玻璃材质
export function renderCard({ title, content, footer, glass = false } = {}) {
  const cls = ['c-card'];
  if (glass) cls.push('c-card--glass');
  return `<div class="${cls.join(' ')}">
    ${title ? `<div class="c-card__title">${title}</div>` : ''}
    ${content ? `<div class="c-card__body">${content}</div>` : ''}
    ${footer ? `<div class="c-card__footer">${footer}</div>` : ''}
  </div>`;
}
