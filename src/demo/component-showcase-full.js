// 组件展示区完整矩阵（Task 15）：6 组 32 组件变体矩阵 + 交互实例。
// 只组装不新建组件（SidebarItem 为本任务内建的唯一新组件）；
// 每组内部调用 showcase()，浮层组件附「点击演示」触发按钮，
// 悬浮窗专属组底部渲染可交互 FloatingWindow + SearchBar + FloatBall 联动实例。
// 自身 import 本组 CSS（Task B1-1 内化）：Vite 按模块去重，docs 静态引用与 app 动态 chunk 双引无害。
import './component-showcase-full.css';
import { icon } from '../components/icon/icon.js';
import { renderButton } from '../components/button/button.js';
import { renderInput } from '../components/input/input.js';
import { renderTextarea } from '../components/textarea/textarea.js';
import { renderSelect } from '../components/select/select.js';
import { renderCheckbox } from '../components/checkbox/checkbox.js';
import { renderRadio } from '../components/radio/radio.js';
import { renderSwitch, mountSwitch } from '../components/switch/switch.js';
import { renderSlider } from '../components/slider/slider.js';
import { renderKbd } from '../components/kbd/kbd.js';
import { renderCard } from '../components/card/card.js';
import { renderList, mountList } from '../components/list/list.js';
import { renderBadge } from '../components/badge/badge.js';
import { renderTag, mountTag } from '../components/tag/tag.js';
import { renderProgress } from '../components/progress/progress.js';
import { renderAvatar } from '../components/avatar/avatar.js';
import { renderSkeleton } from '../components/skeleton/skeleton.js';
import { renderEmptyState } from '../components/empty-state/empty-state.js';
import { toast } from '../components/toast/toast.js';
import { openDialog } from '../components/dialog/dialog.js';
import { renderPopover, mountPopover } from '../components/popover/popover.js';
import { mountContextMenu } from '../components/context-menu/context-menu.js';
import { renderTabs, mountTabs } from '../components/tab/tab.js';
import { renderBreadcrumb } from '../components/breadcrumb/breadcrumb.js';
import { renderTitleBar, mountTitleBar } from '../components/title-bar/title-bar.js';
import { mountNavWheel } from '../components/navigation-wheel/nav-wheel.js';
import { renderFloatingWindow, mountFloatingWindow } from '../components/floating-window/floating-window.js';
import { renderSearchBar, mountSearchBar } from '../components/search-bar/search-bar.js';
import { renderHotkeyHint } from '../components/hotkey-hint/hotkey-hint.js';
import { renderFloatBall, mountFloatBall } from '../components/float-ball/float-ball.js';
import { renderHotkeyRecorder, mountHotkeyRecorder } from '../components/hotkey-recorder/hotkey-recorder.js';
import { renderSidebarItem } from '../components/sidebar-item/sidebar-item.js';
import { showcase } from './component-showcase.js';

// NavigationWheel 演示实例：8 项（与侧栏真实导航互不影响）
const NAVWHEEL_DEMO = [
  { id: 'clipboard',   name: '剪贴板',  icon: 'clipboard' },
  { id: 'password',    name: '密码管理', icon: 'key' },
  { id: 'bookkeeping', name: '记账本',  icon: 'wallet' },
  { id: 'settings',    name: '设置',    icon: 'settings' },
  { id: 'theme',       name: '主题',    icon: 'palette' },
  { id: 'sync',        name: '同步',    icon: 'refresh' },
  { id: 'help',        name: '帮助',    icon: 'info' },
  { id: 'about',       name: '关于',    icon: 'heart' },
];

const SELECT_OPTIONS = [
  { value: 'a', label: '选项 A' },
  { value: 'b', label: '选项 B' },
  { value: 'c', label: '选项 C' },
];

// 组容器：标题（含图标）+ 组内 showcase 列表
function group(title, iconName, ...boxes) {
  const wrap = document.createElement('section');
  wrap.className = 'csg';
  wrap.innerHTML = `<h3 class="csg__title">${icon(iconName, 16)}<span>${title}</span></h3>`;
  boxes.forEach((b) => wrap.appendChild(b));
  return wrap;
}

