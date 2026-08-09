import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('阿里普惠体字体（B5-1：全局字体替换）', () => {
  // Vitest 3.2 + Vite 会将 `new URL(path, import.meta.url)` 字面量按 dev asset URL 解析，
  // 先取到变量再作 base，命中磁盘上真实的文件（同 window-capabilities.test.js 模式）。
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('55/65/85 三个 WOFF2 文件存在', () => {
    // 仅存在性守卫，不读内容（二进制大文件）
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2'))).toBeTruthy();
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2'))).toBeTruthy();
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2'))).toBeTruthy();
  });

  it('fonts.css 定义 55 Regular + 65 Medium + 85 Bold 三档 @font-face', () => {
    const css = readFileSync(base('styles/fonts.css'), 'utf8');
    expect(css).toContain("font-family: 'Alibaba PuHuiTi'");
    expect(css).toContain('AlibabaPuHuiTi-3-55-Regular.woff2');
    expect(css).toContain('AlibabaPuHuiTi-3-65-Medium.woff2');
    expect(css).toContain('AlibabaPuHuiTi-3-85-Bold.woff2');
    expect(css).toContain('font-weight: 400');
    expect(css).toContain('font-weight: 500');
    expect(css).toContain('font-weight: 700');
    expect(css).toContain('font-display: swap');
  });

  it('tokens.css --font-sans 含 Alibaba PuHuiTi 前缀', () => {
    const css = readFileSync(base('styles/tokens.css'), 'utf8');
    expect(css).toMatch(/--font-sans:\s*"Alibaba PuHuiTi",/);
  });

  it('base.css 引入 fonts.css', () => {
    const css = readFileSync(base('styles/base.css'), 'utf8');
    expect(css).toMatch(/@import.*fonts\.css/);
  });
});
