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
import { icon } from './components/icon/icon.js';
import { renderButton } from './components/button/button.js';
import { renderInput } from './components/input/input.js';
import { renderTextarea } from './components/textarea/textarea.js';
import { renderSelect } from './components/select/select.js';
import { renderCheckbox } from './components/checkbox/checkbox.js';
import { renderRadio } from './components/radio/radio.js';
import { renderSwitch, mountSwitch } from './components/switch/switch.js';
import { renderSlider } from './components/slider/slider.js';
import { renderKbd } from './components/kbd/kbd.js';
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
componentsSection.appendChild(showcase('输入框 Input', [
  { label: '默认', html: renderInput({ placeholder: '请输入内容', label: '输入框' }) },
]));
componentsSection.appendChild(showcase('文本域 Textarea', [
  { label: '默认', html: renderTextarea({ placeholder: '请输入多行内容', label: '文本域' }) },
]));
componentsSection.appendChild(showcase('选择器 Select', [
  { label: '默认', html: renderSelect({ placeholder: '请选择', options: [
    { value: 'a', label: '选项 A' }, { value: 'b', label: '选项 B' }], value: 'a' }) },
]));
componentsSection.appendChild(showcase('复选框 Checkbox', [
  { label: '已选中', html: renderCheckbox({ checked: true, label: '记住我' }) },
]));
componentsSection.appendChild(showcase('单选 Radio', [
  { label: '已选中', html: renderRadio({ checked: true, label: '选项 A' }) },
]));
componentsSection.appendChild(showcase('滑杆 Slider', [
  { label: '默认', html: renderSlider({ label: '音量' }) },
  { label: '已调整', html: renderSlider({ value: 80, label: '透明度' }) },
]));
const switchBox = showcase('开关 Switch', [
  { label: '关闭', html: renderSwitch({ label: '开关' }) },
  { label: '开启', html: renderSwitch({ checked: true, label: '开关' }) },
]);
componentsSection.appendChild(switchBox);
mountSwitch(switchBox);
componentsSection.appendChild(showcase('快捷键键帽 Kbd', [
  { label: '单键', html: renderKbd('Ctrl') },
]));

// 测试桥：Task 15 组件展示区上线后移除（components-basic.spec.js 依赖）
window.__renderIcon = icon;
