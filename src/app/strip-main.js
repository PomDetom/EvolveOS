// FloatStrip 悬浮条入口（Task A5，规格 §5）：body 级独立渲染一个悬浮条实例。
// 内容 = 实时 token 监测（余量/余额）：Tauri 下 invoke get_config + get_balances 并订阅
// balances-updated（Rust app.emit 广播全窗口）；浏览器无 __TAURI__ 回退占位。
// main.js 在 ?mode=strip 时动态 import 本模块并调用 mountStripMode()。
// 组件 CSS 随本模块按需加载（docs 模式零冲击：docs 不 import 本模块，样式不进入 docs）。
import { renderFloatStrip, mountFloatStrip } from '../components/float-strip/float-strip.js';
import '../components/float-strip/float-strip.css';
import { getConfig, saveConfig } from '../config/store.js';
import { applyConfig } from '../config/apply.js';

/** 悬浮窗窗口尺寸（纯函数，可单测）：CSS 像素 → {width,height}（ceil + 至少 1px） */
export function computeFitSize(rect) {
  return {
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height)),
  };
}

/** 最小化 HTML 转义（本地实现，零依赖）—— 账户名为用户输入，不得成为 XSS sink */
function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * 账户状态（悬浮条状态点语义）：error → err；OpenCode 取最高用量窗口
 * （≥90% err / ≥70% warn / 其余 ok）；无数据 → none（灰点）。
 */
export function stripAccountStatus(account, balance) {
  if (balance?.error) return 'err';
  const isOpen = account?.kind === 'opencode_go';
  if (isOpen) {
    const wins = balance?.windows ?? [];
    if (!wins.length) return 'none';
    const maxPct = Math.max(...wins.map((w) => w.usedPct ?? 0));
    if (maxPct >= 90) return 'err';
    if (maxPct >= 70) return 'warn';
    return 'ok';
  }
  return balance?.balance != null ? 'ok' : 'none';
}

/** OpenCode 三窗口短标记（key → 短标记，常量安全；未知 key 回落 label 并转义） */
const STRIP_WINDOW_MARKS = { rolling: '5h', weekly: '周', monthly: '月' };

/** 账户值（悬浮条单行口径）：DeepSeek=余额；OpenCode=全部窗口短标记 + 百分比（空格拼接，如 5h29% 周50% 月80%） */
export function stripAccountValue(account, balance) {
  const isOpen = account?.kind === 'opencode_go';
  if (isOpen) {
    const wins = balance?.windows ?? [];
    if (!wins.length) return '—';
    return wins.map((w) => {
      const mark = STRIP_WINDOW_MARKS[w.key] ?? escapeHtml(w.label ?? '');
      return `${mark}${(w.usedPct ?? 0).toFixed(0)}%`;
    }).join(' ');
  }
  return balance?.balance != null ? `${balance.balance.toFixed(2)} ${escapeHtml(balance.currency ?? '')}` : '—';
}

/**
 * 悬浮条 token 内容模板：每账户一行 chip = 状态点 + 名称 + 值。
 * config 为空（未加载）→ 加载占位；无账户 → 暂无账户占位。
 */
export function renderStripToken(config, balances) {
  if (!config) return '<div class="c-strip-tk"><span class="c-strip-tk__muted">加载中…</span></div>';
  const accounts = config.accounts ?? [];
  if (!accounts.length) return '<div class="c-strip-tk"><span class="c-strip-tk__muted">暂无账户</span></div>';
  const chips = accounts.map((acc) => {
    const bal = balances.find((b) => b.accountId === acc.id);
    const st = stripAccountStatus(acc, bal);
    const dotCls = st === 'err' ? ' c-strip-tk__dot--err' : st === 'warn' ? ' c-strip-tk__dot--warn' : st === 'none' ? ' c-strip-tk__dot--none' : '';
    return `
      <div class="c-strip-tk__chip" title="${escapeHtml(acc.name)}">
        <span class="c-strip-tk__dot${dotCls}"></span>
        <span class="c-strip-tk__name">${escapeHtml(acc.name)}</span>
        <span class="c-strip-tk__value">${stripAccountValue(acc, bal)}</span>
      </div>`;
  }).join('');
  return `<div class="c-strip-tk">${chips}</div>`;
}

/**
 * 悬浮条真实数据挂载：invoke 拉初始快照 + 订阅 balances-updated；每次渲染后 onData 回调
 * （窗口模式重贴合尺寸，浏览器 noop）。Tauri 特有路径，mock 不能替代桌面验证。
 */
