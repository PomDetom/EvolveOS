# Task B6-R2-3: 导航轮 resize 后顶/底项选中修复

> 源：docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh-r2.md（Task B6-R2-3）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md（§6 导航轮选中 bug，唯一需求源）

## 任务目标

修复用户报告的 bug：**页面拉宽后，菜单窗口最上和最下的项无法选中，选中后自动跳到下一个菜单**。

**根因（已复现确认）**：`src/components/navigation-wheel/nav-wheel.js` 的几何 padding（`padTop/padBottom`）与 `CONTENT_TOP` **只在 mount 时按当时 `viewLen()` 计算一次，容器尺寸变化后永不重算**。触发链：
- 页面以 ≤900px（手机形态）加载时左窗 `display:none` → `clientHeight=0` → `padTop=padBottom=0`。
- 「拉宽」过 900px 断点后左窗显示但 padding 仍为 0；窗口较矮（左窗 7 项内容 ≈442px > 视口，可滚动）时锚线数学断裂：点击底部项 → 目标 scrollTop 超出 maxScroll 被 clamp → `snapNow` 的 `findNearestIndex` 在 scrollTop 处锚线指向中间项（≈3-4）→ 跳到中间项；点击顶部项（从中间位置）→ 滚回后 `snapNow` 重算锚线最近项为相邻项（≈1-2）→ 跳到下一项。

**修复**：挂 **ResizeObserver** 观察 list 元素，容器尺寸变化时重算 `padTop/padBottom` + `CONTENT_TOP` + `setFocal()`。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，本地不入库）。
- 视觉基线无变化（本任务不改视觉，不 update-snapshots）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画。选中滚动为原生 scrollTop（非动画属性）。
- 零运行时依赖（ResizeObserver 为浏览器原生 API）；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css 亚克力配方）不动；`--font-mono` 不动。
- 提交前 `npm run build`；任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。

## Files

- Modify: `src/components/navigation-wheel/nav-wheel.js`（ResizeObserver 重算几何 + destroy()）
- Modify: `src/app/app-main.js`（右窗 renderRight 重挂前 destroy 旧轮）
- Modify: `tests/e2e/app-shell.spec.js`（新增 resize 回归用例）

## Interfaces

- Consumes: 既有 nav-wheel-geometry.js 纯函数（anchorY/scrollTopForAnchor/findNearestIndex/focalScale/focalOpacity）——不动
- Produces: `mountNavWheel` 返回值新增 `destroy()`；容器尺寸变化自动重算 pad/CONTENT_TOP —— 独立交付

---

## 实施步骤（TDD）

### Step 1: 写失败 e2e（tests/e2e/app-shell.spec.js 追加）

```js
test('B6-R2-3：resize 后导航顶/底项可正常选中（手机加载→拉宽，无跳变）', async ({ page }) => {
  // 手机形态加载 → 左窗 display:none → mount 时 clientHeight=0 → pad=0（bug 前置）
  await page.setViewportSize({ width: 700, height: 800 });
  await page.goto('/?mode=app');
  // 拉宽到较矮桌面窗口（左窗内容 442px > 视口，可滚动，pad 陈旧时锚线断裂）
  await page.setViewportSize({ width: 1440, height: 400 });
  const L = '.app-main__nav-l .c-navwheel__list';
  await expect(page.locator(L).first()).toBeVisible();
  await page.waitForTimeout(300);
  // 底部项 → 应选中 6（修复前 snapNow 跳到 3-4）
  await page.locator(`${L} .c-navwheel__item`).nth(6).click();
  await expect(page.locator(`${L} .c-navwheel__item--active`)).toHaveAttribute('data-index', '6');
  // 顶部项 → 应选中 0（修复前从滚动位置跳回时 snapNow 跳到 1-2）
  await page.locator(`${L} .c-navwheel__item`).nth(0).click();
  await expect(page.locator(`${L} .c-navwheel__item--active`)).toHaveAttribute('data-index', '0');
});
```

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-3"`
Expected: FAIL（修复前点击底项 active 变 3/4、顶项变 1/2 —— 已实测复现）

### Step 3: 实现 nav-wheel.js（替换 46-52 行：原 pad 计算 + `const CONTENT_TOP` + `let active` 整块替换为 recomputeGeometry + ResizeObserver；`CONTENT_TOP` 改 `let`）

```js
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
```

> 把原来的 `const padTop/padBottom` + 两行 style 赋值替换为 `recomputeGeometry()` 调用（重复计算由 RO 初始回调覆盖，幂等）。`setFocal` 为函数声明（提升），调用安全。**不在 resize 时主动重对齐滚动**（避免触发 snapNow 误改选中；下次交互自然纠正）。

返回对象加 `destroy`（断开 RO，防右窗重挂泄漏）：
```js
return {
  setActive: (id) => { /* 原逻辑 */ },
  scrollToIndex: (i) => select(Math.max(0, Math.min(items.length - 1, i))),
  destroy: () => ro.disconnect(),
};
```

### Step 4: 实现 app-main.js 右窗重挂前 destroy（renderRight 记持有轮）

在 `let dockMounted = false;` 附近加 `let rightWheel = null;`，renderRight 开头与替换 innerHTML 前销毁旧轮：
```js
function renderRight() {
  rightWheel?.destroy(); // 重挂前释放旧 ResizeObserver（防多次重挂泄漏）
  rightWheel = null;
  if (state.rightMode === 'settings') {
    navRBody.innerHTML = `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`;
    const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
      items: APP_SECTIONS.map((s) => ({ id: s.id, name: s.name, icon: s.icon })),
      onChange: (item) => setSettingsSection(item.id),
      anchorRatio: 0.382,
    });
    wheel.setActive(state.settingsId);
    rightWheel = wheel;
    return wheel;
  }
  const mod = MODULES.find((m) => m.id === state.moduleId);
  navRBody.innerHTML = mod.dir.length
    ? `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`
    : `<div class="app-main__nav-r-empty">${icon('box', 18)}<span>无子目录</span></div>`;
  if (!mod.dir.length) return null;
  const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
    items: mod.dir.map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
    onChange: (item) => setDir(item.id),
    anchorRatio: 0.382,
  });
  wheel.setActive(state.dirId);
  rightWheel = wheel;
  return wheel;
}
```

### Step 5: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-3"` → 绿；再跑 app-shell 全文件零回归（既有导航/右键切换用例应仍绿）。

### Step 6: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`（视觉基线零变化，不 update-snapshots）

```bash
git add src/components/navigation-wheel/nav-wheel.js src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "fix: 导航轮 resize 后顶/底项选中修复（ResizeObserver 重算几何 padding，B6-R2-3）"
```

> 提交惯例：fix + docs 两枚提交（docs 承载报告/账本，追加到 `docs/superpowers/sdd/progress-b6-r2.md`）。`playwright.config.worktree.js` 不得提交。
