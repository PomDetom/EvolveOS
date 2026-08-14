import { describe, it, expect } from 'vitest';
import { signalWhenPainted } from '../../src/app/startup-signal.js';

// 启动就绪信号（ui/startup-opt）：主窗 hidden-until-ready —— 内容首帧绘制后触发 ready。
// 双 rAF 保证 ready 在「首帧已绘制」之后触发（不早于绘制，否则窗口显示时仍空白）。
// 幂等：无论 rAF 队列被触发几次，ready 只回调一次（HMR / 重复挂载防线）。
describe('signalWhenPainted', () => {
  it('双 rAF 队列完成后触发 ready 一次', () => {
    const cbs = [];
    const raf = (cb) => { cbs.push(cb); };
    let n = 0;
    signalWhenPainted(raf, () => { n++; });
    expect(n).toBe(0); // 未绘制前不触发
    cbs[0](); // 第一帧
    expect(n).toBe(0); // 首帧（绘制前）仍不触发
    cbs[1](); // 第二帧（绘制后）→ 触发
    expect(n).toBe(1);
  });

  it('幂等：队列重复执行只触发一次', () => {
    const cbs = [];
    const raf = (cb) => { cbs.push(cb); };
    let n = 0;
    signalWhenPainted(raf, () => { n++; });
    cbs[0]();
    cbs[1]();
    cbs[1](); // 重复触发
    expect(n).toBe(1);
  });
});
