// 牛马笔记应用页：日报列表 + 编辑器 + 出勤统计。壳契约：render(ctx)→HTML；mount(pageEl,ctx)→交互挂载。
import { renderButton } from '../../components/button/button.js';
import { renderTextarea } from '../../components/textarea/textarea.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderDialog, openDialog } from '../../components/dialog/dialog.js';
import { renderPopover, mountPopover } from '../../components/popover/popover.js';
import { toast } from '../../components/toast/toast.js';
import { icon } from '../../components/icon/icon.js';
import * as U from './notes-utils.js';
import './notes.css';

// 会话内纯 UI 态：月份选择（不进 store；重进页回默认当前月）
const currentYM = () => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; };
const uiState = { report: currentYM(), stats: currentYM() };

export function notesPage(ctx) {
  U.ensureSeedTemplates();
  const dirId = ctx?.dirId ?? 'report';
  if (dirId === 'templates') return templatePage(ctx);
  if (dirId === 'stats') return statsPage(ctx);
  return reportPage(ctx);
}

// —— 日报页 ——
export function reportPage(ctx) {
  const { year, month } = uiState.report;
  const range = U.monthRange(year, month);
  const reports = U.loadReports()
    .filter((r) => r.date >= range.start && r.date <= range.end)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">牛马笔记</h2>
      <span class="app-main__page-sub">› 日报</span>
    </div>`;
  return `${head}
    <div class="app-main__page-body">
      <div class="notes__toolbar">
        <div class="notes__month-nav">
          <button class="notes__month-btn" data-notes-month-prev aria-label="上个月" type="button">${icon('chevron-left', 16)}</button>
          <span class="notes__month-label" data-notes-month>${year}年${month + 1}月</span>
          <button class="notes__month-btn" data-notes-month-next aria-label="下个月" type="button">${icon('chevron-right', 16)}</button>
        </div>
        <span class="notes__write">${renderButton({ label: '写日报', iconName: 'plus' })}</span>
      </div>
      <div class="notes__report-list" data-notes-report-list>
        ${reportListHtml(reports)}
      </div>
    </div>`;
}

function reportListHtml(reports) {
  if (!reports.length) {
    return renderEmptyState({ iconName: 'clipboard', title: '本月暂无日报', desc: '点击「写日报」记录今天的工作', action: { label: '写日报', iconName: 'plus' } });
  }
  return reports.map(reportRow).join('');
}

function reportRow(r) {
  const primary = r.primary ? `<span class="notes__report-primary">${U.escapeHtml(r.primary)}</span>` : '';
  return `
    <button class="notes__report-row" type="button" data-date="${r.date}">
      <span class="notes__report-date">${U.fmtDate(r.date)}</span>
      <span class="c-tag notes__tag--${r.attendance}">${U.ATTENDANCE_LABELS[r.attendance]}</span>
      <span class="notes__badge">${r.phase === 'intern' ? '实习期' : '正式期'}</span>
      <span class="notes__badge${r.location !== 'qingdao' ? ' notes__badge--trip' : ''}">${r.location === 'qingdao' ? '青岛' : '西安'}</span>
      ${primary}
    </button>`;
}

// —— 模板页 ——
export function templatePage(ctx) {
  const templates = U.loadTemplates();
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">牛马笔记</h2>
      <span class="app-main__page-sub">› 模板</span>
    </div>`;
  return `${head}
    <div class="app-main__page-body">
      <div class="notes__toolbar">
        <span class="notes__toolbar-hint">可复用工作内容模板，写日报时一键填入</span>
        <span class="notes__write">${renderButton({ label: '新建模板', iconName: 'plus' })}</span>
      </div>
      <div class="notes__template-list" data-notes-template-list>
        ${templateListHtml(templates)}
      </div>
    </div>`;
}

function templateListHtml(templates) {
  if (!templates.length) {
    return renderEmptyState({ iconName: 'copy', title: '暂无模板', desc: '新建常用工作内容模板，写日报时一键填入' });
  }
  return templates.map(templateRow).join('');
}

// renderButton 不支持 data-* 透传，行内按钮外包一层 <span data-notes-template-*>，e2e/挂载经 span 冒泡命中
function templateRow(t) {
  const preview = t.primary || t.secondary || '（无内容）';
  return `
    <div class="notes__template-row" data-id="${U.escapeHtml(t.id)}">
      <div class="notes__template-main">
        <span class="notes__template-name">${U.escapeHtml(t.name)}</span>
        <span class="notes__template-preview">${U.escapeHtml(preview)}</span>
      </div>
      <div class="notes__template-actions">
        <span data-notes-template-edit>${renderButton({ label: '编辑', variant: 'secondary', iconName: 'edit' })}</span>
        <span data-notes-template-del>${renderButton({ label: '删除', variant: 'danger', iconName: 'trash' })}</span>
      </div>
    </div>`;
}

