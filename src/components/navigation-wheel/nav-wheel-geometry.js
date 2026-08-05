// NavigationWheel 几何纯函数 —— 视口规格：itemHeight=52px, gap=12px（--navwheel-item-h/--navwheel-gap）
// 全部纯函数，供 nav-wheel.js 与单测共用；坐标系：内容从 y=0 起（不含容器 padding/margin）。

export function itemCenterY(index, itemHeight, gap) {
  return index * (itemHeight + gap) + itemHeight / 2;
}
export function scrollTopForCenter(index, itemHeight, gap, viewportHeight) {
  return itemCenterY(index, itemHeight, gap) - viewportHeight / 2;
}
export function findNearestIndex(scrollTop, count, itemHeight, gap, viewportHeight) {
  // scrollTop 0 = 初始位置：容器顶部 padding 使首项居中（见 nav-wheel.js 动态 padding），故选中第 0 项
  if (scrollTop === 0) return 0;
  const viewCenter = scrollTop + viewportHeight / 2;
  const i = Math.round((viewCenter - itemHeight / 2) / (itemHeight + gap));
  return Math.max(0, Math.min(count - 1, i));
}
export function focalScale(offset, viewportHeight, maxScale = 1.15, falloff = 1.3) {
  // falloff 默认 1.3：保证 offset=viewH/2 处二次衰减到 < 1.01（单测约束；1.4 会得到 1.012）
  const t = Math.min(1, Math.abs(offset) / (viewportHeight / 2 * falloff));
  return 1 + (maxScale - 1) * (1 - t) ** 2;
}
export function focalOpacity(offset, viewportHeight, falloff = 1.4) {
  const t = Math.min(1, Math.abs(offset) / (viewportHeight / 2 * falloff));
  return 1 - 0.65 * t;
}
