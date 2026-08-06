// 应用壳（Task A3 骨架 + Task A4 设置模式，规格 §2/§3/§4）：双窗口级联 + 标题栏上下文。
// 模式状态机：单窗口态（右窗收起，内容区 = 左窗选中应用首屏）/ 双窗口态（右窗展开，右窗驱动内容区）。
//   rightMode: 'apps'（右窗 = 应用内目录，内容区 = 模块页）/ 'settings'（右窗 = 设置目录 8 分区，
//   内容区 = 设置页）。⚙ 进入设置模式（激活高亮）；再次点击/返回/Esc/左窗已选中项 = 退出回应用模式。
// 设置页与场景模板共享 settings-pages.js 实现（类名 .csettings__* 不变，外观分区定制器首次激活惰性挂载）。
// 左窗/右窗均为 NavigationWheel 实例（纯 icon，38.2% 黄金比例锚点；名称由标题栏上下文承担，
// 栏内 name 经 app-main.css 隐藏，nav-wheel 组件零改动、docs 行为不变）。
// MODULES 扩展契约：应用注册 = 模块项（左窗 icon）+ 目录项（右窗 icon）+ 页面渲染函数（内容区）。
//   后续填充真实功能只改 MODULES（新增/改模块项、目录项、渲染函数），壳逻辑不变。
// 右窗状态为纯 UI 态（会话内），不进配置存储。
import { icon } from '../components/icon/icon.js';
import { renderTitleBar, mountTitleBar } from '../components/title-bar/title-bar.js';
import { renderEmptyState } from '../components/empty-state/empty-state.js';
import { mountNavWheel } from '../components/navigation-wheel/nav-wheel.js';
import { renderFloatBall, mountFloatBall } from '../components/float-ball/float-ball.js';
import { renderFloatStrip, mountFloatStrip, renderTokenMonitor } from '../components/float-strip/float-strip.js';
import { bindWindowControls } from '../demo/window-controls.js';
import { renderCustomizerGroups } from '../demo/customizer-panel.js';
import { APP_SECTIONS, renderSettingsPages, mountSettingsInteractions } from '../scenes/settings-window/settings-pages.js';
import { getConfig } from '../config/store.js';
import { applyConfig } from '../config/apply.js';
import '../components/float-strip/float-strip.css';
import './app-main.css';
import './partitions.css';

// 点按/拖拽位移阈值（与 dock 同机制，见下）：nav-wheel 不 preventDefault，拖拽松手后浏览器
// 仍派发 click —— pointerdown 记录起点，click 阶段位移 > 阈值视为拖拽忽略，防误触发收起。
const TAP_MAX_MOVE = 10;

// —— MODULES 扩展契约 ——
const MODULES = [
  { id: 'home', name: '概览', icon: 'home', dir: [], render: renderOverview },
  {
    id: 'clipboard', name: '剪贴板', icon: 'clipboard',
    dir: [
      { id: 'history', name: '历史', icon: 'list' },
      { id: 'pinned', name: '固定', icon: 'pin' },
      { id: 'groups', name: '分组', icon: 'folder' },
    ],
    render: placeholderPage,
  },
  {
    id: 'key', name: '密码', icon: 'key',
    dir: [
      { id: 'all', name: '全部', icon: 'box' },
      { id: 'groups', name: '分组', icon: 'folder' },
      { id: 'trash', name: '回收站', icon: 'trash' },
    ],
    render: placeholderPage,
  },
  {
    id: 'wallet', name: '记账', icon: 'wallet',
    dir: [
      { id: 'overview', name: '概览', icon: 'wallet' },
      { id: 'flows', name: '流水', icon: 'list' },
      { id: 'categories', name: '分类', icon: 'folder' },
    ],
    render: placeholderPage,
  },
  {
    id: 'search', name: '搜索', icon: 'search',
    dir: [
      { id: 'all', name: '全部', icon: 'search' },
      { id: 'web', name: '网页', icon: 'globe' },
      { id: 'files', name: '文件', icon: 'image' },
    ],
    render: placeholderPage,
  },
  {
    id: 'help', name: '帮助', icon: 'help',
    dir: [
      { id: 'usage', name: '使用', icon: 'list' },
      { id: 'faq', name: '常见问题', icon: 'help' },
    ],
    render: placeholderPage,
  },
  {
    id: 'info', name: '关于', icon: 'info',
    dir: [
      { id: 'version', name: '版本', icon: 'box' },
      { id: 'license', name: '许可', icon: 'shield' },
    ],
    render: placeholderPage,
  },
];

