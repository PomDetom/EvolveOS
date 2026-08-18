import { describe, it, expect } from 'vitest';
import {
  DOCK_TOLERANCE, SLIVER,
  edgeDistances, detectOverflow, primaryOverflow,
  computeCorrectionTarget, resolveDock, computeCollapseTarget, gripDirection,
} from '../../src/app/strip-edge.js';

const MON = { x: 0, y: 0, width: 1280, height: 720 };

describe('strip-edge 贴边几何（物理像素口径）', () => {
  it('edgeDistances：窗口位于 monitor 内时四边距离为正', () => {
    expect(edgeDistances({ x: 100, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ top: 100, bottom: 560, left: 100, right: 880 });
  });

  it('detectOverflow：溢出边检测', () => {
    expect(detectOverflow({ x: -50, y: -10, width: 300, height: 60 }, MON)).toEqual(['top', 'left']);
    expect(detectOverflow({ x: 100, y: 100, width: 300, height: 60 }, MON)).toEqual([]);
  });

  it('primaryOverflow：多边溢出取溢出最严重边', () => {
    expect(primaryOverflow({ x: -100, y: -10, width: 300, height: 60 }, MON)).toBe('left');
    expect(primaryOverflow({ x: 100, y: 100, width: 300, height: 60 }, MON)).toBeNull();
  });

  it('computeCorrectionTarget：溢出窗口拉回 monitor 内（贴边完整可见）', () => {
    expect(computeCorrectionTarget({ x: -100, y: -10, width: 300, height: 60 }, MON))
      .toEqual({ x: 0, y: 0 });
    expect(computeCorrectionTarget({ x: 1200, y: 700, width: 300, height: 60 }, MON))
      .toEqual({ x: 980, y: 660 });
    expect(computeCorrectionTarget({ x: 500, y: 300, width: 300, height: 60 }, MON))
      .toEqual({ x: 500, y: 300 });
  });

  it('resolveDock：贴靠边（精确贴齐或溢出校正）/ 溢出 / 居中', () => {
    expect(resolveDock({ x: 100, y: 660, width: 300, height: 60 }, MON))
      .toEqual({ edge: 'bottom', overflow: [] });
    expect(resolveDock({ x: 4, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ edge: null, overflow: [] });
    expect(resolveDock({ x: 0, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ edge: 'left', overflow: [] });
    expect(resolveDock({ x: -100, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ edge: 'left', overflow: ['left'] });
    expect(resolveDock({ x: 500, y: 300, width: 300, height: 60 }, MON))
      .toEqual({ edge: null, overflow: [] });
  });

  it('computeCollapseTarget：各边滑出留 SLIVER=20', () => {
    const size = { width: 300, height: 60 };
    expect(computeCollapseTarget({ x: 100, y: 660 }, size, MON, 'bottom')).toEqual({ x: 100, y: 700 });
    expect(computeCollapseTarget({ x: 100, y: 0 }, size, MON, 'top')).toEqual({ x: 100, y: -40 });
    expect(computeCollapseTarget({ x: 0, y: 100 }, size, MON, 'left')).toEqual({ x: -280, y: 100 });
    expect(computeCollapseTarget({ x: 980, y: 100 }, size, MON, 'right')).toEqual({ x: 1260, y: 100 });
  });

  it('gripDirection：chevron 指向拉出方向（朝屏幕中心）', () => {
    expect(gripDirection('bottom')).toBe('up');
    expect(gripDirection('top')).toBe('down');
    expect(gripDirection('left')).toBe('right');
    expect(gripDirection('right')).toBe('left');
  });

  it('常量：DOCK_TOLERANCE=0、SLIVER=20', () => {
    expect(DOCK_TOLERANCE).toBe(0);
    expect(SLIVER).toBe(20);
  });
});
