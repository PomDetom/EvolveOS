// 设置页共享实现（Task A4 提取）：SECTIONS 数据 + 各分区页渲染 + 页面栈包装 + 交互接线。
// 应用壳设置模式（app-main.js）使用（Task B1-4 起为唯一宿主；docs 设置场景已随 docs 渲染删除），
// 类名 .csettings__* 不变 —— e2e 依赖（.csettings / .c-navwheel__item 8 /
//   .csettings__page--active / .cust-group 6）。
// 分工：
// - 纯渲染：SECTIONS / pageBody / renderSettingsPages —— 调用方负责布局容器与导航轮；
//   外观分区定制器惰性挂载（renderCustomizerGroups）由调用方在首次激活时执行（隔离原因：
//   定制器面板与设置页同构类并存会触发 strict mode 冲突，故面板仅常驻抽屉、整页形态惰性挂载）。
// - 交互接线：mountSettingsInteractions(root) —— 主题三态 click→store、动效开关、保存、
//   快捷键录制、开源链接、开关视觉（桌面设置页与手机页面栈行为一致）。
import { icon } from '../../components/icon/icon.js';
import { renderSwitch, mountSwitch } from '../../components/switch/switch.js';
import { renderSelect } from '../../components/select/select.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderHotkeyRecorder, mountHotkeyRecorder } from '../../components/hotkey-recorder/hotkey-recorder.js';
import { getConfig, saveConfig } from '../../config/store.js';
import { applyConfig } from '../../config/apply.js';
import { toast } from '../../components/toast/toast.js';
import './settings-window.css';

// 8 分区（pre-flight 修订）：8×64px = 512px > 列表视口 424px，滑动选择真实生效。
// 界面类模块（原第 3 分区）统一收纳于「界面」分区，其余沿用原分区结构。
export const SECTIONS = [
  { id: 'general',    name: '通用',   icon: 'home' },
  { id: 'appearance', name: '外观',   icon: 'palette' },
  { id: 'interface',  name: '界面',   icon: 'layout' },
  { id: 'shortcuts',  name: '快捷键', icon: 'key' },
  { id: 'notify',     name: '通知',   icon: 'bell' },
  { id: 'data',       name: '数据',   icon: 'folder' },
  { id: 'advanced',   name: '高级',   icon: 'settings' },
  { id: 'about',      name: '关于',   icon: 'info' },
];

// 应用壳专用：共享 8 分区 + 组件/动效（Task B1-1）。
// 组件/动效分区为应用壳内化展示内容（B1-4 起 docs 渲染已删除），
// pageBody 分支返回含 .app-partition 容器（场景不渲染这两 id，仅应用壳触发惰性挂载）。
export const APP_SECTIONS = [
  ...SECTIONS,
  { id: 'components', name: '组件', icon: 'box' },
  { id: 'motion', name: '动效', icon: 'sparkles' },
];

// —— 通用分区 ——

// 主题三态：与顶栏 tsw 同语义（浅/深/跟随系统），类名场景局部（.csettings__mode）
const THEME_MODES = [
  { id: 'light',  label: '浅色',   icon: 'sun' },
  { id: 'dark',   label: '深色',   icon: 'moon' },
  { id: 'system', label: '跟随系统', icon: 'monitor' },
];

