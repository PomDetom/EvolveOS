import { getConfig, saveConfig, subscribe, notify, KEY } from '../config/store.js';
import { applyConfig, prefersDark } from '../config/apply.js';
import { DEFAULTS, RANGES, ACCENTS } from '../config/defaults.js';
import { icon } from '../components/icon/icon.js';
import { toast } from '../components/toast/toast.js';
import { renderSwitch } from '../components/switch/switch.js';
import { exportCss } from './customizer-css.js';

/**
 * 主题定制器面板（Task 17）：右侧抽屉（.cust-panel + .cust-backdrop）。
 *
 * 契约：
 * - 导出 mountCustomizer(root) / toggleCustomizer(open?) —— open 省略时切换
 * - 导出 renderCustomizerGroups(container)（Task 20 重构）—— 6 组渲染 + 事件 + store 订阅，
 *   面板（.cust-body）与设置页外观分区共用同一实现；两侧滑杆操作同一份 store，双向实时
 * - 6 组 .cust-group（整体色调/表面质感/文字排版/边角形状/动效节奏/阴影层次），每组 .cust-row = 标签 + 控件；
 *   组标题下渲染 .cust-group__desc 一行描述（全局语义名 + 简述，B3-1）
 * - 滑杆全部来自 RANGES 的 [min, max, step]；input 事件 → saveConfig(patch) → applyConfig → 实时生效
 * - 预设：「默认深/浅」= saveConfig({ theme })；重置 = removeItem(KEY) + notify(DEFAULTS) + applyConfig
 * - 导出：navigator.clipboard.writeText(exportCss(getConfig())) + toast
 * - 动画红线：抽屉只动 transform + visibility（透明度走 backdrop 的 opacity），模糊不动画
 */

// 滑杆 data-key → 配置路径（映射关系与 apply.js 写入的变量一一对应）
const CFG_PATH = {
  opacity: ['glass', 'opacity'],
  blur: ['glass', 'blur'],
  noise: ['glass', 'noise'],
  baseSize: ['type', 'baseSize'],
  scale: ['type', 'scale'],
  radiusScale: ['radiusScale'],
  durationScale: ['motion', 'durationScale'],
  springStrength: ['motion', 'springStrength'],
  shadowIntensity: ['shadow'],
};

const GROUPS = [
  {
    title: '整体色调',
    desc: '预设主题色 / 语义色自动协调',
    pre: (cfg) => accentCards(cfg) + semanticBar(),
  },
  {
    title: '表面质感',
    desc: '透明度/模糊/噪点强度/亚克力材质',
    pre: (cfg) => glassSwitchRow(cfg) + glassPreview(),
    sliders: [
      { key: 'opacity', label: '透明度' },
      { key: 'blur', label: '模糊', unit: 'px' },
      { key: 'noise', label: '噪点强度' },
    ],
  },
  {
    title: '文字排版',
    desc: '基准字号/缩放',
    sliders: [
      { key: 'baseSize', label: '基准字号', unit: 'px' },
      { key: 'scale', label: '缩放', unit: '×' },
    ],
  },
  {
    title: '边角形状',
    desc: '圆角比例',
    sliders: [{ key: 'radiusScale', label: '圆角比例', unit: '×' }],
  },
  {
    title: '动效节奏',
    desc: '时长缩放/弹性强度',
    pre: (cfg) => motionSwitchRow(cfg),
    sliders: [
      { key: 'durationScale', label: '时长缩放', unit: '×' },
      { key: 'springStrength', label: '弹性强度' },
    ],
  },
  {
    title: '阴影层次',
    desc: '阴影强度',
    sliders: [{ key: 'shadowIntensity', label: '阴影强度' }],
  },
];

const SEMANTIC = [
  { key: 'success-500', label: '成功' },
  { key: 'warning-500', label: '警告' },
  { key: 'danger-500', label: '危险' },
  { key: 'info-500', label: '信息' },
];

