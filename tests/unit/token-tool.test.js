import { describe, it, expect, afterEach } from 'vitest';
import {
  usageCard,
  accountRow,
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

  it('usageCard：DeepSeek 只读余额卡（无操作按钮）', () => {
    const html = usageCard(
      { id: 'a1', name: '主号', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a1', balance: 123.456, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) },
    );
    expect(html).toContain('data-tt-id="a1"');
    expect(html).toContain('123.46');
    expect(html).toContain('CNY');
    expect(html).toContain('DeepSeek');
    expect(html).toContain('上次刷新:');
    // 只读：不得出现任何操作按钮（测试/编辑/删除）
    expect(html).not.toContain('data-tt-action');
    expect(html).not.toContain('测试');
    expect(html).not.toContain('删除');
  });

  it('usageCard：OpenCode Go 三窗口 + 剩余额度', () => {
    const html = usageCard(
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
    expect(html).not.toContain('data-tt-action'); // 只读
  });

  it('usageCard：Codex 显示套餐、限额窗口与 credits 状态', () => {
    const html = usageCard(
      { id: 'a3', name: '本机 Codex', kind: 'codex', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, warnThreshold: 10 },
      {
        accountId: 'a3',
        planType: 'plus',
        windows: [{ key: 'primary', label: '7天', limit: 100, used: 11, usedPct: 11, resetsIn: 7200, resetsAt: '' }],
        credits: { hasCredits: false, unlimited: false, balance: '0' },
        ok: true,
        error: null,
        lastUpdated: Math.floor(Date.now() / 1000),
      },
    );
    expect(html).toContain('Codex');
    expect(html).toContain('plus');
    expect(html).toContain('7天');
    expect(html).toContain('11.0%');
    expect(html).toContain('无额外 credits');
    expect(html).not.toContain('data-tt-action');
  });

  it('usageCard：错误态 + 名称转义；无数据时「尚未刷新」', () => {
    const html = usageCard(
      { id: 'a3', name: '<b>hack</b>', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a3', balance: null, currency: null, ok: false, error: 'Cookie 已过期或无效', lastUpdated: 0 },
    );
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(html).toContain('Cookie 已过期或无效');
    // balance 无 lastUpdated → 空余额 + 尚未刷新
    expect(usageCard(
      { id: 'a4', name: '空', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      null,
    )).toContain('尚未刷新');
  });

  it('accountRow：含测试/编辑/删除操作 + 类型 badge + 动态刷新文案', () => {
    const html = accountRow(
      { id: 'a1', name: '主号', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a1', balance: 88.5, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) },
    );
    expect(html).toContain('data-tt-id="a1"');
    expect(html).toContain('data-tt-action="test"');
    expect(html).toContain('data-tt-action="edit"');
    expect(html).toContain('data-tt-action="del"');
    expect(html).toContain('DeepSeek');
    expect(html).toContain('动态 30s~5min 自适应');
    expect(html).toContain('主号');
  });

  it('accountRow：OpenCode 行带 badge', () => {
    const html = accountRow(
      { id: 'a2', name: 'OC', kind: 'opencode_go', baseUrl: '', apiKey: '', workspaceId: 'wrk', authCookie: 'ck', refreshIntervalSecs: 300, warnThreshold: 10 },
      null,
    );
    expect(html).toContain('OpenCode Go');
    expect(html).toContain('data-tt-action="edit"');
  });

  it('accountRow：包含展示开关与拖拽手柄', () => {
    const html = accountRow(
      { id: 'a4', name: '隐藏账户', kind: 'deepseek', visible: false },
      null,
    );
    expect(html).toContain('data-tt-action="toggle-visibility"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('data-tt-drag');
  });
});

describe('token-tool page', () => {
  it('浏览器（无 __TAURI__）：需桌面端空态（任意 dir）', () => {
    expect(tokenToolPage({ dirId: 'usage' })).toContain('需桌面端使用');
    expect(tokenToolPage({ dirId: 'accounts' })).toContain('需桌面端使用');
    expect(tokenToolPage()).toContain('需桌面端使用');
  });

  it('桌面：余量页（默认）→ 立即刷新，无添加账户', () => {
    globalThis.window.__TAURI__ = { core: {} };
    const html = tokenToolPage({ dirId: 'usage' });
    expect(html).toContain('data-tt-grid');
    expect(html).toContain('立即刷新');
    expect(html).not.toContain('添加账户');
    // 无 dir 参数回落余量页
    expect(tokenToolPage()).toContain('立即刷新');
  });

  it('桌面：账户管理页 → 添加账户，无立即刷新', () => {
    globalThis.window.__TAURI__ = { core: {} };
    const html = tokenToolPage({ dirId: 'accounts' });
    expect(html).toContain('data-tt-accounts');
    expect(html).toContain('添加账户');
    expect(html).not.toContain('立即刷新');
  });
});

describe('token-tool module 契约', () => {
  it('导出 module 字段齐全 + dir 拆分子页', () => {
    expect(module.id).toBe('token-tool');
    expect(module.name).toBe('TokenTool');
    expect(module.icon).toBe('bolt');
    expect(module.order).toBe(2);
    expect(typeof module.render).toBe('function');
    expect(typeof module.mount).toBe('function');
    expect(module.dir).toHaveLength(2);
    expect(module.dir[0]).toMatchObject({ id: 'usage', name: '余量' });
    expect(module.dir[1]).toMatchObject({ id: 'accounts', name: '账户管理' });
  });
});
