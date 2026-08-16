import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATTENDANCE_OPTIONS, ATTENDANCE_LABELS, PHASE_OPTIONS, LOCATION_OPTIONS,
  workDayFraction, loadReports, saveReports, upsertReport, deleteReport,
  loadTemplates, saveTemplates, upsertTemplate, deleteTemplate, ensureSeedTemplates,
  todayISO, monthRange, fmtDate, escapeHtml,
  calcStats, buildMonthGrid, serializeExport, parseImport,
  calendarMonthSpan, monthSeq, monthLabel,
  orderedOptions, loadOptionOrder, saveOptionOrder,
} from '../../src/apps/notes/notes-utils.js';
import { module } from '../../src/apps/notes/index.js';
import { notesPage } from '../../src/apps/notes/notes.js';

beforeEach(() => localStorage.clear());

describe('notes-utils：枚举与牛马日权重', () => {
  it('出勤枚举六值 + 标签映射', () => {
    expect(ATTENDANCE_OPTIONS.map((o) => o.value)).toEqual(['normal', 'overtime', 'rest', 'leave-am', 'leave-pm', 'leave-full']);
    expect(ATTENDANCE_LABELS).toEqual({ normal: '正常', overtime: '加班', rest: '休息日', 'leave-am': '请假（上午）', 'leave-pm': '请假（下午）', 'leave-full': '请假（全天）' });
    expect(PHASE_OPTIONS.map((o) => o.value)).toEqual(['intern', 'regular']);
    expect(LOCATION_OPTIONS.map((o) => o.value)).toEqual(['qingdao', 'xian']);
  });

  it('workDayFraction：正常/加班=1，半天请假=0.5，全天请假/休息日=0，未知=0', () => {
    expect(workDayFraction('normal')).toBe(1);
    expect(workDayFraction('overtime')).toBe(1);
    expect(workDayFraction('leave-am')).toBe(0.5);
    expect(workDayFraction('leave-pm')).toBe(0.5);
    expect(workDayFraction('leave-full')).toBe(0);
    expect(workDayFraction('rest')).toBe(0);
    expect(workDayFraction('nope')).toBe(0);
  });
});

describe('notes-utils：日报数据层', () => {
  it('upsert 新增 → 覆盖同日期 → delete 移除', () => {
    saveReports([]);
    upsertReport({ date: '2026-08-01', attendance: 'normal', phase: 'intern', location: 'qingdao', primary: 'a', secondary: '' });
    expect(loadReports()).toHaveLength(1);
    upsertReport({ date: '2026-08-01', attendance: 'overtime', phase: 'intern', location: 'qingdao', primary: 'a2', secondary: '' });
    expect(loadReports()).toHaveLength(1);
    expect(loadReports()[0].attendance).toBe('overtime');
    expect(loadReports()[0].primary).toBe('a2');
    expect(typeof loadReports()[0].updatedAt).toBe('number');
    deleteReport('2026-08-01');
    expect(loadReports()).toHaveLength(0);
  });

  it('坏 JSON 容错：loadReports 返回空数组不抛错', () => {
    localStorage.setItem('evolveos.notes.reports', '{oops');
    expect(loadReports()).toEqual([]);
    localStorage.setItem('evolveos.notes.reports', '{"not":"array"}');
    expect(loadReports()).toEqual([]);
  });
});

describe('notes-utils：模板数据层', () => {
  it('upsert 新建自动赋 id → 按 id 更新 → delete', () => {
    saveTemplates([]);
    upsertTemplate({ name: '需求开发', primary: 'p1', secondary: 's1' });
    const t1 = loadTemplates()[0];
    expect(typeof t1.id).toBe('string');
    expect(t1.name).toBe('需求开发');
    upsertTemplate({ id: t1.id, name: '需求开发改', primary: 'p2', secondary: 's2' });
    expect(loadTemplates()).toHaveLength(1);
    expect(loadTemplates()[0].primary).toBe('p2');
    deleteTemplate(t1.id);
    expect(loadTemplates()).toHaveLength(0);
  });
});

