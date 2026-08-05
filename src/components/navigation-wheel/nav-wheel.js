// NavigationWheel：滚动 focal 变形 + 点击锚定吸附 + 键盘选择（A，Task 11）
// + 拖拽惯性 + 跟手变形 + 锚定吸附 + 设置入口（B，Task 12）
// Task A2：选中锚点从 50% 中心改为 38.2% 黄金比例（anchorRatio 默认 0.382），并加主轴方向参数化
// （direction: 'vertical' | 'horizontal'；horizontal 供 Task A6 手机底部横滑栏）。
// 只动 transform/opacity（合成器友好）；滚动由原生 overflow-{x,y}:auto + scroll/rAF 驱动。
// 几何/渲染/滚动沿主轴：direction 只切换轴属性（scrollTop↔scrollLeft、clientHeight↔clientWidth、
// translateY↔translateX、offsetTop↔offsetLeft、paddingTop/Bottom↔paddingLeft/Right、clientY↔clientX），
// 公式复用同一套纯函数（nav-wheel-geometry.js，方向无关，等价性由单测覆盖）。
import { icon } from '../icon/icon.js';
import { anchorY, scrollTopForAnchor, findNearestIndex, focalScale, focalOpacity }
  from './nav-wheel-geometry.js';

const GAP = 12; // 与 :root --navwheel-gap 一致（几何约定；itemH 按实测读取）

