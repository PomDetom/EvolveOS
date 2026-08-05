import './styles/tokens.css';
import './styles/themes.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/layout.css';
import './components/icon/icon.css';
import './components/button/button.css';
import { icon } from './components/icon/icon.js';
import { renderButton } from './components/button/button.js';
import { showcase } from './demo/component-showcase.js';
import { mountThemeSwitcher } from './demo/theme-switcher.js';
import { getConfig } from './config/store.js';
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
      <nav class="navwheel__list" data-mount="nav-wheel"></nav>
      <button class="navwheel__settings" data-mount="settings-entry">设置</button>
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

// 组件展示区初始渲染（Task 15 起替换为完整矩阵）
const componentsSection = document.querySelector('#components');
componentsSection.innerHTML = '<h2>组件</h2>';
componentsSection.appendChild(showcase('按钮 Button', [
  { label: '主按钮', html: renderButton({ label: '确定', variant: 'primary' }) },
  { label: '次按钮', html: renderButton({ label: '取消', variant: 'secondary' }) },
  { label: '幽灵按钮', html: renderButton({ label: '更多', variant: 'ghost', iconName: 'chevron-down' }) },
  { label: '危险按钮', html: renderButton({ label: '删除', variant: 'danger' }) },
  { label: '小尺寸', html: renderButton({ label: '小按钮', size: 'sm' }) },
  { label: '大尺寸', html: renderButton({ label: '大按钮', size: 'lg', iconName: 'plus' }) },
  { label: '禁用', html: renderButton({ label: '禁用', disabled: true }) },
]));

// 测试桥：Task 15 组件展示区上线后移除（components-basic.spec.js 依赖）
window.__renderIcon = icon;
