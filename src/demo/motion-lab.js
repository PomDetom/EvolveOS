// 自身 import 本模块 CSS（Task B1-1 内化）：Vite 按模块去重，docs 静态引用与 app 动态 chunk 双引无害。
import '../styles/motion-lab.css';
import { icon } from '../components/icon/icon.js';
import { springCurve } from '../motion/spring.js';
import { getConfig, subscribe } from '../config/store.js';

/**
 * 动效实验室（Task 16）：5 个动效演示卡 + 参数试玩器 + 重播。
 *
 * 契约：
 * - 每卡 .ml-card 内：.ml-stage（演示舞台）/ .ml-controls（试玩器）/ .ml-slider（弹性、位移滑杆）/ .ml-replay（重播）
 * - 试玩器把局部 CSS 变量写到 .ml-card（--dur-base / --ease-spring / --lift），不碰全局
 * - 重播 = clone 演示根元素（.ml-demo）替换舞台节点，动画从头播放
 * - 联动：mount 时读 getConfig() 的 durationScale/springStrength 作初始值；
 *   subscribe 定制器变化同步滑杆位置与局部变量（不重渲染 DOM，rAF/动画不中断）
 * - 动画红线：全部 keyframes 只动 transform/opacity；stagger 用 animation-delay 40ms 递增
 */

const BASE_DUR = 200; // ms，对应令牌 --dur-base 基准（×定制器 durationScale ×试玩器倍率）
const STAGGER_STEP = 40; // ms，stagger 相邻间隔（红线：40ms 递增）

const DEMOS = [
  {
    id: 'pop', title: '面板呼出', lift: 8,
    desc: 'scale 0.96 · 上浮 · 淡入（spring）',
    stage: `
      <div class="ml-demo ml-pop ml-anim ml-anim--running">
        <div class="ml-pop__dots"><i class="ml-pop__dot"></i><i class="ml-pop__dot"></i><i class="ml-pop__dot"></i></div>
        <div class="ml-pop__line"></div>
        <div class="ml-pop__line ml-pop__line--short"></div>
      </div>`,
  },
  {
    id: 'hover', title: 'hover 提升', lift: 1,
    desc: '悬停上浮 + 顶部高光（位移即提升距离）',
    stage: `
      <div class="ml-demo ml-hover ml-anim ml-anim--running">
        ${icon('star')}<span class="ml-hover__text">悬停我 · 看提升</span>
      </div>`,
  },
  {
    id: 'stagger', title: '列表 stagger', lift: 8,
    desc: '5 项 · 相邻 40ms 延迟入场',
    stage: `
      <div class="ml-demo ml-stagger">
        ${[0, 1, 2, 3, 4].map((i) =>
          `<div class="ml-stagger__item ml-anim ml-anim--running" style="--i: ${i}"><span></span></div>`).join('')}
      </div>`,
  },
  {
    id: 'switch', title: '开关 thumb', lift: 16,
    desc: 'thumb 弹簧滑入开位（位移即行程）',
    stage: `
      <div class="ml-demo ml-switch">
        <span class="ml-switch__track"><i class="ml-switch__thumb ml-anim ml-anim--running"></i></span>
        <span class="ml-switch__label">开关</span>
      </div>`,
  },
  {
    id: 'badge', title: '徽标弹出', lift: 6,
    desc: 'scale 0 → 1 弹出（spring）',
    stage: `
      <div class="ml-demo ml-badge ml-anim ml-anim--running">
        ${icon('bell')}新消息
      </div>`,
  },
];

const DUR_OPTIONS = [0.5, 1, 2];

function controls(cfg, liftDefault) {
  return `
    <div class="ml-controls">
      <div class="ml-control">
        <span class="ml-control__label">时长</span>
        <div class="ml-durs" role="group" aria-label="时长倍率">
          ${DUR_OPTIONS.map((s) =>
            `<button type="button" class="ml-dur${s === 1 ? ' is-active' : ''}" data-dur="${s}">${s}×</button>`).join('')}
        </div>
        <output class="ml-out" data-out="dur" aria-label="实际时长"></output>
      </div>
      <label class="ml-control">
        <span class="ml-control__label">弹性</span>
        <input class="ml-slider" type="range" min="0" max="1" step="0.05"
          value="${cfg.motion.springStrength}" aria-label="弹性强度">
        <output class="ml-out" data-out="spring"></output>
      </label>
      <label class="ml-control">
        <span class="ml-control__label">位移</span>
        <input class="ml-slider" type="range" min="0" max="24" step="1"
          value="${liftDefault}" data-lift aria-label="位移距离">
        <output class="ml-out" data-out="lift"></output><span class="ml-unit">px</span>
      </label>
      <button type="button" class="ml-replay">${icon('refresh', 14)}重播</button>
    </div>`;
}

