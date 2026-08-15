# 悬浮窗贴边收起 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tauri 悬浮窗支持贴边收起：半出屏先决校正 → 贴边空闲 1s 缓收起 → 边缘小把手形态 → hover 弹回。

**Architecture:** 纯函数几何层（`src/app/strip-edge.js`，物理像素判定边缘/溢出/收起目标）+ `strip-main.js` 编排（状态机 free/docked/collapsed + rAF tween `setPosition` + 1s 计时 + `onMoved` 去抖评估 + hover 触发）。窗口位移全走 OS 层 `setPosition`，不触 CSS 动画红线。

**Tech Stack:** 零依赖原生 JS；Tauri 2.11（`window`/`screen` 全局 API）；Vitest 单测 + Playwright e2e（web 环境，mock `__TAURI__`）。

**Spec:** `docs/superpowers/specs/2026-08-15-strip-edge-collapse-design.md`

## Global Constraints

- 零运行时依赖、零框架（AGENTS.md）；禁止引入 npm 依赖。
- 坐标口径：窗口 `outerPosition`/`outerSize` 与 `screen.currentMonitor()` 均为物理像素。
- 权限：`core:screen:allow-current-monitor` + `core:window:allow-outer-size` 加入 `src-tauri/capabilities/default.json`（缺失会被 `.catch` 吞错 = 静默失效）。
- 动画红线：位移走 `setPosition`（OS 层）；CSS 只动 `transform`/`opacity`，grip 旋转是静态类切换非动画；时长走 CSS 变量 `--strip-dur-collapse`，`data-motion="off"` / reduced-motion 时归零。
- TDD：每任务 红→绿→提交；提交信息中文、前缀。
- 测试仅 Web 环境；Tauri 真机行为（真实 setPosition 滑出屏 / monitor bounds / 屏外 hover）标注待 `npm run tauri:dev`。
- `ui/*` 框架改动：分支 `ui/strip-edge-collapse`（已建），改完经 `npm run merge-to-dev` 合并 + 框架 owner 评审。

---

### Task 1: 贴边几何纯函数（strip-edge.js）

**Files:**
- Create: `src/app/strip-edge.js`
- Test: `tests/unit/strip-edge.test.js`

**Interfaces:**
- Produces: `DOCK_TOLERANCE=0`、`SLIVER=20`、`edgeDistances(rect, monitor)`、`detectOverflow(rect, monitor)`、`primaryOverflow(rect, monitor)`、`computeCorrectionTarget(rect, monitor)`、`resolveDock(rect, monitor, tolerance?)`、`computeCollapseTarget(pos, size, monitor, edge, sliver?)`、`gripDirection(edge)`
- rect/monitor 形状：`{ x, y, width, height }`（物理像素）；edge：`'top'|'bottom'|'left'|'right'`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/strip-edge.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  DOCK_TOLERANCE, SLIVER,
  edgeDistances, detectOverflow, primaryOverflow,
  computeCorrectionTarget, resolveDock, computeCollapseTarget, gripDirection,
} from '../../src/app/strip-edge.js';

const MON = { x: 0, y: 0, width: 1280, height: 720 };