function readCfg(cfg, key) {
  const p = CFG_PATH[key];
  return p.length === 1 ? cfg[p[0]] : cfg[p[0]][p[1]];
}

function writePatch(key, value) {
  const p = CFG_PATH[key];
  return p.length === 1 ? { [p[0]]: value } : { [p[0]]: { [p[1]]: value } };
}

function fmtValue(cfg, key, unit) {
  return `${readCfg(cfg, key)}${unit ?? ''}`;
}

function renderSlider(cfg, spec) {
  const [min, max, step] = RANGES[spec.key];
  const value = readCfg(cfg, spec.key);
  return `
    <div class="cust-row">
      <div class="cust-row__head">
        <span class="cust-row__label">${spec.label}${spec.hint ? `<em class="cust-row__hint">${spec.hint}</em>` : ''}</span>
        <span class="cust-row__value">
          <output data-out="${spec.key}">${fmtValue(cfg, spec.key, spec.unit)}</output>
        </span>
      </div>
      <input class="cust-range" type="range" data-key="${spec.key}"
        min="${min}" max="${max}" step="${step}" value="${value}"
        aria-label="${spec.label}">
    </div>`;
}

function accentCards(cfg) {
  return `
    <div class="cust-accent-grid" role="group" aria-label="主题色">
      ${ACCENTS.map((a) => `
        <button type="button" class="cust-accent-card${cfg.accent === a.id ? ' cust-accent-card--active' : ''}"
          data-accent="${a.id}" style="--swatch: ${a.color}" aria-pressed="${cfg.accent === a.id}">
          <span class="cust-accent-card__dot"></span>
          <span class="cust-accent-card__name">${a.name}</span>
          <span class="cust-accent-card__desc">${a.desc}</span>
        </button>`).join('')}
    </div>`;
}

function semanticBar() {
  return `
    <div class="cust-semantic" role="group" aria-label="语义色预览">
      <span class="cust-semantic__title">语义色</span>
      ${SEMANTIC.map((s) => `
        <span class="cust-semantic__chip" style="--chip: var(--${s.key})">${s.label}</span>`).join('')}
    </div>`;
}

/** 表面质感即时预览：色点/线条在玻璃层之后，backdrop-filter 实时呈现透明度/模糊/噪点强度 */
function glassPreview() {
  return `
    <div class="cust-glass-preview" aria-hidden="true">
      <span class="cust-glass-preview__dot" style="--d: var(--accent-400)"></span>
      <span class="cust-glass-preview__dot" style="--d: #2dd4bf"></span>
      <span class="cust-glass-preview__dot" style="--d: #f59e0b"></span>
      <span class="cust-glass-preview__line" style="width: 70%"></span>
      <span class="cust-glass-preview__line" style="width: 55%"></span>
      <span class="cust-glass-preview__line" style="width: 85%"></span>
      <div class="cust-glass-preview__glass"></div>
    </div>`;
}

function motionSwitchRow(cfg) {
  return `
    <div class="cust-row cust-row--switch">
      <div class="cust-row__head">
        <span class="cust-row__label">动效总开关</span>
      </div>
      <div class="cust-switch-wrap" data-motion-switch>${renderSwitch({ checked: cfg.motion.enabled, label: '动效总开关' })}</div>
    </div>`;
}

/** 亚克力材质开关（B2-1）：blurEnabled → data-glass 降级为纯色不透明。与动效开关同构，
 *  写 saveConfig + applyConfig，订阅同步 aria-checked；抽屉与设置外观分区共用。 */
function glassSwitchRow(cfg) {
  return `
    <div class="cust-row cust-row--switch" data-glass-switch>
      <div class="cust-row__head">
        <span class="cust-row__label">亚克力材质</span>
      </div>
      ${renderSwitch({ checked: cfg.glass.blurEnabled, label: '亚克力材质' })}
    </div>`;
}

