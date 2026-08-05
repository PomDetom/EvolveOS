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
import { bindWindowControls } from '../demo/window-controls.js';
import { renderCustomizerGroups } from '../demo/customizer-panel.js';
import { SECTIONS, renderSettingsPages, mountSettingsInteractions } from '../scenes/settings-window/settings-pages.js';
import './app-main.css';

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
  const settingsPagesHtml = renderSettingsPages();
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

  // —— 会话内纯 UI 态（不进配置存储）——
  // rightMode: 'apps'（应用目录）| 'settings'（设置目录）—— 设置模式右窗状态为纯 UI 态
  const state = { moduleId: 'home', dirId: null, rightOpen: false, rightMode: 'apps', settingsId: 'general' };

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
        items: SECTIONS.map((s) => ({ id: s.id, name: s.name, icon: s.icon })),
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

  // —— 设置页分区切换：唯一 active 页 + 外观分区定制器首次激活惰性挂载（与场景同构，
  //   类名 .csettings__* 不变；.cust-group 只在 app 模式出现，docs 互斥不并存）——
  let custMounted = false;
  function setSettingsPageActive() {
    const sec = pages.find((p) => p.dataset.page === 'settings');
    sec.querySelectorAll('.csettings__page').forEach((p) =>
      p.classList.toggle('csettings__page--active', p.dataset.page === state.settingsId));
    if (state.settingsId === 'appearance' && !custMounted) {
      renderCustomizerGroups(sec.querySelector('[data-page="appearance"] .csettings__cust'));
      custMounted = true;
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
    if (state.rightMode === 'settings') {
      const s = SECTIONS.find((x) => x.id === state.settingsId);
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
  // 是否真的再次点击了已选中项 —— 故在 pointerdown 记录「所点项当时是否已选中」，click 阶段判定。
  let downWasActive = false;
  navL.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.c-navwheel__item');
    if (item) downWasActive = MODULES[Number(item.dataset.index)].id === state.moduleId;
  });
  navL.addEventListener('click', () => {
    const wasActive = downWasActive;
    downWasActive = false;
    if (wasActive) {
      // 设置模式：再次点击左窗已选中项 = 退出设置模式（收起）
      if (state.rightMode === 'settings') { exitSettingsMode(); return; }
      const mod = MODULES.find((m) => m.id === state.moduleId);
      if (mod.dir.length) {
        state.rightOpen = !state.rightOpen;
        applyRightOpen();
      }
    }
  });

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
