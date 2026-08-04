import { springCurve, scaledDurations } from '../motion/spring.js';

export function prefersDark() {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyConfig(cfg, root = document.documentElement) {
  root.dataset.theme = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme;
  root.dataset.accent = cfg.accent;
  root.dataset.motion = cfg.motion.enabled ? 'on' : 'off';

  const s = root.style;
  s.setProperty('--glass-bg-opacity', String(cfg.glass.opacity));
  s.setProperty('--glass-blur', `${cfg.glass.blur}px`);
  s.setProperty('--glass-highlight-opacity', String(cfg.glass.highlight));
  s.setProperty('--font-size-base', `${cfg.type.baseSize}px`);
  s.setProperty('--radius-scale', String(cfg.radiusScale));
  s.setProperty('--shadow-intensity', String(cfg.shadow));
  s.setProperty('--spring-strength', String(cfg.motion.springStrength));
  const d = scaledDurations(cfg.motion.durationScale, cfg.motion.enabled);
  s.setProperty('--dur-fast', `${d.fast}ms`);
  s.setProperty('--dur-base', `${d.base}ms`);
  s.setProperty('--dur-slow', `${d.slow}ms`);
  s.setProperty('--ease-spring', springCurve(cfg.motion.springStrength));
}