function panelTemplate() {
  return `
    <header class="cust-header">
      <div class="cust-header__text">
        <h3 class="cust-header__title">主题定制器</h3>
        <p class="cust-header__sub">所有界面效果 · 即时生效</p>
      </div>
      <button type="button" class="cust-close" data-cust-close aria-label="关闭定制器">${icon('close', 18)}</button>
    </header>
    <div class="cust-body"></div>
    <footer class="cust-footer">
      <div class="cust-presets" role="group" aria-label="主题预设">
        <button type="button" class="cust-preset c-btn c-btn--secondary c-btn--sm" data-preset="dark">默认深</button>
        <button type="button" class="cust-preset c-btn c-btn--secondary c-btn--sm" data-preset="light">默认浅</button>
      </div>
      <div class="cust-actions">
        <button type="button" class="cust-save c-btn c-btn--secondary c-btn--sm">保存我的方案</button>
        <button type="button" class="cust-export c-btn c-btn--primary c-btn--sm">导出 CSS 变量</button>
        <button type="button" class="cust-reset c-btn c-btn--ghost c-btn--sm">重置</button>
      </div>
    </footer>`;
}

/** 订阅 store 同步容器内控件态：滑杆值/输出/风格卡片高亮/开关/禁用（不重渲染 DOM）。
 *  container 语义：面板 .cust-body 或设置页外观分区 —— 两者各持一个订阅，
 *  任一侧改动 store 都会双向实时同步。 */
function syncUI(container, cfg) {
  container.querySelectorAll('.cust-range').forEach((input) => {
    const key = input.dataset.key;
    const value = readCfg(cfg, key);
    input.value = String(value);
    const [min, max] = RANGES[key];
    input.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);
    const out = container.querySelector(`[data-out="${key}"]`);
    const spec = GROUPS.flatMap((g) => g.sliders ?? []).find((s) => s.key === key);
    if (out && spec) out.textContent = fmtValue(cfg, key, spec.unit);
    if (key === 'durationScale' || key === 'springStrength') {
      input.disabled = !cfg.motion.enabled;
    }
  });
  container.querySelectorAll('.cust-accent-card').forEach((card) => {
    const active = card.dataset.accent === cfg.accent;
    card.classList.toggle('cust-accent-card--active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  const swWrap = container.querySelector('[data-motion-switch]');
  if (swWrap) swWrap.querySelector('.c-switch').setAttribute('aria-checked', String(cfg.motion.enabled));
  const glassWrap = container.querySelector('[data-glass-switch]');
  if (glassWrap) glassWrap.querySelector('.c-switch').setAttribute('aria-checked', String(cfg.glass.blurEnabled));
}

function resetAll(panel) {
  localStorage.removeItem(KEY);
  const defaults = structuredClone(DEFAULTS);
  notify(defaults); // 广播：main.js 重渲染展示区 / 各组容器 syncUI
  applyConfig(defaults);
  syncUI(panel.querySelector('.cust-body'), defaults); // 双保险（订阅回调之外立即同步）
  toast('已恢复默认配置');
}

/** 面板底部动作（预设/导出/保存/重置）—— 分组渲染与事件绑定已抽到 renderCustomizerGroups */
function bindFooter(panel) {
  // 预设：「默认深/浅」= 仅切换主题
  panel.querySelector('.cust-presets').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    applyConfig(saveConfig({ theme: btn.dataset.preset }));
  });

  // 导出 CSS 变量
  panel.querySelector('.cust-export').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(exportCss(getConfig()));
      toast('CSS 变量已复制');
    } catch {
      toast('复制失败：剪贴板不可用', { variant: 'danger' });
    }
  });

  // 保存我的方案：配置经 store 每次变更即自动持久化，此处为确认反馈
  panel.querySelector('.cust-save').addEventListener('click', () => {
    toast('我的方案已保存');
  });

  // 重置：清除存储 + 广播默认值 + applyConfig（不写回 localStorage）
  panel.querySelector('.cust-reset').addEventListener('click', () => resetAll(panel));
}

