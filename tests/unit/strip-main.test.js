import { describe, it, expect } from 'vitest';
import {
  computeFitSize,
  renderStripToken,
  stripAccountStatus,
  stripAccountValue,
} from '../../src/app/strip-main.js';

const ACC = (over = {}) => ({
  id: 'a1', name: '主号', kind: 'deepseek', baseUrl: '', apiKey: '',
  workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10, ...over,
});

describe('strip-main 悬浮条 token 渲染', () => {
  it('config 为空（加载中）→ 加载占位', () => {
    expect(renderStripToken(null, [])).toContain('加载中');
  });

  it('无账户 → 暂无账户占位', () => {
    expect(renderStripToken({ accounts: [] }, [])).toContain('暂无账户');
  });

  it('DeepSeek：余额 + 币种 + 状态点 ok', () => {
    const html = renderStripToken(
      { accounts: [ACC()] },
      [{ accountId: 'a1', balance: 88.5, currency: 'CNY', ok: true, error: null, lastUpdated: 0 }],
    );
    expect(html).toContain('主号');
    expect(html).toContain('88.50');
    expect(html).toContain('CNY');
    expect(html).toContain('c-strip-tk__dot');
    expect(html).not.toContain('c-strip-tk__dot--warn');
    expect(html).not.toContain('c-strip-tk__dot--err');
  });

  it('OpenCode Go：取最高用量窗口（label + 百分比）', () => {
    const acc = ACC({ id: 'a2', kind: 'opencode_go', workspaceId: 'wrk', authCookie: 'ck' });
    const html = renderStripToken(
      { accounts: [acc] },
      [{ accountId: 'a2', balance: null, currency: null, windows: [
          { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: '' },
          { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
        ], ok: true, error: null, lastUpdated: 0 }],
    );
    expect(html).toContain('本月');
    expect(html).toContain('80%');
  });

  it('账户名转义：<b> 不得注入', () => {
    const html = renderStripToken(
      { accounts: [ACC({ name: '<b>x</b>' })] },
      [{ accountId: 'a1', balance: 1, currency: 'USD', ok: true, error: null, lastUpdated: 0 }],
    );
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('stripAccountStatus：error→err；OpenCode 高用量→warn/err；无数据→none', () => {
    const ds = ACC();
    const oc = ACC({ kind: 'opencode_go' });
    expect(stripAccountStatus(ds, { accountId: 'a1', error: 'x' })).toBe('err');
    expect(stripAccountStatus(ds, null)).toBe('none');
    expect(stripAccountStatus(oc, { accountId: 'a1', windows: [{ usedPct: 95, label: '本月' }] })).toBe('err');
    expect(stripAccountStatus(oc, { accountId: 'a1', windows: [{ usedPct: 75, label: '本周' }] })).toBe('warn');
    expect(stripAccountStatus(oc, { accountId: 'a1', windows: [{ usedPct: 40, label: '本周' }] })).toBe('ok');
  });

  it('stripAccountValue：DeepSeek 余额 / OpenCode 最高窗口 / 空数据占位', () => {
    const ds = ACC();
    const oc = ACC({ kind: 'opencode_go' });
    expect(stripAccountValue(ds, { accountId: 'a1', balance: 12.345, currency: 'CNY' })).toBe('12.35 CNY');
    expect(stripAccountValue(ds, null)).toBe('—');
    expect(stripAccountValue(oc, { accountId: 'a1', windows: [{ usedPct: 29.2, label: '5小时' }, { usedPct: 80, label: '本月' }] })).toBe('本月 80%');
    expect(stripAccountValue(oc, null)).toBe('—');
  });

  it('stripAccountValue：OpenCode 窗口 label 转义（label 来自外部 API，非用户输入也不得注入）', () => {
    const oc = ACC({ kind: 'opencode_go' });
    expect(stripAccountValue(oc, { accountId: 'a1', windows: [{ usedPct: 50, label: '<b>恶意</b>' }] }))
      .toBe('&lt;b&gt;恶意&lt;/b&gt; 50%');
  });

  it('computeFitSize：ceil 到整数像素', () => {
    expect(computeFitSize({ width: 320.4, height: 64.1 })).toEqual({ width: 321, height: 65 });
    expect(computeFitSize({ width: 0.5, height: 0.5 })).toEqual({ width: 1, height: 1 });
  });
});
