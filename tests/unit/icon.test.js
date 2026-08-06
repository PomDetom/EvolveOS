import { it, expect } from 'vitest';
import { icon } from '../../src/components/icon/icon.js';

// B2-3：icon 支持第三参 stroke-width（导航图标四项增强——active 项 2.2 加粗分级）。
// 默认 1.8 保持既有调用点向后兼容（现有 icon(name, size) 调用零改动）。
it('icon 支持 stroke-width 参数', () => {
  const svg = icon('home', 20, 2.2);
  expect(svg).toContain('stroke-width="2.2"');
});
it('默认 stroke-width 1.8（向后兼容）', () => {
  expect(icon('home', 20)).toContain('stroke-width="1.8"');
});