describe('notes-utils：内置示例模板播种', () => {
  it('key 从未初始化 → ensureSeedTemplates 播种 3 条内置示例', () => {
    expect(localStorage.getItem('evolveos.notes.templates')).toBeNull();
    ensureSeedTemplates();
    const templates = loadTemplates();
    expect(templates).toHaveLength(3);
    expect(templates.map((t) => t.id)).toEqual(['tpl-seed-1', 'tpl-seed-2', 'tpl-seed-3']);
    expect(templates.map((t) => t.name)).toEqual(['需求开发', '日常总结', '会议纪要']);
    expect(typeof templates[0].createdAt).toBe('number');
    expect(typeof templates[0].updatedAt).toBe('number');
  });
  it('key 为 []（用户删空）→ 不覆盖不重播种', () => {
    saveTemplates([]);
    ensureSeedTemplates();
    expect(loadTemplates()).toEqual([]);
  });
  it('key 已有数据 → 不覆盖', () => {
    saveTemplates([{ id: 't1', name: '自建', primary: 'p', secondary: 's' }]);
    ensureSeedTemplates();
    expect(loadTemplates()).toHaveLength(1);
    expect(loadTemplates()[0].id).toBe('t1');
  });
});

describe('notes-utils：时间工具', () => {
  it('todayISO 返回 YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('monthRange：平月/闰年二月/十二月', () => {
    expect(monthRange(2026, 0)).toEqual({ start: '2026-01-01', end: '2026-01-31' });
    expect(monthRange(2024, 1)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange(2026, 11)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
  it('fmtDate：本地化中文日期', () => {
    expect(fmtDate('2026-08-15')).toBe('2026年8月15日');
  });
  it('escapeHtml：转义 HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a"b\'c&d')).toBe('a&quot;b&#39;c&amp;d');
    expect(escapeHtml(null)).toBe('');
  });
});

describe('notes-utils：统计', () => {
  const reports = [
    { date: '2026-08-01', attendance: 'normal', phase: 'intern', location: 'qingdao' },
    { date: '2026-08-02', attendance: 'leave-am', phase: 'intern', location: 'qingdao' },
    { date: '2026-08-03', attendance: 'rest', phase: 'regular', location: 'qingdao' },
    { date: '2026-08-04', attendance: 'overtime', phase: 'regular', location: 'xian' },
    { date: '2026-08-05', attendance: 'leave-full', phase: 'regular', location: 'qingdao' },
  ];
  it('全量统计：牛马日浮点累计 + 各维度计数 + breakdown', () => {
    const s = calcStats(reports);
    expect(s.workDays).toBe(2.5); // 1+0.5+0+1+0
    expect(s.restDays).toBe(1);
    expect(s.internDays).toBe(2);
    expect(s.regularDays).toBe(3);
    expect(s.tripDays).toBe(1); // 只 count location !== qingdao（xian）
    expect(s.breakdown).toEqual({ normal: 1, overtime: 1, rest: 1, leaveAm: 1, leavePm: 0, leaveFull: 1 });
  });
  it('带范围：只统计范围内（含边界）', () => {
    const s = calcStats(reports, { start: '2026-08-01', end: '2026-08-03' });
    expect(s.workDays).toBe(1.5);
    expect(s.restDays).toBe(1);
    expect(s.internDays).toBe(2);
    expect(s.regularDays).toBe(1);
    expect(s.tripDays).toBe(0);
  });
});

