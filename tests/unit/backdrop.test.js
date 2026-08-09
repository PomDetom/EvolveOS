import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('背景装饰预设（B6-R2：大色块构图可见且互不相同）', () => {
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('app-main.css 定义 8 个 data-backdrop 预设', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none']
      .forEach((bd) => expect(css).toContain(`[data-backdrop="${bd}"]`));
  });

  it('每个非 none 预设的 --backdrop-bg 含渐变 wash（非纯实底），且无 24px 细线平铺', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora'].forEach((bd) => {
      const block = css.match(new RegExp(`\\[data-backdrop="${bd}"\\][^}]*`))[0];
      expect(block).toMatch(/gradient\(/); // radial/linear/repeating 任一层
      expect(block).not.toContain('24px'); // 旧细线平铺已弃
    });
    // 旧 grid/dots 的 background-size: 24px 24px 平铺规则整条删除（新构图 % 定位自动铺满）
    expect(css).not.toContain('24px 24px');
  });

  it('gradient 与 aurora 结构区分（单 accent 团 vs 多色多团）', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    const grad = css.match(/\[data-backdrop="gradient"\][^}]*/)[0];
    const aur = css.match(/\[data-backdrop="aurora"\][^}]*/)[0];
    expect(grad).toContain('--accent-300');
    expect(grad).not.toContain('--neutral-400'); // gradient 单色
    expect(aur).toContain('--neutral-400'); // aurora 多色区分器
    // 结构判别（旧 gradient 为 2 团 accent，与 aurora 高度相似）：gradient 单团 / aurora 多团
    expect(grad.match(/radial-gradient\(/g) ?? []).toHaveLength(1);
    expect(aur.match(/radial-gradient\(/g) ?? []).toHaveLength(3);
  });
});
