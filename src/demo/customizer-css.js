import { springCurve, scaledDurations } from '../motion/spring.js';
import { hexToHsl, temperatureToHue } from '../config/apply.js';
import { ACCENTS } from '../config/defaults.js';

/** 色相/饱和度覆盖的 HSL（与 apply.js applyColorTint 公式一致） */
function tintHsl(cfg) {
  const accent = ACCENTS.find((a) => a.id === cfg.accent) ?? ACCENTS[0];
  const base = hexToHsl(accent.color);
  const H = cfg.color.hue === -1 ? base.h : cfg.color.hue;
  const S = Math.min(100, Math.max(0, Math.round(base.s * (cfg.color.saturation / 100) * 10) / 10));
  return { H, S, L: base.l };
}

/**
 * 主题定制器导出（Task 17）：把当前配置生成为可直接粘贴的 CSS 变量代码。
 * 值全部来自 cfg（经 store/apply 链路）—— :root 段 = apply.js 写入的覆盖层，
 * theme/accent 段指向 themes.css 中的主题令牌（导出为注释契约，代码段即挂载选择器）。
 */
export function exportCss(cfg) {
  const { glass, type, radiusScale, motion, shadow } = cfg;
  const d = scaledDurations(motion.durationScale, motion.enabled);
  const theme = cfg.theme === 'system' ? 'dark' : cfg.theme;
  const accent = ACCENTS.find((a) => a.id === cfg.accent);
  const accentNote = accent ? `${accent.name}（${accent.desc}）` : cfg.accent;
  const tintActive = cfg.color.hue !== -1 || cfg.color.saturation !== 100;
  const tint = tintActive ? tintHsl(cfg) : null;
  const tintLine = tint
    ? `  --accent: hsl(${tint.H} ${tint.S}% ${tint.L}%); /* 色彩微调覆盖（色相/饱和度） */`
    : `  --accent: var(--accent-500); /* 主题色全阶 --accent-50…950 见 themes.css */`;
  const tempLine = cfg.color.temperature !== 0
    ? `  --neutral-hue: ${temperatureToHue(cfg.color.temperature)}; /* 色温覆盖（中性色冷暖偏移） */`
    : null;
  return `/* 由主题定制器导出 — ${new Date().toLocaleString('zh-CN')} */
/* 定制参数层（玻璃/排版/圆角/动效/阴影）—— 粘贴到应用 :root */
:root {
  --glass-bg-opacity: ${glass.opacity};
  --glass-blur: ${glass.blur}px;
  --noise-opacity: ${glass.noise};
  --font-size-base: ${type.baseSize}px;
  --radius-scale: ${radiusScale};
  --shadow-intensity: ${shadow};
  --dur-fast: ${d.fast}ms;
  --dur-base: ${d.base}ms;
  --dur-slow: ${d.slow}ms;
  --ease-spring: ${springCurve(motion.springStrength)};
  --spring-strength: ${motion.springStrength};
${tintLine}
${tempLine ?? ''}
}

/* 主题令牌（--text-* / --surface-* / --glass-* / 语义色）见 themes.css — 当前主题：${theme} */
html[data-theme="${theme}"] { /* 按需拷贝 themes.css 中对应主题段 */ }

/* 主题色板（${accentNote}）见 themes.css */
html[data-accent="${cfg.accent}"] { /* 按需拷贝 themes.css 中对应主题色段 */ }`;
}
