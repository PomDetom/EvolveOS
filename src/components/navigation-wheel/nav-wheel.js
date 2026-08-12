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
    <div class="c-navwheel__item${i === 0 ? ' c-navwheel__item--active' : ''}" data-id="${it.id}" data-index="${i}" role="button" tabindex="0">
      <span class="c-navwheel__icon">${icon(it.icon, i === 0 ? 24 : 20, i === 0 ? 2.2 : 1.8)}</span>
      <span class="c-navwheel__name">${it.name}</span>
    </div>`).join('');
  // 空列表早返回（0.1.2 Final Fix Important 2）：items=[] 时访问 itemEls[0] →
  // getComputedStyle(undefined) TypeError（病态配置 nav.hidden 覆盖全部入口 → MODULES=[]，
  // 冷启动挂空轮即崩）。早返回不渲染/不碰几何与监听器，返回 no-op 句柄保持宿主
  // setActive/scrollToIndex/destroy 调用安全（各重挂路径 destroy?.() 幂等）。
  if (items.length === 0) return { setActive: () => {}, scrollToIndex: () => {}, destroy: () => {} };
  // B2-R8：顶部/底部内容遮罩改用 CSS mask-image（nav-wheel.css 竖向列表规则），
  // 不再插入叠加渐变 div —— 叠加层把导航栏自身 48% 半透明背景双倍着色洗白，
  // 与标题栏割裂成色带。横向 dock 无竖向遮罩需求，列表规则以 :not(--horizontal) 排除。
  const itemEls = [...list.children];
  const itemH = parseFloat(getComputedStyle(itemEls[0])[AXIS.size]);
  // 项上边距（6px = --navwheel-gap/2）：offsetTop 含 margin，pad 须同样扣除，
  // 否则首/末项中心初始偏下 6px（最终审查 B；CSS 兜底 calc(38.2% - 32px) 已同步修正）
  const marginTop = parseFloat(getComputedStyle(itemEls[0])[AXIS.margin]);
  const viewLen = () => list[AXIS.len];
  // 精确首尾 padding：使首/末项能滚到主轴锚线（38.2%）。锚点非居中 → 上/下 padding 非对称：
  // 首项对齐 viewportLen*anchorRatio，末项对齐 viewportLen*(1-anchorRatio)；anchorRatio=0.5 时
  // 二者相等 = 旧中心语义（CSS calc(38.2% - 32px) 相对宽度，实测值才正确）
  let CONTENT_TOP = itemEls[0][AXIS.offset];
  let active = 0, raf = 0;

  // B6-R2-3：容器尺寸变化（窗口 resize / 手机↔桌面 900px 跨越 / 任意尺寸变化）后
  // 几何 padding 与 CONTENT_TOP 必须重算 —— 否则首/末项锚线失准，选中跳到相邻项。
  // 根因：原实现只在 mount 算一次 pad；≤900px 手机形态加载时左窗 display:none →
  // clientHeight=0 → pad=0，拉宽后 pad 陈旧 → 锚线数学断裂。
  // ResizeObserver 观察 list（position:absolute; inset 铺满容器 → clientHeight=容器高；
  // 改 padding 不改变自身 clientHeight，无观测循环；display:none→可见亦触发）。
  function recomputeGeometry() {
    const vlen = viewLen();
    const pt = Math.max(0, vlen * anchorRatio - itemH / 2 - marginTop);
    const pb = Math.max(0, vlen * (1 - anchorRatio) - itemH / 2 - marginTop);
    list.style[AXIS.padBefore] = `${pt}px`;
    list.style[AXIS.padAfter] = `${pb}px`;
    CONTENT_TOP = itemEls[0][AXIS.offset];
    setFocal();
  }
  recomputeGeometry();
  const ro = new ResizeObserver(recomputeGeometry);
  ro.observe(list);

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
  // B2-3 图标分级：active 项 24px/2.2 加粗、非 active 20px/1.8（icon(name, size, stroke) 第三参）。
  // 分级落地为「原地改 svg 宽高/粗细属性」而非替换 .c-navwheel__icon innerHTML —— 在 pointerup
  // 内同步替换会移除 mousedown 目标，Chromium 将抑制后续 click 派发（实测），破坏依赖 click 的
  // 宿主行为（应用壳 dock 推入/左窗 toggle 靠 click 收尾）。尺寸变化是静态重渲染，绝不动 item
  // 上的 style.transform/opacity —— setFocal 逐字不变（动画红线）。
  function renderItemIcons(...indexes) {
    indexes.forEach((idx) => {
      if (idx < 0 || idx >= itemEls.length) return;
      const el = itemEls[idx];
      const isActive = el.classList.contains('c-navwheel__item--active');
      const svg = el.querySelector('.c-navwheel__icon svg');
      svg.setAttribute('width', isActive ? 24 : 20);
      svg.setAttribute('height', isActive ? 24 : 20);
      svg.setAttribute('stroke-width', isActive ? 2.2 : 1.8);
    });
  }
  function select(i, animate = true) {
    const prev = active; // 捕获旧 active，供切换后对前后两项重渲染图标分级
    active = i;
    itemEls.forEach((el, idx) => el.classList.toggle('c-navwheel__item--active', idx === i));
    renderItemIcons(prev, i);
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
  // click/pointer 处理器抽具名（0.1.2 Final Fix Critical 1）：destroy 需按引用移除 —— 否则
  // 同一持久 list 重挂（rebuildNav / mountDock(true)）时旧监听器残留，N 次重配 = N 套监听器
  // （拖拽灵敏度 N×、pointerup 惯性多套 rAF 混沌、旧 handler 用陈旧 items 冗余 setModule）。
  const onClick = (e) => {
    const el = e.target.closest('.c-navwheel__item'); if (!el) return;
    select(Number(el.dataset.index));
  };
  list.addEventListener('click', onClick);
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
  const onPointerDown = (e) => {
    // 只响应主键（左键 0）：右键/中键不进入拖拽/点击选择（Task 12 收尾守卫）
    if (e.button !== 0) return;
    // 抓取/点击都打断惯性或待吸附，避免吸附跳到新位置
    cancelAnimationFrame(inertiaRaf);
    clearTimeout(snapTimer);
    pointerId = e.pointerId; lastPos = e[AXIS.pointer]; lastT = performance.now(); moved = 0;
    velocity = 0; // EMA 首样本直接采用（见 pointermove）
    downItem = e.target.closest('.c-navwheel__item'); // 点击回退目标（位移 < 5px 视为点击）
    list.setPointerCapture(e.pointerId); // 拖出列表仍持续接收 pointermove
  };
  const onPointerMove = (e) => {
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
  };
  const onPointerUp = (e) => {
    if (e.pointerId !== pointerId || e.button !== 0) return;
    pointerId = null;
    // 位移 < 5px = 点击：指针捕获使原生 click 落在 list 上（target=list，找不到项），
    // 这里手动复刻「点项选中 + 锚定」，与 Task 11 点击行为一致
    if (moved <= 5 && downItem) { select(Number(downItem.dataset.index)); return; }
    if (moved > 5 && Math.abs(velocity) > 0.3) startInertia();
    else scheduleSnap();
  };
  const onPointerCancel = () => {
    if (pointerId === null) return;
    pointerId = null;
    cancelAnimationFrame(inertiaRaf);
    scheduleSnap();
  };
  list.addEventListener('pointerdown', onPointerDown);
  list.addEventListener('pointermove', onPointerMove);
  list.addEventListener('pointerup', onPointerUp);
  list.addEventListener('pointercancel', onPointerCancel);

  setFocal();
  return {
    setActive: (id) => {
      const i = items.findIndex(it => it.id === id);
      if (i < 0) return; // 未知名 id 不选中，避免 onChange 收到 undefined 崩溃
      select(i, false);
    },
    // 对外：场景模板按索引滚动选中（含锚定动画），越界 clamp
    scrollToIndex: (i) => select(Math.max(0, Math.min(items.length - 1, i))),
    // 完全销毁（0.1.2 Final Fix Critical 1）：同一持久 list 重挂（rebuildNav /
    // mountDock(true)）前必须移除全部 DOM 监听器 + 取消挂起动画 —— 否则 N 次重配 = N 套
    // 监听器（左窗/dock 拖拽灵敏度 N×、pointerup 惯性多套 rAF 混沌、旧 handler 用陈旧
    // items 冗余 setModule）。右窗路径 destroy 后重挂新容器 = 干净；左窗/dock 路径
    // destroy 后同一容器重挂 = 干净。空列表 no-op 句柄的 destroy 幂等（无监听器可移除）。
    destroy: () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(inertiaRaf);
      clearTimeout(snapTimer);
      list.removeEventListener('scroll', onScroll);
      list.removeEventListener('click', onClick);
      list.removeEventListener('pointerdown', onPointerDown);
      list.removeEventListener('pointermove', onPointerMove);
      list.removeEventListener('pointerup', onPointerUp);
      list.removeEventListener('pointercancel', onPointerCancel);
      ro.disconnect();
    },
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
