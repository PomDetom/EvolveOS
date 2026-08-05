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
import './scenes/clipboard-float/clipboard-float.css';
import './scenes/main-window/main-window.css';
import './scenes/settings-window/settings-window.css';
import './styles/customizer.css';
import { resolveMode } from './app/mode.js';
import { mountDocsMode } from './docs/docs-mode.js';

// 模式入口（Task A1，规格：模式入口）：resolveMode 纯函数决定当前形态 ——
// ?mode=app|docs|strip 显式优先；无参数 + Tauri → 'app'；无参数浏览器 → 'docs'；非法值回落 'docs'。
// hasTauri 由本处探测 window.__TAURI__（withGlobalTauri 全局通道，与 window-controls.js 同模式）。
// docs 同步挂载（渲染逐字节等价，见 src/docs/docs-mode.js）；app/strip 动态 import 占位
// （app-main.js / strip-main.js 由 Task A3 / Task A5 实现，本任务仅保证 build 可解析）。
const mode = resolveMode(
  new URLSearchParams(window.location.search),
  typeof window !== 'undefined' && !!window.__TAURI__,
);

if (mode === 'app') {
  import('./app/app-main.js').then(({ mountAppMode }) => mountAppMode(document.querySelector('#app')));
} else if (mode === 'strip') {
  import('./app/strip-main.js').then(({ mountStripMode }) => mountStripMode());
} else {
  mountDocsMode();
}
