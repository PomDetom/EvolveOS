import './styles/tokens.css';
import './styles/themes.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/layout.css';
import './demo/token-showcase.css';
import './demo/component-showcase-full.css';
import './styles/motion-lab.css';
import './components/icon/icon.css';
import './components/button/button.css';
import './components/input/input.css';
import './components/textarea/textarea.css';
import './components/select/select.css';
import './components/checkbox/checkbox.css';
import './components/radio/radio.css';
import './components/switch/switch.css';
import './components/slider/slider.css';
import './components/kbd/kbd.css';
import './components/card/card.css';
import './components/list/list.css';
import './components/badge/badge.css';
import './components/tag/tag.css';
import './components/progress/progress.css';
import './components/avatar/avatar.css';
import './components/skeleton/skeleton.css';
import './components/empty-state/empty-state.css';
import './components/toast/toast.css';
import './components/dialog/dialog.css';
import './components/popover/popover.css';
import './components/context-menu/context-menu.css';
import './components/tab/tab.css';
import './components/breadcrumb/breadcrumb.css';
import './components/title-bar/title-bar.css';
import './components/navigation-wheel/nav-wheel.css';
import './components/floating-window/floating-window.css';
import './components/search-bar/search-bar.css';
import './components/hotkey-hint/hotkey-hint.css';
import './components/float-ball/float-ball.css';
import './components/hotkey-recorder/hotkey-recorder.css';
import './components/sidebar-item/sidebar-item.css';
import './styles/customizer.css';
import { icon } from './components/icon/icon.js';
import { toast } from './components/toast/toast.js';
import { openDialog } from './components/dialog/dialog.js';
import { renderTitleBar, mountTitleBar } from './components/title-bar/title-bar.js';
import { mountNavWheel } from './components/navigation-wheel/nav-wheel.js';
import { renderFloatingWindow, mountFloatingWindow } from './components/floating-window/floating-window.js';
import { renderSearchBar, mountSearchBar } from './components/search-bar/search-bar.js';
import { mountComponentsShowcase } from './demo/component-showcase-full.js';
import { mountMotionLab } from './demo/motion-lab.js';
import { mountThemeSwitcher } from './demo/theme-switcher.js';
import { mountTokenShowcase } from './demo/token-showcase.js';
import { mountCustomizer, toggleCustomizer } from './demo/customizer-panel.js';
import { getConfig, subscribe } from './config/store.js';
import { applyConfig } from './config/apply.js';

const NAV_CORE = [
  { id: 'tokens',    name: '设计令牌', icon: 'palette' },
  { id: 'components', name: '组件',    icon: 'box' },
  { id: 'motion',    name: '动效',    icon: 'sparkles' },
  { id: 'scenes',    name: '场景模板', icon: 'layout' },
];
// 导航项 ×3 重复 —— 4 个真实模块 + 演示重复项，保证列表高度超过导航容器，
// 「上下滑动选择 + 居中吸附」真实生效（用户确认的演示方案）
const NAV_ITEMS = [...NAV_CORE, ...NAV_CORE, ...NAV_CORE];

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__brand">UI Design System</div>
      <nav class="topbar__nav">${NAV_ITEMS.map(i => `<a href="#${i.id}">${i.name}</a>`).join('')}</nav>
      <div class="topbar__actions">
        <div class="topbar__theme" data-mount="theme-switcher"></div>
        <button class="topbar__customizer" data-mount="customizer-open">定制</button>
      </div>
    </header>
    <aside class="navwheel">
      <nav class="navwheel__list c-navwheel__list" data-mount="nav-wheel"></nav>
      <button class="navwheel__settings c-navwheel__settings" data-mount="settings-entry">设置</button>
    </aside>
    <main class="content">
      <section id="tokens" class="content__section"></section>
      <section id="components" class="content__section"></section>
      <section id="motion" class="content__section"></section>
      <section id="scenes" class="content__section"></section>
    </main>
  </div>
