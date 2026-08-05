import { describe, it, expect, beforeEach } from 'vitest';
import { renderCustomizerGroups } from '../../src/demo/customizer-panel.js';
import { saveConfig } from '../../src/config/store.js';

// 定制器分组订阅（闭环 M1）：手机形态每次重建设置页 DOM 会重挂 renderCustomizerGroups
// （新增一次 store 订阅），重建前必须释放旧订阅（subscribe 返回退订函数）—— 防订阅数
// 随进入次数线性增长、回调引用已脱离容器的旧 DOM。
describe('renderCustomizerGroups 退订（防订阅累积）', () => {
  beforeEach(() => localStorage.clear());

  it('返回退订函数（供重建前释放旧订阅）', () => {
    const container = document.createElement('div');
    const unsub = renderCustomizerGroups(container);
    expect(typeof unsub).toBe('function');
    unsub(); // 清理本测试订阅，避免跨用例污染 store 监听器
  });

  it('释放旧订阅后：新容器随 store 同步、旧容器不再跟随（重建前释放防累积）', () => {
    const old = document.createElement('div');
    const unsubOld = renderCustomizerGroups(old);
    const current = document.createElement('div');
    unsubOld(); // app-main 手机路径重建前释放旧订阅
    renderCustomizerGroups(current);

    saveConfig({ accent: 'teal' }); // store 变更 → 订阅回调 syncUI
    // 新容器（当前挂载）跟随 store
    expect(current.querySelector('.cust-accent-card--active').dataset.accent).toBe('teal');
    // 旧容器已退订：仍停留在挂载时的默认 indigo（不再被同步）
    expect(old.querySelector('.cust-accent-card--active').dataset.accent).toBe('indigo');
  });
});
