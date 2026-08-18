// 密码管理器应用页。桌面优先：浏览器（无 __TAURI__）渲染「需桌面端使用」空态；
// 桌面经 window.__TAURI__.core.invoke 调后端命令。锁态/目录页由 mount 按运行时状态填充 data-key-body。
import { renderButton } from '../../components/button/button.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderDialog } from '../../components/dialog/dialog.js';
import { renderInput } from '../../components/input/input.js';
import { renderSwitch, mountSwitch } from '../../components/switch/switch.js';
import { renderSearchBar, mountSearchBar } from '../../components/search-bar/search-bar.js';
import { renderBadge } from '../../components/badge/badge.js';
import { toast } from '../../components/toast/toast.js';
import { icon } from '../../components/icon/icon.js';
import {
  VAULT_PATH_KEY, REMEMBER_PATH_KEY,
  escapeHtml, filterEntries, allTags, sortByName, splitTags, isRememberPathEnabled,
} from './key-utils.js';
import './key.css';

export function keyPage(ctx) {
  if (typeof window.__TAURI__ === 'undefined') {
    return `
      <div class="app-main__page-head">
        <h2 class="app-main__page-title">密码</h2>
      </div>
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'key',
          title: '需桌面端使用',
          desc: '密码管理器依赖 Tauri 桌面后端（Argon2id + AES-256-GCM 加密保险库），请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  const sub = ctx.dirName ? ` › ${ctx.dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">密码</h2>
      ${ctx.dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body" data-key-body></div>`;
}

// —— 交互挂载（每次左右窗切换重挂；WeakMap 按 pageEl 释放上次挂载）——

const disposes = new WeakMap();

export function mountKey(pageEl, ctx) {
  if (typeof window.__TAURI__ === 'undefined') return;
  const body = pageEl.querySelector('[data-key-body]');
  if (!body) return;
  disposes.get(pageEl)?.();

  let disposed = false;
  const api = window.__TAURI__.core;
  const errMsg = (err) => (typeof err === 'string' ? err : (err && err.message) || '未知错误');

  let entries = [];
  let vaultPath = '';
  let query = '';
  let activeTags = [];
  const revealed = new Set();

  const render = () => {
    if (disposed) return;
    if (!vaultPath) renderLocked();
    else if (ctx.dirId === 'data') renderData();
    else if (ctx.dirId === 'settings') renderSettings();
    else renderAll();
  };

  // —— 会话探测：list_entries + current_vault_path 同时失败 = 锁定 ——
  const load = async () => {
    try {
      const [es, path] = await Promise.all([
        api.invoke('list_entries'),
        api.invoke('current_vault_path'),
      ]);
      entries = es; vaultPath = path; revealed.clear();
      render();
    } catch {
      entries = []; vaultPath = ''; revealed.clear();
      render(); // 锁定屏
    }
  };

  const rememberPath = () => isRememberPathEnabled();

  // —— 锁定屏 ——
  const renderLocked = () => {
    const remembered = localStorage.getItem(VAULT_PATH_KEY) || '';
    let mode = 'unlock';
    body.innerHTML = `
      <div class="key__lock">
        <div class="key__lock-icon">${icon('lock', 32)}</div>
        <h3 class="key__lock-title">保险库已锁定</h3>
        <p class="key__lock-desc">输入主密码解锁现有保险库，或创建一个新的。主密码仅本次会话使用，绝不保存。</p>
        <div class="key__field">
          <label class="key__field-label" for="key-path">保险库文件路径</label>
          <div class="key__path-row">
            ${renderInput({ value: escapeHtml(remembered), placeholder: 'vault.json 的完整路径', label: '保险库文件路径' })}
            <button type="button" class="key__act" data-key-pick title="选择保存位置" aria-label="选择保存位置">${icon('folder', 15)}</button>
          </div>
        </div>
        <div class="key__field">
          <label class="key__field-label" for="key-pwd">主密码</label>
          ${renderInput({ type: 'password', value: '', placeholder: '主密码', label: '主密码' })}
        </div>
        <div class="key__field">
          <span class="key__field-label">模式</span>
          <div class="key__mode">
            <button type="button" class="key__mode-btn is-active" data-key-mode="unlock">解锁现有</button>
            <button type="button" class="key__mode-btn" data-key-mode="create">创建新保险库</button>
          </div>
        </div>
        ${renderButton({ label: '解锁', variant: 'primary', iconName: 'log-out' })}
      </div>`;
    const pathInput = body.querySelector('.c-input');
    const pwdInput = body.querySelectorAll('.c-input')[1];
    const submitBtn = body.querySelector('.key__lock .c-btn');

    body.querySelector('[data-key-pick]').addEventListener('click', async () => {
      try {
        const p = await api.invoke('pick_vault_path');
        if (p) pathInput.value = p;
      } catch (err) { toast(`选择路径失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });

    const syncMode = (m) => {
      mode = m;
      body.querySelectorAll('[data-key-mode]').forEach((b) =>
        b.classList.toggle('is-active', b.dataset.keyMode === m));
      submitBtn.textContent = m === 'create' ? '创建并解锁' : '解锁';
    };
    body.querySelectorAll('[data-key-mode]').forEach((b) =>
      b.addEventListener('click', () => syncMode(b.dataset.keyMode)));

    if (!remembered) {
      api.invoke('default_vault_path').then((p) => {
        if (!disposed && !pathInput.value) pathInput.value = p;
      }).catch(() => {});
    }

    const submit = async () => {
      const path = pathInput.value.trim();
      const master = pwdInput.value;
      if (!path) { toast('请填写保险库路径', { variant: 'danger' }); return; }
      if (!master) { toast('请填写主密码', { variant: 'danger' }); return; }
      try {
        if (mode === 'create') await api.invoke('create_vault', { path, masterPassword: master });
        else await api.invoke('unlock_vault', { path, masterPassword: master });
        if (rememberPath()) localStorage.setItem(VAULT_PATH_KEY, path);
        pwdInput.value = '';
        await load();
      } catch (err) {
        const msg = errMsg(err);
        toast(`解锁失败: ${msg}${mode === 'create' ? '（若文件已存在请用「解锁现有」模式）' : ''}`, { variant: 'danger' });
      }
    };
    submitBtn.addEventListener('click', submit);
    pwdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  };

  // —— 全部：工具栏 + 搜索 + 标签筛选 + 列表 ——
  const entryRow = (e) => `
    <div class="key__row" data-key-id="${escapeHtml(e.id)}">
      <div class="key__row-main">
        <div class="key__row-name">${escapeHtml(e.name)}</div>
        <div class="key__row-meta">
          ${e.username ? `<span>${escapeHtml(e.username)}</span>` : ''}
          ${e.url ? `<span class="key__row-url">${escapeHtml(e.url)}</span>` : ''}
          ${(e.tags || []).map((t) => renderBadge({ label: escapeHtml(t) })).join('')}
        </div>
        ${revealed.has(e.id) ? `<div class="key__row-pass">${escapeHtml(e.password)}</div>` : ''}
      </div>
      <div class="key__row-actions">
        <button class="key__act" type="button" data-key-act="copy-user" title="复制用户名" aria-label="复制用户名">${icon('copy', 15)}</button>
        <button class="key__act" type="button" data-key-act="copy-pass" title="复制密码" aria-label="复制密码">${icon('clipboard', 15)}</button>
        <button class="key__act" type="button" data-key-act="reveal" title="${revealed.has(e.id) ? '隐藏密码' : '显示密码'}" aria-label="${revealed.has(e.id) ? '隐藏密码' : '显示密码'}">${icon('eye', 15)}</button>
        <button class="key__act" type="button" data-key-act="edit" title="编辑" aria-label="编辑">${icon('edit', 15)}</button>
        <button class="key__act key__act--danger" type="button" data-key-act="del" title="删除" aria-label="删除">${icon('trash', 15)}</button>
      </div>
    </div>`;

  const renderList = () => {
    const listEl = body.querySelector('[data-key-list]');
    if (!listEl) return;
    const filtered = sortByName(filterEntries(entries, { query, activeTags }));
    listEl.innerHTML = filtered.length
      ? filtered.map(entryRow).join('')
      : renderEmptyState({
          iconName: 'box',
          title: '暂无条目',
          desc: query || activeTags.length ? '没有符合筛选条件的条目。' : '点击「添加」创建第一个密码条目。',
        });
  };

  const renderAll = () => {
    const tags = allTags(entries);
    body.innerHTML = `
      <div class="key__toolbar">
        <div class="key__toolbar-search">${renderSearchBar({ placeholder: '搜索名称 / 网址 / 用户名…' })}</div>
        <div class="key__toolbar-actions">
          ${renderButton({ label: '添加', variant: 'primary', iconName: 'plus' })}
          ${renderButton({ label: '锁定', variant: 'secondary', iconName: 'lock' })}
        </div>
      </div>
      ${tags.length ? `<div class="key__tags">${tags.map((t) => `<button type="button" class="key__tag${activeTags.includes(t) ? ' is-active' : ''}" data-key-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div>` : ''}
      <div class="key__list" data-key-list></div>`;
    mountSearchBar(body, { onQuery: (q) => { query = q; renderList(); } });
    const searchInput = body.querySelector('.c-search-bar__input');
    if (searchInput && query) {
      searchInput.value = query;
      searchInput.closest('.c-search-bar').classList.add('c-search-bar--has-input');
    }
    renderList();
  };

  // —— 数据管理 ——
  const renderData = () => {
    const remembered = localStorage.getItem(VAULT_PATH_KEY) || '';
    body.innerHTML = `
      <div class="key__cards">
        <div class="app-main__card">
          <h3 class="app-main__card-title">导出备份</h3>
          <p class="app-main__card-desc">导出为明文 JSON（含密码），请妥善保管。</p>
          <div class="key__field">
            <div class="key__path-row">
              ${renderInput({ value: escapeHtml(remembered), placeholder: '导出文件路径', label: '导出路径' })}
              <button type="button" class="key__act" data-key-pick-export title="选择保存位置" aria-label="选择保存位置">${icon('folder', 15)}</button>
            </div>
          </div>
          ${renderButton({ label: '导出备份', variant: 'primary', iconName: 'download' })}
        </div>
        <div class="app-main__card">
          <h3 class="app-main__card-title">导入恢复</h3>
          <p class="app-main__card-desc">从明文 JSON 合并导入条目（新增，不覆盖）。</p>
          <div class="key__field">
            <div class="key__path-row">
              ${renderInput({ value: '', placeholder: '导入文件路径', label: '导入路径' })}
              <button type="button" class="key__act" data-key-pick-import title="选择保存位置" aria-label="选择保存位置">${icon('folder', 15)}</button>
            </div>
          </div>
          ${renderButton({ label: '导入恢复', variant: 'secondary', iconName: 'upload' })}
        </div>
        <div class="app-main__card">
          <h3 class="app-main__card-title">保险库信息</h3>
          <div class="key__info"><span>路径</span><code>${escapeHtml(vaultPath)}</code></div>
          <div class="key__info"><span>条目数</span><b>${entries.length}</b></div>
        </div>
      </div>`;
    const inputs = body.querySelectorAll('.key__cards .key__field .c-input');
    const exportBtn = body.querySelectorAll('.key__cards .c-btn')[0];
    const importBtn = body.querySelectorAll('.key__cards .c-btn')[1];
    const pickExport = body.querySelector('[data-key-pick-export]');
    const pickImport = body.querySelector('[data-key-pick-import]');
    pickExport.addEventListener('click', async () => {
      try { const p = await api.invoke('pick_vault_path'); if (p) inputs[0].value = p; }
      catch (err) { toast(`选择路径失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });
    pickImport.addEventListener('click', async () => {
      try { const p = await api.invoke('pick_vault_path'); if (p) inputs[1].value = p; }
      catch (err) { toast(`选择路径失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });
    exportBtn.addEventListener('click', async () => {
      const p = inputs[0].value.trim();
      if (!p) { toast('请填写导出路径', { variant: 'danger' }); return; }
      try { await api.invoke('export_vault', { path: p }); toast('导出成功', { variant: 'success' }); }
      catch (err) { toast(`导出失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });
    importBtn.addEventListener('click', async () => {
      const p = inputs[1].value.trim();
      if (!p) { toast('请填写导入路径', { variant: 'danger' }); return; }
      try {
        const n = await api.invoke('import_vault', { path: p });
        await load();
        toast(`导入 ${n} 条`, { variant: 'success' });
      } catch (err) { toast(`导入失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });
  };

  // —— 设置 ——
  const renderSettings = () => {
    body.innerHTML = `
      <div class="key__cards">
        <div class="app-main__card">
          <h3 class="app-main__card-title">偏好</h3>
          <div class="key__setting">
            <div class="key__setting-text">
              <span class="key__setting-name">记住上次保险库路径</span>
              <span class="key__setting-desc">解锁/创建成功后保存路径，下次自动预填。主密码绝不保存。</span>
            </div>
            ${renderSwitch({ checked: isRememberPathEnabled(), label: '记住上次保险库路径' })}
          </div>
          <div class="key__setting">
            <div class="key__setting-text">
              <span class="key__setting-name">清除记住的路径</span>
              <span class="key__setting-desc">移除本地保存的保险库路径。</span>
            </div>
            ${renderButton({ label: '清除', variant: 'secondary', iconName: 'trash' })}
          </div>
        </div>
        <div class="app-main__card">
          <h3 class="app-main__card-title">关于</h3>
          <p class="app-main__card-desc">密码管理器：Argon2id 派生密钥 + AES-256-GCM 加密保险库，主密码不落盘、仅桌面端可用。导出文件为明文 JSON，请妥善保管。</p>
        </div>
      </div>`;
    mountSwitch(body);
    const sw = body.querySelector('.c-switch');
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') === 'true';
      localStorage.setItem(REMEMBER_PATH_KEY, on ? 'true' : 'false');
    });
    body.querySelectorAll('.key__cards .c-btn').forEach((btn) => {
      if (btn.textContent.includes('清除')) {
        btn.addEventListener('click', () => {
          localStorage.removeItem(VAULT_PATH_KEY);
          toast('已清除记住的路径', { variant: 'success' });
        });
      }
    });
  };

  // —— 条目编辑器对话框 ——
  const openEntryEditor = (id) => {
    const existing = id ? entries.find((e) => e.id === id) : null;
    return new Promise((resolve) => {
      const mask = document.createElement('div');
      mask.className = 'key__editor';
      mask.innerHTML = renderDialog({
        title: existing ? '编辑条目' : '添加条目',
        content: editorFormHtml(existing),
        confirmLabel: '保存',
        cancelLabel: '取消',
      });
      const dialog = mask.querySelector('.c-dialog');
      const bodyEl = mask.querySelector('.c-dialog__body');
      const pwdInput = bodyEl.querySelector('[data-key-field="password"] .c-input');
      const optsBox = bodyEl.querySelector('[data-key-gen-opts]');

      const genPassword = async () => {
        const opts = {
          length: Number(optsBox.querySelector('input[type="number"]').value) || 16,
          useLower: optsBox.querySelector('[data-key-gen-opt="lower"]').checked,
          useUpper: optsBox.querySelector('[data-key-gen-opt="upper"]').checked,
          useDigits: optsBox.querySelector('[data-key-gen-opt="digits"]').checked,
          useSymbols: optsBox.querySelector('[data-key-gen-opt="symbols"]').checked,
          excludeAmbiguous: optsBox.querySelector('[data-key-gen-opt="excludeAmbiguous"]').checked,
        };
        try {
          const pw = await api.invoke('generate_password', opts);
          pwdInput.value = pw;
          // 生成后转 type=text 预览随机密码（原 type=password 被遮罩，用户看不到生成结果）
          pwdInput.type = 'text';
        } catch (err) { toast(`生成失败: ${errMsg(err)}`, { variant: 'danger' }); }
      };

      bodyEl.querySelector('[data-key-gen]').addEventListener('click', () => {
        optsBox.hidden = !optsBox.hidden;
        if (!optsBox.hidden) genPassword();
      });
      optsBox.querySelectorAll('[data-key-gen-opt]').forEach((cb) =>
        cb.addEventListener('change', () => { if (!optsBox.hidden) genPassword(); }));
      optsBox.querySelector('input[type="number"]').addEventListener('change', () => {
        if (!optsBox.hidden) genPassword();
      });

      const done = (input) => {
        document.removeEventListener('keydown', onKey);
        mask.remove();
        resolve(input);
      };
      const onKey = (e) => { if (e.key === 'Escape') done(null); };

      const collect = () => {
        const val = (key) => bodyEl.querySelector(`[data-key-field="${key}"] .c-input`).value.trim();
        const name = val('name');
        if (!name) { toast('请填写名称', { variant: 'danger' }); return null; }
        const tagsRaw = val('tags');
        return {
          name,
          url: val('url') || null,
          username: val('username'),
          password: val('password'),
          notes: val('notes') || null,
          tags: splitTags(tagsRaw),
        };
      };

      const save = async () => {
        const input = collect();
        if (!input) return;
        try {
          if (existing) await api.invoke('update_entry', { id, ...input });
          else await api.invoke('create_entry', input);
          await load();
          done(input);
        } catch (err) { toast(`保存失败: ${errMsg(err)}`, { variant: 'danger' }); }
      };

      mask.querySelector('[data-action="cancel"]').addEventListener('click', () => done(null));
      mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', () => done(null));
      mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', save);
      mask.addEventListener('click', (e) => { if (e.target !== dialog && !dialog.contains(e.target)) done(null); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(mask);
      dialog.querySelector('.c-dialog__close').focus();
    });
  };

  function editorFormHtml(e) {
    e = e || {};
    return `
      <div class="key__form">
        <label class="key__field" data-key-field="name">
          <span class="key__field-label">名称</span>
          ${renderInput({ value: escapeHtml(e.name ?? ''), placeholder: '如：GitHub', label: '名称' })}
        </label>
        <label class="key__field" data-key-field="url">
          <span class="key__field-label">网址</span>
          ${renderInput({ value: escapeHtml(e.url ?? ''), placeholder: 'https://…', label: '网址' })}
        </label>
        <label class="key__field" data-key-field="username">
          <span class="key__field-label">用户名</span>
          ${renderInput({ value: escapeHtml(e.username ?? ''), placeholder: '邮箱或账号', label: '用户名' })}
        </label>
        <div class="key__field" data-key-field="password">
          <span class="key__field-label">密码</span>
          <div class="key__pass-row">
            ${renderInput({ type: 'password', value: escapeHtml(e.password ?? ''), placeholder: '密码', label: '密码' })}
            <button class="key__act" type="button" data-key-gen title="生成随机密码" aria-label="生成随机密码">${icon('bolt', 15)}</button>
          </div>
          <div class="key__gen-opts" data-key-gen-opts hidden>
            <label class="key__gen-opt">长度 ${renderInput({ type: 'number', value: 16, label: '长度' })}</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="lower" checked> 小写</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="upper" checked> 大写</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="digits" checked> 数字</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="symbols" checked> 符号</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="excludeAmbiguous"> 排除易混</label>
          </div>
        </div>
        <label class="key__field" data-key-field="notes">
          <span class="key__field-label">备注</span>
          ${renderInput({ value: escapeHtml(e.notes ?? ''), placeholder: '备注（可选）', label: '备注' })}
        </label>
        <label class="key__field" data-key-field="tags">
          <span class="key__field-label">标签</span>
          ${renderInput({ value: escapeHtml((e.tags || []).join(', ')), placeholder: '逗号分隔，如：工作, 邮箱', label: '标签' })}
        </label>
      </div>`;
  }

  // —— 行为 ——
  const copyText = async (text, kind) => {
    try { await navigator.clipboard.writeText(text); toast(`已复制${kind}`); }
    catch { toast(`复制${kind}失败`, { variant: 'danger' }); }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('确认删除该条目？此操作不可撤销。')) return;
    try {
      await api.invoke('delete_entry', { id });
      entries = entries.filter((e) => e.id !== id);
      toast('已删除', { variant: 'success' });
      renderList();
    } catch (err) { toast(`删除失败: ${errMsg(err)}`, { variant: 'danger' }); }
  };

  const doLock = async () => {
    try { await api.invoke('lock_vault'); } catch {}
    entries = []; vaultPath = ''; revealed.clear();
    render();
  };

  const onClick = (e) => {
    const act = e.target.closest('[data-key-act]');
    if (act) {
      const row = act.closest('[data-key-id]');
      if (!row) return;
      const id = row.dataset.keyId;
      const entry = entries.find((x) => x.id === id);
      if (!entry) return;
      const a = act.dataset.keyAct;
      if (a === 'copy-user') copyText(entry.username, '用户名');
      else if (a === 'copy-pass') copyText(entry.password, '密码');
      else if (a === 'reveal') {
        if (revealed.has(id)) revealed.delete(id); else revealed.add(id);
        renderList();
      } else if (a === 'edit') openEntryEditor(id);
      else if (a === 'del') deleteEntry(id);
      return;
    }
    const tag = e.target.closest('[data-key-tag]');
    if (tag) {
      const t = tag.dataset.keyTag;
      activeTags = activeTags.includes(t) ? activeTags.filter((x) => x !== t) : [...activeTags, t];
      renderAll();
      return;
    }
    const btn = e.target.closest('.key__toolbar-actions .c-btn');
    if (btn) {
      if (btn.textContent.includes('添加')) openEntryEditor();
      else if (btn.textContent.includes('锁定')) doLock();
    }
  };

  body.addEventListener('click', onClick);

  disposes.set(pageEl, () => {
    disposed = true;
    body.removeEventListener('click', onClick);
  });

  load();
}
