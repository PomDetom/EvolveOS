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
import { toast } from './components/toast/toast.js';
import { openDialog } from './components/dialog/dialog.js';
import { renderPopover, mountPopover } from './components/popover/popover.js';
import { mountContextMenu } from './components/context-menu/context-menu.js';
import { renderTabs, mountTabs } from './components/tab/tab.js';
import { renderBreadcrumb } from './components/breadcrumb/breadcrumb.js';
import { renderTitleBar, mountTitleBar } from './components/title-bar/title-bar.js';
import { mountNavWheel } from './components/navigation-wheel/nav-wheel.js';
import { renderFloatingWindow, mountFloatingWindow } from './components/floating-window/floating-window.js';
import { renderSearchBar, mountSearchBar } from './components/search-bar/search-bar.js';
import { renderHotkeyHint } from './components/hotkey-hint/hotkey-hint.js';
import { renderFloatBall, mountFloatBall } from './components/float-ball/float-ball.js';
import { renderHotkeyRecorder, mountHotkeyRecorder } from './components/hotkey-recorder/hotkey-recorder.js';
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

// FloatingWindow 演示：body 顶部独立展示区（position:fixed 组件不进可滚动网格，
// 与 TitleBar 同策略）。body 内组合 SearchBar —— 拖动/置顶/折叠/搜索全部可交互。
const fwinDemo = document.createElement('div');
fwinDemo.style.width = '360px'; fwinDemo.style.margin = 'var(--space-5) auto 0';
fwinDemo.innerHTML = renderFloatingWindow({
  title: '剪贴板悬浮窗',
  body: renderSearchBar({ placeholder: '搜索剪贴板内容…', hotkey: ['Ctrl', 'K'] }),
});
document.body.prepend(fwinDemo);
mountFloatingWindow(fwinDemo);
mountSearchBar(fwinDemo);

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
const tabBox = showcase('标签页 Tabs', [
  { label: '3 个标签', html: renderTabs({ tabs: [
    { label: '概览', iconName: 'home', content: `<div class="demo-tab-content"><span>概览内容</span>${renderButton({ label: '新建', variant: 'primary', size: 'sm', iconName: 'plus' })}</div>` },
    { label: '历史', iconName: 'clipboard', content: `<div class="demo-tab-content"><span>最近 12 条记录</span>${renderBadge({ label: '12 条', variant: 'info' })}</div>` },
    { label: '设置', iconName: 'settings', content: `<div class="demo-tab-content"><span>主题偏好</span>${renderBadge({ label: '跟随系统', variant: 'warning' })}</div>` },
  ] }) },
]);
componentsSection.appendChild(tabBox);
mountTabs(tabBox);
componentsSection.appendChild(showcase('面包屑 Breadcrumb', [
  { label: '默认', html: renderBreadcrumb({ items: ['剪贴板', '历史记录', '2026-08-05'] }) },
]));
const popoverBox = showcase('气泡 Popover', [
  { label: '底部弹出', html: renderPopover({ trigger: '操作选项', content: '<div>这里是气泡内容<br>点击外部自动关闭</div>' }) },
  { label: '右侧弹出', html: renderPopover({ trigger: '更多信息', placement: 'right', content: '<div>右侧位置的气泡提示</div>' }) },
]);
componentsSection.appendChild(popoverBox);
mountPopover(popoverBox);
const dialogBox = showcase('对话框 Dialog', [
  { label: '危险确认', html: '<button class="c-btn c-btn--danger" data-dialog="danger" type="button">删除条目</button>' },
  { label: '普通确认', html: '<button class="c-btn c-btn--secondary" data-dialog="info" type="button">打开对话框</button>' },
]);
componentsSection.appendChild(dialogBox);
dialogBox.querySelectorAll('[data-dialog]').forEach((btn) => {
  const danger = btn.dataset.dialog === 'danger';
  btn.addEventListener('click', () => {
    openDialog(danger
      ? { title: '确认删除', content: '删除后无法恢复，确定要继续吗？', confirmLabel: '删除', danger: true }
      : { title: '关于', content: 'UI Design System v0.1 — 克制的玻璃质感设计语言。', confirmLabel: '知道了' })
      .then((ok) => { if (ok) toast(danger ? '已删除' : '感谢阅读', { variant: danger ? 'danger' : 'success' }); });
  });
});
const menuBox = showcase('右键菜单 ContextMenu', [
  { label: '右键舞台区域', html: '<div class="demo-context-stage">在此区域右键<br>打开上下文菜单</div>' },
]);
componentsSection.appendChild(menuBox);
mountContextMenu(menuBox.querySelector('.demo-context-stage'), [
  { label: '复制', iconName: 'copy', action: () => toast('已复制', { variant: 'info' }) },
  { label: '重命名', iconName: 'edit', action: () => toast('重命名功能演示') },
  { label: '删除', iconName: 'trash', danger: true, action: () => toast('已删除', { variant: 'danger' }) },
]);
const toastBox = showcase('消息提示 Toast', [
  { label: '成功', html: '<button class="c-btn c-btn--secondary" data-toast="success" type="button">成功提示</button>' },
  { label: '警告', html: '<button class="c-btn c-btn--secondary" data-toast="warning" type="button">警告提示</button>' },
  { label: '危险', html: '<button class="c-btn c-btn--secondary" data-toast="danger" type="button">错误提示</button>' },
  { label: '信息', html: '<button class="c-btn c-btn--secondary" data-toast="info" type="button">信息提示</button>' },
]);
componentsSection.appendChild(toastBox);
toastBox.querySelectorAll('[data-toast]').forEach((btn) => {
  const variant = btn.dataset.toast;
  btn.addEventListener('click', () => {
    const msgs = { success: '操作成功', warning: '请注意', danger: '操作失败', info: '新消息提醒' };
    toast(msgs[variant], { variant });
  });
});

