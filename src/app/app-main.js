// 应用壳（Task A3 骨架 + Task A4 设置模式，规格 §2/§3/§4）：双窗口级联 + 标题栏上下文。
// 模式状态机：单窗口态（右窗收起，内容区 = 左窗选中应用首屏）/ 双窗口态（右窗展开，右窗驱动内容区）。
//   rightMode: 'apps'（右窗 = 应用内目录，内容区 = 模块页）/ 'settings'（右窗 = 设置目录 8 分区，
//   内容区 = 设置页）。⚙ 进入设置模式（激活高亮）；再次点击/返回/Esc/左窗已选中项 = 退出回应用模式。
// 设置页与场景模板共享 settings-pages.js 实现（类名 .csettings__* 不变，外观分区定制器首次激活惰性挂载）。
// 左窗/右窗均为 NavigationWheel 实例（纯 icon，38.2% 黄金比例锚点；名称由标题栏上下文承担，
// 栏内 name 经 app-main.css 隐藏，nav-wheel 组件零改动、docs 行为不变）。
// MODULES 扩展契约：应用注册 = 模块项（左窗 icon）+ 目录项（右窗 icon）+ 页面渲染函数（内容区）。
//   后续填充真实功能只新增 src/apps/<id>/index.js（导出 module，Task G1），壳逻辑不变。
// 右窗状态为纯 UI 态（会话内），不进配置存储。
import { icon } from '../components/icon/icon.js';
import { renderTitleBar, mountTitleBar } from '../components/title-bar/title-bar.js';
import { mountNavWheel } from '../components/navigation-wheel/nav-wheel.js';
import { renderFloatBall, mountFloatBall } from '../components/float-ball/float-ball.js';
import { renderFloatStrip, mountFloatStrip, renderTokenMonitor } from '../components/float-strip/float-strip.js';
import { bindWindowControls } from '../demo/window-controls.js';
import { renderCustomizerGroups } from '../demo/customizer-panel.js';
import { toast } from '../components/toast/toast.js';
import { APP_SECTIONS, renderSettingsPages, mountSettingsInteractions } from '../scenes/settings-window/settings-pages.js';
import { getConfig, saveConfig, subscribe } from '../config/store.js';
import { resolveNav } from '../config/nav.js';
import { applyConfig, prefersDark } from '../config/apply.js';
import { signalWhenPainted } from './startup-signal.js';
import '../components/float-strip/float-strip.css';
import './app-main.css';
import './partitions.css';

// 点按/拖拽位移阈值（与 dock 同机制，见下）：nav-wheel 不 preventDefault，拖拽松手后浏览器
// 仍派发 click —— pointerdown 记录起点，click 阶段位移 > 阈值视为拖拽忽略，防误触发收起。
const TAP_MAX_MOVE = 10;

// —— MODULES 扩展契约：home 为壳内置概览，其余应用经 glob 自动发现（Task G1）——
// 应用 = src/apps/<id>/index.js 导出 module（id/name/icon/order/dir/render），壳零改动即可新增。
// 应用只能制作自己的页面，禁止修改框架目录（边界见 docs/integration/app-integration.md + check:boundary）。
const homeModule = { id: 'home', name: '概览', icon: 'home', dir: [], render: renderOverview, order: 0 };
// 0.1.2：设置内置模块（非 app 目录）—— 左窗点选 = 触发设置模式（等同标题栏 ⚙）
const settingsModule = { id: 'settings', name: '设置', icon: 'settings', order: 9, dir: [], special: 'settings' };
const appModules = import.meta.glob('../apps/*/index.js', { eager: true });
const APPS = Object.values(appModules)
  .map((m) => m.module)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99)); // 左窗顺序：home(0) + 应用按 order
let MODULES = resolveNav([homeModule, ...APPS, settingsModule], getConfig().nav); // 0.1.2：入口 nav {order,hidden} 运行时解析（rebuildNav 重赋值）

