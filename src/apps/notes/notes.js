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

// —— 统计 占位（Task 5 实装替换）——
function statsPage(ctx) {
  return pageStub(ctx, '统计', '出勤统计与日历即将上线', 'layout');
}
function pageStub(ctx, sub, desc, iconName) {
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">牛马笔记</h2>
      <span class="app-main__page-sub">› ${sub}</span>
    </div>
    <div class="app-main__page-body">
      ${renderEmptyState({ iconName, title: sub, desc })}
    </div>`;
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

function editorFormHtml(existing, templates) {
  const e = existing ?? {};
  const tplList = templates.length
    ? templates.map((t) => `<button type="button" class="notes__tpl-item" data-notes-template="${U.escapeHtml(t.id)}">${U.escapeHtml(t.name)}</button>`).join('')
    : '<div class="notes__tpl-empty">暂无模板，可先在「模板」页新建</div>';
  return `
  <div class="notes__editor">
    <div class="notes__field">
      <label class="notes__field-label">日期</label>
      <input class="c-input" type="date" data-notes-ed="date" value="${U.escapeHtml(e.date ?? '')}">
    </div>
    <div class="notes__field">
      <label class="notes__field-label">出勤情况</label>
      <div class="notes__seg">${U.ATTENDANCE_OPTIONS.map((o) => segItem('attendance', o, e.attendance ?? 'normal')).join('')}</div>
    </div>
    <div class="notes__field">
      <label class="notes__field-label">工作阶段</label>
      <div class="notes__seg">${U.PHASE_OPTIONS.map((o) => segItem('phase', o, e.phase ?? 'intern')).join('')}</div>
    </div>
    <div class="notes__field">
      <label class="notes__field-label">所在地</label>
      <div class="notes__seg">${U.LOCATION_OPTIONS.map((o) => segItem('location', o, e.location ?? 'qingdao')).join('')}</div>
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
    content: editorFormHtml(existing, U.loadTemplates()),
    confirmLabel: '保存',
    cancelLabel: '取消',
  });
  document.body.appendChild(mask);
  const body = mask.querySelector('.c-dialog__body');
  mountPopover(body);

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
      const ok = await openDialog({ title: '覆盖确认', content: `<p>${U.fmtDate(v.date)} 已有一条日报，保存将覆盖。继续？</p>`, confirmLabel: '覆盖', danger: true });
      subOpen = false;
      if (!ok) return;
    }
    U.upsertReport(v);
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
    const ok = await openDialog({ title: '删除确认', content: `<p>删除 ${U.fmtDate(existing.date)} 的日报？</p>`, confirmLabel: '删除', danger: true });
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
        const ok = await openDialog({ title: '替换内容', content: '<p>模板将覆盖已填写的字段内容。继续？</p>', confirmLabel: '替换' });
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
        const ok = await openDialog({ title: '删除模板', content: '<p>删除该模板？</p>', confirmLabel: '删除', danger: true });
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

// 占位 mount（Task 5 实装）
function mountStatsPage() {}