// 主窗关闭行为（Task B4F-2）：两态选择器 → cfg.closeBehavior（defaults → store → apply 链路，
// 后续 B4F-3 Rust 消费 / B4F-4 JS 同步 Rust 依赖此值）。类名复用 .csettings__mode（样式复用），
// 高亮管理用独立 [data-close-behavior-group]/[data-close-behavior]，不受主题循环（[data-mode]）影响。
const CLOSE_BEHAVIORS = [
  { id: 'exit', label: '退出应用' },
  { id: 'background', label: '保留后台' },
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
    <div class="csettings__field">
      <span class="csettings__field-label">关闭主窗口时</span>
      <p class="csettings__field-desc">点主窗关闭按钮：退出整个应用，或隐藏到后台保留悬浮窗</p>
      <div class="csettings__modes csettings__modes--close" data-close-behavior-group role="group" aria-label="关闭行为">
        ${CLOSE_BEHAVIORS.map((b) => `
          <button type="button" class="csettings__mode${cfg.closeBehavior === b.id ? ' csettings__mode--active' : ''}"
            data-close-behavior="${b.id}" aria-pressed="${cfg.closeBehavior === b.id}">${b.label}</button>`).join('')}
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

// 定制器整页形态：占位容器由调用方首次激活时惰性渲染（renderCustomizerGroups），
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

export const HOTKEY_STORAGE = 'ui-design-hotkeys';

export function loadHotkeys() {
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
      <div class="csettings__name">EvolveOS</div>
      <div class="csettings__ver">版本 0.1.0</div>
      <div class="csettings__meta">
        <div class="csettings__row"><span>技术栈</span><span>Tauri 2 · 原生 Web</span></div>
        <div class="csettings__row"><span>设计语言</span><span>亚克力质感 · 深/浅双主题 · 12 主题色</span></div>
      </div>
      <button type="button" class="csettings__link" data-open-source>${icon('globe', 16)}开源仓库</button>
    </div>`;
}

// —— 分区 → 页面主体 ——

export function pageBody(id) {
  switch (id) {
    case 'general':    return generalPage();
    case 'appearance': return appearancePage();
    case 'interface':  return interfacePage();
    case 'shortcuts':  return shortcutsPage();
    case 'notify':     return emptyPage('bell', '通知设置', '新复制提醒、声音与角标等将在接入应用后开放');
    case 'data':       return emptyPage('folder', '数据管理', '导出备份与多端同步将在接入应用后开放');
    case 'advanced':   return emptyPage('shield', '高级设置', '实验性功能与调试选项将在接入应用后开放');
    case 'about':      return aboutPage();
    // 应用壳专用分区（Task B1-1）：空 .app-partition 容器，展示内容由 app-main.js 首次激活时惰性挂载
    case 'components': return `<div class="app-partition" data-partition="components"></div>`;
    case 'motion':     return `<div class="app-partition" data-partition="motion"></div>`;
    default: return '';
  }
}

/**
 * 页面栈 HTML：8 个 .csettings__page（首项 active，类名不变）。
 * 调用方负责包一层 .csettings__pages 容器（场景 820×520 网格 / 应用壳内容区各自接管尺寸）。
 * @param {Array} [sections=SECTIONS] 分区列表 —— docs 场景不传（8 分区）；应用壳传 APP_SECTIONS（10 分区）
 * @returns {string} 分区页的 HTML 拼接
 */
export function renderSettingsPages(sections = SECTIONS) {
  return sections.map((s, i) => `
    <div class="csettings__page${i === 0 ? ' csettings__page--active' : ''}" data-page="${s.id}">
      ${pageBody(s.id)}
    </div>`).join('');
}

/**
 * 设置页交互接线（场景模板与应用壳共用，行为一致）。
 * @param {HTMLElement} root 含 8 个分区页的容器（scene 传 .csettings；应用壳传设置页 section）
 */
export function mountSettingsInteractions(root) {
  // 通用分区：主题三态 → store 即时生效；动效开关 → store；保存 → toast
  // 控制器裁定（Task B4F-2）：主题同步循环限定 [data-mode]，只作用于主题按钮 ——
  // 否则新 close-behavior 按钮（同用 .csettings__mode 类）的 active 高亮会被主题循环误清。
  root.querySelector('.csettings__modes')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.csettings__mode');
    if (!btn) return;
    const next = saveConfig({ theme: btn.dataset.mode });
    applyConfig(next);
    root.querySelectorAll('.csettings__mode[data-mode]').forEach((b) => {
      const on = b.dataset.mode === next.theme;
      b.classList.toggle('csettings__mode--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });
  // 关闭主窗口时（B4 收尾）：两态选择器 → store
  root.querySelector('[data-close-behavior-group]')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-close-behavior]');
    if (!btn) return;
    const next = saveConfig({ closeBehavior: btn.dataset.closeBehavior });
    applyConfig(next);
    root.querySelectorAll('[data-close-behavior]').forEach((b) => {
      const on = b.dataset.closeBehavior === next.closeBehavior;
      b.classList.toggle('csettings__mode--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });
  root.querySelector('.csettings__field--row .c-switch')?.addEventListener('click', (e) => {
    const sw = e.currentTarget;
    const next = saveConfig({ motion: { enabled: sw.getAttribute('aria-checked') !== 'true' } });
    applyConfig(next);
  });
  root.querySelector('[data-save-general]')?.addEventListener('click', () => {
    toast('设置已保存', { variant: 'success' });
  });

  // 快捷键分区：每行独立 mount，onChange → sessionStorage
  root.querySelectorAll('.csettings__hotkey').forEach((row) => {
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
  root.querySelector('[data-open-source]')?.addEventListener('click', () => {
    toast('开源仓库链接占位：接入 Tauri 后指向真实仓库');
  });

  // 开关视觉（通用分区动效 / 界面分区模块显隐）
  mountSwitch(root);
}
