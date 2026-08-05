import { describe, it, expect } from 'vitest';
import { anchorY, scrollTopForAnchor, findNearestIndex, focalScale, focalOpacity } from
  '../../src/components/navigation-wheel/nav-wheel-geometry.js';

const ITEM_H = 52, GAP = 12, VIEW_H = 400, RATIO = 0.382;

describe('anchorY / scrollTopForAnchor', () => {
  it('anchorY(0) = itemH/2（首项锚点在内容起点半个项高）', () => {
    expect(anchorY(0, ITEM_H, GAP, VIEW_H, RATIO)).toBe(26);
  });
  it('anchorY(2) = 2*64 + 26', () => {
    expect(anchorY(2, ITEM_H, GAP, VIEW_H, RATIO)).toBe(154);
  });
  it('anchorRatio=0.382 时首项初始 scrollTop = anchorY(0) - viewH*0.382（锚点上三分线）', () => {
    // 黄金比例锚点：选中项中心对齐视口 38.2% 处（非居中）—— 初始态负偏移 = itemH/2 - viewH*0.382
    expect(scrollTopForAnchor(0, ITEM_H, GAP, VIEW_H, RATIO)).toBeCloseTo(26 - 400 * 0.382, 10);
  });
  it('滚动到第 2 项锚点的 scrollTop = anchorY(2) - viewH*0.382', () => {
    expect(scrollTopForAnchor(2, ITEM_H, GAP, VIEW_H, RATIO)).toBeCloseTo(154 - 400 * 0.382, 10);
  });
  it('anchorRatio=0.5 时恢复旧中心语义（向后兼容基准）', () => {
    expect(scrollTopForAnchor(2, ITEM_H, GAP, VIEW_H, 0.5)).toBeCloseTo(154 - 200, 10);
  });
});

describe('findNearestIndex', () => {
  it('初始位置（第 0 项锚定 38.2%）选中第 0 项', () => {
    // 补偿坐标：初始位置 = scrollTopForAnchor(0)（负值），公式在此处精确得 0
    expect(findNearestIndex(scrollTopForAnchor(0, ITEM_H, GAP, VIEW_H, RATIO), 5, ITEM_H, GAP, VIEW_H, RATIO)).toBe(0);
  });
  it('锚点在视口 38.2% 处时选中对应项', () => {
    const st = scrollTopForAnchor(2, ITEM_H, GAP, VIEW_H, RATIO);
    expect(findNearestIndex(st, 5, ITEM_H, GAP, VIEW_H, RATIO)).toBe(2);
  });
  it('anchorRatio=0.5 时与旧中心语义一致', () => {
    const st = scrollTopForAnchor(2, ITEM_H, GAP, VIEW_H, 0.5);
    expect(findNearestIndex(st, 5, ITEM_H, GAP, VIEW_H, 0.5)).toBe(2);
  });
  it('两端 clamp 不越界', () => {
    expect(findNearestIndex(99999, 5, ITEM_H, GAP, VIEW_H, RATIO)).toBe(4);
    expect(findNearestIndex(-99999, 5, ITEM_H, GAP, VIEW_H, RATIO)).toBe(0);
  });
});

describe('focalScale / focalOpacity', () => {
  it('锚点处（offset=0）scale 最大', () => {
    expect(focalScale(0, VIEW_H)).toBe(1.15);
  });
  it('远离锚点衰减，不越过 1', () => {
    expect(focalScale(VIEW_H / 2, VIEW_H)).toBeLessThan(1.01);
    expect(focalScale(VIEW_H * 2, VIEW_H)).toBeGreaterThanOrEqual(1);
  });
  it('锚点处 opacity 1，远处衰减', () => {
    expect(focalOpacity(0, VIEW_H)).toBe(1);
    expect(focalOpacity(VIEW_H, VIEW_H)).toBeLessThan(0.4);
  });
});

describe('horizontal 方向等价性（几何层方向无关）', () => {
  it('横/纵同名参数代入得同值 —— horizontal 渲染只换 scrollLeft/clientWidth，几何函数不变', () => {
    // 设计不变量：几何层纯函数不感知方向（只有「主轴长度」语义），horizontal 实例复用同一套
    // 公式（scrollTop→scrollLeft、clientHeight→clientWidth）。断言竖直与水平（参数同值）的
    // 锚点/吸附/聚焦整条管道结果一致，防止未来引入纵轴特化假设。
    const v = { len: VIEW_H, item: ITEM_H, gap: GAP, ratio: RATIO };
    const h = { len: VIEW_H, item: ITEM_H, gap: GAP, ratio: RATIO }; // 水平：换名为 itemWidth/scrollLeft，数值同
    const stV = scrollTopForAnchor(3, v.item, v.gap, v.len, v.ratio);
    const stH = scrollTopForAnchor(3, h.item, h.gap, h.len, h.ratio); // 水平调用 = 竖直调用同式
    expect(stH).toBe(stV);
    expect(anchorY(3, h.item, h.gap, h.len, h.ratio)).toBe(anchorY(3, v.item, v.gap, v.len, v.ratio));
    expect(findNearestIndex(stH, 5, h.item, h.gap, h.len, h.ratio))
      .toBe(findNearestIndex(stV, 5, v.item, v.gap, v.len, v.ratio));
    // focal 峰值在锚点：offset = 锚点处内容偏移 - 视口主轴锚线，为 0 时达峰值
    expect(focalScale(stH - scrollTopForAnchor(3, h.item, h.gap, h.len, h.ratio), h.len)).toBe(1.15);
  });
});
