import { describe, it, expect } from 'vitest';
import {
  computeFitSize,
  formatCountdown,
  formatRelative,
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

  it('OpenCode Go：rolling 倒计时 span + 周/月窗口用量全展示（空格拼接）', () => {
    const acc = ACC({ id: 'a2', kind: 'opencode_go', workspaceId: 'wrk', authCookie: 'ck' });
    const html = renderStripToken(
      { accounts: [acc] },
      [{ accountId: 'a2', balance: null, currency: null, windows: [
          { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString() },
          { key: 'weekly', label: '本周', limit: 40, used: 20, usedPct: 50, resetsIn: 604800, resetsAt: '' },
          { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
        ], ok: true, error: null, lastUpdated: 0 }],
    );
    expect(html).toContain('c-strip-tk__countdown');
    expect(html).toContain('data-resets-at');
    expect(html).toContain('>1.5h</span>'); // rolling 90min → 1.5h
    expect(html).toContain('29% 周50% 月80%');
    expect(html).not.toContain('本月 80%'); // 旧口径：不再只显示最高用量窗口
  });

  it('formatRelative：各档位（刚刚/N分钟前/N小时前/N天前/超7天回退日期/未来截断）', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelative(now - 30)).toBe('刚刚');
    expect(formatRelative(now - 60)).toBe('1分钟前');
    expect(formatRelative(now - 2 * 3600)).toBe('2小时前');
    expect(formatRelative(now - 3 * 86400)).toBe('3天前');
    const past = Math.floor(new Date(2026, 7, 1).getTime() / 1000); // 本地 2026-08-01，超 7 天
    expect(formatRelative(past)).toBe('2026-08-01');
    expect(formatRelative(now + 99999)).toBe('刚刚'); // 未来时间（时钟偏移）→ diff 0 截断
  });

  it('renderStripToken：chip 含名称 + 值 + 相对时间列（seed lastUpdated，与 TokenTool 口径一致）', () => {
    const html = renderStripToken(
      { accounts: [ACC()] },
      [{ accountId: 'a1', balance: 88.5, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) - 120 }],
    );
    expect(html).toContain('主号');
    expect(html).toContain('88.50');
    expect(html).toContain('c-strip-tk__time');
    expect(html).toContain('data-last-refresh'); // 定时器原地更新的种子属性
    expect(html).toContain(' · 2分钟前');
  });

  it('renderStripToken：无 lastUpdated → 不渲染时间列', () => {
    const html = renderStripToken(
      { accounts: [ACC()] },
      [{ accountId: 'a1', balance: 88.5, currency: 'CNY', ok: true, error: null, lastUpdated: null }],
    );
    expect(html).toContain('88.50');
    expect(html).not.toContain('c-strip-tk__time');
    expect(html).not.toContain(' · ');
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

  it('stripAccountValue：DeepSeek 余额 / OpenCode 倒计时 + 周月百分比 / 空数据占位', () => {
    const ds = ACC();
    const oc = ACC({ kind: 'opencode_go' });
    expect(stripAccountValue(ds, { accountId: 'a1', balance: 12.345, currency: 'CNY' })).toBe('12.35 CNY');
    expect(stripAccountValue(ds, null)).toBe('—');
    const openVal = stripAccountValue(oc, { accountId: 'a1', windows: [
      { key: 'rolling', usedPct: 29.2, label: '5小时' },
      { key: 'weekly', usedPct: 50, label: '本周' },
      { key: 'monthly', usedPct: 80, label: '本月' },
    ] });
    expect(openVal).toContain('data-resets-at'); // rolling 倒计时 span 属性
    expect(openVal).toContain('29% 周50% 月80%');
    expect(openVal).not.toContain('5h'); // 旧短标记口径移除
    expect(stripAccountValue(oc, null)).toBe('—');
  });

  it('stripAccountValue：OpenCode 未知 key 窗口被忽略（仅 rolling/weekly/monthly 三窗口，label 不再渲染）', () => {
    const oc = ACC({ kind: 'opencode_go' });
    // 未知 key（无 rolling/weekly/monthly）→ 无已知窗口 → 空串；恶意 label 不进入输出（无 XSS sink）
    expect(stripAccountValue(oc, { accountId: 'a1', windows: [{ usedPct: 50, label: '<b>恶意</b>' }] })).toBe('');
  });

  it('formatCountdown：各档位（<1m/Nm/N.Nh/已过截断/缺失空串）', () => {
    const now = Date.now();
    // 偏移含 30s 缓冲：floor 秒粒度的分钟边界恰逢整数分钟时 +1ms 即落到前一档，缓冲避开抖动
    expect(formatCountdown(new Date(now + 30 * 1000).toISOString())).toBe('<1m');          // 30s 余量
    expect(formatCountdown(new Date(now + 45.5 * 60 * 1000).toISOString())).toBe('45m');   // 45.5min → 45m
    expect(formatCountdown(new Date(now + 90.5 * 60 * 1000).toISOString())).toBe('1.5h');  // 90.5min → 90m → 1.5h
    expect(formatCountdown(new Date(now + 123.5 * 60 * 1000).toISOString())).toBe('2.1h'); // 123.5min → 123m → 2.1h
    expect(formatCountdown(new Date(now - 5 * 1000).toISOString())).toBe('<1m');           // 已过 → diff 0 截断
    expect(formatCountdown('')).toBe('');                                                    // 缺失 → 空串（span 留白）
    expect(formatCountdown(undefined)).toBe('');                                             // 未定义 → 空串
  });

  it('computeFitSize：ceil 到整数像素', () => {
    expect(computeFitSize({ width: 320.4, height: 64.1 })).toEqual({ width: 321, height: 65 });
    expect(computeFitSize({ width: 0.5, height: 0.5 })).toEqual({ width: 1, height: 1 });
  });
});
