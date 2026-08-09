import { icon } from '../icon/icon.js';

// 悬浮球：44px 圆形玻璃球（玻璃底 + accent 图标），hover 上浮 2px + 中性投影（B6-2 去光晕）。
export function renderFloatBall({ iconName = 'clipboard', tooltip = '' } = {}) {
  return `<button class="c-float-ball" type="button" aria-label="${tooltip}" title="${tooltip}">${icon(iconName, 20)}</button>`;
}

export function mountFloatBall(root, { onExpand = () => {} } = {}) {
  const ball = root.classList.contains('c-float-ball')
    ? root : root.querySelector('.c-float-ball');
  ball.addEventListener('click', onExpand);
}
