// 场景模板 3：设置页（Task 20）—— 滑动选择分区 + 定制器整页嵌入 + 快捷键录制。
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
import { renderSwitch, mountSwitch } from '../../components/switch/switch.js';
import { renderSelect } from '../../components/select/select.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderHotkeyRecorder, mountHotkeyRecorder } from '../../components/hotkey-recorder/hotkey-recorder.js';
import { renderCustomizerGroups } from '../../demo/customizer-panel.js';
import { getConfig, saveConfig } from '../../config/store.js';
import { applyConfig } from '../../config/apply.js';
import { toast } from '../../components/toast/toast.js';

// 8 分区（pre-flight 修订）：8×64px = 512px > 列表视口 424px，滑动选择真实生效。
// 界面类模块（原第 3 分区）统一收纳于「界面」分区，其余沿用原分区结构。
const SECTIONS = [
  { id: 'general',    name: '通用',   icon: 'home' },
  { id: 'appearance', name: '外观',   icon: 'palette' },
  { id: 'interface',  name: '界面',   icon: 'layout' },
  { id: 'shortcuts',  name: '快捷键', icon: 'key' },
  { id: 'notify',     name: '通知',   icon: 'bell' },
  { id: 'data',       name: '数据',   icon: 'folder' },
  { id: 'advanced',   name: '高级',   icon: 'settings' },
  { id: 'about',      name: '关于',   icon: 'info' },
];

// —— 通用分区 ——

// 主题三态：与顶栏 tsw 同语义（浅/深/跟随系统），类名场景局部（.csettings__mode）
const THEME_MODES = [
  { id: 'light',  label: '浅色',   icon: 'sun' },
  { id: 'dark',   label: '深色',   icon: 'moon' },
  { id: 'system', label: '跟随系统', icon: 'monitor' },
];

function pageHead(title, desc = '') {
  return `<div class="csettings__page-head"><h4>${title}</h4>${desc ? `<p>${desc}</p>` : ''}</div>`;
}