function card(d, cfg) {
  return `
    <article class="ml-card" data-demo="${d.id}">
      <h3 class="ml-card__title">${d.title}</h3>
      <p class="ml-card__desc">${d.desc}</p>
      <div class="ml-stage">${d.stage}</div>
      ${controls(cfg, d.lift)}
    </article>`;
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 把试玩器当前状态写成本卡局部 CSS 变量（--dur-base / --ease-spring / --lift），
 * 并刷新时长输出。全局参数（durationScale/springStrength）来自 cfg ——
 * 事件回调里传 getConfig() 取最新值，subscribe 回调里传 next。
 */
function applyParams(card, cfg, springSlider, liftSlider, durBtn) {
  const scale = Number(durBtn?.dataset.dur ?? 1);
  const enabled = cfg.motion.enabled && !prefersReducedMotion();
  const dur = Math.round(BASE_DUR * cfg.motion.durationScale * scale);
  card.style.setProperty('--dur-base', enabled ? `${dur}ms` : '0ms');
  // stagger 步进随动效开关归零（评审 Important 1：reduced-motion/motion off 下
  // fill-mode both 会让延迟期间停留在 opacity 0，5 项仍逐项弹出 —— 必须同步归零）
  card.style.setProperty('--stagger-step', enabled ? `${STAGGER_STEP}ms` : '0ms');
  card.style.setProperty('--ease-spring', springCurve(Number(springSlider.value)));
  card.style.setProperty('--lift', `${liftSlider.value}px`);
  const outDur = card.querySelector('[data-out="dur"]');
  if (outDur) outDur.textContent = `${dur}ms`;
  const outSpring = card.querySelector('[data-out="spring"]');
  if (outSpring) outSpring.textContent = Number(springSlider.value).toFixed(2);
  const outLift = card.querySelector('[data-out="lift"]');
  if (outLift) outLift.textContent = liftSlider.value;
}

/** 重播：clone 舞台中的演示根元素替换原节点 —— 全新节点插入，动画从头播放 */
function replay(stage) {
  const demo = stage.querySelector('.ml-demo');
  if (!demo) return;
  const clone = demo.cloneNode(true);
  stage.replaceChild(clone, demo);
}

export function mountMotionLab(root) {
  const cfg = getConfig();
  root.innerHTML = `
    <h2>动效实验室</h2>
    <p class="ml-lead">5 个动效演示 · 试玩器只改本卡参数 · 全局设置跟随定制器</p>
    <div class="ml-grid">
      ${DEMOS.map((d) => card(d, cfg)).join('')}
    </div>`;

  const cards = [...root.querySelectorAll('.ml-card')];
  cards.forEach((card) => {
    const stage = card.querySelector('.ml-stage');
    const springSlider = card.querySelector('.ml-slider'); // DOM 顺序第一个 range = 弹性
    const liftSlider = card.querySelector('[data-lift]');
    const durs = [...card.querySelectorAll('.ml-dur')];

    const apply = () =>
      applyParams(card, getConfig(), springSlider, liftSlider, card.querySelector('.ml-dur.is-active'));

    durs.forEach((btn) => btn.addEventListener('click', () => {
      durs.forEach((b) => b.classList.toggle('is-active', b === btn));
      apply();
    }));
    springSlider.addEventListener('input', apply);
    liftSlider.addEventListener('input', apply);
    card.querySelector('.ml-replay').addEventListener('click', () => replay(stage));
    apply(); // 初始值 → 局部变量（含定制器 durationScale/springStrength 联动）
  });

  // 联动：定制器全局参数变化 → 同步滑杆位置与局部变量（不重渲染 DOM，动画不中断）
  subscribe((next) => {
    cards.forEach((card) => {
      card.querySelector('.ml-slider').value = String(next.motion.springStrength);
      applyParams(card, next, card.querySelector('.ml-slider'), card.querySelector('[data-lift]'), card.querySelector('.ml-dur.is-active'));
    });
  });
}
