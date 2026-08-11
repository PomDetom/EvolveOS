// tokenTool 应用页：余额 / OpenCode Go 套餐用量监测（复用 codeplan-usage Rust 后端）。
// 桌面（Tauri）经 invoke 调 5 命令 + 收 balances-updated 事件；浏览器（无 __TAURI__）只渲染
// 「需桌面端使用」空态。壳契约：render(ctx) → HTML；mount(pageEl, ctx) → 交互挂载。
import { renderButton } from '../../components/button/button.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderDialog } from '../../components/dialog/dialog.js';
import { renderInput } from '../../components/input/input.js';
import { renderSelect } from '../../components/select/select.js';
import { toast } from '../../components/toast/toast.js';
import { accountCard, escapeHtml, formatRelative } from './token-tool-utils.js';
import './token-tool.css';

export function tokenToolPage() {
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">TokenTool</h2>
    </div>`;
  if (typeof window.__TAURI__ === 'undefined') {
    return `${head}
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'bolt',
          title: '需桌面端使用',
          desc: 'tokenTool 依赖 Tauri 后端抓取 DeepSeek / OpenCode 余额，请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  return `${head}
    <div class="app-main__page-body">
      <div class="tt__toolbar">
        <span class="tt__toolbar-hint">账户余额 / OpenCode Go 套餐用量监测</span>
        <div class="tt__toolbar-actions">
          ${renderButton({ label: '立即刷新', iconName: 'refresh' })}
          ${renderButton({ label: '添加账户', variant: 'secondary', iconName: 'plus' })}
        </div>
      </div>
      <div class="tt__grid" data-tt-grid>
        ${renderEmptyState({ iconName: 'box', title: '加载中…' })}
      </div>
    </div>`;
}

// —— 交互挂载（壳 render 后调用；每次进页重挂，先释放上次挂载，防监听/定时器泄漏）——

const disposes = new WeakMap();

export function mountTokenTool(pageEl) {
  if (typeof window.__TAURI__ === 'undefined') return; // 浏览器：空态已由 render 输出
  const api = window.__TAURI__.core;
  const grid = pageEl.querySelector('[data-tt-grid]');
  const toolbar = pageEl.querySelector('.tt__toolbar');
  if (!grid || !toolbar) return;

  disposes.get(pageEl)?.(); // 壳重渲染复用同一 pageEl → 先释放上次挂载
  let disposed = false;
  let unlisten = null;
  let timer = null;
  let config = { accounts: [] };
  let balances = [];

  const renderAccounts = () => {
    if (disposed) return;
    grid.innerHTML = config.accounts.length
      ? config.accounts
          .map((acc) => accountCard(acc, balances.find((b) => b.accountId === acc.id)))
          .join('')
      : renderEmptyState({
          iconName: 'box',
          title: '暂无账户',
          desc: '添加一个 DeepSeek 或 OpenCode Go 账户开始监测。',
          action: { label: '添加账户', variant: 'primary', iconName: 'plus' },
        });
  };

  const renderLastRefreshes = () => {
    if (disposed) return;
    pageEl.querySelectorAll('[data-tt-last]').forEach((el) => {
      el.textContent = `上次刷新: ${formatRelative(Number(el.dataset.ttLast))}`;
    });
  };

  const errMsg = (err) => (typeof err === 'string' ? err : (err && err.message) || '未知错误');

  const load = async () => {
    try {
      config = await api.invoke('get_config');
    } catch (err) {
      toast(`读取配置失败: ${errMsg(err)}`, { variant: 'danger' });
    }
    try {
      balances = await api.invoke('get_balances');
    } catch (err) {
      /* 冷启动快照失败可忽略，等 balances-updated */
    }
    renderAccounts();
  };

  const saveConfig = async () => {
    try {
      await api.invoke('save_config', { config });
    } catch (err) {
      toast(`保存失败（变更可能未持久化）: ${errMsg(err)}`, { variant: 'danger' });
    }
    await load();
  };

  const openEditor = async (id) => {
    const existing = id ? config.accounts.find((a) => a.id === id) : null;
    const acc = await openEditorDialog(existing);
    if (!acc) return;
    acc.id = existing?.id ?? crypto.randomUUID();
    const idx = config.accounts.findIndex((a) => a.id === acc.id);
    if (idx >= 0) config.accounts[idx] = acc;
    else config.accounts.push(acc);
    await saveConfig();
  };

  const testAccount = async (id) => {
    const acc = config.accounts.find((a) => a.id === id);
    if (!acc) return;
    try {
      const bal = await api.invoke('test_account', { account: acc });
      balances = balances.filter((b) => b.accountId !== id);
      balances.push(bal);
      renderAccounts();
    } catch (err) {
      toast(`测试失败: ${errMsg(err)}`, { variant: 'danger' });
    }
  };

  const deleteAccount = async (id) => {
    config.accounts = config.accounts.filter((a) => a.id !== id);
    await saveConfig();
  };

  const onToolbar = (e) => {
    const btn = e.target.closest('.c-btn');
    if (!btn) return;
    if (btn.textContent.includes('立即刷新')) {
      api.invoke('refresh_all').catch(() => {});
    } else if (btn.textContent.includes('添加账户')) {
      openEditor();
    }
  };

  const onGrid = (e) => {
    const actionEl = e.target.closest('[data-tt-action]');
    if (!actionEl) return;
    const card = actionEl.closest('.tt__card');
    if (!card) return;
    const action = actionEl.dataset.ttAction;
    const id = card.dataset.ttId;
    if (action === 'test') testAccount(id);
    else if (action === 'edit') openEditor(id);
    else if (action === 'del') deleteAccount(id);
  };

  toolbar.addEventListener('click', onToolbar);
  grid.addEventListener('click', onGrid);

  window.__TAURI__.event.listen('balances-updated', (e) => {
    if (disposed) return;
    balances = e.payload ?? [];
    renderAccounts();
  }).then((un) => { unlisten = un; }).catch(() => {});

  timer = window.setInterval(renderLastRefreshes, 30 * 1000);

  disposes.set(pageEl, () => {
    disposed = true;
    clearInterval(timer);
    unlisten?.();
    toolbar.removeEventListener('click', onToolbar);
    grid.removeEventListener('click', onGrid);
  });

  load();
}

// —— 添加/编辑账户对话框 ——
// openDialog 组件在确认时即移除 DOM，无法在 Promise 外取表单值；故复用 renderDialog 结构
// 自行接线：kind 联动显隐、确认时收集字段、Esc/遮罩/取消关闭。

function editorFormHtml(existing, kind) {
  const e = existing ?? {};
  const ds = kind === 'opencode_go' ? ' hidden' : '';
  const oc = kind === 'opencode_go' ? '' : ' hidden';
  return `
    <div class="tt__form">
      <label class="tt__field" data-tt-field="name">
        <span class="tt__field-label">名称</span>
        ${renderInput({ value: escapeHtml(e.name ?? ''), placeholder: '账户备注名', label: '名称' })}
      </label>
      <label class="tt__field" data-tt-field="kind">
        <span class="tt__field-label">类型</span>
        ${renderSelect({
          value: kind,
          options: [
            { value: 'deepseek', label: 'DeepSeek 官方' },
            { value: 'opencode_go', label: 'OpenCode Go 套餐' },
          ],
        })}
      </label>
      <div class="tt__field" data-tt-field="baseUrl" data-tt-row="deepseek"${ds}>
        <span class="tt__field-label">接口地址</span>
        ${renderInput({ value: escapeHtml(e.baseUrl ?? 'https://api.deepseek.com'), placeholder: 'https://api.deepseek.com', label: '接口地址' })}
      </div>
      <div class="tt__field" data-tt-field="apiKey" data-tt-row="deepseek"${ds}>
        <span class="tt__field-label">API Key</span>
        ${renderInput({ type: 'password', value: escapeHtml(e.apiKey ?? ''), placeholder: 'sk-...', label: 'API Key' })}
      </div>
      <div class="tt__field" data-tt-field="workspace" data-tt-row="opencode_go"${oc}>
        <span class="tt__field-label">Workspace ID</span>
        ${renderInput({ value: escapeHtml(e.workspaceId ?? ''), placeholder: 'wrk_xxx', label: 'Workspace ID' })}
      </div>
      <div class="tt__field" data-tt-field="cookie" data-tt-row="opencode_go"${oc}>
        <span class="tt__field-label">Auth Cookie</span>
        ${renderInput({ type: 'password', value: escapeHtml(e.authCookie ?? ''), placeholder: 'auth=... 整段', label: 'Auth Cookie' })}
      </div>
      <div class="tt__field" data-tt-field="interval">
        <span class="tt__field-label">刷新间隔(秒)</span>
        ${renderInput({ type: 'number', value: e.refreshIntervalSecs ?? 300, placeholder: '300', label: '刷新间隔(秒)' })}
      </div>
    </div>`;
}

function collectEditor(body) {
  const val = (key) => body.querySelector(`[data-tt-field="${key}"] .c-input, [data-tt-field="${key}"] .c-select`)?.value.trim() ?? '';
  const name = val('name');
  if (!name) {
    toast('请填写账户名称', { variant: 'danger' });
    return null;
  }
  const kind = body.querySelector('[data-tt-field="kind"] .c-select').value;
  const isOpen = kind === 'opencode_go';
  const interval = Number(val('interval')) || 300;
  return {
    name,
    kind,
    baseUrl: isOpen ? 'https://opencode.ai' : (val('baseUrl') || 'https://api.deepseek.com'),
    apiKey: isOpen ? '' : val('apiKey'),
    workspaceId: isOpen ? (val('workspace') || null) : null,
    authCookie: isOpen ? (val('cookie') || null) : null,
    refreshIntervalSecs: Math.max(30, interval),
    warnThreshold: 10,
  };
}

function openEditorDialog(existing) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    const kind = existing?.kind ?? 'deepseek';
    mask.innerHTML = renderDialog({
      title: existing ? '编辑账户' : '添加账户',
      content: editorFormHtml(existing, kind),
      confirmLabel: '保存',
      cancelLabel: '取消',
    });
    const dialog = mask.querySelector('.c-dialog');
    const body = mask.querySelector('.c-dialog__body');
    const kindSel = body.querySelector('[data-tt-field="kind"] .c-select');

    const syncKind = () => {
      const k = kindSel.value;
      body.querySelector('[data-tt-row="deepseek"]').hidden = k !== 'deepseek';
      body.querySelector('[data-tt-row="opencode_go"]').hidden = k !== 'opencode_go';
    };

    const done = (acc) => {
      document.removeEventListener('keydown', onKey);
      mask.remove();
      resolve(acc);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };

    kindSel.addEventListener('change', syncKind);
    mask.querySelector('[data-action="cancel"]').addEventListener('click', () => done(null));
    mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', () => done(null));
    mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', () => {
      const acc = collectEditor(body);
      if (acc) done(acc);
    });
    mask.addEventListener('click', (e) => { if (e.target === mask) done(null); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    dialog.querySelector('.c-dialog__close').focus();
    syncKind();
  });
}
