import './styles/tokens.css';
import './styles/themes.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/layout.css';
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
import './scenes/settings-window/settings-window.css';
import './styles/customizer.css';
import { resolveMode } from './app/mode.js';

// 模式入口（Task B1-4，模式简化）：resolveMode 纯函数决定当前形态 ——
// ?mode=app|strip 显式优先；无参数/非法值 → 'app'（浏览器与 Tauri 一致，docs 渲染已删除）。
// hasTauri 由本处探测 window.__TAURI__（withGlobalTauri 全局通道，与 window-controls.js 同模式）。
// app/strip 动态 import（docs 展示内容已内化为设置「组件」「动效」分区，见 app-main.js）。
const mode = resolveMode(
  new URLSearchParams(window.location.search),
  typeof window !== 'undefined' && !!window.__TAURI__,
);

if (mode === 'app') {
  import('./app/app-main.js').then(({ mountAppMode }) => mountAppMode(document.querySelector('#app')));
} else {
  import('./app/strip-main.js').then(({ mountStripMode }) => mountStripMode());
}