function generalPage() {
  const cfg = getConfig();
  return `
    ${pageHead('通用', '应用基础偏好，保存后即时生效')}
    <div class="csettings__field">
      <span class="csettings__field-label">主题</span>
      <p class="csettings__field-desc">跟随系统或固定深/浅主题</p>
      <div class="csettings__modes" role="group" aria-label="主题模式">
        ${THEME_MODES.map((m) => `
          <button type="button" class="csettings__mode${cfg.theme === m.id ? ' csettings__mode--active' : ''}"
            data-mode="${m.id}" aria-pressed="${cfg.theme === m.id}">
            ${icon(m.icon, 16)}<span>${m.label}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="csettings__field csettings__field--row">
      <div>
        <span class="csettings__field-label">动效</span>
        <p class="csettings__field-desc">界面过渡与微动效开关</p>
      </div>
      ${renderSwitch({ checked: cfg.motion.enabled, label: '动效' })}
    </div>
    <div class="csettings__field">
      <span class="csettings__field-label">启动行为</span>
      <p class="csettings__field-desc">应用启动时的窗口状态</p>
      ${renderSelect({ options: ['上次关闭时的状态', '默认窗口', '最小化到托盘'], value: '上次关闭时的状态' })}
    </div>
    <div class="csettings__actions">
      <button type="button" class="c-btn c-btn--primary c-btn--sm" data-save-general>${icon('check', 16)}保存设置</button>
    </div>`;
}

// —— 外观分区 ——

// 定制器整页形态：占位容器由 switchPage 首次激活时惰性渲染（renderCustomizerGroups），
// 与定制器面板共用同一实现 + 同一份 store，双向实时（隔离原因见文件头注释）
function appearancePage() {
  return `
    ${pageHead('外观', '主题定制器整页形态 —— 与右侧抽屉面板共用同一份配置')}
    <div class="csettings__cust"></div>`;
}

// —— 界面分区：模块显隐开关列表（演示级，不写 store）——

const MODULE_TOGGLES = [
  { id: 'float',    label: '剪贴板悬浮窗', desc: '全局呼出的小窗，复制记录即时可查' },
  { id: 'main',     label: '主窗口',       desc: '完整功能窗口：仪表盘与数据列表' },
  { id: 'lab',      label: '动效实验室',   desc: '动效演示卡与参数试玩器' },
  { id: 'showcase', label: '组件展示区',   desc: '32 组件变体矩阵与悬浮窗实例' },
];

function interfacePage() {
  return `
    ${pageHead('界面', '模块显隐控制')}
    <div class="csettings__toggles">
      ${MODULE_TOGGLES.map((m) => `
        <div class="csettings__toggle">
          <div>
            <span class="csettings__field-label">${m.label}</span>
            <p class="csettings__field-desc">${m.desc}</p>
          </div>
          ${renderSwitch({ checked: true, label: m.label })}
        </div>`).join('')}
    </div>
    <p class="csettings__note">界面类模块导航统一收拢于设置：以上开关为演示占位，实际显隐由接入应用的模块系统决定。</p>`;
}

// —— 快捷键分区：4 行 HotkeyRecorder，录制结果存 sessionStorage（演示级）——

const HOTKEY_DEFS = [
  { key: 'show',   label: '呼出面板',    desc: '全局呼出剪贴板悬浮窗',    defaults: ['Ctrl', 'Shift', 'V'] },
  { key: 'search', label: '搜索',        desc: '聚焦悬浮窗搜索框',        defaults: ['Ctrl', 'Shift', 'F'] },
  { key: 'paste',  label: '粘贴纯文本',  desc: '以纯文本格式粘贴剪贴板内容', defaults: ['Ctrl', 'Shift', 'X'] },
  { key: 'clear',  label: '清空',        desc: '清空全部复制记录',        defaults: ['Ctrl', 'Shift', 'Backspace'] },
];

const HOTKEY_STORAGE = 'ui-design-hotkeys';

function loadHotkeys() {
  try { return JSON.parse(sessionStorage.getItem(HOTKEY_STORAGE) ?? '{}'); }
  catch { return {}; }
}

function shortcutsPage() {
  const saved = loadHotkeys();
  return `
    ${pageHead('快捷键', '点击录制，结果保存于本会话（演示级）')}
    <div class="csettings__hotkeys">
      ${HOTKEY_DEFS.map((h) => `
        <div class="csettings__hotkey" data-hotkey="${h.key}">
          <div>
            <span class="csettings__field-label">${h.label}</span>
            <p class="csettings__field-desc">${h.desc}</p>
          </div>
          ${renderHotkeyRecorder({ value: saved[h.key] ?? h.defaults, placeholder: '点击设置快捷键' })}
        </div>`).join('')}
    </div>`;
}

// —— 通知/数据/高级：占位页 ——

function emptyPage(iconName, title, desc) {
  return `<div class="c-empty-state csettings__empty">${renderEmptyState({ iconName, title, desc })}</div>`;
}

// —— 关于分区：应用信息卡 ——

function aboutPage() {
  return `
    ${pageHead('关于', '应用信息与版本')}
    <div class="csettings__about">
      <div class="csettings__logo">${icon('palette', 36)}</div>
      <div class="csettings__name">UI Design System</div>
      <div class="csettings__ver">版本 1.0.0</div>
      <div class="csettings__meta">
        <div class="csettings__row"><span>技术栈</span><span>Tauri 2 · 原生 Web</span></div>
        <div class="csettings__row"><span>设计语言</span><span>克制的玻璃质感 · 深/浅双主题 · 6 主题色</span></div>
      </div>
      <button type="button" class="csettings__link" data-open-source>${icon('globe', 16)}开源仓库</button>
    </div>`;
}

// —— 分区 → 页面主体 ——

function pageBody(id) {
  switch (id) {
    case 'general':    return generalPage();
    case 'appearance': return appearancePage();
    case 'interface':  return interfacePage();
    case 'shortcuts':  return shortcutsPage();
    case 'notify':     return emptyPage('bell', '通知设置', '新复制提醒、声音与角标等将在接入应用后开放');
    case 'data':       return emptyPage('folder', '数据管理', '导出备份与多端同步将在接入应用后开放');
    case 'advanced':   return emptyPage('shield', '高级设置', '实验性功能与调试选项将在接入应用后开放');
    case 'about':      return aboutPage();
    default: return '';
  }
}

/**
 * 挂载设置页场景（追加到 #scenes 内，主窗口场景之后）。
 * @param {HTMLElement} root #scenes section（外层 h2 由 main.js 写入）
 */
export function mountSettingsWindow(root) {
  const pagesHtml = SECTIONS.map((s, i) => `
    <div class="csettings__page${i === 0 ? ' csettings__page--active' : ''}" data-page="${s.id}">
      ${pageBody(s.id)}
    </div>`).join('');

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

  // 通用分区：主题三态 → store 即时生效；动效开关 → store；保存 → toast
  const modes = scene.querySelector('.csettings__modes');
  modes.addEventListener('click', (e) => {
    const btn = e.target.closest('.csettings__mode');
    if (!btn) return;
    const next = saveConfig({ theme: btn.dataset.mode });
    applyConfig(next);
    modes.querySelectorAll('.csettings__mode').forEach((b) => {
      const on = b.dataset.mode === next.theme;
      b.classList.toggle('csettings__mode--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });
  scene.querySelector('.csettings__field--row .c-switch').addEventListener('click', (e) => {
    const sw = e.currentTarget;
    const next = saveConfig({ motion: { enabled: sw.getAttribute('aria-checked') !== 'true' } });
    applyConfig(next);
  });
  scene.querySelector('[data-save-general]').addEventListener('click', () => {
    toast('设置已保存', { variant: 'success' });
  });

  // 快捷键分区：每行独立 mount，onChange → sessionStorage
  scene.querySelectorAll('.csettings__hotkey').forEach((row) => {
    mountHotkeyRecorder(row, {
      onChange: (keys) => {
        const saved = loadHotkeys();
        saved[row.dataset.hotkey] = keys;
        sessionStorage.setItem(HOTKEY_STORAGE, JSON.stringify(saved));
        toast('快捷键已更新');
      },
    });
  });

  // 关于分区：开源链接占位
  scene.querySelector('[data-open-source]').addEventListener('click', () => {
    toast('开源仓库链接占位：接入 Tauri 后指向真实仓库');
  });

  // 挂载交互：标题栏（最大化切换）/ 模块显隐开关
  mountTitleBar(scene);
  mountSwitch(scene);
}
