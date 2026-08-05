import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deepMerge, getConfig, saveConfig, onStorageError } from '../../src/config/store.js';
import { DEFAULTS } from '../../src/config/defaults.js';

describe('deepMerge', () => {
  it('嵌套对象深合并，补全缺失键', () => {
    const r = deepMerge({ a: { x: 1, y: 2 }, b: 3 }, { a: { y: 9 } });
    expect(r).toEqual({ a: { x: 1, y: 9 }, b: 3 });
  });
  it('覆盖数组与标量', () => {
    const r = deepMerge({ list: [1, 2] }, { list: [3] });
    expect(r.list).toEqual([3]);
  });
});

describe('getConfig', () => {
  beforeEach(() => localStorage.clear());
  it('无存储时返回默认配置', () => {
    expect(getConfig()).toEqual(DEFAULTS);
  });
  it('损坏 JSON 兜底为默认值', () => {
    localStorage.setItem('ui-design-config', '{broken!!');
    expect(getConfig()).toEqual(DEFAULTS);
  });
  it('部分配置深合并默认值', () => {
    localStorage.setItem('ui-design-config', JSON.stringify({ accent: 'teal' }));
    const c = getConfig();
    expect(c.accent).toBe('teal');
    expect(c.glass.blur).toBe(DEFAULTS.glass.blur);
  });
});

describe('saveConfig', () => {
  it('写入并持久化', () => {
    saveConfig({ accent: 'sky' });
    expect(JSON.parse(localStorage.getItem('ui-design-config')).accent).toBe('sky');
    expect(getConfig().accent).toBe('sky');
  });
});

// Task I4 Step 2（规格 §13 localStorage 不可用）：saveConfig 写失败（隐私模式）时
// onStorageError 回调一次性触发 —— 模块级 flag 防重复弹，UI 层（main.js）接线 toast。
// store 保持纯配置层：只发事件不依赖任何 UI 模块。
describe('onStorageError', () => {
  it('存储正常时写配置不触发回调', () => {
    const cb = vi.fn();
    onStorageError(cb);
    saveConfig({ accent: 'sky' });
    expect(cb).not.toHaveBeenCalled();
  });
  it('setItem 抛错时回调触发一次（多次 saveConfig 只触发一次）', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('storage denied'); });
    const cb = vi.fn();
    onStorageError(cb);
    saveConfig({ accent: 'sky' });
    saveConfig({ accent: 'teal' });
    saveConfig({ accent: 'amber' });
    expect(cb).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
