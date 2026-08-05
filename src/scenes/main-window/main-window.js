// 场景模板 2：主窗口（Task 19）—— 一体式 TitleBar + NavigationWheel 滑动导航 + 8 模块内容区。
// 验证「上下无割裂」+ 滑动导航设计语言的完整窗口场景：.cmain 880×560 玻璃窗口，
// 内部 grid（176px 1fr / 40px 1fr）：顶部一体式标题栏 + 左侧独立 mountNavWheel（8 项，
// 8×64px > 列表视口，真实可滑）+ 右侧 8 个模块页。
// 动画红线：页面切换只动 transform/opacity（page-in）；图片格悬停只动 transform。
// 隔离：导航实例用场景局部容器 .cmain__nav（不用侧栏 .navwheel 类），mountNavWheel
// 按 root 作用域查询，不干扰全局侧栏实例；设置入口用场景局部类 .cmain__settings
// （不复用全局 .c-navwheel__settings —— nav-wheel.spec.js 假设该选择器唯一，见 CSS 注释），
// 点击切到表单页 + toast。
import { icon } from '../../components/icon/icon.js';
import { renderTitleBar, mountTitleBar } from '../../components/title-bar/title-bar.js';
import { mountNavWheel } from '../../components/navigation-wheel/nav-wheel.js';
import { renderCard } from '../../components/card/card.js';
import { renderList, mountList } from '../../components/list/list.js';
import { renderProgress } from '../../components/progress/progress.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderInput } from '../../components/input/input.js';
import { renderSelect } from '../../components/select/select.js';
import { renderSwitch, mountSwitch } from '../../components/switch/switch.js';
import { toast } from '../../components/toast/toast.js';

// 8 个模块（pre-flight 修订）：8×64px = 512px > 列表视口 464px，滑动选择真实生效；
// 用户后续新增模块即沿用此扩展方式（往 MODULES 追加即可，导航与内容区同步生成）
const MODULES = [
  { id: 'dashboard', name: '仪表盘', icon: 'home' },
  { id: 'list',     name: '数据列表', icon: 'list' },
  { id: 'settings', name: '表单',    icon: 'settings' },
  { id: 'image',    name: '图片库',  icon: 'image' },
  { id: 'star',     name: '空状态',  icon: 'star' },
  { id: 'help',     name: '帮助',    icon: 'help' },
  { id: 'info',     name: '关于',    icon: 'info' },
  { id: 'folder',   name: '更多',    icon: 'folder' },
];

// —— 各模块内容 ——

const DASH_STATS = [
  { label: '复制统计', value: '1,284', trend: '+12.5%', up: true },
  { label: '收藏统计', value: '36',    trend: '+5.0%',  up: true },
  { label: '同步统计', value: '8',     trend: '-2.1%',  up: false },
];

function statCard(s) {
  return `<div class="c-card cmain__stat">
    <div class="cmain__stat-label">${s.label}</div>
    <div class="cmain__stat-value">${s.value}</div>
    <div class="cmain__stat-trend${s.up ? '' : ' cmain__stat-trend--down'}">${s.up ? '↑' : '↓'} ${s.trend}</div>
  </div>`;
}

function pageHead(title, desc = '') {
  return `<div class="cmain__page-head"><h4>${title}</h4>${desc ? `<p>${desc}</p>` : ''}</div>`;
}