export function mountAppMode(root) {
  // 冷启动应用持久化配置（闭环 I1）：重启/Tauri 重开后界面保持
  // 上次保存的主题/强调色/定制器参数，与设置页高亮两态一致。
  applyConfig(getConfig());
  const settingsPagesHtml = renderSettingsPages(APP_SECTIONS);
  root.innerHTML = `
  <div class="app-main">
    ${renderTitleBar({ title: '概览', iconName: 'box', settings: true })}
    <div class="app-main__nav-l">
      <nav class="app-main__nav-l-wheel c-navwheel__list"></nav>
    </div>
    <div class="app-main__nav-r" aria-hidden="true">
      <button class="app-main__nav-r-back" aria-label="返回" title="收起目录">${icon('chevron-left', 16)}</button>
      <div class="app-main__nav-r-body"></div>
    </div>
    <main class="app-main__pages">
      ${MODULES.map((m) => `<section class="app-main__page" data-page="${m.id}"></section>`).join('')}
      <section class="app-main__page" data-page="settings">
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

  // —— 会话内纯 UI 态（不进配置存储）——
  // rightMode: 'apps'（应用目录）| 'settings'（设置目录）—— 设置模式右窗状态为纯 UI 态
  const state = { moduleId: 'home', dirId: null, rightOpen: false, rightMode: 'apps', settingsId: 'general' };

  // 手机形态（Task A6）：独立导航模型 —— 底部 dock（横向应用轮，点击驱动推入）+ 全屏页面栈。
  // 栈 = 钻取路径（基底概览 → 应用目录页 → 详情页 / 设置页）；桌面/手机两套模型经媒体查询切换，
  // 共享标题栏上下文；页面栈状态为纯 UI 态（会话内），不进配置存储。
  const mobile = { stack: [{ type: 'overview' }], animateTop: false };
  function isMobile() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
  }

  // —— 左窗：7 模块 NavigationWheel（纯 icon，38.2% 锚点）——
  const leftWheel = mountNavWheel(navL, {
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
    if (state.rightMode === 'settings') {
      navRBody.innerHTML = `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`;
      const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
        items: APP_SECTIONS.map((s) => ({ id: s.id, name: s.name, icon: s.icon })),
        onChange: (item) => setSettingsSection(item.id),
        anchorRatio: 0.382,
      });
      wheel.setActive(state.settingsId); // 保持上次选中的设置分区
      return wheel;
    }
    const mod = MODULES.find((m) => m.id === state.moduleId);
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
    return wheel;
  }

  // —— 内容区：唯一 active 页（data-page 对应模块；设置模式 = settings 页）——
  function renderPages() {
    if (state.rightMode === 'settings') {
      pages.forEach((p) => p.classList.toggle('app-main__page--active', p.dataset.page === 'settings'));
      setSettingsPageActive();
      return;
    }
    const mod = MODULES.find((m) => m.id === state.moduleId);
    pages.forEach((p) => p.classList.toggle('app-main__page--active', p.dataset.page === state.moduleId));
    const page = pages.find((p) => p.dataset.page === state.moduleId);
    page.innerHTML = mod.render(modCtx(mod));
  }

  // —— 设置页分区切换：唯一 active 页 + 惰性挂载（外观定制器 + 组件/动效展示内容，Task B1-1）。
  //   类名 .csettings__* 不变；.cust-group/.csg/.ml-card/.cfloat 只在 app 模式出现，docs 互斥不并存。
  //   组件/动效分区：首次激活时动态 import 展示模块挂到 .app-partition（Vite 代码分包，
  //   展示模块 CSS 随 chunk 加载）；桌面 DOM 常驻，模块级标志防重复挂载。
  //   组件分区末尾追加「组合示例：剪贴板悬浮窗」（mountClipboardFloat 流式 in-flow，不遮挡分区）。
  function mountComponentsPartition(part) {
    if (part.children.length) return; // 已挂载（移动端按空态重挂的防线）
    Promise.all([
      import('../demo/component-showcase-full.js'),
      import('../scenes/clipboard-float/clipboard-float.js'),
    ]).then(([{ mountComponentsShowcase }, { mountClipboardFloat }]) => {
      if (part.children.length) return; // 并发 import 竞态防御：同时触发时只挂一次
      mountComponentsShowcase(part);
      mountClipboardFloat(part); // 组合示例：剪贴板悬浮窗（复用既有场景模块）
    });
  }
  function mountMotionPartition(part) {
    if (part.children.length) return;
    import('../demo/motion-lab.js').then(({ mountMotionLab }) => {
      if (part.children.length) return;
      mountMotionLab(part);
    });
  }
  let custMounted = false;
  let componentsMounted = false;
  let motionMounted = false;
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
  }

  function setSettingsSection(id) {
    if (id === state.settingsId) return;
    state.settingsId = id;
    setSettingsPageActive();
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
  function setModule(id) {
    if (id === state.moduleId) return;
    state.moduleId = id;
    const mod = MODULES.find((m) => m.id === id);
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
  function setSettingsMode() {
    if (state.rightMode === 'settings') return;
    state.rightMode = 'settings';
    state.rightOpen = true;
    renderRight();
    renderPages();
    applyRightOpen();
  }

  function exitSettingsMode() {
    if (state.rightMode !== 'settings') return;
    state.rightMode = 'apps';
    state.rightOpen = false;
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
    if (id !== state.moduleId) setModule(id);
  }

  // 收起右窗（返回按钮 / Esc；二次点击走 onLeftSelect 的 toggle）。设置模式收起 = 退出设置模式
  function collapseRight() {
    if (!state.rightOpen) return;
    const wasSettings = state.rightMode === 'settings';
    state.rightOpen = false;
    if (wasSettings) {
      state.rightMode = 'apps';
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
      body = `
        <h2 class="app-main__page-title app-main__stack-title">${mod.name}</h2>
        <div class="app-main__dir-list">
          ${mod.dir.map((d) => `
            <button class="app-main__dir-item" data-dir="${d.id}">
              ${icon(d.icon, 18)}<span class="app-main__dir-name">${d.name}</span>${icon('chevron-right', 14)}
            </button>`).join('')}
        </div>`;
    } else if (entry.type === 'detail') {
      const mod = MODULES.find((m) => m.id === entry.moduleId);
      body = mod.render({ module: mod, dirId: entry.dirId, dirName: entry.dirName });
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
  function renderStack() {
    mobileCustUnsub?.(); // 重建前释放上一订阅（可能未挂载 = noop）
    mobileCustUnsub = null;
    stackEl.innerHTML = mobile.stack.map((entry, i) =>
      renderStackPage(entry, i === mobile.stack.length - 1 && mobile.animateTop)).join('');
    const settingsPage = stackEl.querySelector('[data-stack="settings"]');
    if (settingsPage) mountSettingsInteractions(settingsPage.querySelector('.app-main__settings'));
    mobile.animateTop = false;
    activateMobileSettings();
    updateCtx();
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
    if (state.settingsId === 'motion' && motion && !motion.children.length) mountMotionPartition(motion);
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

  // 底部 dock 点击 = 一级导航（钻取不叠加）：home（无目录）→ 回基底；其他应用 → 目录页。
  // 滚动/吸附只更新轮内高亮（nav-wheel onChange 为 noop），推入由显式点击驱动 —— 横滑浏览不弹页。
  function handleDockTap(id) {
    const mod = MODULES.find((m) => m.id === id);
    const top = mobile.stack[mobile.stack.length - 1];
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

  // dock 懒挂载：桌面视口下 dock 为 display:none（clientWidth=0 会让几何 pad 计算失真），
  // 首次进入手机形态时才挂载（几何基于实测视口长度；手机视口近似恒定，挂载一次即可）
  let dockMounted = false;
  function mountDock() {
    if (dockMounted) return;
    dockMounted = true;
    mountNavWheel(dockList, {
      items: MODULES.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
      onChange: () => {}, // 滚动/吸附仅更新轮内高亮，页面推入由点击驱动（钻取模型）
      anchorRatio: 0.382,
      direction: 'horizontal',
    });
  }

  // —— 事件 ——
  settingsBtn.addEventListener('click', toggleSettings);
  navRRoot.querySelector('.app-main__nav-r-back').addEventListener('click', collapseRight);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') collapseRight(); });
  pagesEl.addEventListener('click', (e) => {
    const card = e.target.closest('.app-main__shortcut');
    if (card) goToModule(card.dataset.shortcut);
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
      if (mod.dir.length) {
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
    if (shortcut) handleDockTap(shortcut.dataset.shortcut);
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

  // —— 初始渲染：全部 7 应用页 + 激活概览页 + 右窗收起（单窗口态）；
  //   设置页（第 8 区）已随模板渲染，此处跳过 ——
  pages.forEach((page) => {
    if (page.dataset.page === 'settings') return;
    const mod = MODULES.find((m) => m.id === page.dataset.page);
    page.innerHTML = mod.render(modCtx(mod));
  });
  pages.find((p) => p.dataset.page === state.moduleId).classList.add('app-main__page--active');
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
}

// —— 占位页骨架：页面头（应用名 + 可选 › 目录项）+ EmptyState（图标 + 功能开发中 + 接入说明）——
function placeholderPage(ctx) {
  const { module, dirName } = ctx;
  const sub = dirName ? ` › ${dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">${module.name}</h2>
      ${dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body">
      ${renderEmptyState({
        iconName: module.icon,
        title: '功能开发中',
        desc: `「${module.name}${sub}」为应用壳占位骨架，接入真实功能后替换此处。`,
      })}
    </div>`;
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
