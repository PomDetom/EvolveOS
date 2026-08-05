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
import { renderCard } from './components/card/card.js';
import { renderList, mountList } from './components/list/list.js';
import { renderBadge } from './components/badge/badge.js';
import { renderTag, mountTag } from './components/tag/tag.js';
import { renderProgress } from './components/progress/progress.js';
import { renderAvatar } from './components/avatar/avatar.js';
import { renderSkeleton } from './components/skeleton/skeleton.js';
import { renderEmptyState } from './components/empty-state/empty-state.js';
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
componentsSection.appendChild(showcase('卡片 Card', [
  { label: '默认', html: renderCard({ title: '剪贴板历史', content: '最近 20 条复制记录会保存在这里，支持搜索与固定。', footer: renderButton({ label: '查看全部', variant: 'ghost', size: 'sm' }) }) },
  { label: '玻璃材质', html: renderCard({ title: '密码条目', content: '为每个网站生成独立的强密码，自动填充登录表单。', glass: true }) },
]));
const listBox = showcase('列表 List', [
  { label: '点击选中', html: renderList({ items: [
    { title: '复制内容', desc: 'https://example.com', meta: '02:14', iconName: 'copy' },
    { title: '剪贴板历史', desc: '共 12 条记录', meta: '12:05', iconName: 'clipboard', selected: true },
    { title: '设置面板', desc: '应用偏好设置', meta: '昨天', iconName: 'settings' },
  ] }) },
]);
componentsSection.appendChild(listBox);
mountList(listBox);
componentsSection.appendChild(showcase('徽标 Badge', [
  { label: '默认', html: renderBadge({ label: '默认', variant: 'default' }) },
  { label: '强调', html: renderBadge({ label: '强调', variant: 'accent' }) },
  { label: '成功', html: renderBadge({ label: '成功', variant: 'success' }) },
  { label: '警告', html: renderBadge({ label: '警告', variant: 'warning' }) },
  { label: '危险', html: renderBadge({ label: '危险', variant: 'danger' }) },
  { label: '信息', html: renderBadge({ label: '信息', variant: 'info' }) },
]));
const tagBox = showcase('标签 Tag', [
  { label: '普通标签', html: renderTag({ label: '常用' }) },
  { label: '可关闭标签', html: renderTag({ label: '可移除', closable: true }) },
]);
componentsSection.appendChild(tagBox);
mountTag(tagBox);
componentsSection.appendChild(showcase('进度条 Progress', [
  { label: '60%', html: renderProgress({ value: 60 }) },
  { label: '完成', html: renderProgress({ value: 100 }) },
]));
componentsSection.appendChild(showcase('头像 Avatar', [
  { label: '小 24', html: renderAvatar({ name: '剪', size: 'sm' }) },
  { label: '中 32', html: renderAvatar({ name: '贴', size: 'md' }) },
  { label: '大 40', html: renderAvatar({ name: '板', size: 'lg' }) },
]));
componentsSection.appendChild(showcase('骨架屏 Skeleton', [
  { label: '3 行', html: renderSkeleton({ lines: 3 }) },
  { label: '5 行', html: renderSkeleton({ lines: 5 }) },
]));
componentsSection.appendChild(showcase('空状态 EmptyState', [
  { label: '空剪贴板', html: renderEmptyState({ iconName: 'clipboard', title: '暂无内容', desc: '复制任意内容后将出现在这里', action: { label: '打开剪贴板', variant: 'primary' } }) },
  { label: '无搜索结果', html: renderEmptyState({ iconName: 'search', title: '未找到结果', desc: '换个关键词试试' }) },
]));

// 测试桥：Task 15 组件展示区上线后移除（components-basic.spec.js 依赖）
window.__renderIcon = icon;
