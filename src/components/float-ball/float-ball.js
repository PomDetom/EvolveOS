import { icon } from '../icon/icon.js';

// 悬浮球：40px 圆形玻璃球（accent 渐变 + 光晕），hover 上浮 2px + 光晕增强。
export function renderFloatBall({ iconName = 'clipboard', tooltip = '' } = {}) {
  return `<button class="c-float-ball" type="button" aria-label="${tooltip}" title="${tooltip}">
    <span class="c-float-ball__glow" aria-hidden="true"></span>${icon(iconName, 20)}</button>`;
}

export function mountFloatBall(root, { onExpand = () => {} } = {}) {
  const ball = root.classList.contains('c-float-ball')
    ? root : root.querySelector('.c-float-ball');
  ball.addEventListener('click', onExpand);
}
