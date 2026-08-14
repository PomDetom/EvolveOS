// FloatStrip 悬浮条（Task A5，规格 §5）：横竖双形态 / 四边磁吸 / 无边框 hover 浮现。
// 定位模型：position:fixed 底右 dock（right/bottom = --strip-gap，见 float-strip.css），
// 全部位移经 transform: translate(dx, dy)（红线段：磁吸不触发布局动画）。
//   基准位 = 未变换的 dock 位（vw - gap - w / vh - gap - h）；pos 为 strip 左上角视口坐标，
//   transform = pos - 基准位。拖动改 transform；松手距边缘 < 24px 吸附贴边（transform 定位）。
// 形态：--strip-orientation（horizontal|vertical，语义态）+ data-orientation 翻转；
//   flex-direction 随形态切换（布局属性瞬时切换不做动画，红线段）。
// 红线证据：旋转（交叉淡入淡出只动 transform/opacity）、磁吸（transform 位移）、
//   浮现（opacity + border-color/box-shadow paint 豁免），时长/曲线经 CSS 变量。
import { icon } from '../icon/icon.js';

const SNAP_DIST = 24; // 距屏幕边缘 < 24px 吸附（贴边）
const MOVE_THRESHOLD = 2; // 像素级移动判定：双击/点击不触发吸附

export function renderFloatStrip({ content = '', showJump = false } = {}) {
  return `<div class="c-strip c-strip--horizontal" data-orientation="horizontal">
    <div class="c-strip__content">${content}</div>
    <div class="c-strip__ctrl" role="toolbar" aria-label="悬浮条控制">
      ${showJump ? `<button class="c-strip__jump" type="button" title="跳转到 TokenTool 余量页" aria-label="跳转到 TokenTool 余量页">${icon('bolt', 14)}</button>` : ''}
      <button class="c-strip__material" type="button" title="切换外观材质" aria-label="切换外观材质">${icon('layout', 14)}</button>
      <button class="c-strip__rotate" type="button" title="旋转" aria-label="旋转">${icon('refresh', 14)}</button>
      <button class="c-strip__close" type="button" title="关闭" aria-label="关闭">${icon('close', 14)}</button>
    </div>
  </div>`;
}

// token 监测内容模板：数值 + 状态点（OK/WARN/ERR 语义色）+ 迷你趋势条（纯 div + transform scaleY）。
// status: 'ok' | 'warn' | 'err'；trend: 0-1 数值数组（每项一根趋势条）。
// 作为「供后续应用复用」的公开模板，value/status 是外部输入 —— 必须转义/白名单（闭环 M2），
// 未来传用户数据不得成为 XSS sink。
const TOKEN_STATUSES = ['ok', 'warn', 'err'];

/** 最小化 HTML 转义（本地实现，零依赖）：仅转义可注入的 5 个字符 */
function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function renderTokenMonitor({ value = '--', status = 'ok', trend = [] } = {}) {
  const LABEL = { ok: '正常', warn: '告警', err: '错误' };
  const st = TOKEN_STATUSES.includes(status) ? status : 'ok'; // 状态白名单：非法值回落默认
  const dot = `<span class="c-tmon__dot c-tmon__dot--${st}" role="img" aria-label="状态：${LABEL[st]}"></span>`;
  const bars = trend.length
    ? `<span class="c-tmon__trend" role="img" aria-label="趋势">${trend
        .map((v) => `<i class="c-tmon__trend-bar" style="--tbar:${Math.max(0, Math.min(1, Number(v) || 0))}"></i>`)
        .join('')}</span>`
    : '';
  return `<div class="c-tmon">${dot}<span class="c-tmon__value">${escapeHtml(value)}</span>${bars}</div>`;
}

