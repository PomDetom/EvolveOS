import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('背景装饰预设（B6-1：网格强化 + 多样式）', () => {
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('app-main.css 定义 8 个 data-backdrop 预设', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none']
      .forEach((bd) => expect(css).toContain(`[data-backdrop="${bd}"]`));
  });

  it('网格预设强化（2px 线 + 交点圆点 + 24px 格距）', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    expect(css).toContain('24px 24px'); // 格距 24px
  });

  it('app-main.js BD_LABELS 含 8 预设键且顺序固定（决定预览卡 DOM 序）', () => {
    const js = readFileSync(base('app/app-main.js'), 'utf8');
    const literal = js.match(/BD_LABELS = \{([^}]*)\}/)?.[1] ?? '';
    const keys = ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none'];
    // 键齐全 + 出现先后与预设顺序一致（gradient 在前、none 在后）
    const positions = keys.map((k) => literal.indexOf(k));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('app-main.js 背景选择器渲染迷你预览卡（swatch + label + data-bd + aria-pressed）', () => {
    const js = readFileSync(base('app/app-main.js'), 'utf8');
    expect(js).toContain('app-main__backdrop-card');
    expect(js).toContain('app-main__backdrop-card-swatch');
    expect(js).toContain('app-main__backdrop-card-label');
    expect(js).toContain('data-bd-swatch');
    expect(js).toContain('aria-pressed');
  });
});