/**
 * 实时整体预览卡（B3-2）：外观分区顶部缩略展示当前主题/强调色/玻璃/圆角/图标层级。
 * 全部静态背景、无任何动画（红线：布局/几何只动 transform/opacity，模糊永不动画 —— 本卡
 * 玻璃层 backdrop-filter 为静态声明）。值经 --preview-* 变量映射当前 config，由
 * updateOverview 在订阅回调里只读写入（不调 applyConfig —— 变更发起方已先 saveConfig+applyConfig）。
 */
function renderOverviewCard(cfg) {
  return `
    <div class="cust-overview" role="group" aria-label="实时整体预览">
      <h4 class="cust-overview__title">整体预览</h4>
      <div class="cust-overview__items">
        <div class="cust-overview__item">
          <span class="cust-overview__label">主题</span>
          <span class="cust-overview__theme" aria-hidden="true"></span>
        </div>
        <div class="cust-overview__item">
          <span class="cust-overview__label">强调色</span>
          <span class="cust-overview__accent" aria-hidden="true"></span>
        </div>
        <div class="cust-overview__item">
          <span class="cust-overview__label">玻璃</span>
          <span class="cust-overview__glass" aria-hidden="true"></span>
        </div>
        <div class="cust-overview__item">
          <span class="cust-overview__label">圆角</span>
          <span class="cust-overview__radius" aria-hidden="true"></span>
        </div>
        <div class="cust-overview__item">
          <span class="cust-overview__label">图标</span>
          <span class="cust-overview__icons" aria-hidden="true">
            <span class="cust-overview__icon cust-overview__icon--active"></span>
            <span class="cust-overview__icon cust-overview__icon--inactive"></span>
            <span class="cust-overview__icon cust-overview__icon--inactive"></span>
          </span>
        </div>
      </div>
    </div>`;
}

/** 把当前 config 写入预览卡 .cust-overview 的 --preview-* 局部变量（只读，不调 applyConfig）。
 *  空值守卫：jsdom 单测容器 / 未挂预览卡场景下安全跳过。theme: system 经 prefersDark 解析（jsdom 无 matchMedia 由守卫兜底）。 */
function updateOverview(container, cfg) {
  const el = container.querySelector('.cust-overview');
  if (!el) return;
  const resolved = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme;
  el.style.setProperty('--preview-theme', resolved);
  // 主题块底色：与主题色对应 solid 面（themes.css 同值），使色块随 --preview-theme 解析变化
  el.style.setProperty('--preview-theme-bg', resolved === 'dark' ? '#16181f' : '#f8f9fb');
  el.style.setProperty('--preview-accent', ACCENTS.find((a) => a.id === cfg.accent)?.color ?? ACCENTS[0].color);
  el.style.setProperty('--preview-glass-opacity', String(cfg.glass.opacity));
  el.style.setProperty('--preview-radius', String(cfg.radiusScale));
}

/**
 * 定制器分组（Task 20 重构抽出）：6 组 .cust-group HTML + 事件绑定 + store 双向同步。
 * 面板（mountCustomizer）与设置页外观分区共用同一实现 —— 两侧滑杆操作同一份 store：
 * 改动实时 saveConfig + applyConfig，订阅回调反向同步对侧控件态。
 * @param {HTMLElement} container 分组容器（面板 .cust-body / 设置页外观分区）
 * @returns {() => void} store 订阅退订函数 —— 调用方若重建/销毁 container（如 app 手机形态
 *   每次重建设置页 DOM），须在重挂前调用旧退订函数，防订阅数随挂载次数线性累积
 */
