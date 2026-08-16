// FloatStrip 悬浮条入口（Task A5，规格 §5）：body 级独立渲染一个悬浮条实例。
// 内容 = 实时 token 监测（余量/余额）：Tauri 下 invoke get_config + get_balances 并订阅
// balances-updated（Rust app.emit 广播全窗口）；浏览器无 __TAURI__ 回退占位。
// main.js 在 ?mode=strip 时动态 import 本模块并调用 mountStripMode()。
// 组件 CSS 随本模块按需加载（docs 模式零冲击：docs 不 import 本模块，样式不进入 docs）。
import { renderFloatStrip, mountFloatStrip } from '../components/float-strip/float-strip.js';
import '../components/float-strip/float-strip.css';
import { getConfig, saveConfig } from '../config/store.js';
import { applyConfig } from '../config/apply.js';
import { computeCorrectionTarget, computeCollapseTarget, resolveDock } from './strip-edge.js';

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
    collapsible: !!win,
  });
  document.body.appendChild(root);
  const content = root.querySelector('.c-strip__content');
  // 真机调试读条（ui/strip-edge-debug）：console 无 DevTools 不可见（壳层禁右键）→ 直接渲染到
  // strip DOM 内，滚动显示最近诊断。临时调试用，定位后移除。
  const debugEl = document.createElement('div');
  debugEl.className = 'c-strip__debug';
  const logEdge = (msg) => {
    console.log(msg);
    const line = document.createElement('div');
    line.textContent = msg;
    debugEl.appendChild(line);
    while (debugEl.children.length > 6) debugEl.firstChild?.remove();
  };
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
    document.body.style.background = 'transparent'; // 透明窗口：清掉 body 玻璃底
    const strip = root.querySelector('.c-strip');
    strip.appendChild(debugEl); // 真机调试读条（临时）
    const STORAGE_KEY = 'ui-design-strip-pos';

    // —— 贴边收起状态（ui/strip-edge-collapse）——
    const edge = { mode: 'free', dockEdge: null, dockPos: null }; // free | docked | collapsed
    let collapsed = false;   // 收起/收起动画期间：挂起 fit、跳过持久化、onMoved 不评估
    let collapseTimer = null;
    let settleTimer = null;
    let collapseRaf = null;

    // 位置恢复
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (Number.isFinite(x) && Number.isFinite(y)) win.setPosition({ x, y }).catch(() => {});
      }
    } catch { /* 损坏存档忽略 */ }

    // 尺寸贴合内容（初始 + 数据到达 + 旋转）。收起/收起动画期间挂起：
    // 防 hover 贴合 / 倒计时宽度漂移把滑出窗口重定位。量 strip（border-box）。
    fit = () => {
      if (collapsed) return;
      const r = strip.getBoundingClientRect();
      const { LogicalSize } = window.__TAURI__.window;
      const size = computeFitSize(r);
      win.setSize(new LogicalSize(size.width, size.height)).catch(() => {});
      win.outerSize?.().then((os) => {
        win.scaleFactor?.().then((sf) => {
          console.log('[strip] fit', JSON.stringify(size), 'outer', JSON.stringify(os), 'scaleFactor', sf);
        }).catch(() => {});
      }).catch(() => {});
    };
    fit(); // 首次显示尺寸由挂载时 fit() 确定
    document.fonts?.ready?.then(() => { fit(); evaluateDock(); }).catch(() => {}); // 字体加载后重贴 + 初始贴边评估

    // —— 贴边收起机制（规格 §3）——
    const readMotionDur = () => {
      const off = document.documentElement.dataset.motion === 'off'
        || (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
      if (off) return 0;
      const v = parseFloat(getComputedStyle(strip).getPropertyValue('--strip-dur-collapse'));
      return Number.isFinite(v) ? v : 500;
    };
    const getMonitor = async () => {
      // Monitor API 挂在 Window 类（win.currentMonitor()），无独立 screen 模块；权限
      // core:window:allow-current-monitor。缺失/降级时 .catch 吞错 = 静默失效（mock 掩盖真机 bug）。
      // 诊断（真机定位）：currentMonitor 方法是否存在、screen 模块是否存在、返回什么。
      const m = await win.currentMonitor?.().catch?.((err) => { logEdge(`[edge] currentMonitor err ${err}`); return null; });
      const mon = m ? { x: m.position.x, y: m.position.y, width: m.size.width, height: m.size.height } : null;
      logEdge(`[edge] monitor ${JSON.stringify(mon)} | currentMonitor=${typeof win.currentMonitor} screen=${typeof window.__TAURI__?.screen}`);
      return mon;
    };
    const getRect = async () => {
      // ?.() 兼容缺 outerPosition/outerSize 的旧 mock/降级环境（无能力 → null，评估 no-op）
      const p = await win.outerPosition?.().catch?.((err) => { logEdge(`[edge] outerPosition err ${err}`); return null; });
      const s = await win.outerSize?.().catch?.((err) => { logEdge(`[edge] outerSize err ${err}`); return null; });
      const rect = (p && s) ? { x: p.x, y: p.y, width: s.width, height: s.height } : null;
      logEdge(`[edge] rect ${JSON.stringify(rect)} | outerPosition=${typeof win.outerPosition} outerSize=${typeof win.outerSize}`);
      return rect;
    };
    const setEdgeUI = (mode) => {
      strip.classList.toggle('c-strip--collapsed', mode === 'collapsed');
      strip.dataset.dockEdge = edge.dockEdge ?? '';
    };
    const persistPosition = (p) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: p.x, y: p.y }));
    // tweenTo 返回 Promise：await 的调用方（evaluateDock 先决校正）等动画真正到位再起收起计时，
    // 防「校正 tween 与 1s 计时并发」把贴边可见窗口期压缩。onDone 后 resolve；dur<=0 直落、
    // outerPosition 失败都 resolve（防悬挂）。位移全走 setPosition（OS 层）。
    const tweenTo = (to, dur, onDone = () => {}) => new Promise((resolve) => {
      if (collapseRaf) { cancelAnimationFrame(collapseRaf); collapseRaf = null; }
      const finish = () => { try { onDone(); } finally { resolve(); } };
      win.outerPosition().then((p) => {
        const from = { x: p.x, y: p.y };
        if (dur <= 0) { win.setPosition(to).catch(() => {}); finish(); return; }
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic
        const step = (now) => {
          const k = ease(Math.min(1, (now - start) / dur));
          win.setPosition({ x: Math.round(from.x + (to.x - from.x) * k), y: Math.round(from.y + (to.y - from.y) * k) }).catch(() => {});
          if (k < 1) collapseRaf = requestAnimationFrame(step);
          else { collapseRaf = null; finish(); }
        };
        collapseRaf = requestAnimationFrame(step);
      }).catch(() => finish());
    });
    const cancelCollapse = () => { if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; } };
    const startCollapseTimer = () => {
      cancelCollapse();
      if (edge.mode !== 'docked' || strip.matches(':hover')) return; // 非贴边或光标在条上不计时
      collapseTimer = setTimeout(collapseNow, 1000);
    };
    const collapseNow = async () => {
      const monitor = await getMonitor();
      const rect = await getRect();
      if (!monitor || !rect || !edge.dockEdge) return;
      // 收起间隙守卫：await getMonitor/getRect 期间鼠标可能进入 strip —— mouseenter 此时看到的
      // mode 仍是 'docked'，只 cancelCollapse()（计时已触发，无效果），悬停下窗口仍会滑出。
      // 这里在置 mode 前补 :hover 检查：命中则重启计时并返回（startCollapseTimer 自带 :hover
      // 守卫，光标在条上不计时；mouseleave 会重启计时），不进入收起。
      if (strip.matches(':hover')) { startCollapseTimer(); return; }
      const target = computeCollapseTarget({ x: rect.x, y: rect.y }, { width: rect.width, height: rect.height }, monitor, edge.dockEdge);
      logEdge(`[edge] collapse → ${JSON.stringify(target)} edge=${edge.dockEdge}`);
      edge.mode = 'collapsed';
      collapsed = true;
      setEdgeUI('collapsed');
      tweenTo(target, readMotionDur());
    };
    const popOut = () => {
      cancelCollapse();
      if (edge.mode !== 'collapsed' || !edge.dockPos) return;
      logEdge(`[edge] popOut → ${JSON.stringify(edge.dockPos)}`);
      collapsed = false;
      setEdgeUI('docked');
      tweenTo(edge.dockPos, readMotionDur(), () => {
        edge.mode = 'docked';
        if (strip.isConnected) startCollapseTimer();
      });
    };
    const evaluateDock = async () => {
      const monitor = await getMonitor();
      const rect = await getRect();
      if (!monitor || !rect) return false; // 无能力（旧 mock/降级）→ 调用方兜底持久化
      const dock = resolveDock(rect, monitor);
      logEdge(`[edge] dock ${JSON.stringify(dock)} → ${dock.overflow.length ? 'correct→docked' : dock.edge ? 'docked' : 'free'}`);
      if (dock.overflow.length) {
        // 先决校正：溢出边拉回贴齐完整可见 → 贴边
        const target = computeCorrectionTarget(rect, monitor);
        edge.dockEdge = dock.edge;
        edge.dockPos = target;
        edge.mode = 'docked';
        collapsed = false;
        setEdgeUI('docked');
        await tweenTo(target, readMotionDur());
        persistPosition(target);
        if (strip.isConnected) startCollapseTimer();
      } else if (dock.edge) {
        edge.dockEdge = dock.edge;
        edge.dockPos = { x: rect.x, y: rect.y };
        edge.mode = 'docked';
        collapsed = false;
        setEdgeUI('docked');
        persistPosition({ x: rect.x, y: rect.y });
        startCollapseTimer();
      } else {
        edge.mode = 'free';
        edge.dockEdge = null;
        collapsed = false;
        setEdgeUI('free');
        cancelCollapse();
        persistPosition({ x: rect.x, y: rect.y });
      }
      return true;
    };

    // 位置持久化 + 贴边评估：拖动松手（onMoved 去抖 150ms）统一处理；收起/收起动画期间不评估。
    // evaluateDock 有能力（monitor+rect）时其内部 persistPosition；降级环境无能力时兜底持久化
    // 当前位置（沿用既有 onMoved 持久化行为，兼容无 screen/outerSize 的旧 mock）。
    logEdge(`[edge] active win=${!!win} strip=${!!strip}`);
    win.onMoved?.(() => {
      logEdge('[edge] onMoved fired');
      if (collapsed || collapseRaf) return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(async () => {
        const handled = await evaluateDock();
        if (!handled) {
          win.outerPosition?.().then(({ x, y }) => {
            if (!collapsed && !collapseRaf) localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
          }).catch(() => {});
        }
      }, 150);
    });
    // hover 触发：贴边态取消计时（标准自动隐藏）；收起态弹回
    strip.addEventListener('mouseenter', () => {
      if (edge.mode === 'collapsed') popOut();
      else cancelCollapse();
    });
    strip.addEventListener('mouseleave', () => { if (edge.mode === 'docked') startCollapseTimer(); });
    // 拖拽退出收起：pointerdown 取消计时/中止弹出动画/清收起态，交给系统拖拽（onMoved settle 再评估）
    strip.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.c-strip__ctrl')) return;
      cancelCollapse();
      if (collapseRaf) { cancelAnimationFrame(collapseRaf); collapseRaf = null; }
      if (edge.mode === 'collapsed') { edge.mode = 'free'; collapsed = false; setEdgeUI('free'); }
    });

    mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.hide().catch(() => {}) });
  } else {
    mountFloatStrip(root, { onClose: () => root.remove() });
  }
  // 真实数据挂载：数据异步到达后内容变宽/高 → 重新贴合（fit 在窗口模式为真实 setSize）
  mountStripToken(content, { onData: fit });
}
