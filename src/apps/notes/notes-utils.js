// 牛马笔记纯函数数据层：localStorage CRUD / 出勤权重 / 时间工具 / 转义。
// 页面渲染与交互不得在此引入 DOM——本文件全部为可单测纯函数。

// —— 枚举（value 为存储值，label 为展示文案）——
export const ATTENDANCE_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'overtime', label: '加班' },
  { value: 'rest', label: '休息日' },
  { value: 'leave-am', label: '请假（上午）' },
  { value: 'leave-pm', label: '请假（下午）' },
  { value: 'leave-full', label: '请假（全天）' },
];
export const PHASE_OPTIONS = [
  { value: 'intern', label: '实习期' },
  { value: 'regular', label: '正式期' },
];
export const LOCATION_OPTIONS = [
  { value: 'qingdao', label: '青岛' },
  { value: 'xian', label: '西安' },
];
export const ATTENDANCE_LABELS = Object.fromEntries(ATTENDANCE_OPTIONS.map((o) => [o.value, o.label]));

// —— 牛马日权重（半天请假 = 0.5，全天请假/休息日 = 0）——
const WORK_DAY_WEIGHTS = { normal: 1, overtime: 1, rest: 0, 'leave-am': 0.5, 'leave-pm': 0.5, 'leave-full': 0 };
export function workDayFraction(attendance) {
  return WORK_DAY_WEIGHTS[attendance] ?? 0;
}

// —— 存储（坏 JSON / 结构不符 → 空数组，不阻塞页面）——
const REPORTS_KEY = 'evolveos.notes.reports';
const TEMPLATES_KEY = 'evolveos.notes.templates';

function safeParse(raw) {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function loadReports() { return safeParse(localStorage.getItem(REPORTS_KEY)); }
export function saveReports(reports) { localStorage.setItem(REPORTS_KEY, JSON.stringify(reports)); }
export function upsertReport(report) {
  const reports = loadReports();
  const next = { ...report, updatedAt: Date.now() };
  const i = reports.findIndex((r) => r.date === report.date);
  if (i >= 0) reports[i] = next;
  else reports.push(next);
  saveReports(reports);
  return reports;
}
export function deleteReport(date) {
  const reports = loadReports().filter((r) => r.date !== date);
  saveReports(reports);
  return reports;
}

export function loadTemplates() { return safeParse(localStorage.getItem(TEMPLATES_KEY)); }
export function saveTemplates(templates) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); }
let templateSeq = 0;
export function upsertTemplate(tpl) {
  const templates = loadTemplates();
  if (tpl.id) {
    const i = templates.findIndex((t) => t.id === tpl.id);
    if (i >= 0) templates[i] = { ...templates[i], name: tpl.name, primary: tpl.primary, secondary: tpl.secondary, updatedAt: Date.now() };
  } else {
    templateSeq += 1;
    templates.push({ id: `tpl-${Date.now()}-${templateSeq}`, name: tpl.name, primary: tpl.primary, secondary: tpl.secondary, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveTemplates(templates);
  return templates;
}
export function deleteTemplate(id) {
  const templates = loadTemplates().filter((t) => t.id !== id);
  saveTemplates(templates);
  return templates;
}

// —— 时间工具 ——
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthRange(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const m = String(month + 1).padStart(2, '0');
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${String(daysInMonth).padStart(2, '0')}` };
}
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

// —— 转义 ——
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// —— 统计（range 缺省 = 全量；出差日 = 所在地非青岛）——
export function calcStats(reports, range) {
  const stats = {
    workDays: 0, restDays: 0, internDays: 0, regularDays: 0, tripDays: 0,
    breakdown: { normal: 0, overtime: 0, rest: 0, leaveAm: 0, leavePm: 0, leaveFull: 0 },
  };
  for (const r of reports) {
    if (range && (r.date < range.start || r.date > range.end)) continue;
    stats.workDays += workDayFraction(r.attendance);
    if (r.attendance === 'rest') stats.restDays += 1;
    if (r.phase === 'intern') stats.internDays += 1;
    if (r.phase === 'regular') stats.regularDays += 1;
    if (r.location !== 'qingdao') stats.tripDays += 1;
    const b = stats.breakdown;
    if (r.attendance === 'normal') b.normal += 1;
    else if (r.attendance === 'overtime') b.overtime += 1;
    else if (r.attendance === 'rest') b.rest += 1;
    else if (r.attendance === 'leave-am') b.leaveAm += 1;
    else if (r.attendance === 'leave-pm') b.leavePm += 1;
    else if (r.attendance === 'leave-full') b.leaveFull += 1;
  }
  return stats;
}

// —— 日历：周一起、6×7 定网格，格值为 ISO 日期串或 null ——
export function buildMonthGrid(year, month) {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const m = String(month + 1).padStart(2, '0');
  const grid = [];
  let week = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startOffset + 1;
    week.push(dayNum >= 1 && dayNum <= daysInMonth
      ? `${year}-${m}-${String(dayNum).padStart(2, '0')}`
      : null);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  return grid;
}

// —— 序列化（导出/导入校验）——
const VALID_ATTENDANCE = new Set(ATTENDANCE_OPTIONS.map((o) => o.value));
const VALID_PHASE = new Set(PHASE_OPTIONS.map((o) => o.value));
const VALID_LOCATION = new Set(LOCATION_OPTIONS.map((o) => o.value));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function serializeExport(reports, templates) {
  return JSON.stringify({ app: 'evolveos.notes', version: 1, exportedAt: Date.now(), reports, templates }, null, 2);
}
export function parseImport(json) {
  let data;
  try { data = JSON.parse(json); } catch { return { ok: false, error: '无法解析备份文件' }; }
  if (!data || data.app !== 'evolveos.notes' || data.version !== 1) return { ok: false, error: '文件不是有效的牛马笔记备份' };
  if (!Array.isArray(data.reports) || !Array.isArray(data.templates)) return { ok: false, error: '备份结构不完整' };
  const validReport = (r) => r && typeof r.date === 'string' && DATE_RE.test(r.date)
    && VALID_ATTENDANCE.has(r.attendance) && VALID_PHASE.has(r.phase) && VALID_LOCATION.has(r.location);
  if (!data.reports.every(validReport)) return { ok: false, error: '备份含非法日报记录' };
  const validTemplate = (t) => t && typeof t.id === 'string' && typeof t.name === 'string';
  if (!data.templates.every(validTemplate)) return { ok: false, error: '备份含非法模板' };
  return { ok: true, data: { reports: data.reports, templates: data.templates } };
}