export function mountAppMode(root) {
  // 冷启动应用持久化配置（闭环 I1）：重启/Tauri 重开后界面保持
  // 上次保存的主题/强调色/定制器参数，与设置页高亮两态一致。
  applyConfig(getConfig());
  const settingsPagesHtml = renderSettingsPages(APP_SECTIONS);
  root.innerHTML = `
  <div class="app-main" data-backdrop="gradient">
    <div class="app-main__backdrop"></div>
    ${renderTitleBar({ title: '概览', iconName: 'box', settings: true, themeToggle: true })}
    <div class="app-main__nav-l">
      <nav class="app-main__nav-l-wheel c-navwheel__list"></nav>
    </div>
    <div class="app-main__nav-r" aria-hidden="true">
      <button class="app-main__nav-r-back" aria-label="返回" title="收起目录">${icon('chevron-left', 16)}</button>
      <div class="app-main__nav-r-body"></div>
    </div>
    <main class="app-main__pages">
      ${MODULES.filter((m) => !m.special) // special 模块（设置）无自有页，页区由下方硬编码 settings 页承担
        .map((m) => `<section class="app-main__page" data-page="${m.id}" data-layout="center"></section>`).join('')}
      <section class="app-main__page" data-page="settings" data-layout="fluid">
        <div class="csettings__pages app-main__settings">${settingsPagesHtml}</div>
      </section>
    </main>
    <!-- 手机形态（Task A6）：底部横滑应用栏 + 全屏页面栈 —— 桌面视口 display:none，≤900px 媒体查询接管 -->
    <div class="app-main__stack"></div>
    <div class="app-main__dock">
      <nav class="app-main__dock-wheel c-navwheel__list"></nav>
    </div>
  </div>`;

  const appMain = root.querySelector('.app-main');
  const ctx = root.querySelector('.c-titlebar__title');
  ctx.classList.add('app-main__ctx');
  ctx.setAttribute('data-ctx', '');
  const settingsBtn = appMain.querySelector('.c-titlebar__control--settings');
  const navL = root.querySelector('.app-main__nav-l .c-navwheel__list');
  const navRRoot = root.querySelector('.app-main__nav-r');
  const navRBody = root.querySelector('.app-main__nav-r-body');
  const pagesEl = root.querySelector('.app-main__pages');
  const pages = [...pagesEl.children];
  const stackEl = root.querySelector('.app-main__stack');
  const dockList = root.querySelector('.app-main__dock .c-navwheel__list');

  // —— 标题栏快捷主题按钮（B2-R9）：设置按钮左边按钮，三态循环 light→dark→system→light ——
  // 经配置链路 saveConfig→applyConfig（不绕过直接写 CSS 变量）；图标显示当前主题状态：
  // 浅 sun / 深 moon / 系统 monitor。subscribe 是唯一同步点：主题从标题栏按钮或设置分区
  // 三态选择器任一入口变更，标题栏图标 + 设置分区 .csettings__mode 高亮/aria-pressed 双向同步。
  const themeBtn = appMain.querySelector('.c-titlebar__control--theme');
  const THEME_CYCLE = ['light', 'dark', 'system'];
  const THEME_ICONS = { light: 'sun', dark: 'moon', system: 'monitor' };
  const updateThemeIcon = () => {
    themeBtn.innerHTML = icon(THEME_ICONS[getConfig().theme] ?? 'sun', 16);
  };
  // 挂载期初始化（R9 评审 I1 修复，恢复 R8 行为）：title-bar.js 初始静态 sun 在此被覆盖——
  // 冷启动已存 dark/system 时标题栏图标随配置，否则按钮仍为 sun、与页面 data-theme 和设置分区失同步。
  updateThemeIcon();
  themeBtn.addEventListener('click', () => {
    const cur = getConfig().theme;
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length];
    applyConfig(saveConfig({ theme: next }));
  });
  // 设置分区三态选择器高亮同步：cfg.theme === data-mode → active + aria-pressed
  // 控制器裁定（Task B4F-2）：主题同步循环限定 [data-mode]，只作用于主题按钮 ——
  // 否则新 close-behavior 按钮（同用 .csettings__mode 类）的 active 高亮会被本循环误清。
  const syncSettingsThemeModes = () => {
    const cfg = getConfig();
    document.querySelectorAll('.csettings__mode[data-mode]').forEach((b) => {
      const on = b.dataset.mode === cfg.theme;
      b.classList.toggle('csettings__mode--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  // 主题从任何入口变更（标题栏快捷按钮 / 设置分区选择器）都双向同步；桌面常驻订阅无需退订
  // （应用壳单次挂载，移动端不重建标题栏；.csettings__mode 选择器对桌面/手机两套实例均生效）
  subscribe(() => {
    updateThemeIcon();
    syncSettingsThemeModes();
    // 概览页「主题状态」卡同步（B3-P0）：saveConfig 先同步触发订阅、applyConfig 才写 data-theme，
    // 回调内读 data-theme 仍是旧值（桌面/手机 label 均陈旧）—— 改读 getConfig().theme +
    // prefersDark() 解析 system（与 updateThemeIcon 同模式），订阅同步执行时能读到新值。
    // 桌面仅活动概览页更新首 span 文本（不整页重渲，避免破坏动画/性能）；手机卡片无条件
    // 更新（值始终正确，pop 回概览时即正确）。
    const cfg = getConfig();
    const isDark = cfg.theme === 'system' ? prefersDark() : cfg.theme === 'dark';
    const label = `当前主题：${isDark ? '深色' : '浅色'}`;
    const desktopLabel = document.querySelector('.app-main__page[data-page="home"].app-main__page--active .app-main__theme-row span');
    if (desktopLabel) desktopLabel.textContent = label;
    const mobileLabel = document.querySelector('.app-main__stack-page[data-stack="overview"] .app-main__theme-row span');
    if (mobileLabel) mobileLabel.textContent = label;
  });

  // —— 浏览器装饰背景层（Task B2-2 + B6-1，浏览器侧模糊对象）——
  // Tauri 探测：桌面端背景层同显（B2-R7 关窗口透明 + 删隐藏规则）；浏览器默认可见
  // （8 预设：渐变/几何/网格/圆点/斜线/波纹/极光/关闭）。外观分区「背景装饰」8 迷你预览卡，
  // 点击更新 .app-main 的 data-backdrop（静态 --backdrop-bg 变化，不动画）。预设为会话内
  // 纯 UI 态，不进 store、不触发配置链路（与右窗状态同类）。
  if (typeof window.__TAURI__ !== 'undefined') appMain.setAttribute('data-tauri', '1');
  const BD_LABELS = {
    gradient: '渐变', geo: '几何', grid: '网格', dots: '圆点',
    diagonal: '斜线', waves: '波纹', aurora: '极光', none: '关闭',
  };
  (() => {
    const page = appMain.querySelector('.csettings__page[data-page="appearance"]');
    if (!page) return;
    const block = document.createElement('div');
    block.className = 'app-main__backdrop-sel';
    block.innerHTML = `
      <div class="app-main__backdrop-sel-head">背景装饰</div>
      <div class="app-main__backdrop-sel-opts" role="group" aria-label="背景装饰">
        ${Object.keys(BD_LABELS).map((bd) => {
          const active = appMain.dataset.backdrop === bd;
          return `
          <button type="button" class="app-main__backdrop-card${active ? ' app-main__backdrop-card--active' : ''}"
            data-bd="${bd}" aria-pressed="${active}" aria-label="${BD_LABELS[bd]}">
            <span class="app-main__backdrop-card-swatch" data-bd-swatch="${bd}"></span>
            <span class="app-main__backdrop-card-label">${BD_LABELS[bd]}</span>
          </button>`;
        }).join('')}
      </div>`;
    const cust = page.querySelector('.csettings__cust');
    page.insertBefore(block, cust);
    block.querySelector('.app-main__backdrop-sel-opts').addEventListener('click', (e) => {
      const card = e.target.closest('.app-main__backdrop-card');
      if (!card || card.dataset.bd === appMain.dataset.backdrop) return;
      appMain.dataset.backdrop = card.dataset.bd;
      block.querySelectorAll('.app-main__backdrop-card').forEach((b) => {
        const on = b.dataset.bd === appMain.dataset.backdrop;
        b.classList.toggle('app-main__backdrop-card--active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
  })();

  // —— 会话内纯 UI 态（不进配置存储）——
  // rightMode: 'apps'（应用目录）| 'settings'（设置目录）—— 设置模式右窗状态为纯 UI 态
  const state = { moduleId: 'home', dirId: null, rightOpen: false, rightMode: 'apps', settingsId: 'general' };

  // —— 0.1.2 隐藏激活模块 crash 兜底（控制器补充，Task 4 评审发现的 load-bearing）——
  // state.moduleId 不在当前 MODULES（被 nav.hidden 隐藏）时切到首个可见应用模块。
  // 覆盖三条路径：冷启动配置预设（如 localStorage hidden:['home']）、rebuildNav（nav 变更）、
  // 设置模式进出（exitSettingsMode/collapseRight 时激活应用被隐藏）。返回 true = 发生切换。
  function ensureActiveModule() {
    if (MODULES.some((m) => m.id === state.moduleId)) return false;
    // 优先切到首个可见应用模块；全部非 special 都被隐藏（仅设置可见）时回退到始终可见的
    // settings 模块 —— settings 页硬编码存在于页面区，renderPages/守卫路径安全
    // （review ①：逐个隐藏 8 应用 + home 后退出设置/冷启动 reload 不得 crash）。
    const fallback = MODULES.find((m) => !m.special && m.render)
      ?? MODULES.find((m) => m.id === 'settings');
    if (!fallback) return false; // 病态配置（MODULES 为空，连 settings 也被隐藏）：保持原 id，由各处空页守卫兜底
    state.moduleId = fallback.id;
    state.dirId = fallback.dir.length ? fallback.dir[0].id : null;
    return true;
  }
  ensureActiveModule(); // 冷启动：激活模块若被配置预设隐藏 → 先切走，防初始渲染对不存在 id 崩溃

  // 手机形态（Task A6）：独立导航模型 —— 底部 dock（横向应用轮，点击驱动推入）+ 全屏页面栈。
  // 栈 = 钻取路径（基底概览 → 应用目录页 → 详情页 / 设置页）；桌面/手机两套模型经媒体查询切换，
  // 共享标题栏上下文；页面栈状态为纯 UI 态（会话内），不进配置存储。
  const mobile = { stack: [{ type: 'overview' }], animateTop: false };
  function isMobile() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
  }

  // —— 左窗：7 模块 NavigationWheel（纯 icon，38.2% 锚点）——
  // 0.1.2：let + 可重挂（rebuildNav 根据 nav 配置变更 destroy 旧轮后重挂新轮）
  let leftWheel = mountNavWheel(navL, {
    items: MODULES.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
    onChange: (item) => onLeftSelect(item.id),
    anchorRatio: 0.382,
  });

  // 模块上下文：active 模块取当前目录项，其余取各自首目录项（供初始占位渲染）
  function modCtx(mod) {
    const dirId = mod.id === state.moduleId ? state.dirId : (mod.dir[0]?.id ?? null);
    return { module: mod, dirId, dirName: mod.dir.find((d) => d.id === dirId)?.name ?? null };
  }

  // —— 右窗：按 rightMode 渲染应用目录轮 / 设置目录轮（纯 icon，38.2% 锚点）——
  function renderRight() {
    rightWheel?.destroy(); // 重挂前释放旧 ResizeObserver（防多次重挂泄漏）
    rightWheel = null;
    if (state.rightMode === 'settings') {
      navRBody.innerHTML = `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`;
      const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
        items: APP_SECTIONS.map((s) => ({ id: s.id, name: s.name, icon: s.icon })),
        onChange: (item) => setSettingsSection(item.id),
        anchorRatio: 0.382,
      });
      wheel.setActive(state.settingsId); // 保持上次选中的设置分区
      rightWheel = wheel;
      return wheel;
    }
    const mod = MODULES.find((m) => m.id === state.moduleId);
    if (!mod) {
      // review ①：病态配置（MODULES 为空/激活模块被隐藏且无可切模块）→ 渲染空态，防 mod.dir TypeError
      navRBody.innerHTML = `<div class="app-main__nav-r-empty">${icon('box', 18)}<span>无可用入口</span></div>`;
      return null;
    }
    navRBody.innerHTML = mod.dir.length
      ? `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`
      : `<div class="app-main__nav-r-empty">${icon('box', 18)}<span>无子目录</span></div>`;
    if (!mod.dir.length) return null;
    const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
      items: mod.dir.map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
      onChange: (item) => setDir(item.id),
      anchorRatio: 0.382,
    });
    wheel.setActive(state.dirId); // 首项即锚点初始位（scrollTop 0），无需滚动
    rightWheel = wheel;
    return wheel;
  }

  // —— 内容区：唯一 active 页（data-page 对应模块；设置模式 = settings 页）——
  function renderPages() {
    if (state.rightMode === 'settings') {
      pages.forEach((p) => p.classList.toggle('app-main__page--active', p.dataset.page === 'settings'));
      setSettingsPageActive();
      return;
    }
    let mod = MODULES.find((m) => m.id === state.moduleId);
    if (!mod) {
      // 0.1.2 兜底：state.moduleId 指向模块被隐藏/缺失（病态配置，正常路径已由 ensureActiveModule 切走）
      mod = MODULES.find((m) => !m.special && m.render) ?? MODULES[0];
    }
    pages.forEach((p) => p.classList.toggle('app-main__page--active', p.dataset.page === state.moduleId));
    const page = pages.find((p) => p.dataset.page === state.moduleId);
    if (!page || !mod?.render) return; // 病态配置兜底：无对应页/模块无 render → 留空不 crash
    page.innerHTML = mod.render(modCtx(mod));
    mod.mount?.(page, modCtx(mod)); // 应用交互挂载钩子（render 后调用；无 mount 的占位 app 为 no-op）
  }

  // —— 设置页分区切换：唯一 active 页 + 惰性挂载（外观定制器 + 组件/动效展示内容，Task B1-1）。
  //   类名 .csettings__* 不变；.cust-group/.csg/.ml-card/.cfloat 只在 app 模式出现，docs 互斥不并存。
  //   组件/动效分区：首次激活时动态 import 展示模块挂到 .app-partition（Vite 代码分包，
  //   展示模块 CSS 随 chunk 加载）；桌面 DOM 常驻，模块级标志防重复挂载。
  //   组件分区末尾追加「组合示例：剪贴板悬浮窗」（mountClipboardFloat 流式 in-flow，不遮挡分区）。
  let custMounted = false; // 桌面惰性挂载标志（手机路径按容器空态重挂，不用此标志）
  let componentsMounted = false;
  let motionMounted = false;
  let navMounted = false; // 0.1.2 Task 5：导航分区惰性挂载标志（桌面防重复挂载；手机按容器空态）
  function mountComponentsPartition(part) {
    if (part.children.length) return; // 已挂载（移动端按空态重挂的防线）
    Promise.all([
      import('../demo/component-showcase-full.js'),
      import('../scenes/clipboard-float/clipboard-float.js'),
    ]).then(([{ mountComponentsShowcase }, { mountClipboardFloat }]) => {
      if (part.children.length) return; // 并发 import 竞态防御：同时触发时只挂一次
      mountComponentsShowcase(part);
      mountClipboardFloat(part); // 组合示例：剪贴板悬浮窗（复用既有场景模块）
    }).catch(() => {
      // 闭环 I2：chunk 加载失败不静默（B1-4 后此为主内容加载路径）——
      // toast 提示 + 重置桌面标志，后续再次激活可重试。
      componentsMounted = false;
      toast('分区内容加载失败', { variant: 'danger' });
    });
  }
  function mountMotionPartition(part, onMounted) {
    if (part.children.length) return;
    import('../demo/motion-lab.js').then(({ mountMotionLab }) => {
      if (part.children.length || !part.isConnected) return; // 并发 import 竞态 / 手机重建后已脱离 DOM → 不挂载
      const unsub = mountMotionLab(part);
      onMounted?.(unsub); // 退订函数上抛（手机路径记入 mobileMotionUnsub，闭环 I1）
    }).catch(() => {
      // 闭环 I2：chunk 加载失败不静默 —— toast 提示 + 重置桌面标志（失败可重试）。
      motionMounted = false;
      toast('分区内容加载失败', { variant: 'danger' });
    });
  }

  // —— 0.1.2 导航分区（Task 5）：入口排序（上移/下移）/隐藏管理列表 ——
  // 惰性挂载（桌面 setSettingsPageActive / 手机 activateMobileSettings 首次激活）。读写配置链路
  // saveConfig {nav:{order,hidden}} → subscribe → rebuildNav 同步重排左窗轮/手机 dock/概览快捷卡。
  // 护栏：至少保留 1 个可见入口 —— 最后一个可见的隐藏按钮禁用（canHide）+ 点击处理器二次守卫
  // （visibleNow < 2 直接 return）。变更后重渲列表，反映最新排序/显隐（含被隐藏行）。
  // 列表用全量入口（[homeModule, ...APPS, settingsModule] 当前顺序，含隐藏行）而非 MODULES
  // （MODULES = resolveNav 输出，已过滤隐藏 —— 用它渲染则隐藏项从列表消失、无法再显示）；
  // 隐藏行置灰 + 「显示」按钮（眼图标），上移/下移按全量顺序重排 nav.order。
  // 图标：隐藏开关用 eye（PATHS 无 eye-off），隐藏态加 --off 类 + title/aria-label「显示/隐藏」。
  function mountNavPartition(container) {
    if (!container) return;
    const cfg = getConfig();
    const nav = cfg.nav ?? { order: [], hidden: [] };
    const hidden = new Set(nav.hidden ?? []);
    const ALL = [homeModule, ...APPS, settingsModule];
    const rankAll = (m) => {
      const i = (nav.order ?? []).indexOf(m.id);
      return i === -1 ? 1000 + (m.order ?? 99) : i;
    };
    const full = [...ALL].sort((a, b) => rankAll(a) - rankAll(b)); // 全量当前顺序（含隐藏）
    const visibleCount = full.filter((m) => !hidden.has(m.id)).length;
    container.innerHTML = `
      <div class="csettings__nav-partition">
        <div class="csettings__field-desc">调整入口顺序与显示。至少保留 1 个可见入口。</div>
        <div class="csettings__nav-list" data-nav-mgmt>
          ${full.map((m, i) => {
            const isHidden = hidden.has(m.id);
            const canHide = isHidden || visibleCount > 1; // 最后一个可见不可隐藏
            return `
            <div class="csettings__nav-row" data-nav-id="${m.id}" data-hidden="${isHidden}">
              <span class="csettings__nav-icon">${icon(m.icon, 16)}</span>
              <span class="csettings__nav-name">${m.name}</span>
              <span class="csettings__nav-actions">
                <button type="button" class="csettings__nav-btn" data-nav-move="up" ${i === 0 ? 'disabled' : ''} title="上移" aria-label="上移">${icon('chevron-up', 14)}</button>
                <button type="button" class="csettings__nav-btn" data-nav-move="down" ${i === full.length - 1 ? 'disabled' : ''} title="下移" aria-label="下移">${icon('chevron-down', 14)}</button>
                <button type="button" class="csettings__nav-btn${isHidden ? ' csettings__nav-btn--off' : ''} csettings__nav-hide" data-nav-hide ${canHide ? '' : 'disabled'} title="${isHidden ? '显示' : '隐藏'}" aria-label="${isHidden ? '显示' : '隐藏'}">${icon('eye', 14)}</button>
              </span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    container.querySelector('[data-nav-mgmt]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav-move],[data-nav-hide]');
      if (!btn) return;
      const row = btn.closest('[data-nav-id]');
      const id = row.dataset.navId;
      const nav = getConfig().nav ?? { order: [], hidden: [] };
      const order = [...(nav.order ?? [])];
      const hidden = [...(nav.hidden ?? [])];
      if (btn.dataset.navMove === 'up' || btn.dataset.navMove === 'down') {
        const current = full.map((m) => m.id); // 全量当前顺序（含隐藏行，nav.order 已含隐藏 id）
        const i = current.indexOf(id);
        const j = btn.dataset.navMove === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= current.length) return;
        [current[i], current[j]] = [current[j], current[i]];
        saveConfig({ nav: { order: current, hidden } });
      } else if (btn.dataset.navHide !== undefined) {
        if (hidden.includes(id)) {
          hidden.splice(hidden.indexOf(id), 1); // 显示
        } else {
          const visibleNow = full.filter((m) => !hidden.includes(m.id)).length;
          if (visibleNow < 2) return; // 至少保留 1 可见（防绕过禁用按钮）
          hidden.push(id); // 隐藏
        }
        saveConfig({ nav: { order, hidden } });
      }
      // saveConfig → subscribe → rebuildNav 已同步重排左窗/dock；列表自身须重渲反映变更
      mountNavPartition(container);
    });
  }
  function setSettingsPageActive() {
    const sec = pages.find((p) => p.dataset.page === 'settings');
    sec.querySelectorAll('.csettings__page').forEach((p) =>
      p.classList.toggle('csettings__page--active', p.dataset.page === state.settingsId));
    if (state.settingsId === 'appearance' && !custMounted) {
      renderCustomizerGroups(sec.querySelector('[data-page="appearance"] .csettings__cust'));
      custMounted = true;
    }
    if (state.settingsId === 'components' && !componentsMounted) {
      componentsMounted = true; // 先置位防并发 import 重复挂载（import 异步，挂载前切走再切回）
      mountComponentsPartition(sec.querySelector('[data-page="components"] [data-partition="components"]'));
    }
    if (state.settingsId === 'motion' && !motionMounted) {
      motionMounted = true;
      mountMotionPartition(sec.querySelector('[data-page="motion"] [data-partition="motion"]'));
    }
    if (state.settingsId === 'nav' && !navMounted) {
      navMounted = true;
      mountNavPartition(sec.querySelector('[data-page="nav"] [data-partition="nav"]'));
    }
  }

  function setSettingsSection(id) {
    if (id === state.settingsId) return;
    state.settingsId = id;
    setSettingsPageActive();
    rightWheel?.setActive(id); // review ②：右窗设置轮高亮同步（概览「管理入口」跳转时 rightWheel 已挂，防残留旧分区高亮）
    updateCtx();
  }

  // —— 标题栏上下文「应用名 › 页面名」/「设置 › 分区」（单窗口态只应用名）——
  function updateCtx() {
    if (isMobile()) { updateCtxMobile(); return; } // 手机形态：上下文由页面栈栈顶承担
    if (state.rightMode === 'settings') {
      const s = APP_SECTIONS.find((x) => x.id === state.settingsId);
      ctx.textContent = `设置 › ${s.name}`;
      ctx.dataset.module = 'settings';
      ctx.dataset.page = state.settingsId;
      return;
    }
    const mod = MODULES.find((m) => m.id === state.moduleId);
    if (!mod) return; // 0.1.2 病态配置兜底（可见应用模块为空）：留空上下文不 crash
    ctx.textContent = state.rightOpen && state.dirId && mod.dir.length
      ? `${mod.name} › ${mod.dir.find((d) => d.id === state.dirId).name}`
      : mod.name;
    ctx.dataset.module = mod.id;
    ctx.dataset.page = state.rightOpen ? state.dirId : '';
  }

  function applyRightOpen() {
    appMain.classList.toggle('app-main--dual', state.rightOpen);
    navRRoot.setAttribute('aria-hidden', String(!state.rightOpen));
    settingsBtn.classList.toggle('app-main__settings-toggle--active', state.rightMode === 'settings');
    updateCtx();
  }

  // —— 级联联动 ——
  // 左窗选中新应用 → 右窗推入 + 载入该应用目录 + 内容区切到首屏（不收起）；
  // 若当前处于设置模式则一并切回应用模式（左栏应用恒可选中，规格 §5）
  function setModule(id, force = false) {
    if (id === state.moduleId && !force) return;
    const mod = MODULES.find((m) => m.id === id);
    if (!mod) return; // review ① 防御：id 对应模块被隐藏/缺失（正常路径恒存在，来自 MODULES 轮项）
    state.moduleId = id;
    state.dirId = mod.dir.length ? mod.dir[0].id : null;
    state.rightMode = 'apps';
    state.rightOpen = mod.dir.length > 0;
    renderRight();
    renderPages();
    applyRightOpen();
  }

  // 右窗选中目录项 → 内容区切页 + 上下文联动
  function setDir(id) {
    if (id === state.dirId) return;
    state.dirId = id;
    renderPages();
    updateCtx();
  }

  // —— 设置模式（⚙）：进入 = 右窗切为设置目录（内容区设置页）；再次点击/收起 = 退出回应用模式 ——
  // 左窗滚动聚焦 helper：设置模式进入/退出时左窗须滚动聚焦目标项（非仅高亮）。
  // 左窗点击走 onClick → select(i, true) 带动画滚动；而 ⚙/退出路径若只 setActive
  // （select(i, false)）则左窗停在原位 —— 目标项虽加高亮类但未滚到锚线，
  // 即「⚙ 有高亮但未聚焦设置菜单」缺陷。目标项被 nav.hidden 隐藏（MODULES 无此项）
  // 时回退 setActive 仅高亮（防 scrollToIndex(-1) clamp 到首项误跳转）。
  function focusLeftItem(id) {
    const i = MODULES.findIndex((m) => m.id === id);
    if (i >= 0) leftWheel.scrollToIndex(i);
    else leftWheel.setActive(id);
  }

  function setSettingsMode() {
    if (state.rightMode === 'settings') return;
    state.rightMode = 'settings';
    state.rightOpen = true;
    ensureActiveModule(); // 0.1.2 兜底：进入设置前保证激活模块可见（防御性，正常路径恒有效）
    focusLeftItem('settings'); // 左窗滚动聚焦设置项（高亮 + 滚到锚线；替代仅 setActive）
    renderRight();
    renderPages();
    applyRightOpen();
  }

  function exitSettingsMode() {
    if (state.rightMode !== 'settings') return;
    state.rightMode = 'apps';
    state.rightOpen = false;
    ensureActiveModule(); // 0.1.2 兜底：当前激活应用若在设置期间被隐藏 → 切到首个可见，防 setActive/render 崩溃
    focusLeftItem(state.moduleId); // 左窗滚动聚焦恢复：回到左窗选中应用项（滚回锚线，替代仅 setActive）
    renderRight(); // 右窗回应用目录轮（收起也重渲染 —— 避免重开后残留设置目录轮，违反「apps 模式右窗=应用目录」不变量）
    renderPages(); // 内容区回到左窗选中应用页
    applyRightOpen();
  }

  function toggleSettings() {
    if (isMobile()) {
      // 手机形态：⚙ 推入设置页到页面栈；已在设置页 → 弹回（toggle）
      if (mobile.stack[mobile.stack.length - 1]?.type === 'settings') popStack();
      else pushStack({ type: 'settings' });
      return;
    }
    if (state.rightMode === 'settings') exitSettingsMode();
    else setSettingsMode();
  }

  // 左窗 onChange：选中新应用 → setModule。已选中项的重复 onChange（用户点击 / scroll-snap 对
  // 同 id 的补发，见下方 navL click 监听注释）不在此 toggle —— 收起由独立 click 监听判定，
  // 避免 nav-wheel 对同 id 的补发 onChange 误触发收起。
  function onLeftSelect(id) {
    if (id === 'settings') { setSettingsMode(); return; }
    const wasSettings = state.rightMode === 'settings';
    // 设置模式下选择任意模块（含滚动回当前激活模块）都必须退出设置并切换到该模块——
    // onChange 是明确导航意图，不能被 id===moduleId 守卫挡住（否则内容停在设置页，0.1.2 bug）。
    if (wasSettings && id === state.moduleId) setModule(id, true);
    else if (id !== state.moduleId) setModule(id);
  }

  // 收起右窗（返回按钮 / Esc；二次点击走 onLeftSelect 的 toggle）。设置模式收起 = 退出设置模式
  function collapseRight() {
    if (!state.rightOpen) return;
    const wasSettings = state.rightMode === 'settings';
    state.rightOpen = false;
    if (wasSettings) {
      state.rightMode = 'apps';
      ensureActiveModule(); // 0.1.2 兜底：同 exitSettingsMode —— 退出设置时激活应用被隐藏则切走
      focusLeftItem(state.moduleId); // 左窗滚动聚焦恢复：回到左窗选中应用项（滚回锚线，替代仅 setActive）
      renderRight(); // 同上：退出设置模式即重渲染应用目录轮，重开后不残留设置轮
      renderPages();
    }
    applyRightOpen();
  }

  // 概览快捷入口 → 展开右窗 + 切到该应用（经左窗轮 scrollToIndex → onChange 联动）
  function goToModule(id) {
    const i = MODULES.findIndex((m) => m.id === id);
    if (i < 0) return;
    leftWheel.scrollToIndex(i);
  }

  // —— 手机形态（Task A6）：底部 dock + 全屏页面栈 ——
  // 页面栈 slide 左进 240ms（--dur-push = --dur-base*1.2）+ --ease-spring，只动 transform/opacity（红线）。
  function renderStackPage(entry, animate) {
    const isRoot = entry.type === 'overview';
    const back = isRoot ? '' : `<button class="app-main__stack-back" aria-label="返回" title="返回">${icon('chevron-left', 16)}</button>`;
    const head = isRoot ? '' : `<header class="app-main__stack-head">${back}</header>`;
    const cls = animate ? ' app-main__stack-page--push' : '';
    let body = '';
    if (entry.type === 'overview') {
      body = renderOverview();
    } else if (entry.type === 'dir') {
      const mod = MODULES.find((m) => m.id === entry.moduleId);
      // review ③ 兜底：模块被隐藏 → 空目录 body（head/back 保留，可返回），不渲染无返回按钮空白页
      body = mod
        ? `
          <h2 class="app-main__page-title app-main__stack-title">${mod.name}</h2>
          <div class="app-main__dir-list">
            ${mod.dir.map((d) => `
              <button class="app-main__dir-item" data-dir="${d.id}">
                ${icon(d.icon, 18)}<span class="app-main__dir-name">${d.name}</span>${icon('chevron-right', 14)}
              </button>`).join('')}
          </div>`
        : '';
    } else if (entry.type === 'detail') {
      const mod = MODULES.find((m) => m.id === entry.moduleId);
      // review ③ 兜底：模块被隐藏/无 render → 空详情 body（head/back 保留，可返回）
      body = mod && typeof mod.render === 'function'
        ? mod.render({ module: mod, dirId: entry.dirId, dirName: entry.dirName })
        : '';
    } else if (entry.type === 'settings') {
      body = `
        <div class="app-main__settings-tabs">
          ${APP_SECTIONS.map((s) => `<button class="app-main__settings-tab${s.id === state.settingsId ? ' app-main__settings-tab--active' : ''}" data-tab="${s.id}">${s.name}</button>`).join('')}
        </div>
        <div class="app-main__settings csettings__pages">${renderSettingsPages(APP_SECTIONS)}</div>`;
    }
    return `<section class="app-main__stack-page${cls}" data-stack="${entry.type}">${head}<div class="app-main__stack-body">${body}</div></section>`;
  }

  // 外观分区定制器退订句柄（闭环 M1）：手机路径每次 renderStack 重建 DOM → 重挂
  // renderCustomizerGroups 新增一次 store 订阅。重建前释放旧订阅（回调引用已脱离容器的旧 DOM），
  // 防订阅数随进入设置次数线性累积。renderCustomizerGroups 现返回 subscribe 的退订函数。
  let mobileCustUnsub = null;
  // 动效分区 store 订阅退订句柄（闭环 I1）：手机路径每次 renderStack 重建页面栈 DOM 后
  // activateMobileSettings 对空容器重挂 mountMotionLab（新增一次 store 订阅），重建前释放
  // 旧订阅（回调引用已脱离容器的旧 .ml-card 节点），防订阅数随进入设置→动效次数线性累积。
  // 挂载为异步（动态 import），退订函数经 mountMotionPartition 的 onMounted 回调上抛。
  let mobileMotionUnsub = null;
  function renderStack() {
    mobileCustUnsub?.(); // 重建前释放上一订阅（可能未挂载 = noop）
    mobileCustUnsub = null;
    mobileMotionUnsub?.(); // 闭环 I1：动效分区订阅同机制，重建前释放
    mobileMotionUnsub = null;
    stackEl.innerHTML = mobile.stack.map((entry, i) =>
      renderStackPage(entry, i === mobile.stack.length - 1 && mobile.animateTop)).join('');
    const settingsPage = stackEl.querySelector('[data-stack="settings"]');
    if (settingsPage) mountSettingsInteractions(settingsPage.querySelector('.app-main__settings'));
    mobile.animateTop = false;
    activateMobileSettings();
    updateCtx();
    // 应用交互挂载钩子（手机栈顶 detail 页，render 后调用）
    const topEntry = mobile.stack[mobile.stack.length - 1];
    const topEl = stackEl.lastElementChild;
    if (topEntry?.type === 'detail' && topEl && topEl.dataset.stack === 'detail') {
      const topMod = MODULES.find((m) => m.id === topEntry.moduleId);
      const body = topEl.querySelector('.app-main__stack-body');
      // review ③ 防御：模块被隐藏（topMod undefined）→ 跳过挂载钩子（renderStackPage 已渲染空 body + 返回按钮）
      if (body) topMod?.mount?.(body, { module: topMod, dirId: topEntry.dirId, dirName: topEntry.dirName });
    }
  }

  function pushStack(entry) {
    mobile.stack.push(entry);
    mobile.animateTop = true;
    renderStack();
    updateSettingsActive();
  }
  function popStack() {
    if (mobile.stack.length <= 1) return;
    mobile.stack.pop();
    mobile.animateTop = false;
    renderStack();
    updateSettingsActive();
  }
  function resetStack() {
    mobile.stack = [{ type: 'overview' }];
    mobile.animateTop = false;
    renderStack();
    updateSettingsActive();
  }
  function updateSettingsActive() {
    settingsBtn.classList.toggle('app-main__settings-toggle--active',
      mobile.stack[mobile.stack.length - 1]?.type === 'settings');
  }

  // 设置分区激活（移动端复用共享 settings-pages；外观定制器首次激活惰性挂载 ——
  // 每次渲染页面容器为空即重挂，避免沿用桌面实例的已挂载标志误判）。
  // 组件/动效分区（Task B1-1）：同样按容器空态惰性挂载 —— 页面栈每次 renderStack 重建 DOM，
  // 不能沿用桌面模块级标志（重建后容器已空，标志仍 true 会漏挂）；与桌面共用 mountComponentsPartition/
  // mountMotionPartition（内部再按 children 空态防御，仅首次激活挂载一次）。
  function activateMobileSettings() {
    const sec = stackEl.querySelector('[data-stack="settings"]');
    if (!sec) return;
    sec.querySelectorAll('.csettings__page').forEach((p) =>
      p.classList.toggle('csettings__page--active', p.dataset.page === state.settingsId));
    sec.querySelectorAll('.app-main__settings-tab').forEach((t) =>
      t.classList.toggle('app-main__settings-tab--active', t.dataset.tab === state.settingsId));
    const cust = sec.querySelector('[data-page="appearance"] .csettings__cust');
    if (state.settingsId === 'appearance' && cust && !cust.children.length) {
      mobileCustUnsub?.(); // 防御：同容器重复挂载先释放旧订阅
      mobileCustUnsub = renderCustomizerGroups(cust);
    }
    const comp = sec.querySelector('[data-page="components"] [data-partition="components"]');
    if (state.settingsId === 'components' && comp && !comp.children.length) mountComponentsPartition(comp);
    const motion = sec.querySelector('[data-page="motion"] [data-partition="motion"]');
    if (state.settingsId === 'motion' && motion && !motion.children.length) {
      mountMotionPartition(motion, (unsub) => {
        mobileMotionUnsub?.(); // 防御：异步导入期间可能已重挂（新容器），先释放旧订阅
        mobileMotionUnsub = unsub;
      });
    }
    const nav = sec.querySelector('[data-page="nav"] [data-partition="nav"]');
    if (state.settingsId === 'nav' && nav && !nav.children.length) mountNavPartition(nav);
  }

  function updateCtxMobile() {
    const top = mobile.stack[mobile.stack.length - 1];
    const mod = top?.moduleId ? MODULES.find((m) => m.id === top.moduleId) : null;
    if (top?.type === 'detail' && mod) {
      ctx.textContent = `${mod.name} › ${top.dirName}`;
      ctx.dataset.module = mod.id; ctx.dataset.page = top.dirId;
    } else if (top?.type === 'dir' && mod) {
      ctx.textContent = mod.name;
      ctx.dataset.module = mod.id; ctx.dataset.page = '';
    } else if (top?.type === 'settings') {
      const s = APP_SECTIONS.find((x) => x.id === state.settingsId);
      ctx.textContent = `设置 › ${s.name}`;
      ctx.dataset.module = 'settings'; ctx.dataset.page = state.settingsId;
    } else {
      ctx.textContent = '概览';
      ctx.dataset.module = 'home'; ctx.dataset.page = '';
    }
  }

  // 底部 dock 点击 = 一级导航（钻取不叠加）：home（无目录）→ 回基底；设置 → 推入设置页；
  // 其他应用 → 目录页。滚动/吸附只更新轮内高亮（nav-wheel onChange 为 noop），推入由显式点击驱动 —— 横滑浏览不弹页。
  function handleDockTap(id) {
    const mod = MODULES.find((m) => m.id === id);
    if (!mod) { resetStack(); return; } // 0.1.2 兜底：id 对应模块被隐藏/缺失（病态配置）→ 回基底概览
    const top = mobile.stack[mobile.stack.length - 1];
    if (id === 'settings') {
      // 设置内置模块：dock 点击 = 触发设置模式（等同标题栏 ⚙ 移动端行为）—— 已在设置页 → 弹回
      if (top?.type === 'settings') popStack();
      else pushStack({ type: 'settings' });
      return;
    }
    if (!mod.dir.length) { resetStack(); return; }
    if (top?.type === 'dir' && top.moduleId === id) return; // 已在该应用目录
    if (top && top.type !== 'overview') {
      // 栈顶为目录/详情/设置页 → 替换为当前应用目录（底部栏恒为一级入口，不叠加目录页）
      mobile.stack = [mobile.stack[0], { type: 'dir', moduleId: id }];
      mobile.animateTop = false;
      renderStack();
      updateSettingsActive();
      return;
    }
    pushStack({ type: 'dir', moduleId: id });
  }

  // 右窗轮持有句柄（B6-R2-3）：renderRight 重挂前 destroy 旧轮，防 ResizeObserver 随多次重挂泄漏。
  // 右窗为多实例（应用目录轮 / 设置目录轮交替），左窗/横向 dock 常驻单实例无需销毁。
  let rightWheel = null;
  // dock 懒挂载：桌面视口下 dock 为 display:none（clientWidth=0 会让几何 pad 计算失真），
  // 首次进入手机形态时才挂载（几何基于实测视口长度；手机视口近似恒定，挂载一次即可）
  let dockMounted = false;
  // dock 轮持有句柄：rebuildNav 强制重挂前 destroy 旧轮，防 ResizeObserver 随多次重挂泄漏（同左窗机制）
  let dockWheel = null;
  function mountDock(force = false) {
    if (dockMounted && !force) return;
    dockWheel?.destroy?.(); // 强制重挂前释放旧轮 ResizeObserver
    dockMounted = true;
    dockWheel = mountNavWheel(dockList, {
      items: MODULES.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
      onChange: () => {}, // 滚动/吸附仅更新轮内高亮，页面推入由点击驱动（钻取模型）
      anchorRatio: 0.382,
      direction: 'horizontal',
    });
  }

  // —— 0.1.2 导航响应式：nav 配置变更 → 重排左窗 + 手机 dock + 概览快捷卡（设置内容不重渲）——
  function rebuildNav() {
    MODULES = resolveNav([homeModule, ...APPS, settingsModule], getConfig().nav);
    const activeChanged = ensureActiveModule(); // 兜底：当前激活模块被隐藏 → 切到首个可见（先切走再挂轮/渲染）
    // 重挂左窗轮（destroy 旧轮防 ResizeObserver 泄漏）
    leftWheel?.destroy?.();
    leftWheel = mountNavWheel(navL, {
      items: MODULES.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
      onChange: (item) => onLeftSelect(item.id),
      anchorRatio: 0.382,
    });
    // 若设置模式激活，左窗聚焦 settings；否则聚焦当前 moduleId（重建后须滚动聚焦锚线，防只高亮不可见）
    focusLeftItem(state.rightMode === 'settings' ? 'settings' : state.moduleId);
    // 手机 dock 重建（若已挂载）
    if (dockMounted) mountDock(true); // 强制重挂（dockMounted 保持 true）
    if (state.rightMode === 'settings') return; // 设置轮不受 moduleId 影响；退出时按新 moduleId 重渲
    if (activeChanged) {
      renderRight(); // 目录轮随新 moduleId/dirId 重挂
      renderPages();
      applyRightOpen();
    } else if (state.moduleId === 'home') {
      renderPages(); // 概览快捷卡随排序/显隐刷新
    }
  }
  // 订阅 nav 变更（仅 nav 变化才重建，避免主题切换也重建左窗）
  let lastNav = JSON.stringify(getConfig().nav ?? {});
  subscribe((cfg) => {
    const navJson = JSON.stringify(cfg.nav ?? {});
    if (navJson !== lastNav) { lastNav = navJson; rebuildNav(); }
  });

  // —— 事件 ——
  settingsBtn.addEventListener('click', toggleSettings);
  navRRoot.querySelector('.app-main__nav-r-back').addEventListener('click', collapseRight);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') collapseRight(); });
  pagesEl.addEventListener('click', (e) => {
    const card = e.target.closest('.app-main__shortcut');
    if (!card) return;
    if (card.dataset.shortcut === '__nav-mgmt__') { setSettingsMode(); setSettingsSection('nav'); return; } // 0.1.2：管理入口卡 → 设置导航分区
    goToModule(card.dataset.shortcut);
  });
  // 三通道之一：再次点击左窗已选中项 → 收起（toggle）。nav-wheel 对点击/锚定仍会对同 id 补发
  // onChange（子像素滚动偏差 <1px 使 snapNow 守卫 0.05px 容差未跳过），不能据 onChange 判定用户
  // 是否真的再次点击了已选中项 —— 故在 pointerdown 记录「所点项当时是否已选中 + 起点坐标」，
  // click 阶段判定。拖拽阈值（闭环 I2，与 dock 同机制）：位移 > TAP_MAX_MOVE 视为浏览滑动，
  // 不误触发收起（nav-wheel 未 preventDefault，pointer 捕获下拖拽松手后浏览器仍派发 click）。
  let downState = { active: false, x: 0, y: 0 };
  navL.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.c-navwheel__item');
    downState = {
      active: !!item && MODULES[Number(item.dataset.index)].id === state.moduleId,
      x: e.clientX, y: e.clientY,
    };
  });
  navL.addEventListener('click', (e) => {
    const { active, x, y } = downState;
    downState.active = false;
    if (Math.hypot(e.clientX - x, e.clientY - y) > TAP_MAX_MOVE) return; // 拖拽浏览，忽略
    if (active) {
      // 设置模式：再次点击左窗已选中项 = 退出设置模式（收起）
      if (state.rightMode === 'settings') { exitSettingsMode(); return; }
      const mod = MODULES.find((m) => m.id === state.moduleId);
      if (mod?.dir.length) { // review ① 防御：active 已保证 mod 存在，`?.` 双保险
        state.rightOpen = !state.rightOpen;
        applyRightOpen();
      }
    }
  });

  // —— 手机形态事件（Task A6）：dock 点击 = 一级导航；页面栈点击委托（返回/目录项/设置分区/概览快捷入口）——
  // nav-wheel 对列表 setPointerCapture → click 事件 target 被重定向到列表本身，不能据 click.target 找项；
  // 且 nav-wheel 未 preventDefault，浏览器在任意 pointerup 后仍派发 click（Chrome 无位移抑制）——
  // 横滑浏览的拖拽也会收尾成一次 click。故 pointerdown 记录「所点项下标 + 起点坐标」，
  // click 阶段按位移阈值（>TAP_MAX_MOVE 视为横滑浏览）区分「点按」与「拖拽」，拖拽不误触发推入。
  let dockDown = { index: -1, x: 0, y: 0 };
  dockList.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.c-navwheel__item');
    dockDown = { index: item ? Number(item.dataset.index) : -1, x: e.clientX, y: e.clientY };
  });
  dockList.addEventListener('click', (e) => {
    const { index, x, y } = dockDown;
    dockDown.index = -1;
    if (index < 0 || Math.hypot(e.clientX - x, e.clientY - y) > TAP_MAX_MOVE) return;
    handleDockTap(MODULES[index].id);
  });
  stackEl.addEventListener('click', (e) => {
    const back = e.target.closest('.app-main__stack-back');
    if (back) { popStack(); return; }
    const dirItem = e.target.closest('.app-main__dir-item');
    if (dirItem) {
      const pageEl = e.target.closest('.app-main__stack-page');
      const entry = mobile.stack[[...stackEl.children].indexOf(pageEl)];
      const mod = MODULES.find((m) => m.id === entry.moduleId);
      const dir = mod.dir.find((d) => d.id === dirItem.dataset.dir);
      pushStack({ type: 'detail', moduleId: mod.id, dirId: dir.id, dirName: dir.name });
      return;
    }
    const tab = e.target.closest('.app-main__settings-tab');
    if (tab) {
      state.settingsId = tab.dataset.tab;
      activateMobileSettings();
      updateCtx();
      return;
    }
    const shortcut = e.target.closest('.app-main__shortcut');
    if (shortcut) {
      if (shortcut.dataset.shortcut === '__nav-mgmt__') {
        // 0.1.2：手机管理入口卡 → 推入设置页并切到导航分区（与桌面一致）
        state.settingsId = 'nav';
        if (mobile.stack[mobile.stack.length - 1]?.type !== 'settings') pushStack({ type: 'settings' });
        else { activateMobileSettings(); updateCtx(); }
        return;
      }
      handleDockTap(shortcut.dataset.shortcut);
    }
  });
  // 视口横纵切换（媒体查询 900px 断点）：进入手机形态懒挂载 dock；上下文切回对应导航模型
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 900px)') : null;
  mq?.addEventListener?.('change', (e) => {
    if (e.matches) mountDock();
    updateCtx();
  });
  if (isMobile()) mountDock();

  // 设置页交互接线（主题三态/动效/保存/快捷键/开源链接/开关，与场景模板共用 settings-pages）
  mountSettingsInteractions(pages.find((p) => p.dataset.page === 'settings'));

  mountTitleBar(appMain);
  bindWindowControls();

  // FloatStrip 跳转通道（ui/strip-ui-opt）：strip 窗口「跳转到 TokenTool」按钮 →
  // 主窗 setModule('token-tool')（自动落到首目录 usage=余量页，并切回应用模式）。
  // 双通道（覆盖隐藏→唤起）：① jump-to-tokentool 事件（主窗可见时直接 setModule）；
  // ② ui-jump-intent（strip 先写 intent 再 show 主窗，主窗 visibilitychange visible 时消费）
  // —— 任一通道消费后先清 intent，防陈旧 intent 在主窗后续被唤起点亮时误跳转。
  if (typeof window.__TAURI__ !== 'undefined') {
    window.__TAURI__.event.listen('jump-to-tokentool', () => {
      localStorage.removeItem('ui-jump-intent');
      setModule('token-tool');
    }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && localStorage.getItem('ui-jump-intent') === 'token-tool') {
      localStorage.removeItem('ui-jump-intent');
      setModule('token-tool');
    }
  });

  // —— 初始渲染：懒渲染（ui/startup-opt）—— 启动只渲染激活页（概览），
  //   其余应用页首激活时经 renderPages 渲染（原全页预渲染在冷启动把 7 页 render 全跑一遍）；
  //   设置页（第 8 区）已随模板渲染，此处跳过。renderPages 负责 active 类 + render + mount。 ——
  renderPages(); // 懒渲染：仅激活页渲染
  renderRight();
  applyRightOpen();
  renderStack(); // 手机形态基底页（概览）；桌面视口 display:none，不干扰桌面渲染

  // —— FloatStrip 模拟演示（Task A5，规格 §5，仅 app 模式）：右下 FloatBall →
  //    点击展开一个 FloatStrip 实例（右下贴边可拖）。docs 互斥不并存，零冲击。 ——
  const ballHost = document.createElement('div');
  ballHost.className = 'app-main__float-ball';
  ballHost.innerHTML = renderFloatBall({ iconName: 'bolt', tooltip: '悬浮监测条' });
  document.body.appendChild(ballHost);
  let stripHost = null;
  mountFloatBall(ballHost, {
    onExpand: () => {
      // Tauri：显示/聚焦独立 strip 窗口（tauri.conf.json 预注册隐藏窗口「strip」；
      //   不用运行时 WebviewWindow —— 真实 Tauri 全局未暴露该构造函数，改用 getAllWindows→show）
      if (typeof window.__TAURI__ !== 'undefined') {
        window.__TAURI__.window.getAllWindows()
          .then((wins) => {
            const strip = wins.find((w) => w.label === 'strip');
            if (!strip) { console.warn('[strip] 未找到 strip 窗口'); return; }
            strip.show().catch(() => {});
            strip.setFocus().catch(() => {});
          })
          .catch((err) => {
            console.error('[strip] 获取窗口失败：', err);
            toast(`悬浮窗获取失败：${String(err?.message ?? err).slice(0, 120)}`, { variant: 'danger' });
          });
        return;
      }
      if (stripHost) return; // 已展开则不重复创建
      stripHost = document.createElement('div');
      stripHost.className = 'app-main__strip';
      stripHost.innerHTML = renderFloatStrip({
        content: renderTokenMonitor({
          value: '97.2%',
          status: 'ok',
          trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
        }),
      });
      document.body.appendChild(stripHost);
      mountFloatStrip(stripHost, {
        onClose: () => { stripHost?.remove(); stripHost = null; },
      });
    },
  });

  // 主窗关闭行为同步到 Rust（B4 收尾）：exit/background 由 Rust on_window_event 消费；
  //   移除 JS onCloseRequested 异步关 strip 的脆弱逻辑（曾导致主窗关不掉）
  const syncCloseBehavior = (cfg) => {
    if (typeof window.__TAURI__ === 'undefined') return;
    window.__TAURI__.core?.invoke?.('set_close_behavior', { behavior: cfg.closeBehavior ?? 'exit' }).catch(() => {});
  };
  syncCloseBehavior(getConfig());
  subscribe((cfg) => { syncCloseBehavior(cfg); });

  // 主窗 hidden-until-ready（ui/startup-opt）：首帧绘制后通知 Rust 恢复几何并显示。
  // 主窗 tauri.conf.json 设 visible:false，此处为唯一显示信号 —— 消除白屏与位置跳变；
  // Rust 侧另有 10s 兜底（前端异常时也恢复几何并显示，防隐形窗口）。浏览器（无 __TAURI__）no-op。
  if (typeof window.__TAURI__ !== 'undefined') {
    signalWhenPainted(
      (cb) => requestAnimationFrame(cb),
      () => window.__TAURI__.core.invoke('main_window_ready').catch(() => {}),
    );
  }
}

