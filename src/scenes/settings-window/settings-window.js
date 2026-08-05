// 场景模板 3：设置页（Task 20）—— 滑动选择分区 + 定制器整页嵌入 + 快捷键录制。
// Task A4 重构：纯渲染（SECTIONS / pageBody / 页面栈）与交互接线抽到 settings-pages.js 共享，
// 场景模板与应用壳设置模式共用同一实现（类名 .csettings__* 不变）。
// 820×520 玻璃窗口，grid（220px 1fr / 40px 1fr）—— 设置导航比主页（176px）更宽（用户确认变体）。
// 左侧纵向 NavigationWheel 变体：8 分区（8×64px = 512px > 列表视口 424px，真实可滑）；
// 右侧 8 分区页：通用/外观/快捷键/关于为完整页，界面为模块开关列表，通知/数据/高级为占位页。
// 隔离（Task 19 教训：场景局部类）：
// - 底部返回入口用 .csettings__back —— 不复用 .c-navwheel__settings（nav-wheel.spec.js
//   假设该选择器唯一）；主题三态用 .csettings__mode —— 不复用 .tsw__mode
//   （theme-switcher.spec.js 全页定位 .tsw__mode 并 click，strict mode 不能并存第二份）
// - 外观分区惰性挂载 renderCustomizerGroups：定制器面板与设置页同构类（.cust-row/
//   .cust-glass-preview）会被 customizer.spec.js 的全页 fill/hover 选择器命中，两实例
//   并存即触发 strict mode 冲突 —— 首次激活分区时才渲染，此后常驻并与面板双向实时同步
// 动画红线：分区切换只动 transform/opacity（page-in），无模糊动画。
import { icon } from '../../components/icon/icon.js';
import { renderTitleBar, mountTitleBar } from '../../components/title-bar/title-bar.js';
import { mountNavWheel } from '../../components/navigation-wheel/nav-wheel.js';
import { renderCustomizerGroups } from '../../demo/customizer-panel.js';
import { toast } from '../../components/toast/toast.js';
import { SECTIONS, renderSettingsPages, mountSettingsInteractions } from './settings-pages.js';

/**
 * 挂载设置页场景（追加到 #scenes 内，主窗口场景之后）。
 * @param {HTMLElement} root #scenes section（外层 h2 由 main.js 写入）
 */
export function mountSettingsWindow(root) {
  const pagesHtml = renderSettingsPages();

  root.insertAdjacentHTML('beforeend', `
    <section class="csettings-scene">
      <header class="csettings-scene__head">
        <h3>设置页</h3>
        <p>滑动选择分区 + 定制器整页嵌入 + 快捷键录制；Tauri 接入见 <code>docs/tauri-integration.md</code>。</p>
      </header>
      <div class="csettings">
        ${renderTitleBar({ title: '设置', iconName: 'settings' })}
        <div class="csettings__nav">
          <div class="c-navwheel">
            <div class="c-navwheel__list" data-mount="nav"></div>
            <button class="csettings__back" type="button">返回</button>
          </div>
        </div>
        <div class="csettings__pages">${pagesHtml}</div>
      </div>
    </section>
  `);

  const scene = root.querySelector('.csettings');

  // 分区切换：唯一 active 页（动画在 .csettings__page 由 display 翻转重新触发）
  let custMounted = false;
  const switchPage = (id) => {
    scene.querySelectorAll('.csettings__page')
      .forEach((p) => p.classList.toggle('csettings__page--active', p.dataset.page === id));
    // 外观分区首次激活才渲染定制器分组（隔离原因见文件头注释），此后常驻 + 订阅同步
    if (id === 'appearance' && !custMounted) {
      renderCustomizerGroups(scene.querySelector('[data-page="appearance"] .csettings__cust'));
      custMounted = true;
    }
  };

  // 独立 NavigationWheel 实例（root = .c-navwheel，遮罩挂到 .csettings__nav ——
  // 场景局部容器，不与侧栏 .navwheel 冲突）；onChange 驱动内容区切页
  const wheel = mountNavWheel(scene.querySelector('.c-navwheel'), {
    items: SECTIONS,
    onChange: (item) => switchPage(item.id),
  });

  // 返回入口：滚动回展示页顶部（设置页自身无「设置」入口，改为返回主页语义）
  const backBtn = scene.querySelector('.csettings__back');
  backBtn.innerHTML = `${icon('arrow-left', 16)}<span>返回</span>`;
  backBtn.addEventListener('click', () => {
    document.querySelector('.content').scrollIntoView({ behavior: 'smooth' });
    toast('已返回主页');
  });

  // 共享交互接线（主题三态/动效/保存/快捷键/开源链接/开关）+ 标题栏（最大化切换）
  mountSettingsInteractions(scene);
  mountTitleBar(scene);
}
