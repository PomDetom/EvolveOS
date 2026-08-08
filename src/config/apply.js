import { springCurve, scaledDurations } from '../motion/spring.js';
import { ACCENTS } from './defaults.js';

export function prefersDark() {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** hex (#rrggbb) → HSL（h 整数 / s,l 各保留 1 位小数百分比）。基色取自 ACCENTS 元数据，不依赖 computed style（可单测）。 */
export function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 0 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
}

/** 色温 → 中性色相：-1 冷端（210 更冷偏蓝）→ 0 默认（235）→ 1 暖端（40 暖橙灰）。 */
export function temperatureToHue(t) {
  return Math.round(t <= 0 ? 235 + 25 * t : 235 - 195 * t);
}

/** 色彩微调覆盖：hue -1 = 跟随主题色；saturation 100 = 原饱和度。默认态不写任何覆盖（主题色原样生效）。 */
function applyColorTint(cfg, root) {
  const s = root.style;
  const { hue, saturation } = cfg.color;
  if (hue === -1 && saturation === 100) {
    s.removeProperty('--accent');
    s.removeProperty('--accent-hover');
    s.removeProperty('--accent-active');
    return;
  }
  const base = ACCENTS.find((a) => a.id === cfg.accent)?.color ?? '#6e7bf2';
  const { h, s: bs, l } = hexToHsl(base);
  const H = hue === -1 ? h : Math.round(hue);
  const S = Math.min(100, Math.max(0, Math.round(bs * (saturation / 100) * 10) / 10));
  s.setProperty('--accent', `hsl(${H} ${S}% ${l}%)`);
  s.setProperty('--accent-hover', `hsl(${H} ${S}% ${Math.min(95, l + 6)}%)`);
  s.setProperty('--accent-active', `hsl(${H} ${S}% ${Math.max(5, l - 6)}%)`);
}

export function applyConfig(cfg, root = document.documentElement) {
  root.dataset.theme = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme;
  root.dataset.accent = cfg.accent;
  root.dataset.motion = cfg.motion.enabled ? 'on' : 'off';
  // 玻璃开关：CSS 降级用 data-glass 属性选择器（:root[data-glass="off"]），
  // --glass-enabled 为机器可读值（1|0），供脚本/工具消费
  root.dataset.glass = cfg.glass.blurEnabled ? 'on' : 'off';

  const s = root.style;
  s.setProperty('--glass-enabled', cfg.glass.blurEnabled ? '1' : '0');
  s.setProperty('--glass-bg-opacity', String(cfg.glass.opacity));
  s.setProperty('--glass-blur', `${cfg.glass.blur}px`);
  s.setProperty('--noise-opacity', String(cfg.glass.noise));
  s.setProperty('--font-size-base', `calc(${cfg.type.baseSize}px * ${cfg.type.scale})`);
  s.setProperty('--radius-scale', String(cfg.radiusScale));
  s.setProperty('--shadow-intensity', String(cfg.shadow));
  s.setProperty('--spring-strength', String(cfg.motion.springStrength));
  const d = scaledDurations(cfg.motion.durationScale, cfg.motion.enabled);
  s.setProperty('--dur-fast', `${d.fast}ms`);
  s.setProperty('--dur-base', `${d.base}ms`);
  s.setProperty('--dur-slow', `${d.slow}ms`);
  s.setProperty('--ease-spring', springCurve(cfg.motion.springStrength));
  applyColorTint(cfg, root);
  // 色温覆盖：temperature === 0（默认）时移除，中性色阶回退 :root 的 --neutral-hue: 235
  if (cfg.color.temperature === 0) s.removeProperty('--neutral-hue');
  else s.setProperty('--neutral-hue', String(temperatureToHue(cfg.color.temperature)));
}
