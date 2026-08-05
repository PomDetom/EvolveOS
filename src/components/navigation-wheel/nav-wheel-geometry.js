// NavigationWheel 几何纯函数 —— 视口规格：itemHeight=52px, gap=12px（--navwheel-item-h/--navwheel-gap）
// 全部纯函数，供 nav-wheel.js 与单测共用；坐标系：内容从 y=0 起（不含容器 padding/margin）。
// Task A2：选中锚点从 50% 中心改为 38.2% 黄金比例（anchorRatio，默认 0.382），并做主轴方向参数化 ——
// 几何层方向无关（只有「主轴长度」语义），horizontal 渲染仅需 scrollTop→scrollLeft、clientHeight→clientWidth
// 代入同一套公式（方向等价性由单测覆盖）。anchorRatio=0.5 即恢复旧中心语义（向后兼容基准）。

export function anchorY(index, itemHeight, gap, viewportLength, anchorRatio = 0.382) {
  // 项锚点位置（主轴坐标）= 项中心；viewportLength/anchorRatio 为签名统一（与 scrollTopForAnchor 同系），
  // 值只取决于项几何 —— 该位置正是 scrollTopForAnchor 对齐到视口锚线（viewportLength*anchorRatio）的点。
  return index * (itemHeight + gap) + itemHeight / 2;
}
export function scrollTopForAnchor(index, itemHeight, gap, viewportLength, anchorRatio = 0.382) {
  return anchorY(index, itemHeight, gap) - viewportLength * anchorRatio;
}
export function findNearestIndex(scrollTop, count, itemHeight, gap, viewportLength, anchorRatio = 0.382) {
  // 坐标系：内容坐标（不含容器 padding/margin；nav-wheel.js 调用处传 list.scrollTop - CONTENT_TOP）。
  // 旧 scrollTop===0 守卫是「原始 scrollTop」语义：补偿坐标下 0 并非初始位置（初始 = scrollTopForAnchor(0)，
  // 负值），会把「视口锚线在第 2~3 项处」误判为第 0 项 → 拖拽/惯性后吸附错误。公式在补偿坐标下
  // 精确（单测：scrollTopForAnchor(i) → i），初始位置处自然得 0，两端由 clamp 兜底，故无守卫。
  const viewAnchor = scrollTop + viewportLength * anchorRatio;
  const i = Math.round((viewAnchor - itemHeight / 2) / (itemHeight + gap));
  return Math.max(0, Math.min(count - 1, i));
}
export function focalScale(offset, viewportLength, maxScale = 1.15, falloff = 1.3) {
  // falloff 默认 1.3：保证 offset=viewportLength/2 处二次衰减到 < 1.01（单测约束；1.4 会得到 1.012）。
  // offset 相对「主轴锚线」（调用方按 viewportLength*anchorRatio 计算），峰值在锚点而非视口中心。
  const t = Math.min(1, Math.abs(offset) / (viewportLength / 2 * falloff));
  return 1 + (maxScale - 1) * (1 - t) ** 2;
}
export function focalOpacity(offset, viewportLength, falloff = 1.4) {
  const t = Math.min(1, Math.abs(offset) / (viewportLength / 2 * falloff));
  return 1 - 0.65 * t;
}
