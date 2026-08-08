import { describe, it, expect, beforeEach } from 'vitest';
import { applyConfig, temperatureToHue } from '../../src/config/apply.js';
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
    applyConfig({ ...DEFAULTS, glass: { opacity: 0.8, blur: 30, noise: 0.06 },
      motion: { enabled: true, durationScale: 1, springStrength: 0.6 } }, root);
    const s = root.style;
    expect(s.getPropertyValue('--glass-bg-opacity')).toBe('0.8');
    expect(s.getPropertyValue('--glass-blur')).toBe('30px');
    expect(s.getPropertyValue('--dur-fast')).toBe('120ms');
    expect(s.getPropertyValue('--ease-spring')).toBe('cubic-bezier(0.34, 1.336, 0.64, 1)');
  });
  it('亚克力材质开（blurEnabled=true）：写 --glass-enabled: 1 与 data-glass="on"', () => {
    applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, blurEnabled: true } }, root);
    expect(root.style.getPropertyValue('--glass-enabled')).toBe('1');
    expect(root.dataset.glass).toBe('on');
  });
  it('亚克力材质关（blurEnabled=false）：写 --glass-enabled: 0 与 data-glass="off"', () => {
    applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, blurEnabled: false } }, root);
    expect(root.style.getPropertyValue('--glass-enabled')).toBe('0');
    expect(root.dataset.glass).toBe('off');
  });
  it('噪点强度写入 --noise-opacity 覆盖', () => {
    applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, noise: 0.08 } }, root);
    expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.08');
  });
  it('默认噪点强度 0.06 写入', () => {
    applyConfig(DEFAULTS, root);
    expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.06');
  });
  it('动效关闭时时长全部为 0', () => {
    applyConfig({ ...DEFAULTS, motion: { enabled: false, durationScale: 1, springStrength: 0.6 } }, root);
    expect(root.style.getPropertyValue('--dur-fast')).toBe('0ms');
  });
  // —— 色彩微调：色相/饱和度覆盖（默认跟随主题色时不写覆盖）——
  it('hue 跟随（-1）且饱和度 100 时不写 --accent 覆盖', () => {
    applyConfig(DEFAULTS, root);
    expect(root.style.getPropertyValue('--accent')).toBe('');
  });
  it('自定义色相写入 --accent/--accent-hover/--accent-active 覆盖（保持基色明度）', () => {
    applyConfig({ ...DEFAULTS, color: { hue: 200, saturation: 100, temperature: 0 } }, root);
    const s = root.style;
    expect(s.getPropertyValue('--accent')).toBe('hsl(200 83.5% 69%)');
    expect(s.getPropertyValue('--accent-hover')).toBe('hsl(200 83.5% 75%)');
    expect(s.getPropertyValue('--accent-active')).toBe('hsl(200 83.5% 63%)');
  });
  it('饱和度缩放基色饱和度（100 = 原值）', () => {
    applyConfig({ ...DEFAULTS, color: { hue: -1, saturation: 50, temperature: 0 } }, root);
    expect(root.style.getPropertyValue('--accent')).toBe('hsl(234 41.8% 69%)');
  });
  it('teal 主题基色解析正确', () => {
    applyConfig({ ...DEFAULTS, accent: 'teal', color: { hue: -1, saturation: 100, temperature: 0 } }, root);
    expect(root.style.getPropertyValue('--accent')).toBe('');
    applyConfig({ ...DEFAULTS, accent: 'teal', color: { hue: 120, saturation: 100, temperature: 0 } }, root);
    expect(root.style.getPropertyValue('--accent')).toBe('hsl(120 66% 50.4%)'); // #2dd4bf 基色 HSL
  });
  // —— 色温：中性色阶冷暖偏移 ——
  it('temperatureToHue 端点与中点映射正确', () => {
    expect(temperatureToHue(-1)).toBe(210); // 冷端：更冷偏蓝
    expect(temperatureToHue(0)).toBe(235);  // 默认中性
    expect(temperatureToHue(0.5)).toBe(138); // 235-97.5=137.5 → round 138
    expect(temperatureToHue(1)).toBe(40);    // 暖端：暖橙灰
  });
  it('temperature 为 0（默认）时不写 --neutral-hue 覆盖', () => {
    applyConfig(DEFAULTS, root);
    expect(root.style.getPropertyValue('--neutral-hue')).toBe('');
  });
  it('temperature 0.5 写入 --neutral-hue: 138 覆盖', () => {
    applyConfig({ ...DEFAULTS, color: { hue: -1, saturation: 100, temperature: 0.5 } }, root);
    expect(root.style.getPropertyValue('--neutral-hue')).toBe('138');
  });
  it('--font-size-base = calc(baseSize px * scale)（两滑杆共同驱动）', () => {
    applyConfig({ ...DEFAULTS, type: { baseSize: 14, scale: 1.15, weight: 400 } }, root);
    expect(root.style.getPropertyValue('--font-size-base')).toBe('calc(14px * 1.15)');
  });
});