export function mountStripToken(content, { onData = () => {} } = {}) {
  if (typeof window.__TAURI__ === 'undefined') {
    content.innerHTML = renderStripToken({ accounts: [] }, []);
    onData();
    return;
  }
  const api = window.__TAURI__.core;
  const eventBus = window.__TAURI__.event;
  if (!api || !eventBus) { // 部分 mock / 降级环境：无后端能力 → 占位，不抛错
    content.innerHTML = renderStripToken({ accounts: [] }, []);
    onData();
    return;
  }
  let config = null;
  let balances = [];
  const render = () => { content.innerHTML = renderStripToken(config, balances); onData(); };
  api.invoke('get_config')
    .then((c) => { config = c; render(); })
    .catch(() => {});
  api.invoke('get_balances')
    .then((b) => {
      balances = b ?? [];
      console.log(`[strip] balances ${balances.length}`);
      render();
    })
    .catch(() => {});
  eventBus.listen('balances-updated', (e) => {
    balances = e.payload ?? [];
    if (config) render(); // config 未加载完时不刷新占位
  }).catch(() => {});
}

export function mountStripMode() {
  applyConfig(getConfig()); // 独立 strip 窗口跟随保存的主题/强调色/材质（Fix 3）
  const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: '<div class="c-strip-tk"><span class="c-strip-tk__muted">加载中…</span></div>',
    showJump: !!win, // 仅 Tauri 独立窗口渲染「跳转到 TokenTool 余量页」按钮
  });
  document.body.appendChild(root);
  const content = root.querySelector('.c-strip__content');
  // 跳转到 TokenTool 余量页按钮接线（Tauri 后台模式：主窗隐藏 → 点此唤回 main + 通知主窗跳转）
  const jumpBtn = root.querySelector('.c-strip__jump');
  jumpBtn?.addEventListener('click', () => {
    window.__TAURI__.window.getAllWindows()
      .then((wins) => {
        const main = wins.find((w) => w.label === 'main');
        if (main) { main.show().catch(() => {}); main.setFocus().catch(() => {}); }
        window.__TAURI__.event.emit('jump-to-tokentool').catch(() => {});
      })
      .catch(() => {});
  });
  // 材质按钮：实底 ↔ 无背景（走配置链路 saveConfig → applyConfig，不绕过）
  const materialBtn = root.querySelector('.c-strip__material');
  materialBtn?.addEventListener('click', () => {
    const cfg = getConfig();
    saveConfig({ ...cfg, stripMaterial: cfg.stripMaterial === 'solid' ? 'none' : 'solid' });
    applyConfig(getConfig());
  });
  let fit = () => {};
  if (win) {
    // —— Tauri 独立窗口（B4-6）：铺满窗口 + 系统拖拽 + 尺寸贴合 + 位置持久化 ——
    root.classList.add('strip-root--window');
    document.body.style.background = 'transparent'; // 透明窗口：清掉 body 玻璃底（base.css body 背景），避免整窗半透明遮罩
    const strip = root.querySelector('.c-strip');
    const STORAGE_KEY = 'ui-design-strip-pos';
    // 位置恢复
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (Number.isFinite(x) && Number.isFinite(y)) win.setPosition({ x, y }).catch(() => {});
      }
    } catch { /* 损坏存档忽略 */ }
    // 尺寸贴合内容（初始 + 数据到达 + 旋转）
    fit = () => {
      const r = strip.getBoundingClientRect();
      const { LogicalSize } = window.__TAURI__.window;
      const size = computeFitSize(r);
      win.setSize(new LogicalSize(size.width, size.height)).catch(() => {});
      // 诊断（B4 收尾）：确认窗口尺寸与内容一致 + DPI 缩放
      win.outerSize?.().then((os) => {
        win.scaleFactor?.().then((sf) => {
          console.log('[strip] fit', JSON.stringify(size), 'outer', JSON.stringify(os), 'scaleFactor', sf);
        }).catch(() => {});
      }).catch(() => {});
    };
    fit(); // 首次显示尺寸由挂载时 fit() 确定，桌面目检通过 [strip] fit 诊断 log 确认
    // 位置持久化（去抖 200ms）
    let saveTimer = null;
    win.onMoved?.(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        win.outerPosition?.().then(({ x, y }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
        }).catch(() => {});
      }, 200);
    });
    mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.hide().catch(() => {}) });
  } else {
    mountFloatStrip(root, { onClose: () => root.remove() });
  }
  // 真实数据挂载：数据异步到达后内容变宽/高 → 重新贴合（fit 在窗口模式为真实 setSize）
  mountStripToken(content, { onData: fit });
}
