import { describe, it, expect } from 'vitest';

// 与壳同机制：glob 发现 src/apps/*/index.js（Vitest 支持 import.meta.glob）
const appModules = import.meta.glob('../../src/apps/*/index.js', { eager: true });

describe('应用模块契约（G1：glob 自动发现）', () => {
  it('每个 src/apps/*/index.js 导出合法 module（id/name/icon/dir/render）且 id 唯一', () => {
    const modules = Object.values(appModules).map((m) => m.module);
    expect(modules.length).toBeGreaterThanOrEqual(6);
    const ids = modules.map((m) => {
      expect(typeof m.id).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.icon).toBe('string');
      expect(typeof m.render).toBe('function');
      expect(Array.isArray(m.dir)).toBe(true);
      expect(typeof m.order).toBe('number'); // 左窗排序
      m.dir.forEach((d) => {
        expect(typeof d.id).toBe('string');
        expect(typeof d.name).toBe('string');
        expect(typeof d.icon).toBe('string');
      });
      return m.id;
    });
    expect(new Set(ids).size).toBe(ids.length); // id 唯一
    expect(new Set(modules.map((m) => m.order)).size).toBe(modules.length); // order 唯一（重复 order 会静默错排左窗导航）
  });
});
