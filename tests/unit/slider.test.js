import { describe, it, expect } from 'vitest';
import { renderSlider } from '../../src/components/slider/slider.js';

describe('Slider 组件（B5-2：三区统一胶囊形）', () => {
  it('renderSlider 输出 .c-slider 且保留全部 props', () => {
    const html = renderSlider({ min: 0, max: 10, step: 0.5, value: 5, disabled: true, label: '测试' });
    expect(html).toContain('class="c-slider"');
    expect(html).toContain('min="0" max="10" step="0.5" value="5"');
    expect(html).toContain('disabled');
    expect(html).toContain('aria-label="测试"');
  });
  it('renderSlider 默认值', () => {
    const html = renderSlider({});
    expect(html).toContain('min="0" max="100" step="1" value="50"');
    expect(html).not.toContain('disabled');
  });
  it('renderSlider 内联 --fill 按值计算（B5-final find 1：非 50% 静态兜底）', () => {
    expect(renderSlider({ value: 80 })).toContain('style="--fill:80%"');
    expect(renderSlider({ value: 20 })).toContain('style="--fill:20%"');
    expect(renderSlider({})).toContain('style="--fill:50%"'); // 默认 50/100 恰为 50%
    expect(renderSlider({ min: 0, max: 24, value: 8 })).toMatch(/--fill:3[34](\.\d+)?%/); // 8/24 → ~33.33%
    expect(renderSlider({ min: 0, max: 24, value: 16 })).toMatch(/--fill:66\.66\d*%/); // 16/24 → 66.66…%
  });
});
