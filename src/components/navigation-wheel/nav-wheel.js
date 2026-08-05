// NavigationWheel A：滚动 focal 变形 + 点击居中吸附 + 键盘选择（Task 11）
// 只动 transform/opacity（合成器友好）；滚动由原生 overflow-y:auto + scroll/rAF 驱动
import { icon } from '../icon/icon.js';
import { itemCenterY, scrollTopForCenter, findNearestIndex, focalScale, focalOpacity }
  from './nav-wheel-geometry.js';

const GAP = 12; // 与 :root --navwheel-gap 一致（几何约定；itemH 按实测读取）

export function mountNavWheel(root, { items, onChange = () => {} } = {}) {
  const list = root.querySelector('.c-navwheel__list') ?? root;
  list.innerHTML = items.map((it, i) => `
    <div class="c-navwheel__item" data-id="${it.id}" data-index="${i}" role="button" tabindex="0">
      <div class="c-navwheel__glow"></div>
      <span class="c-navwheel__icon">${icon(it.icon, 22)}</span>
      <span class="c-navwheel__name">${it.name}</span>
    </div>`).join('');
  // 顶部/底部渐变遮罩：列表 overflow-y:auto 内绝对定位会随内容滚动，故挂到
  // .navwheel（position:relative，见 layout.css）下、位于列表之上
  const holder = root.closest('.navwheel') ?? root.parentElement;
  if (holder && !holder.querySelector('.c-navwheel__mask')) {
    holder.insertAdjacentHTML('beforeend',
      '<div class="c-navwheel__mask"></div><div class="c-navwheel__mask c-navwheel__mask--bottom"></div>');
  }
  const itemEls = [...list.children];
  const itemH = parseFloat(getComputedStyle(itemEls[0]).height);
  const viewH = () => list.clientHeight;
  // 精确首尾 padding：使首/末项也能滚到视口中央（CSS calc(50% - 26px) 相对宽度，实测值才正确）
  const pad = Math.max(0, viewH() / 2 - itemH / 2);
  list.style.paddingTop = list.style.paddingBottom = `${pad}px`;
  // 内容起点偏移 = 首项 offsetTop（padding + margin，布局实测），保证几何公式与 CSS 一致
  const CONTENT_TOP = itemEls[0].offsetTop;
  let active = 0, raf = 0;

  function setFocal() {
    const st = list.scrollTop;
    const vh = viewH();
    itemEls.forEach((el, i) => {
      const offset = itemCenterY(i, itemH, GAP) + CONTENT_TOP - st - vh / 2;
      el.style.transform = `translateY(${offset * 0.06}px) scale(${focalScale(offset, vh)})`;
      el.style.opacity = String(focalOpacity(offset, vh));
    });
  }
  function onScroll() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(setFocal);
  }
  function select(i, animate = true) {
    active = i;
    itemEls.forEach((el, idx) => el.classList.toggle('c-navwheel__item--active', idx === i));
    onChange(items[i]);
    if (animate) animateScrollTo(scrollTopForCenter(i, itemH, GAP, viewH()) + CONTENT_TOP);
  }
  function animateScrollTo(target) {
    const start = list.scrollTop, diff = target - start;
    if (diff === 0) return; // 已在目标位，无需动画
    const dur = parseFloat(getComputedStyle(root).getPropertyValue('--dur-base')) || 200;
    const curve = getComputedStyle(root).getPropertyValue('--ease-spring');
    const t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = curve.startsWith('cubic-bezier')
        ? cubicBezierY(curve, t) : t;
      list.scrollTop = start + diff * eased;
      setFocal();
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  list.addEventListener('scroll', onScroll);
  list.addEventListener('click', (e) => {
    const el = e.target.closest('.c-navwheel__item'); if (!el) return;
    select(Number(el.dataset.index));
  });
  itemEls.forEach((el) => el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { select(Math.min(items.length - 1, active + 1)); }
    if (e.key === 'ArrowUp') { select(Math.max(0, active - 1)); }
  }));
  setFocal();
  return { setActive: (id) => select(items.findIndex(it => it.id === id), false) };
}

// cubic-bezier 求值：解析 --ease-spring 曲线，对输入 t ∈ [0,1] 用二分求 x(u)=t 的 u，再返回 y(u)
function cubicBezierY(cssCurve, t) {
  const m = cssCurve.match(/cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  if (!m) return t;
  const [x1, y1, x2, y2] = [1, 2, 3, 4].map((i) => parseFloat(m[i]));
  const bez = (a, b, c, d, u) =>
    a * (1 - u) ** 3 + 3 * b * (1 - u) ** 2 * u + 3 * c * (1 - u) * u * u + d * u ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const u = (lo + hi) / 2;
    if (bez(0, x1, x2, 1, u) < t) lo = u; else hi = u;
  }
  return bez(0, y1, y2, 1, (lo + hi) / 2);
}
