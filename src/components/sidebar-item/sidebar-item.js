import { icon } from '../icon/icon.js';

// 侧边栏项 SidebarItem（Task 15 内建）：静态框形态 —— icon + 名称 + 选中态。
// 样式仿 navwheel item，但为静态展示形态（无 focal 变形 / 无滑动交互）。
export function renderSidebarItem({ label, iconName = null, active = false } = {}) {
  return `
  <div class="c-sidebar-item${active ? ' c-sidebar-item--active' : ''}">
    ${iconName ? `<span class="c-sidebar-item__icon">${icon(iconName, 18)}</span>` : ''}
    <span class="c-sidebar-item__label">${label}</span>
  </div>`;
}