export function mountComponentsShowcase(root) {
  root.innerHTML = '<h2>组件</h2>';

  // ============ 组 1：核心导航（NavigationWheel / TitleBar / SidebarItem） ============
  const navWheelBox = showcase('导航轮 NavigationWheel', [
    { label: '8 项滑动选择实例（拖拽 / 滚轮 / 点击）',
      html: '<div class="c-navwheel c-navwheel--demo"><div class="c-navwheel__list"></div></div>',
      wide: true },
  ]);
  const titleBarBox = showcase('标题栏 TitleBar', [
    { label: '剪贴板窗口', html: renderTitleBar({ title: '剪贴板', iconName: 'clipboard' }) },
    { label: '密码管理窗口', html: renderTitleBar({ title: '密码管理', iconName: 'key' }) },
    { label: '记账本窗口', html: renderTitleBar({ title: '记账本', iconName: 'wallet' }) },
  ]);
  const sidebarBox = showcase('侧边栏项 SidebarItem', [
    { label: '默认', html: renderSidebarItem({ label: '剪贴板', iconName: 'clipboard' }) },
    { label: '选中态', html: renderSidebarItem({ label: '剪贴板', iconName: 'clipboard', active: true }) },
    { label: '图标项', html: renderSidebarItem({ label: '设置', iconName: 'settings' }) },
    { label: '无图标', html: renderSidebarItem({ label: '清空记录' }) },
  ]);
  root.appendChild(group('核心导航', 'home', navWheelBox, titleBarBox, sidebarBox));

  // 导航轮演示实例：挂 8 项 + 选中回调（toast 反馈交互）
  mountNavWheel(navWheelBox.querySelector('.c-navwheel__list'), {
    items: NAVWHEEL_DEMO,
    onChange: (item) => toast(`选中「${item.name}」（演示）`),
  });
  // 标题栏演示：最大化按钮图标切换
  titleBarBox.querySelectorAll('.c-titlebar').forEach((bar) => mountTitleBar(bar));

  // ============ 组 2：基础表单（Button / Icon / Input / Textarea / Select / Checkbox / Radio / Switch / Slider / Kbd） ============
  const btnBox = showcase('按钮 Button', [
    { label: '主按钮', html: renderButton({ label: '确定', variant: 'primary' }) },
    { label: '次按钮', html: renderButton({ label: '取消', variant: 'secondary' }) },
    { label: '幽灵按钮', html: renderButton({ label: '更多', variant: 'ghost', iconName: 'chevron-down' }) },
    { label: '危险按钮', html: renderButton({ label: '删除', variant: 'danger' }) },
    { label: '小尺寸', html: renderButton({ label: '小按钮', size: 'sm' }) },
    { label: '大尺寸', html: renderButton({ label: '大按钮', size: 'lg', iconName: 'plus' }) },
    { label: '禁用', html: renderButton({ label: '禁用', disabled: true }) },
  ]);
  const iconBox = showcase('图标 Icon', [
    { label: '16 小', html: icon('home', 16) },
    { label: '18 标准', html: icon('copy', 18) },
    { label: '20 强调', html: icon('bell', 20) },
    { label: '24 大', html: icon('settings', 24) },
    { label: '主题色', html: `<span style="color: var(--accent)">${icon('star', 18)}</span>` },
    { label: '次要文字色', html: `<span style="color: var(--text-2)">${icon('folder', 18)}</span>` },
  ]);
  const inputBox = showcase('输入框 Input', [
    { label: '默认', html: renderInput({ placeholder: '请输入内容', label: '输入框' }) },
    { label: '带值', html: renderInput({ value: '剪贴板内容', label: '已填写' }) },
    { label: '禁用', html: renderInput({ placeholder: '不可编辑', label: '禁用', disabled: true }) },
    { label: '无标签', html: renderInput({ placeholder: '纯输入框' }) },
  ]);
  const textareaBox = showcase('文本域 Textarea', [
    { label: '3 行默认', html: renderTextarea({ placeholder: '请输入多行内容', label: '文本域' }) },
    { label: '5 行带值', html: renderTextarea({ value: '这是已有内容…', rows: 5, label: '多行' }) },
  ]);
  const selectBox = showcase('选择器 Select', [
    { label: '未选择', html: renderSelect({ options: SELECT_OPTIONS, placeholder: '请选择' }) },
    { label: '已选择', html: renderSelect({ options: SELECT_OPTIONS, value: 'b', placeholder: '请选择' }) },
    { label: '禁用', html: renderSelect({ options: SELECT_OPTIONS, placeholder: '不可选', disabled: true }) },
  ]);
  const checkboxBox = showcase('复选框 Checkbox', [
    { label: '未选', html: renderCheckbox({ label: '记住我' }) },
    { label: '已选', html: renderCheckbox({ label: '自动复制', checked: true }) },
    { label: '禁用', html: renderCheckbox({ label: '不可勾选', disabled: true }) },
  ]);
  const radioBox = showcase('单选 Radio', [
    { label: '未选', html: renderRadio({ label: '选项 A' }) },
    { label: '已选', html: renderRadio({ label: '选项 B', checked: true }) },
    { label: '禁用', html: renderRadio({ label: '选项 C', disabled: true }) },
  ]);
  const switchBox = showcase('开关 Switch', [
    { label: '关闭', html: renderSwitch({ label: '开关' }) },
    { label: '开启', html: renderSwitch({ label: '开关', checked: true }) },
    { label: '通知开启', html: renderSwitch({ label: '通知', checked: true }) },
  ]);
  const sliderBox = showcase('滑杆 Slider', [
    { label: '音量 50', html: renderSlider({ label: '音量' }) },
    { label: '亮度 80', html: renderSlider({ label: '亮度', value: 80 }) },
    { label: '透明度 20', html: renderSlider({ label: '透明度', value: 20 }) },
  ]);
  const kbdBox = showcase('快捷键键帽 Kbd', [
    { label: '修饰键', html: renderKbd('Ctrl') },
    { label: '字母键', html: renderKbd('V') },
    { label: '功能键', html: renderKbd('F2') },
  ]);
  root.appendChild(group('基础表单', 'edit',
    btnBox, iconBox, inputBox, textareaBox, selectBox,
    checkboxBox, radioBox, switchBox, sliderBox, kbdBox));

  mountSwitch(switchBox);

  // ============ 组 3：数据展示（Card / List / Badge / Tag / Progress / Avatar / Skeleton / EmptyState） ============
  const cardBox = showcase('卡片 Card', [
    { label: '默认', html: renderCard({ title: '剪贴板历史', content: '最近 20 条复制记录会保存在这里，支持搜索与固定。', footer: renderButton({ label: '查看全部', variant: 'ghost', size: 'sm' }) }) },
    { label: '亚克力材质', html: renderCard({ title: '密码条目', content: '为每个网站生成独立的强密码，自动填充登录表单。', glass: true }) },
    { label: '徽标页脚', html: renderCard({ title: '同步状态', content: '剪贴板数据将在设备间自动同步。', footer: renderBadge({ label: '已同步', variant: 'success' }) }) },
  ]);
  const listBox = showcase('列表 List', [
    { label: '完整列表', html: renderList({ items: [
      { title: '复制内容', desc: 'https://example.com', meta: '02:14', iconName: 'copy' },
      { title: '剪贴板历史', desc: '共 12 条记录', meta: '12:05', iconName: 'clipboard', selected: true },
      { title: '设置面板', desc: '应用偏好设置', meta: '昨天', iconName: 'settings' },
    ] }) },
    { label: '简洁列表', html: renderList({ items: [
      { title: '显示桌面通知', meta: '开', iconName: 'bell' },
      { title: '开机自启动', meta: '关', iconName: 'monitor' },
    ] }) },
  ]);
  const badgeBox = showcase('徽标 Badge', [
    { label: '默认', html: renderBadge({ label: '默认', variant: 'default' }) },
    { label: '强调', html: renderBadge({ label: '强调', variant: 'accent' }) },
    { label: '成功', html: renderBadge({ label: '成功', variant: 'success' }) },
    { label: '警告', html: renderBadge({ label: '警告', variant: 'warning' }) },
    { label: '危险', html: renderBadge({ label: '危险', variant: 'danger' }) },
    { label: '信息', html: renderBadge({ label: '信息', variant: 'info' }) },
  ]);
  const tagBox = showcase('标签 Tag', [
    { label: '普通标签', html: renderTag({ label: '常用' }) },
    { label: '可关闭标签', html: renderTag({ label: '可移除', closable: true }) },
  ]);
  const progressBox = showcase('进度条 Progress', [
    { label: '处理中 40%', html: renderProgress({ value: 40 }) },
    { label: '接近完成 75%', html: renderProgress({ value: 75 }) },
    { label: '已完成 100%', html: renderProgress({ value: 100 }) },
  ]);
  const avatarBox = showcase('头像 Avatar', [
    { label: '小 24', html: renderAvatar({ name: '剪', size: 'sm' }) },
    { label: '中 32', html: renderAvatar({ name: '贴', size: 'md' }) },
    { label: '大 40', html: renderAvatar({ name: '板', size: 'lg' }) },
  ]);
  const skeletonBox = showcase('骨架屏 Skeleton', [
    { label: '3 行', html: renderSkeleton({ lines: 3 }) },
    { label: '5 行', html: renderSkeleton({ lines: 5 }) },
  ]);
  const emptyBox = showcase('空状态 EmptyState', [
    { label: '带操作', html: renderEmptyState({ iconName: 'clipboard', title: '暂无内容', desc: '复制任意内容后将出现在这里', action: { label: '打开剪贴板', variant: 'primary' } }) },
    { label: '无操作', html: renderEmptyState({ iconName: 'search', title: '未找到结果', desc: '换个关键词试试' }) },
  ]);
  root.appendChild(group('数据展示', 'box',
    cardBox, listBox, badgeBox, tagBox, progressBox, avatarBox, skeletonBox, emptyBox));

  mountList(listBox);
  mountTag(tagBox);

  // ============ 组 4：浮层反馈（Toast / Dialog / Popover / ContextMenu） ============
  const toastBox = showcase('消息提示 Toast', [
    { label: '成功', html: '<button class="c-btn c-btn--secondary" data-toast="success" type="button">成功提示</button>' },
    { label: '警告', html: '<button class="c-btn c-btn--secondary" data-toast="warning" type="button">警告提示</button>' },
    { label: '危险', html: '<button class="c-btn c-btn--secondary" data-toast="danger" type="button">错误提示</button>' },
    { label: '信息', html: '<button class="c-btn c-btn--secondary" data-toast="info" type="button">信息提示</button>' },
  ]);
  const dialogBox = showcase('对话框 Dialog', [
    { label: '危险确认', html: '<button class="c-btn c-btn--danger" data-dialog="danger" type="button">删除条目</button>' },
    { label: '普通确认', html: '<button class="c-btn c-btn--secondary" data-dialog="info" type="button">打开对话框</button>' },
  ]);
  const popoverBox = showcase('气泡 Popover', [
    { label: '底部弹出', html: renderPopover({ trigger: '操作选项', content: '<div>这里是气泡内容<br>点击外部自动关闭</div>' }) },
    { label: '右侧弹出', html: renderPopover({ trigger: '更多信息', placement: 'right', content: '<div>右侧位置的气泡提示</div>' }) },
  ]);
  const menuBox = showcase('右键菜单 ContextMenu', [
    { label: '常用操作', html: '<div class="demo-context-stage">在此区域右键<br>打开常用操作菜单</div>' },
    { label: '视图操作', html: '<div class="demo-context-stage">在此区域右键<br>打开视图菜单</div>' },
  ]);
  root.appendChild(group('浮层反馈', 'bell', toastBox, dialogBox, popoverBox, menuBox));

  toastBox.querySelectorAll('[data-toast]').forEach((btn) => {
    const variant = btn.dataset.toast;
    btn.addEventListener('click', () => {
      const msgs = { success: '操作成功', warning: '请注意', danger: '操作失败', info: '新消息提醒' };
      toast(msgs[variant], { variant });
    });
  });
  dialogBox.querySelectorAll('[data-dialog]').forEach((btn) => {
    const danger = btn.dataset.dialog === 'danger';
    btn.addEventListener('click', () => {
      openDialog(danger
        ? { title: '确认删除', content: '删除后无法恢复，确定要继续吗？', confirmLabel: '删除', danger: true }
        : { title: '关于', content: 'UI Design System v0.1 — 克制的亚克力质感设计语言。', confirmLabel: '知道了' })
        .then((ok) => { if (ok) toast(danger ? '已删除' : '感谢阅读', { variant: danger ? 'danger' : 'success' }); });
    });
  });
  mountPopover(popoverBox);
  const [stage1, stage2] = menuBox.querySelectorAll('.demo-context-stage');
  mountContextMenu(stage1, [
    { label: '复制', iconName: 'copy', action: () => toast('已复制', { variant: 'info' }) },
    { label: '重命名', iconName: 'edit', action: () => toast('重命名功能演示') },
    { label: '删除', iconName: 'trash', danger: true, action: () => toast('已删除', { variant: 'danger' }) },
  ]);
  mountContextMenu(stage2, [
    { label: '刷新', iconName: 'refresh', action: () => toast('已刷新', { variant: 'info' }) },
    { label: '置顶', iconName: 'pin', action: () => toast('已置顶', { variant: 'success' }) },
  ]);

  // ============ 组 5：导航辅助（Tab / Breadcrumb） ============
  const tabBox = showcase('标签页 Tabs', [
    { label: '3 个标签', html: renderTabs({ tabs: [
      { label: '概览', iconName: 'home', content: `<div class="demo-tab-content"><span>概览内容</span>${renderButton({ label: '新建', variant: 'primary', size: 'sm', iconName: 'plus' })}</div>` },
      { label: '历史', iconName: 'clipboard', content: `<div class="demo-tab-content"><span>最近 12 条记录</span>${renderBadge({ label: '12 条', variant: 'info' })}</div>` },
      { label: '设置', iconName: 'settings', content: `<div class="demo-tab-content"><span>主题偏好</span>${renderBadge({ label: '跟随系统', variant: 'warning' })}</div>` },
    ] }) },
    { label: '2 个标签', html: renderTabs({ tabs: [
      { label: '全部', content: `<div class="demo-tab-content"><span>共 24 条记录</span></div>` },
      { label: '已固定', content: `<div class="demo-tab-content"><span>3 条固定记录</span></div>` },
    ] }) },
  ]);
  const breadcrumbBox = showcase('面包屑 Breadcrumb', [
    { label: '3 级', html: renderBreadcrumb({ items: ['剪贴板', '历史记录', '2026-08-05'] }) },
    { label: '2 级', html: renderBreadcrumb({ items: ['设置', '主题'] }) },
  ]);
  root.appendChild(group('导航辅助', 'command', tabBox, breadcrumbBox));

  tabBox.querySelectorAll('.showcase__stage').forEach((stage) => mountTabs(stage));

  // ============ 组 6：悬浮窗专属（SearchBar / HotkeyHint / FloatBall / HotkeyRecorder / FloatingWindow 交互实例） ============
  const searchBox = showcase('搜索栏 SearchBar（Ctrl+K 聚焦）', [
    { label: '搜索剪贴板', html: renderSearchBar({ placeholder: '搜索内容…', hotkey: ['Ctrl', 'K'] }) },
    { label: '搜索设置', html: renderSearchBar({ placeholder: '搜索设置项…', hotkey: ['Ctrl', 'K'] }) },
  ]);
  const hintBox = showcase('快捷键提示 HotkeyHint', [
    { label: '双键组合', html: renderHotkeyHint(['Ctrl', 'K']) },
    { label: '三键组合', html: renderHotkeyHint(['Ctrl', 'Shift', 'V']) },
    { label: '单键', html: renderHotkeyHint(['F2']) },
  ]);
  const ballBox = showcase('悬浮球 FloatBall', [
    { label: '剪贴板', html: renderFloatBall({ iconName: 'clipboard', tooltip: '打开剪贴板' }) },
    { label: '设置', html: renderFloatBall({ iconName: 'settings', tooltip: '打开设置' }) },
  ]);
  const recBox = showcase('快捷键录制 HotkeyRecorder', [
    { label: '点击录制', html: renderHotkeyRecorder({ placeholder: '点击设置快捷键' }) },
    { label: '已有组合键', html: renderHotkeyRecorder({ value: ['Ctrl', 'Alt', 'C'] }) },
  ]);
  // FloatingWindow 静态变体（置顶/折叠态展示）：fixed 组件经局部覆盖为 relative，
  // 随网格流式布局 —— 与右下角交互实例的 fixed 定位互不干扰（纯展示，不挂载交互）
  const fwinStaticBox = showcase('悬浮窗 FloatingWindow（静态变体）', [
    { label: '置顶态（accent 高亮描边）', wide: true, html: `<div class="csg-fwin-static">${renderFloatingWindow({
      title: '剪贴板悬浮窗',
      body: '<div class="demo-tab-content"><span>置顶后窗口固定于屏幕之上，高亮描边提示状态。</span></div>',
    })}</div>` },
    { label: '折叠态（正文收起）', wide: true, html: `<div class="csg-fwin-static">${renderFloatingWindow({
      title: '剪贴板悬浮窗',
      body: '<div class="demo-tab-content"><span>折叠后正文收起（scaleY 0 + opacity 0），仅保留标题栏。</span></div>',
    })}</div>` },
  ]);
  root.appendChild(group('悬浮窗专属', 'layout', searchBox, hintBox, ballBox, recBox, fwinStaticBox));

  mountSearchBar(searchBox);
  ballBox.querySelectorAll('.c-float-ball').forEach((ball) => {
    mountFloatBall(ball, { onExpand: () => toast('展开面板（场景模板演示）') });
  });
  recBox.querySelectorAll('.c-hotkey-recorder').forEach((rec) => {
    mountHotkeyRecorder(rec, { onChange: (keys) => toast(`已设置快捷键 ${keys.join(' + ')}`) });
  });
  // 静态变体状态类：置顶（accent 描边 + 按钮点亮）/ 折叠（正文收起）—— 纯展示，不挂载交互
  const [fwinStaticWin1, fwinStaticWin2] = fwinStaticBox.querySelectorAll('.c-fwin');
  if (fwinStaticWin1) {
    fwinStaticWin1.classList.add('c-fwin--pinned');
    fwinStaticWin1.querySelector('.c-fwin__pin')?.classList.add('c-fwin__btn--on');
  }
  if (fwinStaticWin2) fwinStaticWin2.classList.add('c-fwin--folded');

  // 可交互实例（#components 底部）：FloatingWindow 悬浮于视口右下角 —— 组件本义为
  // fixed 浮层，若留在滚动内容内，其「静态位」落在内容深处（fixed 不随滚动），
  // 不可见；显式定位到视口角落，拖拽/置顶/折叠/Ctrl+K 聚焦/悬浮球展开全部可交互。
  // 内含 SearchBar（Ctrl+K 聚焦）+ FloatBall（展开面板）联动。
  const fwinBlock = document.createElement('section');
  fwinBlock.className = 'csg csg-fwin';
  fwinBlock.innerHTML = `
    <h3 class="csg__title">${icon('layout', 16)}<span>悬浮窗 FloatingWindow（可交互实例）</span></h3>
    <p class="csg-fwin__desc">窗口悬浮于视口右下角 —— 拖拽标题栏移动 · 置顶 · 折叠 · Ctrl+K 聚焦搜索 · 点击悬浮球展开面板</p>
    <div class="csg-fwin__win">${renderFloatingWindow({
      title: '剪贴板悬浮窗',
      body: `<div>
        ${renderSearchBar({ placeholder: '搜索剪贴板内容…', hotkey: ['Ctrl', 'K'] })}
        <div class="csg-fwin__balls">${renderFloatBall({ iconName: 'clipboard', tooltip: '展开面板' })}</div>
      </div>`,
    })}</div>`;
  root.appendChild(fwinBlock);
  const fwinWin = fwinBlock.querySelector('.c-fwin');
  mountFloatingWindow(fwinWin);
  mountSearchBar(fwinWin);
  mountFloatBall(fwinWin.querySelector('.c-float-ball'), {
    onExpand: () => toast('展开剪贴板面板（场景模板演示）'),
  });
}
