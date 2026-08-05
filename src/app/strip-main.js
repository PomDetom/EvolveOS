// FloatStrip 悬浮条入口（Task A5，规格 §5）：body 级独立渲染一个悬浮条实例（token 监测内容），
// 供 Tauri 独立透明窗口接入。main.js 在 ?mode=strip 时动态 import 本模块并调用 mountStripMode()。
// 组件 CSS 随本模块按需加载（docs 模式零冲击：docs 不 import 本模块，样式不进入 docs）。
import { renderFloatStrip, mountFloatStrip, renderTokenMonitor } from '../components/float-strip/float-strip.js';
import '../components/float-strip/float-strip.css';

export function mountStripMode() {
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: renderTokenMonitor({
      value: '97.2%',
      status: 'ok',
      trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
    }),
  });
  document.body.appendChild(root);
  mountFloatStrip(root, { onClose: () => root.remove() });
}