const searchBox = showcase('搜索栏 SearchBar（Ctrl+K 聚焦）', [
  { label: '搜索剪贴板', html: renderSearchBar({ placeholder: '搜索内容…', hotkey: ['Ctrl', 'K'] }) },
  { label: '搜索设置', html: renderSearchBar({ placeholder: '搜索设置项…', hotkey: ['Ctrl', 'K'] }) },
]);
componentsSection.appendChild(searchBox);
mountSearchBar(searchBox);
componentsSection.appendChild(showcase('快捷键提示 HotkeyHint', [
  { label: '双键组合', html: renderHotkeyHint(['Ctrl', 'K']) },
  { label: '三键组合', html: renderHotkeyHint(['Ctrl', 'Shift', 'V']) },
  { label: '单键', html: renderHotkeyHint(['F2']) },
]));
const ballBox = showcase('悬浮球 FloatBall', [
  { label: '剪贴板', html: renderFloatBall({ iconName: 'clipboard', tooltip: '打开剪贴板' }) },
  { label: '设置', html: renderFloatBall({ iconName: 'settings', tooltip: '打开设置' }) },
]);
componentsSection.appendChild(ballBox);
ballBox.querySelectorAll('.c-float-ball').forEach((ball) => {
  mountFloatBall(ball, { onExpand: () => toast('展开面板（场景模板演示）') });
});
const recBox = showcase('快捷键录制 HotkeyRecorder', [
  { label: '点击录制', html: renderHotkeyRecorder({ placeholder: '点击设置快捷键' }) },
  { label: '已有组合键', html: renderHotkeyRecorder({ value: ['Ctrl', 'Alt', 'C'] }) },
]);
componentsSection.appendChild(recBox);
recBox.querySelectorAll('.c-hotkey-recorder').forEach((rec) => {
  mountHotkeyRecorder(rec, { onChange: (keys) => toast(`已设置快捷键 ${keys.join(' + ')}`) });
});

// 测试桥：Task 15 组件展示区上线后移除（components-basic.spec.js 依赖）
window.__renderIcon = icon;
window.__toast = toast;
window.__openDialog = openDialog;
