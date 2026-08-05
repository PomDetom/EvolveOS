import { describe, it, expect } from 'vitest';
import { resolveMode } from '../../src/app/mode.js';

// Task A1（规格：模式入口）：resolveMode 纯函数 —— ?mode=app|docs|strip 显式优先；
// 无参数 + hasTauri → 'app'；无参数浏览器 → 'docs'；非法值回落 'docs'。
// params 为 URLSearchParams 或等价对象（含字符串 '?mode=...'）；hasTauri 由调用方
// （main.js 探测 window.__TAURI__）注入，mode.js 不读全局、便于单测。
describe('resolveMode', () => {
  it('默认浏览器（无参，非 Tauri）→ docs', () => {
    expect(resolveMode(new URLSearchParams(''), false)).toBe('docs');
  });
  it('无参数 + hasTauri → app', () => {
    expect(resolveMode(new URLSearchParams(''), true)).toBe('app');
  });
  it('显式 ?mode=app → app（优先于 Tauri 探测）', () => {
    expect(resolveMode(new URLSearchParams('?mode=app'), false)).toBe('app');
    expect(resolveMode(new URLSearchParams('?mode=app'), true)).toBe('app');
    expect(resolveMode('?mode=app', false)).toBe('app'); // 字符串等价对象
  });
  it('显式 ?mode=docs → docs（Tauri 也回落 docs）', () => {
    expect(resolveMode(new URLSearchParams('?mode=docs'), true)).toBe('docs');
  });
  it('非法 ?mode=bogus → 回落 docs', () => {
    expect(resolveMode(new URLSearchParams('?mode=bogus'), false)).toBe('docs');
    expect(resolveMode(new URLSearchParams('?mode=bogus'), true)).toBe('docs');
  });
});
