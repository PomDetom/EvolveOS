import { describe, it, expect, beforeEach } from 'vitest';
import { deepMerge, getConfig, saveConfig } from '../../src/config/store.js';
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
