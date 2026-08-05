// NavigationWheel 几何纯函数 —— 视口规格：itemHeight=52px, gap=12px（--navwheel-item-h/--navwheel-gap）
// 全部纯函数，供 nav-wheel.js 与单测共用；坐标系：内容从 y=0 起（不含容器 padding/margin）。

export function itemCenterY(index, itemHeight, gap) {
  return index * (itemHeight + gap) + itemHeight / 2;
}
export function scrollTopForCenter(index, itemHeight, gap, viewportHeight) {
  return itemCenterY(index, itemHeight, gap) - viewportHeight / 2;
}
export function findNearestIndex(scrollTop, count, itemHeight, gap, viewportHeight) {
  // 坐标系：内容坐标（不含容器 padding/margin；nav-wheel.js 调用处传 list.scrollTop - CONTENT_TOP）。
  // 旧 scrollTop===0 守卫是「原始 scrollTop」语义：补偿坐标下 0 并非初始位置（初始 = scrollTopForCenter(0)，
  // 负值），会把「视口中心在第 2~3 项处」误判为第 0 项 → 拖拽/惯性后吸附错误。公式在补偿坐标下
  // 精确（单测：scrollTopForCenter(i) → i），初始位置处自然得 0，两端由 clamp 兜底，故无守卫。
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