describe('notes-utils：日历网格', () => {
  it('2026-08：周一起、6×7 定网格、连续日期（月前/月末灰格填相邻月）', () => {
    const grid = buildMonthGrid(2026, 7); // 8 月，index 7
    expect(grid.length).toBe(6);
    grid.forEach((w) => expect(w.length).toBe(7));
    // 2026-08-01 是周六：周一开头偏移 5 → 前 5 格为 2026-07 灰格（27-31 号）
    expect(grid[0].slice(0, 5)).toEqual([
      { date: '2026-07-27', inMonth: false },
      { date: '2026-07-28', inMonth: false },
      { date: '2026-07-29', inMonth: false },
      { date: '2026-07-30', inMonth: false },
      { date: '2026-07-31', inMonth: false },
    ]);
    expect(grid[0][5]).toEqual({ date: '2026-08-01', inMonth: true });
    expect(grid[0][6]).toEqual({ date: '2026-08-02', inMonth: true });
    // 31 天 → 最后一行第 1 格为 31 号，其后为 2026-09 灰格（1 号起）
    expect(grid[5][0]).toEqual({ date: '2026-08-31', inMonth: true });
    expect(grid[5][1]).toEqual({ date: '2026-09-01', inMonth: false });
    expect(grid[5][2]).toEqual({ date: '2026-09-02', inMonth: false });
    // 当月真实日期数 = 31；无 null 格
    expect(grid.flat().filter((c) => c.inMonth).length).toBe(31);
    expect(grid.flat().every((c) => c && typeof c.date === 'string')).toBe(true);
  });
  it('2024-02 闰年 29 天 inMonth', () => {
    const grid = buildMonthGrid(2024, 1);
    const days = grid.flat().filter((c) => c.inMonth);
    expect(days.length).toBe(29);
    expect(days[0]).toEqual({ date: '2024-02-01', inMonth: true });
    expect(days[days.length - 1]).toEqual({ date: '2024-02-29', inMonth: true });
  });
});

describe('notes-utils：竖向日历月份跨度', () => {
  const reports = [
    { date: '2026-03-05', attendance: 'normal', phase: 'intern', location: 'qingdao' },
    { date: '2026-08-01', attendance: 'normal', phase: 'intern', location: 'qingdao' },
  ];
  it('calendarMonthSpan：至少回溯 11 个月（一年窗口）+ 终点当前月+1', () => {
    // 无记录：当前月(2026-08)减 11 → 2025-09，终点当前月+1 → 2026-09
    expect(calendarMonthSpan([], '2026-08-15')).toEqual({ start: { year: 2025, month: 9 }, end: { year: 2026, month: 9 } });
    // 2026-03 记录不早于窗口 → start 仍 2025-09
    expect(calendarMonthSpan(reports, '2026-08-15')).toEqual({ start: { year: 2025, month: 9 }, end: { year: 2026, month: 9 } });
    // 更早记录（2025-01）→ start 取记录月
    expect(calendarMonthSpan([{ date: '2025-01-10', attendance: 'normal', phase: 'intern', location: 'qingdao' }], '2026-08-15'))
      .toEqual({ start: { year: 2025, month: 1 }, end: { year: 2026, month: 9 } });
    // 未来预填 2026-12 记录 → 窗口尾覆盖该月（key 帧 12 月溢出到次年 1 月：end={2027,0}，12 月块仍在窗口内）
    expect(calendarMonthSpan([{ date: '2026-12-01', attendance: 'normal', phase: 'regular', location: 'xian' }], '2026-08-15'))
      .toEqual({ start: { year: 2025, month: 9 }, end: { year: 2027, month: 0 } });
  });
  it('monthSeq：含两端升序 + 跨年', () => {
    expect(monthSeq({ year: 2026, month: 11 }, { year: 2027, month: 1 }))
      .toEqual([{ year: 2026, month: 11 }, { year: 2027, month: 0 }, { year: 2027, month: 1 }]);
  });
  it('monthLabel', () => {
    expect(monthLabel(2026, 7)).toBe('2026年8月');
  });
});

describe('notes-utils：选项顺序持久化', () => {
  it('orderedOptions：按 order 重排 + 未知 value 过滤 + 缺失补尾', () => {
    expect(orderedOptions(ATTENDANCE_OPTIONS, ['overtime', 'normal', 'bogus', 'rest']).map((o) => o.value))
      .toEqual(['overtime', 'normal', 'rest', 'leave-am', 'leave-pm', 'leave-full']);
    expect(orderedOptions(PHASE_OPTIONS, ['regular']).map((o) => o.value)).toEqual(['regular', 'intern']);
    expect(orderedOptions(LOCATION_OPTIONS, null).map((o) => o.value)).toEqual(['qingdao', 'xian']);
  });
  it('saveOptionOrder → loadOptionOrder 往返', () => {
    saveOptionOrder({ attendance: ['leave-full', 'normal'], phase: ['intern', 'regular'], location: ['xian', 'qingdao'] });
    expect(loadOptionOrder()).toEqual({ attendance: ['leave-full', 'normal'], phase: ['intern', 'regular'], location: ['xian', 'qingdao'] });
  });
  it('loadOptionOrder：坏 JSON / 结构不符 → {}', () => {
    localStorage.setItem('evolveos.notes.optionOrder', '{oops');
    expect(loadOptionOrder()).toEqual({});
    localStorage.setItem('evolveos.notes.optionOrder', '{"attendance":"not-array"}');
    expect(loadOptionOrder()).toEqual({});
  });
});

