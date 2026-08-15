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

/**
 * OpenCode rolling 窗口剩余时间倒计时（混合格式）：ISO 字符串 → '<1m' | 'Nm' | 'N.Nh'。
 * 无效/缺失时间返回空串（倒计时 span 留白）；输出纯数字/字母安全，不转义。
 */
export function formatCountdown(resetsAt) {
  const end = resetsAt ? new Date(resetsAt).getTime() : NaN;
  if (!Number.isFinite(end)) return '';
  const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
  if (diff < 60) return '<1m';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = m / 60;
  return `${Math.round(h * 10) / 10}h`;
}

/**
 * 账户值（悬浮条单行口径）：DeepSeek=余额；OpenCode=rolling 实时倒计时 + 周/月窗口百分比
 * （空格拼接，如 1.5h29% 周50% 月80%；rolling 输出含 HTML 倒计时 span，插入 innerHTML）。
 */
export function stripAccountValue(account, balance) {
  const isOpen = account?.kind === 'opencode_go';
  if (isOpen) {
    const wins = balance?.windows ?? [];
    if (!wins.length) return '—';
    const byKey = (k) => wins.find((w) => w.key === k);
    const rolling = byKey('rolling'), weekly = byKey('weekly'), monthly = byKey('monthly');
    const parts = [];
    if (rolling) parts.push(`<span class="c-strip-tk__countdown" data-resets-at="${escapeHtml(rolling.resetsAt ?? '')}">${formatCountdown(rolling.resetsAt)}</span>${(rolling.usedPct ?? 0).toFixed(0)}%`);
    if (weekly) parts.push(`周${(weekly.usedPct ?? 0).toFixed(0)}%`);
    if (monthly) parts.push(`月${(monthly.usedPct ?? 0).toFixed(0)}%`);
    return parts.join(' ');
  }
  return balance?.balance != null ? `${balance.balance.toFixed(2)} ${escapeHtml(balance.currency ?? '')}` : '—';
}

/**
 * 上次刷新相对时间（与 TokenTool 用量页口径一致）：epoch 秒 → 刚刚/N分钟前/N小时前/N天前，
 * 超 7 天回退 YYYY-MM-DD。输出为数字/日期（安全，不转义）。
 */
export function formatRelative(epochSecs) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - epochSecs);
  if (diff < 60) return '刚刚';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}天前`;
  const dt = new Date(epochSecs * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * 悬浮条 token 内容模板：每账户一行 chip = 状态点 + 名称 + 值 + 上次刷新时间（结构化排版：
 * 名称固定列宽对齐，各 chip 余额起始对齐；时间列随 lastUpdated 显示，无则不渲染）。
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
    const time = bal?.lastUpdated != null
      ? `<span class="c-strip-tk__time" data-last-refresh="${escapeHtml(String(bal.lastUpdated))}"> · ${formatRelative(bal.lastUpdated)}</span>`
      : '';
    return `
      <div class="c-strip-tk__chip" title="${escapeHtml(acc.name)}">
        <span class="c-strip-tk__dot${dotCls}"></span>
        <span class="c-strip-tk__name">${escapeHtml(acc.name)}</span>
        <span class="c-strip-tk__value">${stripAccountValue(acc, bal)}</span>${time}
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
  // 实时自动更新：倒计时每秒 + 刷新相对时间 30s —— 原地更新 span 文本，不整窗重渲染；
  // content 脱离 DOM 后（窗口关闭）不再更新。
  // 防右缘裁切：字体异步加载 / 刷新时间原地变宽（「刚刚」→「1分钟前」）会使内容宽度漂移，
  // 窗口尺寸是上次 fit 的快照 —— 漂移 >1px 时重贴（fit），保证窗口始终 ≥ 内容宽度（圆角不被裁方）。
  let lastFitWidth = content.parentElement?.getBoundingClientRect().width ?? 0;
  const updateDynamic = () => {
    if (!content.isConnected) return;
    content.querySelectorAll('[data-resets-at]').forEach((el) => {
      const next = formatCountdown(el.dataset.resetsAt);
      if (el.textContent !== next) el.textContent = next;
    });
    content.querySelectorAll('[data-last-refresh]').forEach((el) => {
      const next = ` · ${formatRelative(Number(el.dataset.lastRefresh))}`;
      if (el.textContent !== next) el.textContent = next;
    });
    const stripEl = content.parentElement;
    if (stripEl) {
      const w = stripEl.getBoundingClientRect().width;
      if (Math.abs(w - lastFitWidth) > 1) { lastFitWidth = w; onData(); }
    }
  };
  const countdownTimer = window.setInterval(updateDynamic, 1000); // 倒计时每秒
  const refreshTimer = window.setInterval(updateDynamic, 30000);  // 刷新时间 30s
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
  // 双通道（覆盖隐藏→唤起）：① 先写 ui-jump-intent（主窗 visibilitychange visible 时消费）再 show+setFocus，
  // ② emit jump-to-tokentool 事件（主窗已可见时直接 setModule）。
  const jumpBtn = root.querySelector('.c-strip__jump');
  jumpBtn?.addEventListener('click', () => {
    window.__TAURI__.window.getAllWindows()
      .then(async (wins) => {
        const main = wins.find((w) => w.label === 'main');
        if (main) {
          localStorage.setItem('ui-jump-intent', 'token-tool');
          // 解最小化：最小化态主窗先 unminimize 再 show 再 setFocus —— 顺序 await 防竞态
          // （Windows 下对最小化窗 setFocus 唤不回，必须先 unminimize 完成）。isMinimized 守卫：
          // 非最小化（含最大化）跳过 unminimize，防 SW_RESTORE 把最大化主窗还原成普通窗。
          // unminimize/isMinimized 须在 capabilities/default.json 授权（core:window:allow-*），
          // 缺失时 JS .catch 吞错 = 只后台跳页、不唤出（本 bug 根因）。?.() 兼容 mock 缺方法。
          const isMin = await main.isMinimized?.().catch?.(() => false);
          if (isMin) await main.unminimize?.().catch?.(() => {});
          await main.show().catch(() => {});
          await main.setFocus().catch(() => {});
        }
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
    // 尺寸贴合内容（初始 + 数据到达 + 旋转）。量 strip（border-box）—— 实底无 box-shadow，
    // 窗口=内容尺寸即可（ui/strip-ui-m9：阴影在透明窗外被裁无效果，去阴影留白）。
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
    // 字体异步加载（普惠体 ~5MB）会让文字在 fit 后变宽 → 重贴一次，防右缘圆角被窗口裁方
    document.fonts?.ready?.then(() => fit()).catch(() => {});
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