`;

applyConfig(getConfig());
mountThemeSwitcher(document.querySelector('[data-mount="theme-switcher"]'));

// 主题定制器（Task 17）：body 级抽屉常驻挂载；顶栏「定制」按钮打开。
// 令牌展示区玻璃卡的「定制器」链接经 .topbar__customizer.click() 委托到这里（token-showcase.js）。
mountCustomizer(document.body);
document.querySelector('.topbar__customizer').addEventListener('click', () => toggleCustomizer(true));

// 令牌展示区（Task 14）：订阅 store —— 主题/主题色/定制器变更时重渲染
// （subscribe 回调内只 applyConfig + 重渲染，不再 saveConfig，避免循环）
const tokensSection = document.querySelector('#tokens');
mountTokenShowcase(tokensSection);
subscribe((cfg) => {
  applyConfig(cfg);
  mountTokenShowcase(tokensSection, true);
});

// NavigationWheel：滑动选择导航（Task 11 + 12）—— 选中项在侧栏居中，主内容滚动到对应区块
const wheel = mountNavWheel(document.querySelector('.navwheel__list'), {
  items: NAV_ITEMS,
  onChange: (item) => {
    document.querySelector(`#${item.id}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
});

// 全局热键（Task 13）：最小实现 —— document keydown 匹配已注册组合键
// （如 Ctrl+K → 聚焦第一个 .c-search-bar input，由 search-bar mount 时注册）
const __hotkeyHandlers = new Map();
window.__bindHotkey = (keys, cb) => { __hotkeyHandlers.set(keys.join('+'), cb); };
const matchHotkey = (e, sig) => {
  const parts = sig.split('+');
  const main = parts.find((p) => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(p));
  return parts.includes('Ctrl') === e.ctrlKey
    && parts.includes('Alt') === e.altKey
    && parts.includes('Shift') === e.shiftKey
    && parts.includes('Meta') === e.metaKey
    && !!main && e.key.toLowerCase() === main.toLowerCase();
};
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  for (const [sig, cb] of __hotkeyHandlers) {
    if (matchHotkey(e, sig)) { e.preventDefault(); cb(); return; }
  }
});

// 设置入口（Task 12）：左下角按钮填图标 + 「设置」，点击滚动到设置页场景模板（#scenes）
const settingsEntry = document.querySelector('.c-navwheel__settings');
settingsEntry.innerHTML = `${icon('settings', 20)}<span>设置</span>`;
settingsEntry.addEventListener('click', () => {
  document.querySelector('#scenes').scrollIntoView({ behavior: 'smooth' });
});

// TitleBar 演示：独立展示区（body 顶部，尺寸与场景模板一致便于评审）
const titlebarDemo = document.createElement('div');
titlebarDemo.id = 'titlebar-demo';
titlebarDemo.style.width = '360px'; titlebarDemo.style.borderRadius = 'var(--radius-xl)'; titlebarDemo.style.overflow = 'hidden';
titlebarDemo.style.border = '1px solid var(--glass-border)'; titlebarDemo.style.boxShadow = 'var(--glass-shadow)';
titlebarDemo.style.margin = '0 auto'; titlebarDemo.style.marginTop = 'var(--space-5)';
titlebarDemo.innerHTML = renderTitleBar({ title: '剪贴板', iconName: 'clipboard' }) + '<div style="height:120px" class="glass"></div>';
document.body.prepend(titlebarDemo);
mountTitleBar(titlebarDemo);

// FloatingWindow 演示：position:fixed 组件不进 showcase 网格，置于 content 内容区顶部。
// 修复（评审 Important 1）：窗口按 flow 落到 topbar 之下 —— 加载态不与 #titlebar-demo
// 重叠（控件可点），滚动时也永不复盖 topbar 导航链接（链接拖拽会劫持 pointercancel）；
// 悬浮于内容区之上即组件本义。body 内组合 SearchBar —— 拖动/置顶/折叠/搜索全部可交互。
const fwinDemo = document.createElement('div');
fwinDemo.style.width = '360px'; fwinDemo.style.margin = 'var(--space-5) auto 0';
fwinDemo.innerHTML = renderFloatingWindow({
  title: '剪贴板悬浮窗',
  body: renderSearchBar({ placeholder: '搜索剪贴板内容…', hotkey: ['Ctrl', 'K'] }),
});
document.querySelector('.content').prepend(fwinDemo);
mountFloatingWindow(fwinDemo);
mountSearchBar(fwinDemo);

// 组件展示区完整矩阵（Task 15）：6 组 32 组件变体矩阵 + 悬浮窗交互实例
mountComponentsShowcase(document.querySelector('#components'));

// 动效实验室（Task 16）：5 个动效演示卡 + 参数试玩器 + 重播。
// 定制器联动在模块内部 subscribe —— 只同步滑杆/局部变量，不重渲染 DOM。
mountMotionLab(document.querySelector('#motion'));

// 测试桥：overlays.spec.js 依赖（__renderIcon 已随 Task 15 真实展示区移除）
window.__toast = toast;
window.__openDialog = openDialog;