describe('notes-utils：导出/导入序列化', () => {
  const reports = [{ date: '2026-08-01', attendance: 'normal', phase: 'intern', location: 'qingdao', primary: '', secondary: '', updatedAt: 1 }];
  const templates = [{ id: 't1', name: '需求开发', primary: 'p', secondary: 's', createdAt: 1, updatedAt: 1 }];
  it('serializeExport → parseImport 往返还原', () => {
    const json = serializeExport(reports, templates);
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('evolveos.notes');
    expect(parsed.version).toBe(1);
    const res = parseImport(json);
    expect(res.ok).toBe(true);
    expect(res.data.reports).toEqual(reports);
    expect(res.data.templates).toEqual(templates);
  });
  it('parseImport 拒绝：非 JSON / 非本应用 / 版本不符 / 非法记录 / 非法模板', () => {
    expect(parseImport('oops').ok).toBe(false);
    expect(parseImport('{"app":"other","version":1,"reports":[],"templates":[]}').ok).toBe(false);
    expect(parseImport('{"app":"evolveos.notes","version":2,"reports":[],"templates":[]}').ok).toBe(false);
    expect(parseImport('{"app":"evolveos.notes","version":1,"reports":[{"date":"2026-08-01","attendance":"nope","phase":"intern","location":"qingdao"}],"templates":[]}').ok).toBe(false);
    expect(parseImport('{"app":"evolveos.notes","version":1,"reports":[],"templates":[{"id":"t1"}]}').ok).toBe(false);
  });
  it('parseImport 日期日历校验：拒绝不可能日期（2026-02-30），接受合法日期', () => {
    const bad = '{"app":"evolveos.notes","version":1,"reports":[{"date":"2026-02-30","attendance":"normal","phase":"intern","location":"qingdao"}],"templates":[]}';
    expect(parseImport(bad).ok).toBe(false);
    const good = '{"app":"evolveos.notes","version":1,"reports":[{"date":"2026-08-15","attendance":"normal","phase":"intern","location":"qingdao"}],"templates":[]}';
    expect(parseImport(good).ok).toBe(true);
  });
});

describe('牛马笔记 module 契约', () => {
  it('id/name/icon/order/dir/render/mount', () => {
    expect(module.id).toBe('notes');
    expect(module.name).toBe('牛马笔记');
    expect(module.icon).toBe('clipboard');
    expect(module.order).toBe(5);
    expect(module.dir.map((d) => d.id)).toEqual(['report', 'templates', 'stats']);
    expect(typeof module.render).toBe('function');
    expect(typeof module.mount).toBe('function');
  });
});

describe('牛马笔记 日报页渲染', () => {
  it('渲染报告列表容器/月份导航/写日报按钮；seed 数据出行', () => {
    localStorage.clear();
    upsertReport({ date: todayISO(), attendance: 'normal', phase: 'intern', location: 'qingdao', primary: '需求联调', secondary: '' });
    const html = notesPage({ dirId: 'report' });
    expect(html).toContain('data-notes-report-list');
    expect(html).toContain('data-notes-month');
    expect(html).toContain('写日报');
    expect(html).toContain('需求联调');
    expect(html).toContain('data-notes-month-prev');
  });
  it('未选目录默认日报页', () => {
    localStorage.clear();
    expect(notesPage({}).includes('data-notes-report-list')).toBe(true);
  });
});