// 各模块页主体：占位页（帮助/关于/更多）复用列表/卡片形态，保持内容区骨架一致
function pageBody(id) {
  switch (id) {
    case 'dashboard': return `
      ${pageHead('仪表盘', '欢迎回来，这是今日概览')}
      <div class="cmain__stats">${DASH_STATS.map(statCard).join('')}</div>
      <div class="cmain__goal">
        ${renderCard({
          title: '本周目标进度',
          content: `<div class="cmain__progress-label"><span>已完成 68%</span><span>目标 1,000 条</span></div>
            ${renderProgress({ value: 68 })}`,
        })}
      </div>`;
    case 'list': return `
      ${pageHead('数据列表', '共 8 条最近记录')}
      <div data-mount="list">${renderList({
        items: [
          { iconName: 'clipboard', title: '设计规范 v2.3', desc: '复制于 08-04 09:12', meta: '文本' },
          { iconName: 'image', title: '产品截图一组', desc: '复制于 08-04 08:47', meta: '图片' },
          { iconName: 'globe', title: 'Tauri 2 文档链接', desc: '复制于 08-03 21:30', meta: '链接' },
          { iconName: 'clipboard', title: '周报模板', desc: '复制于 08-03 17:05', meta: '文本' },
          { iconName: 'key', title: 'SSH 配置片段', desc: '复制于 08-03 15:41', meta: '文本' },
          { iconName: 'image', title: '暗色主题截图', desc: '复制于 08-02 19:22', meta: '图片' },
          { iconName: 'globe', title: '图标库参考', desc: '复制于 08-02 10:08', meta: '链接' },
          { iconName: 'clipboard', title: '发布检查清单', desc: '复制于 08-01 16:53', meta: '文本' },
        ],
      })}</div>
      <div class="cmain__pager">
        <button class="c-btn c-btn--ghost c-btn--sm cmain__pager-prev" type="button">${icon('chevron-left', 16)}上一页</button>
        <span class="cmain__pager-label">第 1 / 3 页</span>
        <button class="c-btn c-btn--ghost c-btn--sm cmain__pager-next" type="button">下一页${icon('chevron-right', 16)}</button>
      </div>`;
    case 'settings': return `
      ${pageHead('表单', '配置应用偏好，保存后即时生效')}
      <form class="cmain__form" novalidate>
        <label class="cmain__field">
          <span>应用名称</span>
          ${renderInput({ value: '我的应用', placeholder: '输入应用名称', label: '应用名称' })}
        </label>
        <label class="cmain__field">
          <span>默认语言</span>
          ${renderSelect({ options: ['简体中文', 'English', '日本語'], value: '简体中文' })}
        </label>
        <div class="cmain__field cmain__field--switch">
          <span>自动保存</span>
          ${renderSwitch({ checked: true, label: '自动保存' })}
        </div>
        <div class="cmain__form-actions">
          <button class="c-btn c-btn--primary" type="submit">${icon('check', 18)}保存设置</button>
        </div>
      </form>`;
    case 'image': return `
      ${pageHead('图片库', '最近 9 张图片，悬停放大预览')}
      <div class="cmain__gallery">${[15, 45, 75, 105, 135, 165, 195, 225, 255]
        .map((h, i) => `<div class="cmain__tile" style="--hue: ${h}"><span>图片 ${i + 1}</span></div>`).join('')}</div>`;
    case 'star': return `
      ${pageHead('空状态', '无数据时的引导与操作入口')}
      <div class="c-empty-state cmain__empty">${renderEmptyState({
        iconName: 'star',
        title: '暂无收藏',
        desc: '点击星标的内容将收藏在这里',
        action: { label: '去收藏', variant: 'primary', iconName: 'star' },
      })}</div>`;
    case 'help': return `
      ${pageHead('帮助中心', '常见问题与使用指南')}
      <div data-mount="help-list">${renderList({
        items: [
          { iconName: 'refresh', title: '如何同步多端数据', desc: '登录后自动同步，无需手动操作' },
          { iconName: 'palette', title: '如何更换主题与主题色', desc: '顶栏「定制」入口可实时预览' },
          { iconName: 'shield', title: '数据存储在哪里', desc: '本地加密存储，仅存于你的设备' },
        ],
      })}</div>`;
    case 'info': return `
      ${pageHead('关于', '应用信息与版本')}
      <div class="cmain__about">${renderCard({
        title: '我的应用',
        content: `<div class="cmain__about-row"><span>版本</span><span>1.0.0</span></div>
          <div class="cmain__about-row"><span>技术栈</span><span>Tauri 2 · 原生 Web</span></div>
          <div class="cmain__about-row"><span>设计语言</span><span>UI Design System</span></div>`,
      })}</div>`;
    case 'folder': return `
      ${pageHead('更多', '其他功能入口')}
      <div data-mount="more-list">${renderList({
        items: [
          { iconName: 'download', title: '导出数据', desc: '备份为 JSON 文件' },
          { iconName: 'command', title: '键盘快捷键', desc: '查看全部快捷键' },
          { iconName: 'refresh', title: '检查更新', desc: '当前已是最新版本' },
          { iconName: 'lock', title: '用户协议', desc: '隐私政策与使用条款' },
        ],
      })}</div>`;
    default: return '';
  }
}

