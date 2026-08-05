import { describe, it, expect } from 'vitest';
import { renderTokenMonitor } from '../../src/components/float-strip/float-strip.js';

// FloatStrip token 监测内容模板（闭环 M2）：作为「供后续应用复用」的公开模板，
// value/status 必须转义/白名单 —— 未来传用户数据不得成为 XSS sink。
describe('renderTokenMonitor', () => {
  it('常规调用输出与既有实例一致（value/status/trend 不变）', () => {
    const html = renderTokenMonitor({ value: '97.2%', status: 'ok', trend: [0.5, 0.8] });
    expect(html).toContain('c-tmon__value">97.2%</span>');
    expect(html).toContain('c-tmon__dot--ok');
    expect(html).toContain('aria-label="状态：正常"');
    expect((html.match(/c-tmon__trend-bar/g) ?? []).length).toBe(2);
  });

  it('value 含 HTML 特殊字符被转义（不可执行注入）', () => {
    const html = renderTokenMonitor({ value: '<script>alert(1)</script>&"\'', status: 'ok' });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('非法 status 回落默认 ok（白名单，防止类名/aria 注入）', () => {
    const html = renderTokenMonitor({ value: '--', status: 'bad<script>' });
    expect(html).toContain('c-tmon__dot--ok');
    expect(html).toContain('aria-label="状态：正常"');
    expect(html).not.toContain('bad<script>');
  });

  it('合法 status 仍渲染对应语义色与标签', () => {
    const html = renderTokenMonitor({ value: '1', status: 'warn' });
    expect(html).toContain('c-tmon__dot--warn');
    expect(html).toContain('aria-label="状态：告警"');
  });
});