// —— 概览页：欢迎卡 + 7 快捷入口卡（点击 = 展开右窗 + 切到该应用）+ 主题状态卡 ——
function renderOverview() {
  const theme = document.documentElement.dataset.theme === 'dark' ? '深色' : '浅色';
  const accent = document.documentElement.dataset.accent || 'indigo';
  return `
    <div class="app-main__page-head"><h2 class="app-main__page-title">概览</h2></div>
    <div class="app-main__page-body">
      <div class="app-main__overview">
        <div class="app-main__card app-main__welcome">
          <div class="app-main__card-title">欢迎使用</div>
          <div class="app-main__card-desc">多应用壳设计系统 —— 左侧选择应用、右侧进入其目录，标题栏显示当前上下文。</div>
        </div>
        <div class="app-main__card app-main__shortcuts">
          <div class="app-main__card-title">快捷入口</div>
          <div class="app-main__shortcut-grid">
            ${MODULES.map((m) => `
              <button class="app-main__shortcut" data-shortcut="${m.id}">
                ${icon(m.icon, 20)}
                <span class="app-main__shortcut-name">${m.name}</span>
              </button>`).join('')}
            <button class="app-main__shortcut" data-shortcut="__nav-mgmt__"> <!-- 0.1.2：管理入口 → 设置导航分区（不进 MODULES） -->
              ${icon('layout', 20)}
              <span class="app-main__shortcut-name">管理入口</span>
            </button>
          </div>
        </div>
        <div class="app-main__card app-main__theme-status">
          <div class="app-main__card-title">主题状态</div>
          <div class="app-main__theme-row">
            <span>当前主题：${theme}</span>
            <span class="app-main__theme-swatch"></span>
            <span>强调色：${accent}</span>
          </div>
        </div>
      </div>
    </div>`;
}
