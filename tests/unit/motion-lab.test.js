import { describe, it, expect, beforeEach } from 'vitest';
import { mountMotionLab } from '../../src/demo/motion-lab.js';
import { saveConfig } from '../../src/config/store.js';

// 动效分区 store 订阅退订（闭环 I1）：手机形态每次重建设置页 DOM 会重挂 mountMotionLab
// （新增一次 store 订阅），重建前必须释放旧订阅（subscribe 返回退订函数）—— 防订阅数
// 随进入设置→动效次数线性增长、回调引用已脱离容器的旧 .ml-card 节点。
// 契约与 customizer.test.js（renderCustomizerGroups 退订）一致：挂载返回退订函数。
describe('mountMotionLab 退订（防订阅累积）', () => {
  beforeEach(() => localStorage.clear());

  it('返回退订函数（供重建前释放旧订阅）', () => {
    const root = document.createElement('div');
    const unsub = mountMotionLab(root);
    expect(typeof unsub).toBe('function');
    unsub(); // 清理本测试订阅，避免跨用例污染 store 监听器
  });

  it('释放旧订阅后：新容器随 store 同步、旧容器不再跟随（重建前释放防累积）', () => {
    const old = document.createElement('div');
    const unsubOld = mountMotionLab(old);
    const current = document.createElement('div');
    unsubOld(); // app-main 手机路径重建前释放旧订阅
    mountMotionLab(current);

    saveConfig({ motion: { springStrength: 0.8 } }); // store 变更 → 订阅回调同步弹性滑杆
    // 新容器（当前挂载）跟随 store：弹性滑杆同步为 0.8
    expect(current.querySelector('.ml-slider').value).toBe('0.8');
    // 旧容器已退订：仍停留在挂载时的默认值 0.6（不再被同步）
    expect(old.querySelector('.ml-slider').value).toBe('0.6');
  });
});
