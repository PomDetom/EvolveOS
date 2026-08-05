// docs 展示页渲染（Task A1 自 src/main.js 纯搬移）：骨架渲染/主题切换/存储降级提示/
// 定制器/令牌区/导航轮/热键/设置入口/titlebar-demo/fwinDemo/组件矩阵/动效实验室/
// 3 场景模板/测试桥/窗口控制桥。main.js 只保留模式分支，本模块在 docs 模式同步挂载 ——
// 渲染结果与搬移前逐字节等价（DOM 结构/类名/文本不变）。
// CSS 全部留在 main.js（全局样式所有模式都加载），本模块只 import JS 逻辑。
import { icon } from '../components/icon/icon.js';
import { toast } from '../components/toast/toast.js';
import { openDialog } from '../components/dialog/dialog.js';
import { renderTitleBar, mountTitleBar } from '../components/title-bar/title-bar.js';
import { bindWindowControls } from '../demo/window-controls.js';
import { mountNavWheel } from '../components/navigation-wheel/nav-wheel.js';
import { renderFloatingWindow, mountFloatingWindow } from '../components/floating-window/floating-window.js';
import { renderSearchBar, mountSearchBar } from '../components/search-bar/search-bar.js';
import { mountComponentsShowcase } from '../demo/component-showcase-full.js';
import { mountMotionLab } from '../demo/motion-lab.js';
import { mountThemeSwitcher } from '../demo/theme-switcher.js';
import { mountTokenShowcase } from '../demo/token-showcase.js';
import { mountCustomizer, toggleCustomizer } from '../demo/customizer-panel.js';
import { mountClipboardFloat } from '../scenes/clipboard-float/clipboard-float.js';
import { mountMainWindow } from '../scenes/main-window/main-window.js';
import { mountSettingsWindow } from '../scenes/settings-window/settings-window.js';
import { getConfig, subscribe, onStorageError } from '../config/store.js';
import { applyConfig } from '../config/apply.js';

const NAV_CORE = [
  { id: 'tokens',    name: '设计令牌', icon: 'palette' },
  { id: 'components', name: '组件',    icon: 'box' },
  { id: 'motion',    name: '动效',    icon: 'sparkles' },
  { id: 'scenes',    name: '场景模板', icon: 'layout' },
];
// 导航项 ×3 重复 —— 4 个真实模块 + 演示重复项，保证列表高度超过导航容器，
// 「上下滑动选择 + 居中吸附」真实生效（用户确认的演示方案）
const NAV_ITEMS = [...NAV_CORE, ...NAV_CORE, ...NAV_CORE];

export function mountDocsMode() {
  const app = document.querySelector('#app');
  app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__brand">UI Design System</div>
      <!-- 窄屏折叠导航（Task I4，规格 §10）：≤900px 侧栏隐藏，顶部下拉接管模块跳转；
           仅取去重后的 NAV_CORE（真实模块），CSS 控制 display，≥900px 不可见 -->
      <select class="topbar__nav-mobile" aria-label="模块导航">
        ${NAV_CORE.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
      </select>
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

  // 存储降级提示（Task I4，规格 §13）：隐私模式下 localStorage 写失败 → 一次性 toast。
  // store 是纯配置层（只发事件），UI 接线在此 —— toast 不侵入配置层依赖。
  // 模块级防重复由 store 内 flag 保证（多次 saveConfig 只触发一次回调）。
  onStorageError(() => toast('隐私模式下配置仅在本次会话内生效，刷新后恢复默认', { variant: 'warning' }));

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
  const navMobile = document.querySelector('.topbar__nav-mobile'); // 窄屏折叠下拉（Task I4）
  const wheel = mountNavWheel(document.querySelector('.navwheel__list'), {
    items: NAV_ITEMS,
    onChange: (item) => {
      if (navMobile) navMobile.value = item.id; // 宽屏操作后缩窗：下拉选中态跟随
      document.querySelector(`#${item.id}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });
  // 窄屏下拉选择 → wheel.setActive(id) 同步侧栏实例选中态（切回宽屏状态一致），
  // onChange 复用同一 scrollIntoView 跳转路径（setActive 触发 onChange）
  navMobile?.addEventListener('change', () => wheel.setActive(navMobile.value));

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

  // 场景模板 1：剪贴板悬浮窗（Task 18）—— 第一个完整场景模板，验证悬浮窗场景组件组合。
  // 场景模板 2：主窗口（Task 19）—— 一体式标题栏 + 滑动导航 + 8 模块内容区，追加在其后。
  // 场景模板 3：设置页（Task 20）—— 滑动选择分区 + 定制器整页嵌入 + 快捷键录制。
  // #scenes 标题在此写入；场景自身（标题/说明/实例）由各 mount 函数追加。
  const scenesSection = document.querySelector('#scenes');
  scenesSection.innerHTML = '<h2>场景模板</h2>';
  mountClipboardFloat(scenesSection);
  mountMainWindow(scenesSection);
  mountSettingsWindow(scenesSection);

  // 测试桥：overlays.spec.js 依赖（__renderIcon 已随 Task 15 真实展示区移除）
  window.__toast = toast;
  window.__openDialog = openDialog;

  // 窗口控制桥（Task I2）：放在全部挂载之后 —— 场景模板/组件矩阵的 .c-titlebar 实例
  // 此时已渲染，统一绑定（同一 getCurrentWindow() 对每个实例操作同一主窗口，无副作用）。
  // Tauri 环境探测 window.__TAURI__ 自动生效（min → minimize、max → toggleMaximize +
  // 图标按真实状态同步、close → close，失败静默降级）；浏览器环境探测不到 API 不绑定，
  // 保留 mountTitleBar 演示行为（含 max 图标切换）。
  // 测试经 /src/demo/window-controls.js 动态 import 注入 mock windowApi 验证绑定逻辑。
  bindWindowControls();
}