function openTemplateEditor({ existing, onSaved }) {
  const isEdit = Boolean(existing);
  const mask = document.createElement('div');
  mask.className = 'notes__editor-mask';
  mask.innerHTML = renderDialog({
    title: isEdit ? '编辑模板' : '新建模板',
    confirmLabel: '保存',
    cancelLabel: '取消',
    content: `
      <div class="notes__editor">
        <div class="notes__field">
          <label class="notes__field-label">模板名称</label>
          <input class="c-input" type="text" data-notes-tpl="name" value="${U.escapeHtml(existing?.name ?? '')}" placeholder="如：需求开发">
        </div>
        <div class="notes__field">
          <label class="notes__field-label">主要内容</label>
          ${renderTemplateTextarea({ dataTpl: 'primary', value: existing?.primary ?? '', placeholder: '模板的主要工作内容', rows: 3, label: '主要内容' })}
        </div>
        <div class="notes__field">
          <label class="notes__field-label">次要内容（可空）</label>
          ${renderTemplateTextarea({ dataTpl: 'secondary', value: existing?.secondary ?? '', placeholder: '模板的次要工作内容', rows: 2, label: '次要内容' })}
        </div>
      </div>`,
  });
  document.body.appendChild(mask);
  const body = mask.querySelector('.c-dialog__body');
  const close = () => mask.remove();
  const onSave = () => {
    const name = body.querySelector('[data-notes-tpl="name"]').value.trim();
    const primary = body.querySelector('[data-notes-tpl="primary"]').value.trim();
    const secondary = body.querySelector('[data-notes-tpl="secondary"]').value.trim();
    if (!name) { toast('请填写模板名称', { variant: 'warning' }); return; }
    if (isEdit) U.upsertTemplate({ id: existing.id, name, primary, secondary });
    else U.upsertTemplate({ name, primary, secondary });
    toast(isEdit ? '模板已更新' : '模板已保存', { variant: 'success' });
    close();
    onSaved?.();
  };
  mask.querySelector('[data-action="cancel"]').addEventListener('click', close);
  mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', close);
  mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', onSave);
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
}

