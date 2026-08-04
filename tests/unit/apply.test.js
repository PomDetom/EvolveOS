import { describe, it, expect, beforeEach } from 'vitest';
import { applyConfig } from '../../src/config/apply.js';
import { DEFAULTS } from '../../src/config/defaults.js';

describe('applyConfig', () => {
  let root;
  beforeEach(() => {
    root = document.documentElement;
    root.removeAttribute('data-theme');
    root.removeAttribute('data-accent');
    root.removeAttribute('style');
  });

  it('写入 data-theme 与 data-accent', () => {
    applyConfig({ ...DEFAULTS, theme: 'light', accent: 'teal' }, root);
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.accent).toBe('teal');
  });
  it('system 主题解析为系统偏好', () => {
    applyConfig(DEFAULTS, root);
    expect(root.dataset.theme).toMatch(/^(light|dark)$/);
  });
  it('玻璃与动效参数写入 CSS 变量覆盖层', () => {
    applyConfig({ ...DEFAULTS, glass: { opacity: 0.8, blur: 30, highlight: 0.2 },
      motion: { enabled: true, durationScale: 1, springStrength: 0.6 } }, root);
    const s = root.style;
    expect(s.getPropertyValue('--glass-bg-opacity')).toBe('0.8');
    expect(s.getPropertyValue('--glass-blur')).toBe('30px');
    expect(s.getPropertyValue('--dur-fast')).toBe('120ms');
    expect(s.getPropertyValue('--ease-spring')).toBe('cubic-bezier(0.34, 1.336, 0.64, 1)');
  });
  it('动效关闭时时长全部为 0', () => {
    applyConfig({ ...DEFAULTS, motion: { enabled: false, durationScale: 1, springStrength: 0.6 } }, root);
    expect(root.style.getPropertyValue('--dur-fast')).toBe('0ms');
  });
});
