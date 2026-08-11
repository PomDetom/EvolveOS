import { describe, it, expect, afterEach } from 'vitest';
import {
  accountCard,
  escapeHtml,
  formatRelative,
  formatReset,
} from '../../src/apps/token-tool/token-tool-utils.js';
import { tokenToolPage } from '../../src/apps/token-tool/token-tool.js';
import { module } from '../../src/apps/token-tool/index.js';

afterEach(() => {
  delete globalThis.window.__TAURI__;
});

describe('token-tool utils', () => {
  it('formatReset：秒转 d/h/m', () => {
    expect(formatReset(0)).toBe('即将重置');
    expect(formatReset(-5)).toBe('即将重置');
    expect(formatReset(3725)).toBe('1h 2m');
    expect(formatReset(90061)).toBe('1d 1h 1m');
  });

  it('formatRelative：相对时间', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelative(now - 30)).toBe('刚刚');
    expect(formatRelative(now - 90)).toBe('1分钟前');
    expect(formatRelative(now - 3600 * 2)).toBe('2小时前');
  });

  it('escapeHtml：转义 HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a"b\'c&d')).toBe('a&quot;b&#39;c&amp;d');
  });

  it('accountCard：DeepSeek 余额卡', () => {
    const html = accountCard(
      { id: 'a1', name: '主号', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a1', balance: 123.456, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) },
    );
    expect(html).toContain('data-tt-id="a1"');
    expect(html).toContain('123.46');
    expect(html).toContain('CNY');
    expect(html).toContain('DeepSeek');
  });

  it('accountCard：OpenCode Go 三窗口 + 剩余额度', () => {
    const html = accountCard(
      { id: 'a2', name: 'OC', kind: 'opencode_go', baseUrl: '', apiKey: '', workspaceId: 'wrk', authCookie: 'ck', refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a2', windows: [
          { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: '' },
          { key: 'weekly', label: '本周', limit: 30, used: 15, usedPct: 50, resetsIn: 43200, resetsAt: '' },
          { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
        ], ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) },
    );
    expect(html).toContain('29.2%');
    expect(html).toContain('剩余 $8.50 / $12');
    expect(html).toContain('重置: 1h 0m');
    expect(html).toContain('OpenCode Go');
  });

  it('accountCard：错误态 + 名称转义', () => {
    const html = accountCard(
      { id: 'a3', name: '<b>hack</b>', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a3', balance: null, currency: null, ok: false, error: 'Cookie 已过期或无效', lastUpdated: 0 },
    );
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(html).toContain('Cookie 已过期或无效');
  });
});

describe('token-tool page', () => {
  it('浏览器（无 __TAURI__）：需桌面端空态', () => {
    expect(tokenToolPage()).toContain('需桌面端使用');
  });

  it('桌面（有 __TAURI__）：工具栏 + 网格容器', () => {
    globalThis.window.__TAURI__ = { core: {} };
    const html = tokenToolPage();
    expect(html).toContain('data-tt-grid');
    expect(html).toContain('立即刷新');
  });
});

describe('token-tool module 契约', () => {
  it('导出 module 字段齐全', () => {
    expect(module.id).toBe('token-tool');
    expect(module.name).toBe('TokenTool');
    expect(module.icon).toBe('bolt');
    expect(module.order).toBe(7);
    expect(module.dir).toEqual([]);
    expect(typeof module.render).toBe('function');
    expect(typeof module.mount).toBe('function');
  });
});