export function mountFloatStrip(root, { onStateChange = () => {}, onClose, windowMode = false, onResize = () => {} } = {}) {
  const strip = root.classList.contains('c-strip') ? root : root.querySelector('.c-strip');
  if (!strip) return null;
  const content = strip.querySelector('.c-strip__content');
  const rotateBtn = strip.querySelector('.c-strip__rotate');
  const closeBtn = strip.querySelector('.c-strip__close');

  let orientation = strip.dataset.orientation === 'vertical' ? 'vertical' : 'horizontal';

  // —— 定位：transform = pos - 未变换基准位（底右 dock）——
  function getGap() {
    const v = parseFloat(getComputedStyle(strip).getPropertyValue('--strip-gap'));
    return Number.isFinite(v) ? v : 16;
  }
  function setPos(x, y) {
    const r = strip.getBoundingClientRect();
    const gap = getGap();
    const dx = x - (window.innerWidth - gap - r.width);
    const dy = y - (window.innerHeight - gap - r.height);
    strip.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function getPos() {
    const r = strip.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }

  // —— 四边磁吸：距边缘 < 24px 吸附贴边（transform 定位，不触发布局动画）——
  function snapToEdge(x, y, w, h) {
    const vw = window.innerWidth, vh = window.innerHeight;
    let ex = null, ey = null;
    if (x < SNAP_DIST) { x = 0; ex = 'left'; }
    else if (x + w > vw - SNAP_DIST) { x = vw - w; ex = 'right'; }
    if (y < SNAP_DIST) { y = 0; ey = 'top'; }
    else if (y + h > vh - SNAP_DIST) { y = vh - h; ey = 'bottom'; }
    return { x, y, edge: [ex, ey].filter(Boolean).join('-') || null };
  }
  function applySnapped(edge) {
    strip.classList.toggle('c-strip--snapped', !!edge);
    strip.dataset.snapped = edge ?? '';
  }

  // —— 旋转切换（按钮 + 双击内容区双通道）——
  // 过渡只动 transform/opacity（交叉淡入淡出）；布局经 --strip-orientation / data-orientation
  // 切换容器 flex 方向，不 animate 宽/高/left/top（容器尺寸随内容瞬时变化，红线段）。
  function readDur(name, fallback) {
    const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(n) ? n : fallback;
  }
  function toggleOrientation() {
    orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
    strip.classList.add('c-strip--rotating');
    const dur = readDur('--dur-base', 200);
    setTimeout(() => {
      strip.classList.toggle('c-strip--vertical', orientation === 'vertical');
      strip.classList.toggle('c-strip--horizontal', orientation === 'horizontal');
      strip.dataset.orientation = orientation;
      // 尺寸变化后保持锚点：已吸附边按新尺寸重新贴边，否则夹在视口内（transform 定位，无布局动画）
      const p = getPos();
      const r = strip.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      let x = Math.max(0, Math.min(p.x, vw - r.width));
      let y = Math.max(0, Math.min(p.y, vh - r.height));
      const edge = strip.dataset.snapped;
      if (edge) {
        if (edge.includes('left')) x = 0;
        if (edge.includes('right')) x = vw - r.width;
        if (edge.includes('top')) y = 0;
        if (edge.includes('bottom')) y = vh - r.height;
      }
      if (windowMode) { onResize(); } else { setPos(x, y); }
      strip.classList.remove('c-strip--rotating');
      onStateChange({ orientation, snapped: strip.dataset.snapped || null });
    }, dur);
  }

  // —— 拖动（pointer 事件 + setPointerCapture；move/up 挂 window 兜底命中）——
  function startDrag(e) {
    if (e.button !== 0) return;
    if (windowMode) {
      window.__TAURI__?.window?.getCurrentWindow?.()?.startDragging?.().catch?.(() => {});
      return;
    }
    const el = e.currentTarget;
    const start = getPos();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    strip.classList.add('c-strip--dragging');
    try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
    function onMove(ev) {
      const nx = start.x + ev.clientX - sx;
      const ny = start.y + ev.clientY - sy;
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > MOVE_THRESHOLD) moved = true;
      setPos(nx, ny);
    }
    function onUp(ev) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      strip.classList.remove('c-strip--dragging');
      try { el.releasePointerCapture(ev.pointerId); } catch { /* noop */ }
      if (!moved) return; // 点击/双击：不触发吸附
      const b = strip.getBoundingClientRect();
      const snapped = snapToEdge(start.x + ev.clientX - sx, start.y + ev.clientY - sy, b.width, b.height);
      setPos(snapped.x, snapped.y);
      applySnapped(snapped.edge);
      onStateChange({ orientation, snapped: snapped.edge });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  rotateBtn?.addEventListener('click', toggleOrientation);
  content?.addEventListener('pointerdown', startDrag);
  content?.addEventListener('dblclick', toggleOrientation);
  closeBtn?.addEventListener('click', () => {
    if (onClose) onClose(strip);
    else strip.remove();
  });

  return {
    setOrientation: (o) => { if ((o === 'vertical' || o === 'horizontal') && o !== orientation) toggleOrientation(); },
    getState: () => ({ orientation, snapped: strip.dataset.snapped || null }),
  };
}
