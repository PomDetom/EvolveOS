import { describe, it, expect } from 'vitest';
import { resolveMode } from '../../src/app/mode.js';

// Task B1-4（模式简化）：resolveMode 只返回 'app'|'strip' —— 显式 ?mode=app|strip 优先；
// 无参数 / 非法值 / ?mode=docs → 一律 'app'（浏览器与 Tauri 一致，docs 渲染已删除）。
// params 为 URLSearchParams 或等价对象（含字符串 '?mode=...'）；hasTauri 由调用方
// （main.js 探测 window.__TAURI__）注入，mode.js 不读全局、便于单测。
describe('resolveMode', () => {
  it('无参数浏览器 → app（不再回落 docs）', () => {
    expect(resolveMode(new URLSearchParams(''), false)).toBe('app');
  });
  it('无参数 + hasTauri → app', () => {
    expect(resolveMode(new URLSearchParams(''), true)).toBe('app');
  });
  it('非法值 → 回落 app', () => {
    expect(resolveMode(new URLSearchParams('?mode=bogus'), false)).toBe('app');
    expect(resolveMode(new URLSearchParams('?mode=bogus'), true)).toBe('app');
  });
  it('?mode=docs 不再特殊 → app', () => {
    expect(resolveMode(new URLSearchParams('?mode=docs'), false)).toBe('app');
    expect(resolveMode(new URLSearchParams('?mode=docs'), true)).toBe('app');
  });
  it('显式 ?mode=app → app（优先于 Tauri 探测）', () => {
    expect(resolveMode(new URLSearchParams('?mode=app'), false)).toBe('app');
    expect(resolveMode(new URLSearchParams('?mode=app'), true)).toBe('app');
    expect(resolveMode('?mode=app', false)).toBe('app'); // 字符串等价对象
  });
  it('显式 ?mode=strip → strip', () => {
    expect(resolveMode(new URLSearchParams('?mode=strip'), false)).toBe('strip');
    expect(resolveMode(new URLSearchParams('?mode=strip'), true)).toBe('strip');
  });
});
