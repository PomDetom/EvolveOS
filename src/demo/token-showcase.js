import { toast } from '../components/toast/toast.js';

/**
 * 令牌展示区（Task 14）：设计令牌可视化。
 * 所有数值从 getComputedStyle(document.documentElement) 实时读取，
 * 随主题 / 主题色 / 定制器配置变化自动刷新（main.js 订阅 store 重渲染）。
 * DOM 契约：.tk-card / .tk-swatch / .tk-swatch__label / .tk-row / .tk-block
 */

const NEUTRAL_LEVELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const ACCENT_LEVELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
const SEMANTIC = [
  { var: '--success-500', name: '成功 Success' },
  { var: '--warning-500', name: '警告 Warning' },
  { var: '--danger-500', name: '危险 Danger' },
  { var: '--info-500', name: '信息 Info' },
];
const TYPE_LEVELS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'];
const SPACE_LEVELS = [1, 2, 3, 4, 5, 6, 7];
const RADIUS_LEVELS = ['xs', 'sm', 'md', 'lg', 'xl'];
const SHADOW_LEVELS = ['sm', 'md', 'lg'];

const rootEl = () => document.documentElement;
const readVar = (name) => getComputedStyle(rootEl()).getPropertyValue(name).trim();

/** 解析 #hex / rgb() / rgba() → [r,g,b]；失败返回 null */
function parseRGB(raw) {
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = raw.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

/** 按亮度给色块选可读文字色（亮底深字 / 暗底白字） */
function inkFor(varName) {
  const [r, g, b] = parseRGB(readVar(varName)) ?? [128, 128, 128];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? 'var(--neutral-950)' : '#ffffff';
}

function swatch(varName) {
  return `<button type="button" class="tk-swatch" data-copy="var(${varName})"
    style="background: var(${varName}); color: ${inkFor(varName)}" title="点击复制 var(${varName})">
    <span class="tk-swatch__label">${varName}</span></button>`;
}

function paletteCard() {
  const neutral = NEUTRAL_LEVELS.map((l) => swatch(`--neutral-${l}`)).join('');
  const accent = ACCENT_LEVELS.map((l) => swatch(`--accent-${l}`)).join('');
  const semantic = SEMANTIC.map((s) => swatch(s.var)).join('');
  return `<div class="tk-card">
    <h3 class="tk-card__title">色板 Palette</h3>
    <p class="tk-card__desc">点击任意色块复制变量名 · 强调色跟随当前主题色</p>
    <div class="tk-palette">
      <div class="tk-group">
        <span class="tk-group__name">中性色 Neutral（${NEUTRAL_LEVELS.length} 级）</span>
        <div class="tk-group__swatches">${neutral}</div>
      </div>
      <div class="tk-group">
        <span class="tk-group__name">强调色 Accent（${ACCENT_LEVELS.length} 级）</span>
        <div class="tk-group__swatches">${accent}</div>
      </div>
      <div class="tk-group">
        <span class="tk-group__name">语义色 Semantic（${SEMANTIC.length} 组）</span>
        <div class="tk-group__swatches">${semantic}</div>
      </div>
    </div>
  </div>`;
}

function typeRow(level) {
  const v = `--font-size-${level}`;
  return `<div class="tk-row" data-copy="var(${v})" title="点击复制 var(${v})">
    <span class="tk-row__name">${v}</span>
    <span class="tk-row__value">${readVar(v)}</span>
    <span class="tk-row__sample" style="font-size: var(${v})">设计令牌 Design Tokens</span>
  </div>`;
}

function typeCard() {
  return `<div class="tk-card">
    <h3 class="tk-card__title">字体阶梯 Type</h3>
    <p class="tk-card__desc">${TYPE_LEVELS.length} 级字号 · 基础字号跟随定制器</p>
    ${TYPE_LEVELS.map(typeRow).join('')}
  </div>`;
}

function spaceRow(n) {
  const v = `--space-${n}`;
  return `<div class="tk-row" data-copy="var(${v})" title="点击复制 var(${v})">
    <span class="tk-row__name">${v}</span>
    <span class="tk-row__value">${readVar(v)}</span>
    <div class="tk-block" style="width: var(${v})"></div>
  </div>`;
}

function spaceCard() {
  return `<div class="tk-card">
    <h3 class="tk-card__title">间距标尺 Spacing</h3>
    <p class="tk-card__desc">${SPACE_LEVELS.length} 级间距 · 4px 基准</p>
    ${SPACE_LEVELS.map(spaceRow).join('')}
  </div>`;
}

function radiusRow(level) {
  const v = `--radius-${level}`;
  return `<div class="tk-row" data-copy="var(${v})" title="点击复制 var(${v})">
    <span class="tk-row__name">${v}</span>
    <span class="tk-row__value">${readVar(v)}</span>
    <div class="tk-block tk-block--square" style="border-radius: calc(var(${v}) * var(--radius-scale, 1))"></div>
  </div>`;
}

function radiusCard() {
  return `<div class="tk-card">
    <h3 class="tk-card__title">圆角 Radius</h3>
    <p class="tk-card__desc">${RADIUS_LEVELS.length} 档圆角 · 随定制器圆角比例缩放</p>
    ${RADIUS_LEVELS.map(radiusRow).join('')}
  </div>`;
}

function shadowRow(level) {
  const v = `--shadow-${level}`;
  return `<div class="tk-row" data-copy="var(${v})" title="点击复制 var(${v})">
    <span class="tk-row__name">${v}</span>
    <span class="tk-row__value">${level.toUpperCase()}</span>
    <div class="tk-block tk-block--shadow" style="box-shadow: var(${v})"></div>
  </div>`;
}

function shadowCard() {
  return `<div class="tk-card">
    <h3 class="tk-card__title">阴影 Shadow</h3>
    <p class="tk-card__desc">${SHADOW_LEVELS.length} 级阴影 · 强度随定制器变化</p>
    ${SHADOW_LEVELS.map(shadowRow).join('')}
  </div>`;
}

function glassCard() {
  const opacity = readVar('--glass-bg-opacity') || '0.62';
  const blur = readVar('--glass-blur') || '24px';
  const highlight = readVar('--glass-highlight-opacity') || '0.5';
  return `<div class="tk-card">
    <h3 class="tk-card__title">玻璃材质 Glass</h3>
    <p class="tk-card__desc">点击数值复制变量名</p>
    <div class="tk-glass">
      <div class="tk-glass__panel glass">
        <span class="tk-glass__title">玻璃面板</span>
        <span class="tk-glass__hint">backdrop-filter 背景模糊 · 内高光</span>
      </div>
      <div class="tk-glass__meta">
        <span class="tk-chip" data-copy="var(--glass-bg-opacity)" title="点击复制">透明度 <b>${opacity}</b></span>
        <span class="tk-chip" data-copy="var(--glass-blur)" title="点击复制">模糊 <b>${blur}</b></span>
        <span class="tk-chip" data-copy="var(--glass-highlight-opacity)" title="点击复制">高光 <b>${highlight}</b></span>
      </div>
    </div>
    <p class="tk-card__note">透明度 / 模糊 / 高光由 <a class="tk-link" data-customizer-link>定制器</a>控制</p>
  </div>`;
}

/**
 * 点击复制变量名：navigator.clipboard 优先，无权限时降级 execCommand；
 * 仍失败则 toast 失败提示（全局约束：静默降级或失败提示）。
 */
async function copyVar(varName) {
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(varName);
      ok = true;
    } else {
      const ta = document.createElement('textarea');
      ta.value = varName;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    }
  } catch { ok = false; }
  toast(ok ? `已复制 ${varName}` : `复制失败：${varName}`, ok ? {} : { variant: 'danger' });
}

function onRootClick(e) {
  const copyEl = e.target.closest('[data-copy]');
  if (copyEl) { copyVar(copyEl.dataset.copy); return; }
  // 玻璃卡「定制器」链接 → 触发顶栏定制按钮（Task 17 挂载后生效）
  if (e.target.closest('[data-customizer-link]')) {
    document.querySelector('.topbar__customizer')?.click();
  }
}

/**
 * 渲染令牌展示区到 #tokens。
 * @param {HTMLElement} root #tokens section
 * @param {boolean} rerender true 时先 replaceChildren 再重建（订阅 store 回调使用）
 */
export function mountTokenShowcase(root, rerender = false) {
  if (rerender) root.replaceChildren();
  root.insertAdjacentHTML('beforeend', `
    <h2>设计令牌</h2>
    <div class="tk-grid">
      ${paletteCard()}${typeCard()}${spaceCard()}
      ${radiusCard()}${shadowCard()}${glassCard()}
    </div>`);
  if (!root.dataset.tkReady) {
    root.dataset.tkReady = '1';
    root.addEventListener('click', onRootClick);
  }
}
