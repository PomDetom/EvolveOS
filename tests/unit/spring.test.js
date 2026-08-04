import { describe, it, expect } from 'vitest';
import { springCurve, scaledDurations } from '../../src/motion/spring.js';

describe('springCurve', () => {
  it('强度 0 时退化为标准 ease-out', () => {
    expect(springCurve(0)).toBe('cubic-bezier(0.34, 1, 0.64, 1)');
  });
  it('强度 1 时达到最大回弹', () => {
    expect(springCurve(1)).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });
  it('中间强度线性插值', () => {
    expect(springCurve(0.5)).toBe('cubic-bezier(0.34, 1.28, 0.64, 1)');
  });
});

describe('scaledDurations', () => {
  it('按缩放因子缩放三个时长', () => {
    expect(scaledDurations(1.5)).toEqual({ fast: 180, base: 300, slow: 450 });
  });
  it('关闭动效时全部为 0', () => {
    expect(scaledDurations(1.5, false)).toEqual({ fast: 0, base: 0, slow: 0 });
  });
});