// —— 统计页（竖向连续日历：累计顶 → 日历中 → 活动月底；滚动联动 + 月标签弹面板）——
export function statsPage(ctx) {
  const all = U.loadReports();
  const today = U.todayISO();
  const span = U.calendarMonthSpan(all, today);
  const months = U.monthSeq(span.start, span.end);
  const active = uiState.stats; // {year, month}，默认当前月；日历滚动/面板跳转会更新
  const activeRange = U.monthRange(active.year, active.month);
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">牛马笔记</h2>
      <span class="app-main__page-sub">› 统计</span>
    </div>`;
  return `${head}
    <div class="app-main__page-body">
      <div class="notes__toolbar">
        <span class="notes__toolbar-hint">累计 · 日历 · 活动月</span>
        <div class="notes__toolbar-actions">
          <span class="notes__io">${renderButton({ label: '导出', variant: 'secondary', iconName: 'download' })}</span>
          <span class="notes__io">${renderButton({ label: '导入', variant: 'secondary', iconName: 'upload' })}</span>
        </div>
      </div>
      <div class="notes__stats-groups" data-notes-stats-total>
        ${statsGroupHtml('累计', U.calcStats(all))}
      </div>
      <div class="notes__cal-wrap" data-notes-cal>
        ${calendarHtml(all, months)}
        ${legendHtml()}
      </div>
      <div class="notes__stats-groups" data-notes-stats-month>
        ${statsGroupHtml(U.monthLabel(active.year, active.month), U.calcStats(all, activeRange))}
      </div>
    </div>`;
}

function statsGroupHtml(title, s) {
  return `
    <div class="notes__stats-group">
      <h3 class="notes__stats-title">${title}</h3>
      <div class="notes__stats-cards">
        ${statCard('牛马日', s.workDays)}
        ${statCard('休息日', s.restDays)}
        ${statCard('实习期', s.internDays)}
        ${statCard('正式期', s.regularDays)}
        ${statCard('出差日', s.tripDays)}
      </div>
      <div class="notes__stats-breakdown">
        ${breakdownItem('正常', s.breakdown.normal, 'normal')}
        ${breakdownItem('加班', s.breakdown.overtime, 'overtime')}
        ${breakdownItem('请假上午', s.breakdown.leaveAm, 'leave')}
        ${breakdownItem('请假下午', s.breakdown.leavePm, 'leave')}
        ${breakdownItem('请假全天', s.breakdown.leaveFull, 'leave')}
        ${breakdownItem('休息日', s.breakdown.rest, 'rest')}
      </div>
    </div>`;
}
function statCard(label, value) {
  return `<div class="notes__stat-card"><span class="notes__stat-label">${label}</span><span class="notes__stat-value">${value}<em class="notes__stat-unit">天</em></span></div>`;
}
function breakdownItem(label, n, cls) {
  return `<span class="notes__breakdown-item notes__breakdown-item--${cls}">${label} <b>${n}</b></span>`;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
function calendarHtml(all, months) {
  const byDate = new Map(all.map((r) => [r.date, r]));
  const today = U.todayISO();
  const [ty, tm] = today.split('-').map(Number);
  const headRow = `<div class="notes__cal-week notes__cal-week--head">${WEEKDAYS.map((w) => `<span class="notes__cal-weekday">${w}</span>`).join('')}</div>`;
  const monthBlocks = months.map(({ year, month }) => {
    const grid = U.buildMonthGrid(year, month);
    const rows = grid.map((week) => `
      <div class="notes__cal-week">
        ${week.map((cell) => {
          if (!cell.inMonth) return `<span class="notes__cal-cell notes__cal-cell--out">${Number(cell.date.slice(8))}</span>`;
          const date = cell.date;
          const r = byDate.get(date);
          const cls = ['notes__cal-cell'];
          if (r) cls.push(`notes__cal-cell--${r.attendance}`);
          if (r && r.location !== 'qingdao') cls.push('notes__cal-cell--trip');
          if (date === today) cls.push('notes__cal-cell--today');
          const dayNum = Number(date.slice(8));
          const dot = r && r.location !== 'qingdao' ? '<span class="notes__cal-trip-dot"></span>' : '';
          return `<button class="${cls.join(' ')}" type="button" data-date="${date}">${dayNum}${dot}</button>`;
        }).join('')}
      </div>`).join('');
    return `
      <div class="notes__cal-month" data-year="${year}" data-month="${month}">
        <div class="notes__cal-month-title">${U.monthLabel(year, month)}</div>
        ${headRow}${rows}
      </div>`;
  }).join('');
  const pickerMonths = Array.from({ length: 12 }, (_, m) =>
    `<button class="notes__cal-picker-month" type="button" data-cal-month="${m}">${m + 1}月</button>`).join('');
  return `
    <div class="notes__cal-scroll" data-notes-cal-scroll>
      <div class="notes__cal-head">
        <button class="notes__cal-nav" type="button" data-notes-cal-prev aria-label="上个月">${icon('chevron-left', 16)}</button>
        <button class="notes__cal-label" type="button" data-notes-cal-label>${U.monthLabel(ty, tm - 1)}</button>
        <button class="notes__cal-nav" type="button" data-notes-cal-next aria-label="下个月">${icon('chevron-right', 16)}</button>
      </div>
      <div class="notes__cal-months">${monthBlocks}</div>
    </div>
    <div class="notes__cal-picker" data-notes-cal-picker hidden>
      <div class="notes__cal-picker-year">
        <button class="notes__cal-nav" type="button" data-cal-year-prev aria-label="上一年">${icon('chevron-left', 14)}</button>
        <span class="notes__cal-picker-year-label" data-cal-year-label>${ty}</span>
        <button class="notes__cal-nav" type="button" data-cal-year-next aria-label="下一年">${icon('chevron-right', 14)}</button>
      </div>
      <div class="notes__cal-picker-months">${pickerMonths}</div>
    </div>`;
}

function legendHtml() {
  const base = U.ATTENDANCE_OPTIONS
    .filter((o) => ['normal', 'overtime', 'rest'].includes(o.value))
    .map((o) => `<span class="notes__legend-item"><i class="notes__legend-dot notes__legend-dot--${o.value}"></i>${o.label}</span>`)
    .join('');
  const leave = `<span class="notes__legend-item"><i class="notes__legend-dot notes__legend-dot--leave"></i>请假</span>`;
  const trip = `<span class="notes__legend-item"><i class="notes__legend-dot notes__legend-dot--trip"></i>出差</span>`;
  return `<div class="notes__legend">${base}${leave}${trip}</div>`;
}

// —— 编辑器（renderDialog 结构自行接线，token-tool 先例）——
function segItem(name, opt, checked) {
  return `<label class="notes__seg-item"><input type="radio" name="notes-${name}" value="${opt.value}"${checked === opt.value ? ' checked' : ''}><span>${opt.label}</span></label>`;
}

// renderTextarea 组件无 data-* 透传，本地包一层注入 data-notes-ed（编辑器 collect/模板填入依赖此选择器）
function renderEditorTextarea({ dataEd, value, placeholder, rows, label }) {
  return renderTextarea({ value, placeholder, rows, label }).replace('<textarea', `<textarea data-notes-ed="${dataEd}"`);
}

// renderTextarea 组件无 data-* 透传，本地包一层注入 data-notes-tpl（模板编辑器字段依赖此选择器）
function renderTemplateTextarea({ dataTpl, value, placeholder, rows, label }) {
  return renderTextarea({ value, placeholder, rows, label }).replace('<textarea', `<textarea data-notes-tpl="${dataTpl}"`);
}

// 确认对话框实底：openDialog 无 class 透传，用 body 标记类在确认弹窗打开期间施加 notes 作用域实底（与编辑器一致）
function notesConfirm(opts) {
  document.body.classList.add('notes__confirm');
  const p = openDialog(opts);
  p.finally(() => document.body.classList.remove('notes__confirm'));
  return p;
}

function editorFormHtml(existing, templates, date) {
  const e = existing ?? {};
  const order = U.loadOptionOrder();
  const tplList = templates.length
    ? templates.map((t) => `<button type="button" class="notes__tpl-item" data-notes-template="${U.escapeHtml(t.id)}">${U.escapeHtml(t.name)}</button>`).join('')
    : '<div class="notes__tpl-empty">暂无模板，可先在「模板」页新建</div>';
  const seg = (name, opts, checked) => `
    <div class="notes__seg" data-notes-opt-group="${name}">${U.orderedOptions(opts, order[name]).map((o) => segItem(name, o, checked)).join('')}</div>`;
  return `
  <div class="notes__editor">
    <div class="notes__field">
      <label class="notes__field-label">日期</label>
      <input class="c-input" type="date" data-notes-ed="date" value="${U.escapeHtml(e.date ?? date ?? U.todayISO())}">
    </div>
    <div class="notes__field">
      <label class="notes__field-label">出勤情况</label>
      ${seg('attendance', U.ATTENDANCE_OPTIONS, e.attendance ?? 'normal')}
    </div>
    <div class="notes__field">
      <label class="notes__field-label">工作阶段</label>
      ${seg('phase', U.PHASE_OPTIONS, e.phase ?? 'intern')}
    </div>
    <div class="notes__field">
      <label class="notes__field-label">所在地</label>
      ${seg('location', U.LOCATION_OPTIONS, e.location ?? 'qingdao')}
    </div>
    <div class="notes__field">
      <div class="notes__field-head">
        <label class="notes__field-label">主要工作内容</label>
        <div class="notes__tpl-picker">${renderPopover({ trigger: '从模板填入', content: tplList })}</div>
      </div>
      ${renderEditorTextarea({ dataEd: 'primary', value: e.primary ?? '', placeholder: '今天主要做了什么', rows: 3, label: '主要工作内容' })}
    </div>
    <div class="notes__field">
      <label class="notes__field-label">次要工作内容</label>
      ${renderEditorTextarea({ dataEd: 'secondary', value: e.secondary ?? '', placeholder: '其它事项（可空）', rows: 2, label: '次要工作内容' })}
    </div>
    ${existing ? `<button class="c-btn c-btn--danger notes__editor-del" data-notes-ed="del" type="button">删除这天日报</button>` : ''}
  </div>`;
}

export function openReportEditor({ date, existing, onSaved }) {
  const isEdit = Boolean(existing);
  const mask = document.createElement('div');
  mask.className = 'notes__editor-mask';
  mask.innerHTML = renderDialog({
    title: isEdit ? '编辑日报' : '写日报',
    content: editorFormHtml(existing, U.loadTemplates(), date),
    confirmLabel: '保存',
    cancelLabel: '取消',
  });
  document.body.appendChild(mask);
  const body = mask.querySelector('.c-dialog__body');
  mountPopover(body);
  wireSegDrag(body);

  let subOpen = false; // 次级确认对话框打开期间忽略 Esc，防叠层同关
  const close = () => { mask.remove(); document.removeEventListener('keydown', onKey); };
  const collect = () => {
    const q = (n) => body.querySelector(`[data-notes-ed="${n}"]`);
    return {
      date: q('date').value.trim(),
      attendance: body.querySelector('input[name="notes-attendance"]:checked')?.value,
      phase: body.querySelector('input[name="notes-phase"]:checked')?.value,
      location: body.querySelector('input[name="notes-location"]:checked')?.value,
      primary: q('primary').value.trim(),
      secondary: q('secondary').value.trim(),
    };
  };
  const onSave = async () => {
    const v = collect();
    if (!v.date || !v.attendance || !v.phase || !v.location) {
      toast('请填写日期与出勤情况', { variant: 'warning' });
      return;
    }
    const existingForDate = U.loadReports().find((r) => r.date === v.date);
    if (existingForDate && !(isEdit && existingForDate.date === existing.date)) {
      subOpen = true;
      const ok = await notesConfirm({ title: '覆盖确认', content: `<p>${U.fmtDate(v.date)} 已有一条日报，保存将覆盖。继续？</p>`, confirmLabel: '覆盖', danger: true });
      subOpen = false;
      if (!ok) return;
    }
    U.upsertReport(v);
    // 编辑且改了日期：新记录已落库，移除原日期旧记录，防重复
    if (isEdit && existing.date !== v.date) U.deleteReport(existing.date);
    toast(isEdit ? '日报已更新' : '日报已保存', { variant: 'success' });
    close();
    onSaved?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && !subOpen) { close(); }
  };

  mask.querySelector('[data-action="cancel"]').addEventListener('click', close);
  mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', close);
  mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', onSave);
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  document.addEventListener('keydown', onKey);

  const delBtn = body.querySelector('[data-notes-ed="del"]');
  if (delBtn) delBtn.addEventListener('click', async () => {
    subOpen = true;
    const ok = await notesConfirm({ title: '删除确认', content: `<p>删除 ${U.fmtDate(existing.date)} 的日报？</p>`, confirmLabel: '删除', danger: true });
    subOpen = false;
    if (!ok) return;
    U.deleteReport(existing.date);
    toast('日报已删除', { variant: 'info' });
    close();
    onSaved?.();
  });

  // 模板一键填入（仅当字段为空或确认覆盖）
  body.querySelectorAll('[data-notes-template]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const t = U.loadTemplates().find((x) => x.id === btn.dataset.notesTemplate);
      if (!t) return;
      const primary = body.querySelector('[data-notes-ed="primary"]');
      const secondary = body.querySelector('[data-notes-ed="secondary"]');
      const needsOverwrite = (t.primary && primary.value.trim()) || (t.secondary && secondary.value.trim());
      if (needsOverwrite) {
        subOpen = true;
        const ok = await notesConfirm({ title: '替换内容', content: '<p>模板将覆盖已填写的字段内容。继续？</p>', confirmLabel: '替换' });
        subOpen = false;
        if (!ok) return;
      }
      if (t.primary) primary.value = t.primary;
      if (t.secondary) secondary.value = t.secondary;
      const wrap = btn.closest('.c-popover');
      wrap?.classList.remove('c-popover--open');
      wrap?.querySelector('.c-popover__trigger')?.setAttribute('aria-expanded', 'false');
      wrap?.querySelector('.c-popover__panel')?.setAttribute('aria-hidden', 'true');
    });
  });
}

// —— 编辑器分组选项 HTML5 拖拽换位：同组内重排 + 顺序持久化（仅渲染序，不影响数据值/配色/统计）——
function wireSegDrag(body) {
  body.querySelectorAll('[data-notes-opt-group]').forEach((group) => {
    let source = null;
    const clearDrop = () => {
      group.querySelectorAll('.notes__seg-item').forEach((x) => x.classList.remove('notes__seg-item--drop-before', 'notes__seg-item--drop-after'));
    };
    const persist = () => {
      // 读当前 DOM 序写入该组；补齐全部组（loadOptionOrder 要求三组皆数组，防部分写入被丢弃）
      const order = {};
      body.querySelectorAll('[data-notes-opt-group]').forEach((g) => {
        order[g.dataset.notesOptGroup] = Array.from(g.querySelectorAll('.notes__seg-item input')).map((inp) => inp.value);
      });
      U.saveOptionOrder(order);
    };
    group.querySelectorAll('.notes__seg-item').forEach((item) => {
      item.draggable = true;
      item.addEventListener('dragstart', (e) => {
        source = item;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'notes-opt');
        item.classList.add('notes__seg-item--dragging');
      });
      item.addEventListener('dragover', (e) => {
        if (!source || source === item) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = item.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        clearDrop();
        item.classList.add(after ? 'notes__seg-item--drop-after' : 'notes__seg-item--drop-before');
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        clearDrop();
        if (!source || source === item) { source = null; return; }
        const rect = item.getBoundingClientRect();
        const before = e.clientY <= rect.top + rect.height / 2;
        const target = item;
        source.remove();
        if (before) target.before(source);
        else target.after(source);
        source = null;
        persist();
      });
      item.addEventListener('dragend', () => {
        group.querySelectorAll('.notes__seg-item').forEach((x) => x.classList.remove('notes__seg-item--dragging'));
        clearDrop();
        source = null;
      });
    });
  });
}

// —— mount（壳每次进页重挂；先释放上次挂载）——
const disposes = new WeakMap();
export function mountNotes(pageEl, ctx) {
  const dirId = ctx?.dirId ?? 'report';
  disposes.get(pageEl)?.();
  const dis = [];
  disposes.set(pageEl, () => dis.forEach((f) => f()));
  if (dirId === 'templates') mountTemplatePage(pageEl, dis);
  else if (dirId === 'stats') mountStatsPage(pageEl, dis);
  else mountReportPage(pageEl, dis);
}

function mountReportPage(pageEl, dis) {
  const listEl = pageEl.querySelector('[data-notes-report-list]');
  const labelEl = pageEl.querySelector('[data-notes-month]');
  // asNew=true（写日报入口）始终开新编辑器；行点击才是编辑（existing 命中同日期记录）
  const openEditor = (date, asNew = false) => {
    const existing = asNew ? null : (U.loadReports().find((r) => r.date === date) || null);
    openReportEditor({ date, existing, onSaved: refresh });
  };
  function refresh() {
    const { year, month } = uiState.report;
    const range = U.monthRange(year, month);
    const reports = U.loadReports().filter((r) => r.date >= range.start && r.date <= range.end).sort((a, b) => (a.date < b.date ? 1 : -1));
    listEl.innerHTML = reportListHtml(reports);
    bindList();
  }
  const bindList = () => {
    listEl.querySelectorAll('.notes__report-row').forEach((row) =>
      row.addEventListener('click', () => openEditor(row.dataset.date)));
    listEl.querySelector('.c-empty__action .c-btn')?.addEventListener('click', () => openEditor(U.todayISO(), true));
  };
  const goMonth = (delta) => {
    const d = new Date(uiState.report.year, uiState.report.month + delta, 1);
    uiState.report = { year: d.getFullYear(), month: d.getMonth() };
    labelEl.textContent = `${uiState.report.year}年${uiState.report.month + 1}月`;
    refresh();
  };
  pageEl.querySelector('.notes__write .c-btn')?.addEventListener('click', () => openEditor(U.todayISO(), true));
  pageEl.querySelector('[data-notes-month-prev]')?.addEventListener('click', () => goMonth(-1));
  pageEl.querySelector('[data-notes-month-next]')?.addEventListener('click', () => goMonth(1));
  bindList();
}

// —— 模板页 mount ——
function mountTemplatePage(pageEl, dis) {
  const listEl = pageEl.querySelector('[data-notes-template-list]');
  function refresh() { listEl.innerHTML = templateListHtml(U.loadTemplates()); bindList(); }
  const bindList = () => {
    listEl.querySelectorAll('.notes__template-row').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-notes-template-edit]')?.addEventListener('click', () => {
        const t = U.loadTemplates().find((x) => x.id === id);
        if (t) openTemplateEditor({ existing: t, onSaved: refresh });
      });
      row.querySelector('[data-notes-template-del]')?.addEventListener('click', async () => {
        const ok = await notesConfirm({ title: '删除模板', content: '<p>删除该模板？</p>', confirmLabel: '删除', danger: true });
        if (!ok) return;
        U.deleteTemplate(id);
        toast('模板已删除', { variant: 'info' });
        refresh();
      });
    });
  };
  pageEl.querySelector('.notes__write .c-btn')?.addEventListener('click', () => openTemplateEditor({ onSaved: refresh }));
  bindList();
}

// —— 统计页 mount（竖向连续日历：初始定位当前月 + 滚动联动 + ‹ › 切换 + 月标签弹面板 + 格开编辑器）——
function mountStatsPage(pageEl, dis) {
  const calWrap = pageEl.querySelector('[data-notes-cal]');
  const statsTotalEl = pageEl.querySelector('[data-notes-stats-total]');
  const statsMonthEl = pageEl.querySelector('[data-notes-stats-month]');
  const openEditor = (date) => {
    const existing = U.loadReports().find((r) => r.date === date) || null;
    openReportEditor({ date, existing, onSaved: refresh });
  };

  // 日历交互引用随 refresh 重渲染后失效，统一经 queryRefs 重新获取
  let calScroll, calHead, labelEl, picker, pickerYearLabel;
  const queryRefs = () => {
    calScroll = calWrap.querySelector('[data-notes-cal-scroll]');
    calHead = calWrap.querySelector('.notes__cal-head');
    labelEl = calWrap.querySelector('[data-notes-cal-label]');
    picker = calWrap.querySelector('[data-notes-cal-picker]');
    pickerYearLabel = calWrap.querySelector('[data-cal-year-label]');
  };
  queryRefs();
  let pickerYear = uiState.stats.year;
  // 平滑滚动期间冻结活动月联动：防 ‹ › / 面板跳转时 label 出现 departure → target → departure 抖动
  let scrolling = false;
  let scrollTimer = 0;

  const allMonths = () => {
    const all = U.loadReports();
    const span = U.calendarMonthSpan(all, U.todayISO());
    return U.monthSeq(span.start, span.end);
  };
  const monthEls = () => Array.from(calScroll.querySelectorAll('.notes__cal-month'));
  const monthBlockEl = (year, month) => calScroll.querySelector(`.notes__cal-month[data-year="${year}"][data-month="${month}"]`);
  const headHeight = () => calHead.offsetHeight;

  const renderMonthGroup = (year, month) => {
    const all = U.loadReports();
    const range = U.monthRange(year, month);
    statsMonthEl.innerHTML = statsGroupHtml(U.monthLabel(year, month), U.calcStats(all, range));
  };
  const setActive = (year, month) => {
    uiState.stats = { year, month };
    labelEl.textContent = U.monthLabel(year, month);
    renderMonthGroup(year, month);
  };
  const scrollToMonth = (block, smooth) => {
    const wrapRect = calScroll.getBoundingClientRect();
    const delta = block.getBoundingClientRect().top - wrapRect.top - headHeight();
    if (smooth) calScroll.scrollTo({ top: calScroll.scrollTop + delta, behavior: 'smooth' });
    else calScroll.scrollTop += delta;
  };
  const nearestMonth = (year, month) => {
    const months = allMonths();
    const target = year * 12 + month;
    let best = months[0];
    let bestDiff = Infinity;
    for (const m of months) {
      const diff = Math.abs(m.year * 12 + m.month - target);
      if (diff < bestDiff) { bestDiff = diff; best = m; }
    }
    return best;
  };

  // 滚动联动：参考线 = 滚动容器顶 + 头高，取最近月块并设为活动月
  const syncActiveFromScroll = () => {
    const refLine = calScroll.getBoundingClientRect().top + headHeight();
    const blocks = monthEls();
    if (!blocks.length) return;
    let best = blocks[0];
    let bestDiff = Infinity;
    for (const b of blocks) {
      const diff = Math.abs(b.getBoundingClientRect().top - refLine);
      if (diff < bestDiff) { bestDiff = diff; best = b; }
    }
    const year = Number(best.dataset.year);
    const month = Number(best.dataset.month);
    if (uiState.stats.year === year && uiState.stats.month === month) return;
    setActive(year, month);
  };
  const endSmoothScroll = () => {
    if (!scrolling) return;
    clearTimeout(scrollTimer);
    scrolling = false;
    syncActiveFromScroll(); // 落定后执行一次最终联动
  };
  const onScroll = () => {
    if (scrolling) {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(endSmoothScroll, 150); // 末次滚动后 ~150ms 落定（scrollend 兜底）
      return;
    }
    syncActiveFromScroll();
  };

  const bindCal = () => {
    calWrap.querySelectorAll('.notes__cal-cell[data-date]').forEach((cell) =>
      cell.addEventListener('click', () => openEditor(cell.dataset.date)));
  };

  const goToMonth = (year, month, smooth) => {
    let y = year, m = month;
    let block = monthBlockEl(y, m);
    if (!block) {
      const n = nearestMonth(y, m);
      y = n.year; m = n.month;
      block = monthBlockEl(y, m);
    }
    if (!block) return;
    setActive(y, m);
    if (smooth) {
      scrolling = true; // 冻结 onScroll 联动，label 在整个滑动过程保持目标月
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(endSmoothScroll, 400); // 兜底：scrollend 缺失或无需滚动（delta=0）
    }
    scrollToMonth(block, smooth);
  };

  // 面板开关（外部点击 / Esc 关闭）
  const openPicker = () => {
    pickerYear = uiState.stats.year;
    pickerYearLabel.textContent = String(pickerYear);
    picker.hidden = false;
  };
  const closePicker = () => { picker.hidden = true; };

  // 日历头/面板交互：refresh 重渲染后需重新挂载
  const bindCalNav = () => {
    calScroll.addEventListener('scroll', onScroll, { passive: true });
    dis.push(() => calScroll.removeEventListener('scroll', onScroll));
    calScroll.addEventListener('scrollend', endSmoothScroll);
    dis.push(() => calScroll.removeEventListener('scrollend', endSmoothScroll));
    calWrap.querySelector('[data-notes-cal-prev]').addEventListener('click', () => {
      const { year, month } = uiState.stats;
      goToMonth(year, month - 1, true);
    });
    calWrap.querySelector('[data-notes-cal-next]').addEventListener('click', () => {
      const { year, month } = uiState.stats;
      goToMonth(year, month + 1, true);
    });
    calWrap.querySelector('[data-notes-cal-label]').addEventListener('click', () => (picker.hidden ? openPicker() : closePicker()));
    calWrap.querySelector('[data-cal-year-prev]').addEventListener('click', () => {
      pickerYear -= 1;
      pickerYearLabel.textContent = String(pickerYear);
    });
    calWrap.querySelector('[data-cal-year-next]').addEventListener('click', () => {
      pickerYear += 1;
      pickerYearLabel.textContent = String(pickerYear);
    });
    calWrap.querySelectorAll('[data-cal-month]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closePicker();
        goToMonth(pickerYear, Number(btn.dataset.calMonth), true);
      });
    });
  };

  function refresh() {
    const all = U.loadReports();
    const today = U.todayISO();
    const span = U.calendarMonthSpan(all, today);
    const months = U.monthSeq(span.start, span.end);
    // 活动月可能超出新跨度（删数据后），clamp 回跨度内
    const sKey = span.start.year * 12 + span.start.month;
    const eKey = span.end.year * 12 + span.end.month;
    const aKey = uiState.stats.year * 12 + uiState.stats.month;
    const active = aKey < sKey ? span.start : (aKey > eKey ? span.end : uiState.stats);
    statsTotalEl.innerHTML = statsGroupHtml('累计', U.calcStats(all));
    calWrap.innerHTML = calendarHtml(all, months) + legendHtml();
    queryRefs();
    bindCal();
    bindCalNav();
    // 恢复滚动位置到活动月块（防跳回当前月）
    const block = monthBlockEl(active.year, active.month);
    if (block) scrollToMonth(block, false);
    setActive(active.year, active.month);
  }

  // —— 初始定位：当前月（重进页回默认当前月），无平滑 ——
  const [ty, tm] = U.todayISO().split('-').map(Number);
  const initMonth = nearestMonth(ty, tm - 1);
  const initBlock = monthBlockEl(initMonth.year, initMonth.month);
  setActive(initMonth.year, initMonth.month);
  if (initBlock) scrollToMonth(initBlock, false);

  // —— 面板外部点击 / Esc 关闭（不随 refresh 重挂载，闭包读最新引用）——
  const onDocClick = (e) => {
    if (!picker.hidden && !picker.contains(e.target) && !labelEl.contains(e.target)) closePicker();
  };
  const onKey = (e) => { if (e.key === 'Escape' && !picker.hidden) closePicker(); };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  dis.push(() => document.removeEventListener('click', onDocClick));
  dis.push(() => document.removeEventListener('keydown', onKey));

  bindCal();
  bindCalNav();
  bindIO(pageEl, refresh);
}

// 导出 / 导入（统计页工具栏）
function bindIO(pageEl, refresh) {
  const btns = pageEl.querySelectorAll('.notes__io .c-btn');
  if (btns.length < 2) return;
  const [exportBtn, importBtn] = btns;

  exportBtn.addEventListener('click', () => {
    const json = U.serializeExport(U.loadReports(), U.loadTemplates());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `牛马笔记-${U.todayISO().replace(/-/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出备份', { variant: 'success' });
  });

  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      const res = U.parseImport(await file.text());
      if (!res.ok) { toast(res.error, { variant: 'danger' }); return; }
      const ok = await notesConfirm({ title: '导入确认', content: '<p>导入将<strong>全量覆盖</strong>当前所有日报与模板。继续？</p>', confirmLabel: '覆盖导入', danger: true });
      if (!ok) return;
      U.saveReports(res.data.reports);
      U.saveTemplates(res.data.templates);
      toast('导入成功', { variant: 'success' });
      refresh();
    });
    input.click();
  });
}