export function renderCustomizerGroups(container) {
  const cfg = getConfig();
  container.innerHTML = renderOverviewCard(cfg) + GROUPS.map((g) => `
    <section class="cust-group">
      <h4 class="cust-group__title">${g.title}</h4>
      ${g.desc ? `<p class="cust-group__desc">${g.desc}</p>` : ''}
      ${g.pre ? g.pre(cfg) : ''}
      ${(g.sliders ?? []).map((s) => renderSlider(cfg, s)).join('')}
    </section>`).join('');

  // 风格卡片：点击切换主题色
  container.querySelector('.cust-accent-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.cust-accent-card');
    if (!card) return;
    applyConfig(saveConfig({ accent: card.dataset.accent }));
  });

  // 滑杆：委托 input（不 debounce —— 即时预览是本设计系统核心卖点）
  container.addEventListener('input', (e) => {
    const input = e.target.closest('.cust-range');
    if (!input) return;
    applyConfig(saveConfig(writePatch(input.dataset.key, Number(input.value))));
  });

  // 动效总开关
  const swWrap = container.querySelector('[data-motion-switch]');
  swWrap?.addEventListener('click', () => {
    const sw = swWrap.querySelector('.c-switch');
    const next = sw.getAttribute('aria-checked') !== 'true';
    applyConfig(saveConfig({ motion: { enabled: next } }));
  });

  // 亚克力材质开关（B2-1）：blurEnabled → data-glass 降级
  const glassWrap = container.querySelector('[data-glass-switch]');
  glassWrap?.addEventListener('click', () => {
    const sw = glassWrap.querySelector('.c-switch');
    const next = sw.getAttribute('aria-checked') !== 'true';
    applyConfig(saveConfig({ glass: { blurEnabled: next } }));
  });

  // store 订阅：本容器控件态 + 预览卡实时同步（面板与设置页各自订阅，双向生效）。
  // 返回退订函数 —— 调用方重建 container 前调用，防订阅累积（闭环 M1）。
  // 订阅回调只读 getConfig()/cfg 并写局部 --preview-* 变量，绝不再调 applyConfig
  // （变更发起方已先 saveConfig + applyConfig）。
  const unsub = subscribe((next) => {
    syncUI(container, next);
    updateOverview(container, next);
  });
  // 初始 syncUI：渲染只写 value 属性，--fill（滑杆填充）与动效滑杆 disabled 态
  // （持久化动效关闭时禁用）依赖 syncUI 首次同步 —— 面板与设置页嵌入两条挂载路径共用
  syncUI(container, cfg);
  updateOverview(container, cfg);
  return unsub;
}

/**
 * 挂载定制器：backdrop + 右侧抽屉（两者都是 body 级常驻元素）。
 * @param {HTMLElement} root 挂载容器（main.js 传 document.body）
 * @returns {HTMLElement} 面板元素
 */
export function mountCustomizer(root) {
  const backdrop = document.createElement('div');
  backdrop.className = 'cust-backdrop';
  backdrop.addEventListener('click', () => toggleCustomizer(false));

  const panel = document.createElement('aside');
  panel.className = 'cust-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '主题定制器');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = panelTemplate();

  root.append(backdrop, panel);
  renderCustomizerGroups(panel.querySelector('.cust-body')); // 分组渲染 + 事件 + store 订阅
  bindFooter(panel);
  panel.querySelector('[data-cust-close]').addEventListener('click', () => toggleCustomizer(false));

  // ESC 关闭（与全局热键监听并存，互不冲突）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.repeat) toggleCustomizer(false);
  });

  return panel;
}

let isOpen = false;

/** 开关定制器：open 省略时取反 */
export function toggleCustomizer(open) {
  const panel = document.querySelector('.cust-panel');
  if (!panel) return;
  isOpen = typeof open === 'boolean' ? open : !isOpen;
  const backdrop = document.querySelector('.cust-backdrop');
  panel.classList.toggle('cust-panel--open', isOpen);
  panel.setAttribute('aria-hidden', String(!isOpen));
  backdrop.classList.toggle('cust-backdrop--visible', isOpen);
}
