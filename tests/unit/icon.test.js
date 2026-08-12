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
// —— 并行治理 a1（2026-08-12）：应用级自持图标（icon 第四参 icons，查找顺序 应用级 → 全局 → monitor）——
it('icon 第四参：应用级图标命中', () => {
  const appIcons = { sparkle: '<path d="M5 12h14M12 5v14"/>' };
  const svg = icon('sparkle', 18, 1.8, appIcons);
  expect(svg).toContain('M5 12h14M12 5v14');
});
it('icon 第四参：应用级查无 → 回退全局 PATHS', () => {
  const svg = icon('home', 18, 1.8, { other: '<path d="M1 1"/>' });
  expect(svg).toContain('m3 9 9-7 9 7'); // PATHS.home 片段
});
it('icon 第四参：应用级同名覆盖全局', () => {
  const svg = icon('home', 18, 1.8, { home: '<path d="M5 5"/>' });
  expect(svg).toContain('M5 5');
  expect(svg).not.toContain('m3 9 9-7 9 7');
});
it('icon 第四参：全局与应用都无 → 回退 monitor（含第四参时）', () => {
  const svg = icon('nope', 18, 1.8, { other: '<path d="M1 1"/>' });
  expect(svg).toContain('<rect x="2" y="4" width="20" height="13" rx="2"/>'); // PATHS.monitor
});
it('icon 第四参：空图标表不破坏既有调用（无第四参向后兼容）', () => {
  expect(icon('home', 20)).toContain('m3 9 9-7 9 7');
  expect(icon('home', 20, 2.2)).toContain('stroke-width="2.2"');
});