/**
 * 挂载主窗口场景（追加到 #scenes 内，剪贴板场景之后）。
 * @param {HTMLElement} root #scenes section（外层 h2 由 main.js 写入）
 */
export function mountMainWindow(root) {
  const pagesHtml = MODULES.map((m, i) => `
    <div class="cmain__page${i === 0 ? ' cmain__page--active' : ''}" data-page="${m.id}">
      ${pageBody(m.id)}
    </div>`).join('');

  root.insertAdjacentHTML('beforeend', `
    <section class="cmain-scene">
      <header class="cmain-scene__head">
        <h3>主窗口</h3>
        <p>一体式标题栏 + 滑动导航 + 8 模块内容区；Tauri 接入见 <code>docs/tauri-integration.md</code>。</p>
      </header>
      <div class="cmain">
        ${renderTitleBar({ title: '我的应用', iconName: 'layout' })}
        <div class="cmain__nav">
          <div class="c-navwheel">
            <div class="c-navwheel__list" data-mount="nav"></div>
            <button class="cmain__settings" type="button">设置</button>
          </div>
        </div>
        <div class="cmain__pages">${pagesHtml}</div>
      </div>
    </section>
  `);

  const scene = root.querySelector('.cmain');

  // 模块切换：唯一 active 页（动画在 .cmain__page 由 display 翻转重新触发）
  const switchPage = (id) => {
    scene.querySelectorAll('.cmain__page')
      .forEach((p) => p.classList.toggle('cmain__page--active', p.dataset.page === id));
  };

  // 独立 NavigationWheel 实例（root = .c-navwheel，遮罩挂到 .cmain__nav —— 场景局部容器，
  // 不与侧栏 .navwheel 冲突）；onChange 驱动内容区切页
  const wheel = mountNavWheel(scene.querySelector('.c-navwheel'), {
    items: MODULES,
    onChange: (item) => switchPage(item.id),
  });

  // 设置入口：切到表单页（索引 2，经 scrollToIndex 选中模块）并 toast 提示
  const settingsBtn = scene.querySelector('.cmain__settings');
  settingsBtn.innerHTML = `${icon('settings', 16)}<span>设置</span>`;
  settingsBtn.addEventListener('click', () => {
    wheel.scrollToIndex(2);
    toast('已打开表单设置');
  });

  // 表单页：提交 → toast（演示用，不真实提交）
  scene.querySelector('.cmain__form').addEventListener('submit', (e) => {
    e.preventDefault();
    toast('设置已保存', { variant: 'success' });
  });

  // 分页演示：上一页/下一页 1..3 循环
  let pageNo = 1;
  const pagerLabel = scene.querySelector('.cmain__pager-label');
  const prevBtn = scene.querySelector('.cmain__pager-prev');
  const nextBtn = scene.querySelector('.cmain__pager-next');
  const renderPager = () => {
    pagerLabel.textContent = `第 ${pageNo} / 3 页`;
    prevBtn.disabled = pageNo === 1;
    nextBtn.disabled = pageNo === 3;
    prevBtn.classList.toggle('c-btn--disabled', pageNo === 1);
    nextBtn.classList.toggle('c-btn--disabled', pageNo === 3);
  };
  prevBtn.addEventListener('click', () => { pageNo = Math.max(1, pageNo - 1); renderPager(); });
  nextBtn.addEventListener('click', () => { pageNo = Math.min(3, pageNo + 1); renderPager(); });

  // 空态按钮：演示入口 toast
  scene.querySelector('.cmain__empty').addEventListener('click', (e) => {
    if (e.target.closest('.c-btn')) toast('收藏功能演示');
  });

  // 挂载交互：标题栏（最大化切换）/ 列表选中 / 开关
  mountTitleBar(scene);
  mountList(scene.querySelector('[data-mount="list"]'));
  mountList(scene.querySelector('[data-mount="help-list"]'));
  mountList(scene.querySelector('[data-mount="more-list"]'));
  mountSwitch(scene);

  renderPager();
}
