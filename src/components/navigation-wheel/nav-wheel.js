// NavigationWheel：滚动 focal 变形 + 点击居中吸附 + 键盘选择（A，Task 11）
// + 拖拽惯性 + 跟手变形 + 居中吸附 + 设置入口（B，Task 12）
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
    const durRaw = parseFloat(getComputedStyle(root).getPropertyValue('--dur-base'));
    // reduced-motion（--dur-base: 0ms）→ 直接跳转；|| 200 只兜底未定义，不能把 0 兜成 200ms
    if (durRaw === 0) { list.scrollTop = target; setFocal(); return; }
    const dur = durRaw || 200;
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
    // preventDefault：阻止方向键触发容器的原生滚动，与居中动画竞争
    if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(items.length - 1, active + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, active - 1)); }
  }));

  // —— 拖拽 + 惯性 + 居中吸附（Task 12 B 部分）——
  // 坐标约定：几何函数用「内容坐标」（不含容器 padding/margin），list.scrollTop 是原始坐标，
  // 二者差 CONTENT_TOP。吸附路径统一传补偿坐标（list.scrollTop - CONTENT_TOP）——
  // 与 scrollTopForCenter/select 同系，findNearestIndex 公式才精确（见 nav-wheel-geometry.js 注释）。
  let pointerId = null, lastY = 0, velocity = 0, lastT = 0,
      inertiaRaf = 0, moved = 0, snapTimer = 0, downItem = null;

  function scheduleSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const s = list.scrollTop - CONTENT_TOP; // 补偿坐标
      const i = findNearestIndex(s, itemEls.length, itemH, GAP, viewH());
      const target = scrollTopForCenter(i, itemH, GAP, viewH()) + CONTENT_TOP;
      if (list.scrollTop !== target) list.scrollTop = target; // 无动画直接吸附（跳变，合成器无感）
      select(i, false);
    }, 150);
  }
  function startInertia() {
    cancelAnimationFrame(inertiaRaf);
    (function tick() {
      list.scrollTop += velocity * 16;
      velocity *= 0.95;
      setFocal();
      if (Math.abs(velocity) > 0.05) inertiaRaf = requestAnimationFrame(tick);
      else scheduleSnap();
    })();
  }
  list.addEventListener('pointerdown', (e) => {
    // 抓取/点击都打断惯性或待吸附，避免吸附跳到新位置
    cancelAnimationFrame(inertiaRaf);
    clearTimeout(snapTimer);
    pointerId = e.pointerId; lastY = e.clientY; lastT = performance.now(); moved = 0;
    downItem = e.target.closest('.c-navwheel__item'); // 点击回退目标（位移 < 5px 视为点击）
    list.setPointerCapture(e.pointerId); // 拖出列表仍持续接收 pointermove
  });
  list.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const dy = e.clientY - lastY;
    lastY = e.clientY;
    const now = performance.now();
    // 速度取滚动增量方向（-dy）：向上拖（dy<0）→ scrollTop 增 → 惯性继续正向滚动；
    // 若沿用指针方向（dy），惯性会把刚拖出的位移打回原点（方向相反）
    velocity = -dy / Math.max(1, now - lastT); lastT = now;
    list.scrollTop -= dy; moved += Math.abs(dy);
    setFocal(); // 实时跟手变形
  });
  list.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    // 位移 < 5px = 点击：指针捕获使原生 click 落在 list 上（target=list，找不到项），
    // 这里手动复刻「点项选中 + 居中」，与 Task 11 点击行为一致
    if (moved <= 5 && downItem) { select(Number(downItem.dataset.index)); return; }
    if (moved > 5 && Math.abs(velocity) > 0.3) startInertia();
    else scheduleSnap();
  });
  list.addEventListener('pointercancel', () => {
    if (pointerId === null) return;
    pointerId = null;
    cancelAnimationFrame(inertiaRaf);
    scheduleSnap();
  });

  setFocal();
  return {
    setActive: (id) => {
      const i = items.findIndex(it => it.id === id);
      if (i < 0) return; // 未知名 id 不选中，避免 onChange 收到 undefined 崩溃
      select(i, false);
    },
    // 对外：场景模板按索引滚动选中（含居中动画），越界 clamp
    scrollToIndex: (i) => select(Math.max(0, Math.min(items.length - 1, i))),
  };
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
