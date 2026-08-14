// 启动就绪信号（ui/startup-opt）：主窗 hidden-until-ready。
// 内容首帧绘制后触发 ready，Rust 侧恢复几何并显示窗口 —— 消除白屏与「先按默认几何显示、加载到某阶段才跳保存位置」。
// 双 rAF：第一帧回调在绘制前，第二帧在「首帧已绘制」之后 —— 此时窗口才显示不空白。
// 幂等：ready 只回调一次（HMR / 重复挂载防线）。
// 纯函数（注入 rAF 与 ready 回调）以便单测。
export function signalWhenPainted(requestAnimationFrame, ready) {
  let signaled = false;
  const fire = () => {
    if (signaled) return;
    signaled = true;
    ready();
  };
  requestAnimationFrame(() => requestAnimationFrame(fire));
}
