// 骨架屏 Skeleton —— shimmer 动画只动 background-position（红线）
export function renderSkeleton({ lines = 3 } = {}) {
  const rows = Array.from({ length: lines }, (_, i) => {
    const w = i === lines - 1 ? '60%' : '100%';
    return `<div class="c-skeleton" style="height: 12px; width: ${w}"></div>`;
  });
  return `<div class="c-skeleton__list">${rows.join('')}</div>`;
}
