// 悬浮窗贴边收起几何（ui/strip-edge-collapse）：纯函数，可单测。
// 坐标口径：窗口 rect 与 monitor bounds 均为物理像素（outerPosition/outerSize 与 currentMonitor 一致）。
export const DOCK_TOLERANCE = 6; // 贴靠容差（px）：边与 monitor 边 ≤ 此值且完整可见 = 贴边
export const SLIVER = 20;        // 收起后屏幕内可见窄条宽度（px）

export function edgeDistances(rect, monitor) {
  return {
    top: rect.y - monitor.y,
    bottom: (monitor.y + monitor.height) - (rect.y + rect.height),
    left: rect.x - monitor.x,
    right: (monitor.x + monitor.width) - (rect.x + rect.width),
  };
}

export function detectOverflow(rect, monitor) {
  const d = edgeDistances(rect, monitor);
  return ['top', 'bottom', 'left', 'right'].filter((e) => d[e] < 0);
}

export function primaryOverflow(rect, monitor) {
  const ov = detectOverflow(rect, monitor);
  if (!ov.length) return null;
  const d = edgeDistances(rect, monitor);
  return ov.reduce((a, b) => (d[a] < d[b] ? a : b));
}

export function computeCorrectionTarget(rect, monitor) {
  return {
    x: Math.min(Math.max(rect.x, monitor.x), monitor.x + monitor.width - rect.width),
    y: Math.min(Math.max(rect.y, monitor.y), monitor.y + monitor.height - rect.height),
  };
}

export function resolveDock(rect, monitor, tolerance = DOCK_TOLERANCE) {
  const overflow = detectOverflow(rect, monitor);
  if (overflow.length) return { edge: primaryOverflow(rect, monitor), overflow };
  const d = edgeDistances(rect, monitor);
  const near = ['top', 'bottom', 'left', 'right'].filter((e) => d[e] <= tolerance);
  if (!near.length) return { edge: null, overflow: [] };
  return { edge: near.reduce((a, b) => (d[a] < d[b] ? a : b)), overflow: [] };
}

export function computeCollapseTarget(pos, size, monitor, edge, sliver = SLIVER) {
  const { width: W, height: H } = size;
  switch (edge) {
    case 'bottom': return { x: pos.x, y: monitor.y + monitor.height - sliver };
    case 'top': return { x: pos.x, y: monitor.y + sliver - H };
    case 'left': return { x: monitor.x + sliver - W, y: pos.y };
    case 'right': return { x: monitor.x + monitor.width - sliver, y: pos.y };
    default: return { x: pos.x, y: pos.y };
  }
}

export function gripDirection(edge) {
  switch (edge) {
    case 'bottom': return 'up';
    case 'top': return 'down';
    case 'left': return 'right';
    case 'right': return 'left';
    default: return 'up';
  }
}
