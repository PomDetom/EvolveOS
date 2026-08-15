import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATTENDANCE_OPTIONS, ATTENDANCE_LABELS, PHASE_OPTIONS, LOCATION_OPTIONS,
  workDayFraction, loadReports, saveReports, upsertReport, deleteReport,
  loadTemplates, saveTemplates, upsertTemplate, deleteTemplate,
  todayISO, monthRange, fmtDate, escapeHtml,
} from '../../src/apps/notes/notes-utils.js';

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
