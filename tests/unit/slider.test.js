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
});
