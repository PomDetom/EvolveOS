import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderPopover, mountPopover } from '../../src/components/popover/popover.js';

// Task I3 4b：popover 不再常驻 document 点击监听 —— 打开时一次性注册、关闭即移除
// （此前 N 个实例挂 N 个常驻 document 监听；修复后监听随开合生命周期，行为不变：
// 打开态外部点击关闭、trigger 点击切换）。
describe('mountPopover document 监听生命周期', () => {
  let root;
  beforeEach(() => {
    // mountPopover 契约：root 为宿主容器（内部含 .c-popover 实例，组件矩阵同款结构）
    document.body.innerHTML = `<div class="host">${renderPopover({ trigger: '菜单', content: '内容' })}</div>`;
    root = document.body.firstElementChild;
    vi.restoreAllMocks();
  });

  it('挂载后（关闭态）不注册 document 点击监听', () => {
    // 仅统计 click 事件（jsdom 内部会注册 mouseover 等环境监听，与组件无关）
    const spy = vi.spyOn(document, 'addEventListener');
    mountPopover(root);
    expect(spy.mock.calls.filter(([ev]) => ev === 'click')).toHaveLength(0);
  });

  it('打开时注册、关闭时移除（外部点击关闭后不再常驻）', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    mountPopover(root);
    const wrap = root.querySelector('.c-popover');
    root.querySelector('.c-popover__trigger').click();
    const clickRegs = addSpy.mock.calls.filter(([ev]) => ev === 'click');
    expect(clickRegs).toHaveLength(1);
    const handler = clickRegs[0][1];
    expect(wrap.classList.contains('c-popover--open')).toBe(true);
    // 外部点击（模拟 document 层 dispatch，target 在 popover 之外）→ 关闭并移除监听
    document.body.click();
    expect(removeSpy.mock.calls.filter(([ev]) => ev === 'click')).toEqual([['click', handler]]);
    expect(wrap.classList.contains('c-popover--open')).toBe(false);
  });

  it('行为保持：trigger 点击切换开/闭，aria 同步', () => {
    mountPopover(root);
    const trigger = root.querySelector('.c-popover__trigger');
    const panel = root.querySelector('.c-popover__panel');
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
