import { icon } from '../icon/icon.js';

// 列表 List —— items: { title, desc, meta, iconName, selected }
export function renderList({ items = [] } = {}) {
  return `<div class="c-list">${items.map(it => `
    <div class="c-list__item${it.selected ? ' c-list__item--selected' : ''}">
      ${it.iconName ? icon(it.iconName) : ''}
      <div class="c-list__text">
        <div class="c-list__title">${it.title}</div>
        ${it.desc ? `<div class="c-list__desc">${it.desc}</div>` : ''}
      </div>
      ${it.meta ? `<div class="c-list__meta">${it.meta}</div>` : ''}
    </div>`).join('')}</div>`;
}

// 事件委托：点击 .c-list__item → 清兄弟 selected 类 → 自身加 selected
export function mountList(root) {
  root.addEventListener('click', (e) => {
    const item = e.target.closest('.c-list__item');
    if (!item || !root.contains(item)) return;
    item.parentElement.querySelectorAll('.c-list__item--selected')
      .forEach(el => el.classList.remove('c-list__item--selected'));
    item.classList.add('c-list__item--selected');
  });
}
