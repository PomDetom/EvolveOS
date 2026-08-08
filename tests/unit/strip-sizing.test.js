import { describe, it, expect } from 'vitest';
import { computeFitSize } from '../../src/app/strip-main.js';

describe('computeFitSize（B4 收尾：悬浮窗尺寸贴合）', () => {
  it('ceil 到整数 + 至少 1px', () => {
    expect(computeFitSize({ width: 212.3, height: 34.7 })).toEqual({ width: 213, height: 35 });
    expect(computeFitSize({ width: 0, height: 0 })).toEqual({ width: 1, height: 1 });
    expect(computeFitSize({ width: 48, height: 48 })).toEqual({ width: 48, height: 48 });
  });
});
