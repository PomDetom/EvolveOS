import { describe, it, expect } from 'vitest';
import { renderFloatStrip, renderTokenMonitor } from '../../src/components/float-strip/float-strip.js';

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

// FloatStrip 控制条（ui/strip-ui-opt）：跳转 / 材质 / 旋转 / 关闭；无拖动手柄。
describe('renderFloatStrip', () => {
  it('默认：材质/旋转/关闭恒在，无跳转按钮/恢复按钮/拖动手柄', () => {
    const html = renderFloatStrip({ content: '<i>x</i>' });
    expect(html).toContain('c-strip__material');
    expect(html).toContain('c-strip__rotate');
    expect(html).toContain('c-strip__close');
    expect(html).not.toContain('c-strip__jump');
    expect(html).not.toContain('c-strip__restore');
    expect(html).not.toContain('c-strip__drag');
  });

  it('showJump:true → 渲染跳转按钮（bolt 图标）', () => {
    const html = renderFloatStrip({ content: '<i>x</i>', showJump: true });
    expect(html).toContain('c-strip__jump');
    expect(html).toContain('跳转到 TokenTool 余量页');
  });

  it('控制条顺序：跳转 → 材质 → 旋转 → 关闭', () => {
    const html = renderFloatStrip({ content: '<i>x</i>', showJump: true });
    const idxJump = html.indexOf('c-strip__jump');
    const idxMaterial = html.indexOf('c-strip__material');
    const idxRotate = html.indexOf('c-strip__rotate');
    const idxClose = html.indexOf('c-strip__close');
    expect(idxJump).toBeGreaterThan(-1);
    expect(idxMaterial).toBeGreaterThan(idxJump);
    expect(idxRotate).toBeGreaterThan(idxMaterial);
    expect(idxClose).toBeGreaterThan(idxRotate);
  });

  it('collapsible:true → 渲染 grip（chevron，aria-hidden）；默认不渲染', () => {
    const html = renderFloatStrip({ content: '<i>x</i>', collapsible: true });
    expect(html).toContain('c-strip__grip');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('m18 15-6-6-6 6'); // icon('chevron-up', 12) 的 SVG path（icon() 输出不含图标名）
    const no = renderFloatStrip({ content: '<i>x</i>' });
    expect(no).not.toContain('c-strip__grip');
  });
});
