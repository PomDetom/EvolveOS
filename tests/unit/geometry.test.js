import { describe, it, expect } from 'vitest';
import { itemCenterY, scrollTopForCenter, findNearestIndex, focalScale, focalOpacity } from
  '../../src/components/navigation-wheel/nav-wheel-geometry.js';

const ITEM_H = 52, GAP = 12, VIEW_H = 400;

describe('itemCenterY / scrollTopForCenter', () => {
  it('第 0 项中心在 itemHeight/2', () => {
    expect(itemCenterY(0, ITEM_H, GAP)).toBe(26);
  });
  it('第 2 项中心 = 2*64 + 26', () => {
    expect(itemCenterY(2, ITEM_H, GAP)).toBe(154);
  });
  it('滚动到第 2 项居中的 scrollTop', () => {
    expect(scrollTopForCenter(2, ITEM_H, GAP, VIEW_H)).toBe(154 - 200);
  });
});

describe('findNearestIndex', () => {
  it('初始位置（第 0 项居中）选中第 0 项', () => {
    // 补偿坐标：初始位置 = scrollTopForCenter(0)（负值），公式在此处精确得 0
    expect(findNearestIndex(scrollTopForCenter(0, ITEM_H, GAP, VIEW_H), 5, ITEM_H, GAP, VIEW_H)).toBe(0);
  });
  it('中心在视口中间时选中对应项', () => {
    // scrollTop 使第 2 项中心正好在 200（视口中心）
    const st = scrollTopForCenter(2, ITEM_H, GAP, VIEW_H);
    expect(findNearestIndex(st, 5, ITEM_H, GAP, VIEW_H)).toBe(2);
  });
  it('两端 clamp 不越界', () => {
    expect(findNearestIndex(99999, 5, ITEM_H, GAP, VIEW_H)).toBe(4);
  });
});

describe('focalScale / focalOpacity', () => {
  it('中心处 scale 最大', () => {
    expect(focalScale(0, VIEW_H)).toBe(1.15);
  });
  it('远离中心衰减，不越过 1', () => {
    expect(focalScale(VIEW_H / 2, VIEW_H)).toBeLessThan(1.01);
    expect(focalScale(VIEW_H * 2, VIEW_H)).toBeGreaterThanOrEqual(1);
  });
  it('中心处 opacity 1，远处衰减', () => {
    expect(focalOpacity(0, VIEW_H)).toBe(1);
    expect(focalOpacity(VIEW_H, VIEW_H)).toBeLessThan(0.4);
  });
});