describe('strip-edge 贴边几何（物理像素口径）', () => {
  it('edgeDistances：窗口位于 monitor 内时四边距离为正', () => {
    expect(edgeDistances({ x: 100, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ top: 100, bottom: 560, left: 100, right: 880 });
  });

  it('detectOverflow：溢出边检测', () => {
    expect(detectOverflow({ x: -50, y: -10, width: 300, height: 60 }, MON)).toEqual(['top', 'left']);
    expect(detectOverflow({ x: 100, y: 100, width: 300, height: 60 }, MON)).toEqual([]);
  });

  it('primaryOverflow：多边溢出取溢出最严重边', () => {
    expect(primaryOverflow({ x: -100, y: -10, width: 300, height: 60 }, MON)).toBe('left');
    expect(primaryOverflow({ x: 100, y: 100, width: 300, height: 60 }, MON)).toBeNull();
  });

  it('computeCorrectionTarget：溢出窗口拉回 monitor 内（贴边完整可见）', () => {
    expect(computeCorrectionTarget({ x: -100, y: -10, width: 300, height: 60 }, MON))
      .toEqual({ x: 0, y: 0 });
    expect(computeCorrectionTarget({ x: 1200, y: 700, width: 300, height: 60 }, MON))
      .toEqual({ x: 980, y: 660 });
    expect(computeCorrectionTarget({ x: 500, y: 300, width: 300, height: 60 }, MON))
      .toEqual({ x: 500, y: 300 });
  });

  it('resolveDock：贴靠边（精确贴齐或溢出校正）/ 溢出 / 居中', () => {
    expect(resolveDock({ x: 100, y: 660, width: 300, height: 60 }, MON))
      .toEqual({ edge: 'bottom', overflow: [] });
    expect(resolveDock({ x: 4, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ edge: null, overflow: [] });
    expect(resolveDock({ x: 0, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ edge: 'left', overflow: [] });
    expect(resolveDock({ x: -100, y: 100, width: 300, height: 60 }, MON))
      .toEqual({ edge: 'left', overflow: ['left'] });
    expect(resolveDock({ x: 500, y: 300, width: 300, height: 60 }, MON))
      .toEqual({ edge: null, overflow: [] });
  });

  it('computeCollapseTarget：各边滑出留 SLIVER=20', () => {
    const size = { width: 300, height: 60 };
    expect(computeCollapseTarget({ x: 100, y: 660 }, size, MON, 'bottom')).toEqual({ x: 100, y: 700 });
    expect(computeCollapseTarget({ x: 100, y: 0 }, size, MON, 'top')).toEqual({ x: 100, y: -40 });
    expect(computeCollapseTarget({ x: 0, y: 100 }, size, MON, 'left')).toEqual({ x: -280, y: 100 });
    expect(computeCollapseTarget({ x: 980, y: 100 }, size, MON, 'right')).toEqual({ x: 1260, y: 100 });
  });

  it('gripDirection：chevron 指向拉出方向（朝屏幕中心）', () => {
    expect(gripDirection('bottom')).toBe('up');
    expect(gripDirection('top')).toBe('down');
    expect(gripDirection('left')).toBe('right');
    expect(gripDirection('right')).toBe('left');
  });

  it('常量：DOCK_TOLERANCE=0、SLIVER=20', () => {
    expect(DOCK_TOLERANCE).toBe(0);
    expect(SLIVER).toBe(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/strip-edge.test.js`
Expected: FAIL（模块不存在 / import 解析失败）

- [ ] **Step 3: Write minimal implementation**

Create `src/app/strip-edge.js`:

```js
// 悬浮窗贴边收起几何（ui/strip-edge-collapse）：纯函数，可单测。
// 坐标口径：窗口 rect 与 monitor bounds 均为物理像素（outerPosition/outerSize 与 currentMonitor 一致）。
export const DOCK_TOLERANCE = 0; // 贴边判定阈值：0 = 仅精确贴齐（距离 0）；溢出经 computeCorrectionTarget 校正后同样贴齐；不做 6px 磁吸容差（用户口径）
export const SLIVER = 20;        // 收起后屏幕内可见窄条宽度（px）

export function edgeDistances(rect, monitor) {
  return {
    top: rect.y - monitor.y,
    bottom: (monitor.y + monitor.height) - (rect.y + rect.height),
    left: rect.x - monitor.x,
    right: (monitor.x + monitor.width) - (rect.x + rect.width),
  };
}

export function detectOverflow(rect, monitor) {
  const d = edgeDistances(rect, monitor);
  return ['top', 'bottom', 'left', 'right'].filter((e) => d[e] < 0);
}

export function primaryOverflow(rect, monitor) {
  const ov = detectOverflow(rect, monitor);
  if (!ov.length) return null;
  const d = edgeDistances(rect, monitor);
  return ov.reduce((a, b) => (d[a] < d[b] ? a : b));
}

export function computeCorrectionTarget(rect, monitor) {
  return {
    x: Math.min(Math.max(rect.x, monitor.x), monitor.x + monitor.width - rect.width),
    y: Math.min(Math.max(rect.y, monitor.y), monitor.y + monitor.height - rect.height),
  };
}

export function resolveDock(rect, monitor, tolerance = DOCK_TOLERANCE) {
  const overflow = detectOverflow(rect, monitor);
  if (overflow.length) return { edge: primaryOverflow(rect, monitor), overflow };
  const d = edgeDistances(rect, monitor);
  const near = ['top', 'bottom', 'left', 'right'].filter((e) => d[e] <= tolerance);
  if (!near.length) return { edge: null, overflow: [] };
  return { edge: near.reduce((a, b) => (d[a] < d[b] ? a : b)), overflow: [] };
}

export function computeCollapseTarget(pos, size, monitor, edge, sliver = SLIVER) {
  const { width: W, height: H } = size;
  switch (edge) {
    case 'bottom': return { x: pos.x, y: monitor.y + monitor.height - sliver };
    case 'top': return { x: pos.x, y: monitor.y + sliver - H };
    case 'left': return { x: monitor.x + sliver - W, y: pos.y };
    case 'right': return { x: monitor.x + monitor.width - sliver, y: pos.y };
    default: return { x: pos.x, y: pos.y };
  }
}

export function gripDirection(edge) {
  switch (edge) {
    case 'bottom': return 'up';
    case 'top': return 'down';
    case 'left': return 'right';
    case 'right': return 'left';
    default: return 'up';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/strip-edge.test.js`
Expected: PASS（全绿）

- [ ] **Step 5: Commit**

```bash
git add src/app/strip-edge.js tests/unit/strip-edge.test.js
git commit -m "feat: 悬浮窗贴边收起几何纯函数（边缘/溢出/收起目标/grip 方向，物理像素）"
```

---

### Task 2: capabilities 权限（screen + outer-size）

**Files:**
- Modify: `src-tauri/capabilities/default.json`
- Test: `tests/unit/window-capabilities.test.js`

**Interfaces:**
- Consumes: 无
- Produces: 权限 `core:screen:allow-current-monitor`、`core:window:allow-outer-size` 生效（Task 4 的 `screen.currentMonitor()` / `win.outerSize()` 不再被静默拒绝）

- [ ] **Step 1: Write the failing test**

In `tests/unit/window-capabilities.test.js`，第二个 `it('授权 strip 悬浮窗…')` 的 `required` 数组追加两项：

```js
    const required = [
      'core:window:allow-show',
      'core:window:allow-hide',
      'core:window:allow-get-all-windows',
      'core:window:allow-set-position',
      'core:window:allow-outer-position',
      'core:window:allow-outer-size',
      'core:window:allow-set-size',
      'core:window:allow-set-focus',
      'core:screen:allow-current-monitor',
    ];
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/window-capabilities.test.js`
Expected: FAIL（两个权限缺失）

- [ ] **Step 3: Implement**

在 `src-tauri/capabilities/default.json` 的 `permissions` 数组加两项（保持字母序位置）：

```json
    "core:window:allow-outer-position",
    "core:window:allow-outer-size",
```
以及
```json
    "core:screen:allow-current-monitor",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/window-capabilities.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/capabilities/default.json tests/unit/window-capabilities.test.js
git commit -m "feat: 悬浮窗贴边收起所需权限（core:screen:allow-current-monitor + core:window:allow-outer-size）"
```

---

### Task 3: grip 渲染 + 收起态样式（float-strip）

**Files:**
- Modify: `src/components/float-strip/float-strip.js`（`renderFloatStrip` 加 `collapsible` 选项）
- Modify: `src/components/float-strip/float-strip.css`（`.c-strip--collapsed` + `.c-strip__grip` + `--strip-dur-collapse`）
- Test: `tests/unit/float-strip.test.js`

**Interfaces:**
- Produces: `renderFloatStrip({ collapsible })` —— `collapsible:true` 时渲染 `<span class="c-strip__grip" aria-hidden="true">`（内含 `icon('chevron-up', 12)`）；CSS 类 `.c-strip--collapsed` + `data-dock-edge` 控制 grip 位置/方向；`--strip-dur-collapse`（500ms）供 Task 4 JS 读取
- Consumes: Task 4 在 `mountStripMode` 用 `collapsible:!!win` 渲染 + 设 `c-strip--collapsed` 类 / `data-dock-edge` 属性

- [ ] **Step 1: Write the failing test**

在 `tests/unit/float-strip.test.js` 的 `describe('renderFloatStrip')` 内追加：

```js
  it('collapsible:true → 渲染 grip（chevron，aria-hidden）；默认不渲染', () => {
    const html = renderFloatStrip({ content: '<i>x</i>', collapsible: true });
    expect(html).toContain('c-strip__grip');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('chevron-up');
    const no = renderFloatStrip({ content: '<i>x</i>' });
    expect(no).not.toContain('c-strip__grip');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/float-strip.test.js`
Expected: FAIL（`c-strip__grip` 未渲染）

- [ ] **Step 3: Implement**

`src/components/float-strip/float-strip.js` 的 `renderFloatStrip` 签名与模板：

```js
export function renderFloatStrip({ content = '', showJump = false, collapsible = false } = {}) {
  return `<div class="c-strip c-strip--horizontal" data-orientation="horizontal">
    ${collapsible ? `<span class="c-strip__grip" aria-hidden="true">${icon('chevron-up', 12)}</span>` : ''}
    <div class="c-strip__content">${content}</div>
    <div class="c-strip__ctrl" role="toolbar" aria-label="悬浮条控制">
      ${showJump ? `<button class="c-strip__jump" type="button" title="跳转到 TokenTool 余量页" aria-label="跳转到 TokenTool 余量页">${icon('bolt', 14)}</button>` : ''}
      <button class="c-strip__material" type="button" title="切换外观材质" aria-label="切换外观材质">${icon('layout', 14)}</button>
      <button class="c-strip__rotate" type="button" title="旋转" aria-label="旋转">${icon('refresh', 14)}</button>
      <button class="c-strip__close" type="button" title="关闭" aria-label="关闭">${icon('close', 14)}</button>
    </div>
  </div>`;
}
```

`src/components/float-strip/float-strip.css` 追加（放在 `.strip-root--window .c-strip--vertical` 规则后）：

```css
/* 贴边收起（ui/strip-edge-collapse）：收起态窗口经 setPosition 滑出屏，屏幕内只剩靠中心一侧
   ~20px 边带；grip 仅收起态显示、绝对定位不占布局；chevron 按 data-dock-edge 静态旋转定向
   （transform，非动画）。--strip-dur-collapse 供 strip-main.js 读取（JS tween 时长）。 */
.c-strip {
  --strip-dur-collapse: 500ms;
}
.c-strip__grip {
  position: absolute;
  display: none;
  place-items: center;
  width: 20px;
  height: 16px;
  color: var(--text-3);
  pointer-events: none; /* 装饰元素：不拦截 hover/拖拽 */
}
.c-strip__grip svg { width: 12px; height: 12px; }
/* 收起态：strip 转相对定位容器（锚定 grip），grip 浮出 */
.c-strip--collapsed { position: relative; }
.c-strip--collapsed .c-strip__grip { display: grid; }
/* 按贴靠边把 grip 放到屏幕内可见边（窗口靠中心一侧），chevron 指向拉出方向（朝屏幕中心） */
.c-strip--collapsed[data-dock-edge="bottom"] .c-strip__grip { top: 2px; left: 50%; transform: translateX(-50%); }
.c-strip--collapsed[data-dock-edge="bottom"] .c-strip__grip svg { transform: none; }        /* up */
.c-strip--collapsed[data-dock-edge="top"] .c-strip__grip { bottom: 2px; left: 50%; transform: translateX(-50%); }
.c-strip--collapsed[data-dock-edge="top"] .c-strip__grip svg { transform: rotate(180deg); } /* down */
.c-strip--collapsed[data-dock-edge="left"] .c-strip__grip { right: 2px; top: 50%; transform: translateY(-50%); }
.c-strip--collapsed[data-dock-edge="left"] .c-strip__grip svg { transform: rotate(90deg); }  /* right */
.c-strip--collapsed[data-dock-edge="right"] .c-strip__grip { left: 2px; top: 50%; transform: translateY(-50%); }
.c-strip--collapsed[data-dock-edge="right"] .c-strip__grip svg { transform: rotate(-90deg); } /* left */
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/float-strip.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/float-strip/float-strip.js src/components/float-strip/float-strip.css tests/unit/float-strip.test.js
git commit -m "feat: 悬浮窗收起 grip 渲染 + 收起态样式（--strip-dur-collapse / data-dock-edge 定向）"
```

---

### Task 4: 状态机 + 编排（strip-main.js）

**Files:**
- Modify: `src/app/strip-main.js`（`mountStripMode` 的 `if (win)` 块）
- Test: `tests/e2e/floatstrip.spec.js`

**Interfaces:**
- Consumes: Task 1 `resolveDock/computeCorrectionTarget/computeCollapseTarget`；Task 3 `collapsible` 渲染 + `.c-strip--collapsed` / `data-dock-edge`；Task 2 权限
- Produces: 状态机（free/docked/collapsed）；收起/弹回 `setPosition` tween；`onMoved` 去抖评估 + 先决校正；hover 取消/弹回；`fit()` 收起态挂起（e2e 经 mock 的 `__stripMoved__` 驱动真实 onMoved 路径，无生产测试缝）

- [ ] **Step 1: Write the failing e2e tests**

在 `tests/e2e/floatstrip.spec.js` 末尾追加（文件尾加一个 `const COLLAPSE_MS = ...` 无需，用字面量）：

```js
// —— 贴边收起（ui/strip-edge-collapse）：先决校正 / 空闲1s收起 / hover取消 / 弹回 / grip ——
// mock：可原位改 pos 模拟拖后窗口位置；screen.currentMonitor 固定 1280×720@1；窗口 300×60。
// 挂载后光标默认(0,0)在 strip 上 → 各用例先 mouse.move 移开，再经 mock 的 __stripMoved__ 驱动
// 真实 onMoved 路径（150ms 去抖 → evaluateDock）。无生产测试缝。
async function mountEdgeMock(page, seedPos) {
  await page.addInitScript((seed) => {
    const calls = [];
    const size = { width: 300, height: 60 };
    const pos = { ...seed };
    window.__mockPos__ = pos;
    window.__TAURI__ = {
      window: {
        LogicalSize: class { constructor(w, h) { this.width = w; this.height = h; } },
        getCurrentWindow: () => ({
          setPosition: (p) => { calls.push(['setPosition', p]); Object.assign(pos, p); return Promise.resolve(); },
          outerPosition: () => Promise.resolve({ ...pos }),
          outerSize: () => Promise.resolve({ ...size }),
          setSize: () => Promise.resolve(),
          setFocus: () => Promise.resolve(),
          onMoved: (fn) => { window.__stripMoved__ = fn; return Promise.resolve(() => {}); },
          hide: () => Promise.resolve(),
        }),
      },
      screen: { currentMonitor: () => Promise.resolve({ position: { x: 0, y: 0 }, size: { width: 1280, height: 720 }, scaleFactor: 1 }) },
      core: { invoke: async () => null },
      event: { listen: async () => () => {} },
    };
    window.__edgeCalls__ = calls;
  }, seedPos);
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip')).toBeVisible();
  await page.waitForTimeout(500); // 挂载评估（free 种子，无计时）
  await page.mouse.move(600, 400); // 光标移离 strip（防 :hover 守卫挡计时）
}

test('贴边收起：半出屏 → 先决校正拉回贴齐，贴边 1s 后缓收起（左滑留 20px）', async ({ page }) => {
  await mountEdgeMock(page, { x: 500, y: 300 }); // 居中 free
  // 拖成左溢出 → 松手（onMoved）→ 先决校正（x 拉回 0）
  await page.evaluate(() => {
    Object.assign(window.__mockPos__, { x: -100, y: 300 });
    window.__stripMoved__();
  });
  await page.waitForTimeout(700); // 去抖 150ms + 校正 tween ~500ms
  let c = await page.evaluate(() => window.__edgeCalls__);
  let last = c.filter((x) => x[0] === 'setPosition').pop();
  expect(last[1].x).toBe(0);
  expect(last[1].y).toBe(300);
  // 贴左 1s 空闲 → 向左滑出留 20px → x = 0+20-300 = -280
  await page.waitForTimeout(1600);
  c = await page.evaluate(() => window.__edgeCalls__);
  last = c.filter((x) => x[0] === 'setPosition').pop();
  expect(last[1].x).toBe(-280);
  expect(last[1].y).toBe(300);
  // 收起态视觉：类 + data-dock-edge
  await expect(page.locator('.c-strip')).toHaveClass(/c-strip--collapsed/);
  await expect(page.locator('.c-strip')).toHaveAttribute('data-dock-edge', 'left');
});

test('贴边收起：hover 取消计时，移开后 1s 缓收起（标准自动隐藏）', async ({ page }) => {
  await mountEdgeMock(page, { x: 500, y: 300 });
  // 贴底 + 松手评估 → docked 起计时（光标已移开）
  await page.evaluate(() => {
    Object.assign(window.__mockPos__, { x: 490, y: 660 });
    window.__stripMoved__();
  });
  await page.waitForTimeout(300); // 去抖 150ms → docked 计时已起
  // hover 取消计时
  await page.locator('.c-strip').hover();
  await page.waitForTimeout(1300); // 若未取消，此窗口应已收起（y→700）
  let c = await page.evaluate(() => window.__edgeCalls__);
  let last = c.filter((x) => x[0] === 'setPosition').pop();
  expect(last[1].y).toBe(660); // 未收起（hover 取消）
  // 移开 → 重新 1s 计时 → 收起
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1700);
  c = await page.evaluate(() => window.__edgeCalls__);
  last = c.filter((x) => x[0] === 'setPosition').pop();
  expect(last[1].y).toBe(700); // 贴底向下滑出留 20px
});

test('贴边收起：贴底 1s 自动收起 → hover 窄条弹回贴边完整位', async ({ page }) => {
  await mountEdgeMock(page, { x: 500, y: 300 });
  await page.evaluate(() => {
    Object.assign(window.__mockPos__, { x: 490, y: 660 });
    window.__stripMoved__();
  });
  await page.waitForTimeout(2100); // 去抖 + 1s 计时 + 500ms 收起 tween
  await expect(page.locator('.c-strip')).toHaveClass(/c-strip--collapsed/);
  await expect(page.locator('.c-strip')).toHaveAttribute('data-dock-edge', 'bottom');
  // hover 窄条 → 弹回 dockPos（y=660）
  await page.locator('.c-strip').hover();
  await page.waitForTimeout(700); // 弹回 tween
  await expect(page.locator('.c-strip')).not.toHaveClass(/c-strip--collapsed/);
  const c = await page.evaluate(() => window.__edgeCalls__);
  const last = c.filter((x) => x[0] === 'setPosition').pop();
  expect(last[1].y).toBe(660);
});
```

- [ ] **Step 2: Run e2e to verify it fails**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/floatstrip.spec.js -g "贴边收起"`
Expected: FAIL（`__stripEdge__` 未定义 → evaluateDock 抛错 / 无收起行为）

- [ ] **Step 3: Implement**

`src/app/strip-main.js`：
1) 顶部 import 追加：`import { computeCorrectionTarget, computeCollapseTarget, resolveDock } from './strip-edge.js';`
2) `mountStripMode` 内 `renderFloatStrip({...})` 调用加 `collapsible: !!win,`（与 `showJump` 同列）。
3) 将 `if (win) { ... }` 块整体替换为（含贴边收起机制；`fit()` 加收起态挂起、`onMoved` 改去抖评估、持久化收敛到 `persistPosition`）：

```js
  if (win) {
    // —— Tauri 独立窗口（B4-6）：铺满窗口 + 系统拖拽 + 尺寸贴合 + 位置持久化 ——
    root.classList.add('strip-root--window');
    document.body.style.background = 'transparent'; // 透明窗口：清掉 body 玻璃底
    const strip = root.querySelector('.c-strip');
    const STORAGE_KEY = 'ui-design-strip-pos';

    // —— 贴边收起状态（ui/strip-edge-collapse）——
    const edge = { mode: 'free', dockEdge: null, dockPos: null }; // free | docked | collapsed
    let collapsed = false;   // 收起/收起动画期间：挂起 fit、跳过持久化、onMoved 不评估
    let collapseTimer = null;
    let settleTimer = null;
    let collapseRaf = null;

    // 位置恢复
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (Number.isFinite(x) && Number.isFinite(y)) win.setPosition({ x, y }).catch(() => {});
      }
    } catch { /* 损坏存档忽略 */ }

    // 尺寸贴合内容（初始 + 数据到达 + 旋转）。收起/收起动画期间挂起：
    // 防 hover 贴合 / 倒计时宽度漂移把滑出窗口重定位。量 strip（border-box）。
    fit = () => {
      if (collapsed) return;
      const r = strip.getBoundingClientRect();
      const { LogicalSize } = window.__TAURI__.window;
      const size = computeFitSize(r);
      win.setSize(new LogicalSize(size.width, size.height)).catch(() => {});
      win.outerSize?.().then((os) => {
        win.scaleFactor?.().then((sf) => {
          console.log('[strip] fit', JSON.stringify(size), 'outer', JSON.stringify(os), 'scaleFactor', sf);
        }).catch(() => {});
      }).catch(() => {});
    };
    fit(); // 首次显示尺寸由挂载时 fit() 确定
    document.fonts?.ready?.then(() => { fit(); evaluateDock(); }).catch(() => {}); // 字体加载后重贴 + 初始贴边评估

    // —— 贴边收起机制（规格 §3）——
    const readMotionDur = () => {
      const off = document.documentElement.dataset.motion === 'off'
        || (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
      if (off) return 0;
      const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--strip-dur-collapse'));
      return Number.isFinite(v) ? v : 500;
    };
    const getMonitor = async () => {
      const m = await window.__TAURI__.screen?.currentMonitor?.().catch?.(() => null);
      return m ? { x: m.position.x, y: m.position.y, width: m.size.width, height: m.size.height } : null;
    };
    const getRect = async () => {
      // ?.() 兼容缺 outerPosition/outerSize 的旧 mock/降级环境（无能力 → null，评估 no-op）
      const p = await win.outerPosition?.().catch?.(() => null);
      const s = await win.outerSize?.().catch?.(() => null);
      return (p && s) ? { x: p.x, y: p.y, width: s.width, height: s.height } : null;
    };
    const setEdgeUI = (mode) => {
      strip.classList.toggle('c-strip--collapsed', mode === 'collapsed');
      strip.dataset.dockEdge = edge.dockEdge ?? '';
    };
    const persistPosition = (p) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: p.x, y: p.y }));
    const tweenTo = (to, dur, onDone = () => {}) => {
      if (collapseRaf) { cancelAnimationFrame(collapseRaf); collapseRaf = null; }
      win.outerPosition().then((p) => {
        const from = { x: p.x, y: p.y };
        if (dur <= 0) { win.setPosition(to).catch(() => {}); onDone(); return; }
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic
        const step = (now) => {
          const k = ease(Math.min(1, (now - start) / dur));
          win.setPosition({ x: Math.round(from.x + (to.x - from.x) * k), y: Math.round(from.y + (to.y - from.y) * k) }).catch(() => {});
          if (k < 1) collapseRaf = requestAnimationFrame(step);
          else { collapseRaf = null; onDone(); }
        };
        collapseRaf = requestAnimationFrame(step);
      }).catch(() => {});
    };
    const cancelCollapse = () => { if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; } };
    const startCollapseTimer = () => {
      cancelCollapse();
      if (edge.mode !== 'docked' || strip.matches(':hover')) return; // 非贴边或光标在条上不计时
      collapseTimer = setTimeout(collapseNow, 1000);
    };
    const collapseNow = async () => {
      const monitor = await getMonitor();
      const rect = await getRect();
      if (!monitor || !rect || !edge.dockEdge) return;
      const target = computeCollapseTarget({ x: rect.x, y: rect.y }, { width: rect.width, height: rect.height }, monitor, edge.dockEdge);
      edge.mode = 'collapsed';
      collapsed = true;
      setEdgeUI('collapsed');
      tweenTo(target, readMotionDur());
    };
    const popOut = () => {
      cancelCollapse();
      if (edge.mode !== 'collapsed' || !edge.dockPos) return;
      collapsed = false;
      setEdgeUI('docked');
      tweenTo(edge.dockPos, readMotionDur(), () => {
        edge.mode = 'docked';
        if (strip.isConnected) startCollapseTimer();
      });
    };
    const evaluateDock = async () => {
      const monitor = await getMonitor();
      const rect = await getRect();
      if (!monitor || !rect) return false; // 无能力（旧 mock/降级）→ 调用方兜底持久化
      const dock = resolveDock(rect, monitor);
      if (dock.overflow.length) {
        // 先决校正：溢出边拉回贴齐完整可见 → 贴边
        const target = computeCorrectionTarget(rect, monitor);
        edge.dockEdge = dock.edge;
        edge.dockPos = target;
        edge.mode = 'docked';
        collapsed = false;
        setEdgeUI('docked');
        await tweenTo(target, readMotionDur());
        persistPosition(target);
        if (strip.isConnected) startCollapseTimer();
      } else if (dock.edge) {
        edge.dockEdge = dock.edge;
        edge.dockPos = { x: rect.x, y: rect.y };
        edge.mode = 'docked';
        collapsed = false;
        setEdgeUI('docked');
        persistPosition({ x: rect.x, y: rect.y });
        startCollapseTimer();
      } else {
        edge.mode = 'free';
        edge.dockEdge = null;
        collapsed = false;
        setEdgeUI('free');
        cancelCollapse();
        persistPosition({ x: rect.x, y: rect.y });
      }
      return true;
    };

    // 位置持久化 + 贴边评估：拖动松手（onMoved 去抖 150ms）统一处理；收起/收起动画期间不评估。
    // evaluateDock 有能力（monitor+rect）时其内部 persistPosition；降级环境无能力时兜底持久化
    // 当前位置（沿用既有 onMoved 持久化行为，兼容无 screen/outerSize 的旧 mock）。
    win.onMoved?.(() => {
      if (collapsed || collapseRaf) return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(async () => {
        const handled = await evaluateDock();
        if (!handled) {
          win.outerPosition?.().then(({ x, y }) => {
            if (!collapsed && !collapseRaf) localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
          }).catch(() => {});
        }
      }, 150);
    });
    // hover 触发：贴边态取消计时（标准自动隐藏）；收起态弹回
    strip.addEventListener('mouseenter', () => {
      if (edge.mode === 'collapsed') popOut();
      else cancelCollapse();
    });
    strip.addEventListener('mouseleave', () => { if (edge.mode === 'docked') startCollapseTimer(); });
    // 拖拽退出收起：pointerdown 取消计时/中止弹出动画/清收起态，交给系统拖拽（onMoved settle 再评估）
    strip.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.c-strip__ctrl')) return;
      cancelCollapse();
      if (collapseRaf) { cancelAnimationFrame(collapseRaf); collapseRaf = null; }
      if (edge.mode === 'collapsed') { edge.mode = 'free'; collapsed = false; setEdgeUI('free'); }
    });

    mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.hide().catch(() => {}) });
  }
```

- [ ] **Step 4: Run e2e to verify it passes**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/floatstrip.spec.js -g "贴边收起"`
Expected: PASS（3 个用例全绿）

- [ ] **Step 5: Commit**

```bash
git add src/app/strip-main.js tests/e2e/floatstrip.spec.js
git commit -m "feat: 悬浮窗贴边收起状态机（先决校正/1s缓收起/hover弹回/收起态挂起 fit）"
```

---

### Task 5: 回归验证 + 账本 + 合并

**Files:**
- Modify: `docs/superpowers/sdd/progress-tokentool.md`（追加执行留痕）

- [ ] **Step 1: 全量回归**

Run（改动影响面 + 壳冒烟）：
```
npx vitest run tests/unit/strip-edge.test.js tests/unit/strip-main.test.js tests/unit/float-strip.test.js tests/unit/strip-sizing.test.js tests/unit/window-capabilities.test.js
npx playwright test --config=playwright.config.worktree.js tests/e2e/floatstrip.spec.js tests/e2e/app-shell.spec.js
npm run build
```
Expected: 单测全绿；floatstrip（含新增 3 收起用例）+ app-shell 全绿；build 通过。视觉基线零漂移（`.c-strip` 不在基线截图；`--strip-dur-collapse` 无基线影响）。

- [ ] **Step 2: 账本留痕**

在 `docs/superpowers/sdd/progress-tokentool.md` 追加「悬浮条优化轮 3（贴边收起）」节：状态机、先决校正、用户选定（仅溢出校正/形态 B 小把手/标准自动隐藏）、提交哈希、验证、待真机验证项。

- [ ] **Step 3: Commit 账本**

```bash
git add docs/superpowers/sdd/progress-tokentool.md
git commit -m "docs: 悬浮窗贴边收起执行留痕（SDD 账本）"
```

- [ ] **Step 4: 合并入 dev**

```bash
git checkout dev && npm run merge-to-dev -- ui/strip-edge-collapse
```
Expected: 合并成功、分支删除、dev 干净。合并后视需要跑 `check:boundary`（merge 脚本内已含）。

---

## Self-Review 记录

- **规格覆盖**：§3.1 边缘检测→Task1+Task4；§3.2 先决校正→Task4 evaluateDock；§3.3 收起动画→Task4 tweenTo；§3.4 grip→Task3；§3.5 触发语义→Task4 mouseenter/leave；§3.6 持久化→Task4 persistPosition（收起期间 onMoved 跳过）；§4 红线→readMotionDur + fit 挂起；§5 测试→Task1/4 + Task2 权限断言；§6 真机→Task5 账本标注。无缺口。
- **占位扫描**：无 TBD/TODO；每步含可执行代码/命令。
- **类型一致性**：`resolveDock` 返回 `{edge, overflow}`、`computeCollapseTarget(pos,size,monitor,edge,sliver)`、`computeCorrectionTarget(rect,monitor)` 在 Task1 定义、Task4 消费，签名一致；`renderFloatStrip({collapsible})` Task3 定义、Task4 用 `collapsible:!!win`；e2e 经 mock 的 `onMoved` 回调（`__stripMoved__`）驱动真实路径，Task4 无生产测试缝。