export function mountNavWheel(root, { items, onChange = () => {}, anchorRatio = 0.382, direction = 'vertical' } = {}) {
  // 主轴抽象：同一套几何/交互按 direction 落到横或纵轴（vertical 默认，行为与旧实现一致）
  const AXIS = direction === 'horizontal'
    ? { size: 'width', margin: 'marginLeft', len: 'clientWidth', scroll: 'scrollLeft',
        offset: 'offsetLeft', translate: 'translateX', padBefore: 'paddingLeft', padAfter: 'paddingRight',
        pointer: 'clientX', prev: 'ArrowLeft', next: 'ArrowRight' }
    : { size: 'height', margin: 'marginTop', len: 'clientHeight', scroll: 'scrollTop',
        offset: 'offsetTop', translate: 'translateY', padBefore: 'paddingTop', padAfter: 'paddingBottom',
        pointer: 'clientY', prev: 'ArrowUp', next: 'ArrowDown' };

  const list = root.querySelector('.c-navwheel__list') ?? root;
  // Task A6（闭环 A2 Minor ①）：horizontal 渲染层 —— 列表根加方向类，CSS 走独立横排规则
  // （flex row / overflow-x / 主轴半间距 6px / touch-action pan-y）；vertical 默认无类，逐字节等价
  if (direction === 'horizontal') list.classList.add('c-navwheel__list--horizontal');
  list.innerHTML = items.map((it, i) => `
    <div class="c-navwheel__item" data-id="${it.id}" data-index="${i}" role="button" tabindex="0">
      <div class="c-navwheel__glow"></div>
      <span class="c-navwheel__icon">${icon(it.icon, 22)}</span>
      <span class="c-navwheel__name">${it.name}</span>
    </div>`).join('');
  // 顶部/底部渐变遮罩：列表 overflow:auto 内绝对定位会随内容滚动，故挂到
  // .navwheel（position:relative，见 layout.css）下、位于列表之上（vertical 专用，
  // horizontal 由 A6 接管：横排无竖向遮罩，跳过插入）
  const holder = root.closest('.navwheel') ?? root.parentElement;
  if (direction !== 'horizontal' && holder && !holder.querySelector('.c-navwheel__mask')) {
    holder.insertAdjacentHTML('beforeend',
      '<div class="c-navwheel__mask"></div><div class="c-navwheel__mask c-navwheel__mask--bottom"></div>');
  }
  const itemEls = [...list.children];
  const itemH = parseFloat(getComputedStyle(itemEls[0])[AXIS.size]);
  // 项上边距（6px = --navwheel-gap/2）：offsetTop 含 margin，pad 须同样扣除，
  // 否则首/末项中心初始偏下 6px（最终审查 B；CSS 兜底 calc(38.2% - 32px) 已同步修正）
  const marginTop = parseFloat(getComputedStyle(itemEls[0])[AXIS.margin]);
  const viewLen = () => list[AXIS.len];
  // 精确首尾 padding：使首/末项能滚到主轴锚线（38.2%）。锚点非居中 → 上/下 padding 非对称：
  // 首项对齐 viewportLen*anchorRatio，末项对齐 viewportLen*(1-anchorRatio)；anchorRatio=0.5 时
  // 二者相等 = 旧中心语义（CSS calc(38.2% - 32px) 相对宽度，实测值才正确）
  const padTop = Math.max(0, viewLen() * anchorRatio - itemH / 2 - marginTop);
  const padBottom = Math.max(0, viewLen() * (1 - anchorRatio) - itemH / 2 - marginTop);
  list.style[AXIS.padBefore] = `${padTop}px`;
  list.style[AXIS.padAfter] = `${padBottom}px`;
  // 内容起点偏移 = 首项 offsetTop（padding + margin，布局实测），保证几何公式与 CSS 一致
  const CONTENT_TOP = itemEls[0][AXIS.offset];
  let active = 0, raf = 0;

  // —— 拖拽 + 惯性 + 锚定吸附（Task 12 B 部分 + 最终审查 A：滚轮停止吸附）——
  // 坐标约定：几何函数用「内容坐标」（不含容器 padding/margin），list.scrollTop 是原始坐标，
  // 二者差 CONTENT_TOP。吸附路径统一传补偿坐标（list.scrollTop - CONTENT_TOP）——
  // 与 scrollTopForAnchor/select 同系，findNearestIndex 公式才精确（见 nav-wheel-geometry.js 注释）。
  let pointerId = null, lastPos = 0, velocity = 0, lastT = 0,
      inertiaRaf = 0, moved = 0, snapTimer = 0, downItem = null;

  // 吸附本体：最近项锚定 + 选中。守卫——位置已在精确锚点且该项已选中
  // （click/键盘/程序化选中的锚定动画产物，误差 <1e-9px；或 snapNow 自身吸附后的回环）
  // → 跳过，避免 onScroll debounce 对每次选中补发重复 onChange。
  function snapNow() {
    const s = list[AXIS.scroll] - CONTENT_TOP; // 补偿坐标
    const i = findNearestIndex(s, itemEls.length, itemH, GAP, viewLen(), anchorRatio);
    const target = scrollTopForAnchor(i, itemH, GAP, viewLen(), anchorRatio) + CONTENT_TOP;
    if (itemEls[i].classList.contains('c-navwheel__item--active')
        && Math.abs(list[AXIS.scroll] - target) < 0.05) return;
    if (list[AXIS.scroll] !== target) list[AXIS.scroll] = target; // 无动画直接吸附（跳变，合成器无感）
    select(i, false);
  }
  // 150ms 后吸附。拖拽路径（pointerup/惯性结束/pointercancel）与滚轮路径
  // （onScroll debounce）复用同一计时器：clearTimeout 即 debounce，二者永不叠加
  function scheduleSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snapNow, 150);
  }
  function setFocal() {
    const st = list[AXIS.scroll];
    const vl = viewLen();
    itemEls.forEach((el, i) => {
      // offset 相对主轴锚线（不再是视口中心）：峰值在锚点（38.2%）处
      const offset = anchorY(i, itemH, GAP) + CONTENT_TOP - st - vl * anchorRatio;
      el.style.transform = `${AXIS.translate}(${offset * 0.06}px) scale(${focalScale(offset, vl)})`;
      el.style.opacity = String(focalOpacity(offset, vl));
    });
  }
  function onScroll() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(setFocal);
    // 滚动停止 150ms → 吸附并选中最近项（规格 §8.3：滚轮停在两项之间时不得悬置）。
    // 拖拽中（pointerId 非空）跳过：吸附由 pointerup/惯性/pointercancel 接管，
    // 且慢拖拽停顿 >150ms 时不会中途吸附与手指打架；pointerdown 已清掉滚轮残留定时器。
    if (pointerId !== null) return;
    scheduleSnap();
  }
  function select(i, animate = true) {
    active = i;
    itemEls.forEach((el, idx) => el.classList.toggle('c-navwheel__item--active', idx === i));
    onChange(items[i]);
    if (animate) animateScrollTo(scrollTopForAnchor(i, itemH, GAP, viewLen(), anchorRatio) + CONTENT_TOP);
  }
  function animateScrollTo(target) {
    const start = list[AXIS.scroll], diff = target - start;
    if (diff === 0) return; // 已在目标位，无需动画
    const durRaw = parseFloat(getComputedStyle(root).getPropertyValue('--dur-base'));
    // reduced-motion（--dur-base: 0ms）→ 直接跳转；|| 200 只兜底未定义，不能把 0 兜成 200ms
    if (durRaw === 0) { list[AXIS.scroll] = target; setFocal(); return; }
    const dur = durRaw || 200;
    const curve = getComputedStyle(root).getPropertyValue('--ease-spring');
    const t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = curve.startsWith('cubic-bezier')
        ? cubicBezierY(curve, t) : t;
      list[AXIS.scroll] = start + diff * eased;
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
    // preventDefault：阻止方向键触发容器的原生滚动，与锚定动画竞争
    if (e.key === AXIS.next) { e.preventDefault(); select(Math.min(items.length - 1, active + 1)); }
    if (e.key === AXIS.prev) { e.preventDefault(); select(Math.max(0, active - 1)); }
  }));

  function startInertia() {
    cancelAnimationFrame(inertiaRaf);
    (function tick() {
      list[AXIS.scroll] += velocity * 16;
      velocity *= 0.95;
      setFocal();
      if (Math.abs(velocity) > 0.05) inertiaRaf = requestAnimationFrame(tick);
      else scheduleSnap();
    })();
  }
  list.addEventListener('pointerdown', (e) => {
    // 只响应主键（左键 0）：右键/中键不进入拖拽/点击选择（Task 12 收尾守卫）
    if (e.button !== 0) return;
    // 抓取/点击都打断惯性或待吸附，避免吸附跳到新位置
    cancelAnimationFrame(inertiaRaf);
    clearTimeout(snapTimer);
    pointerId = e.pointerId; lastPos = e[AXIS.pointer]; lastT = performance.now(); moved = 0;
    velocity = 0; // EMA 首样本直接采用（见 pointermove）
    downItem = e.target.closest('.c-navwheel__item'); // 点击回退目标（位移 < 5px 视为点击）
    list.setPointerCapture(e.pointerId); // 拖出列表仍持续接收 pointermove
  });
  list.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const dPos = e[AXIS.pointer] - lastPos;
    lastPos = e[AXIS.pointer];
    const now = performance.now();
    // 速度取滚动增量方向（-dPos）：沿主轴反向拖（dPos<0）→ 滚动增量增 → 惯性继续正向滚动；
    // 若沿用指针方向（dPos），惯性会把刚拖出的位移打回原点（方向相反）
    // Task I3 4g：单样本导数一甩到底/抖振 → EMA 平滑（首样本直接采用，之后 0.3 新样本权重），
    // 慢速微抖不再产生虚假高初速惯性，快速甩动仍保留惯性（拖拽 e2e 回归确认）
    const sample = -dPos / Math.max(1, now - lastT);
    velocity = velocity === 0 ? sample : velocity * 0.7 + sample * 0.3; lastT = now;
    list[AXIS.scroll] -= dPos; moved += Math.abs(dPos);
    setFocal(); // 实时跟手变形
  });
  list.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId || e.button !== 0) return;
    pointerId = null;
    // 位移 < 5px = 点击：指针捕获使原生 click 落在 list 上（target=list，找不到项），
    // 这里手动复刻「点项选中 + 锚定」，与 Task 11 点击行为一致
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
    // 对外：场景模板按索引滚动选中（含锚定动画），越界 clamp
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
