import { springCurve, scaledDurations } from '../motion/spring.js';

export function prefersDark() {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
}
