# Task B2-R4: 图标选中态去光晕

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（只动 transform/opacity；blur 永不动画）；配置链路不绕过。
- 零运行时依赖；遵循 src/CLAUDE.md。
- 视觉基线会变（图标去光晕）→ 确认差异由本次改动引起后 `--update-snapshots`。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## Files

- Modify: `src/components/navigation-wheel/nav-wheel.js`（模板删 `.c-navwheel__glow`）
- Modify: `src/components/navigation-wheel/nav-wheel.css`（删 glow 规则/动画；补 `--active:hover` 优先）
- Test: `tests/e2e/app-shell.spec.js`（无光晕 + 选中衬底）、视觉基线重生成

## Interfaces

- Consumes: `.c-navwheel__icon` 衬底（B2-3 已加 40px 圆角底）
- Produces: 无 `.c-navwheel__glow` 元素/样式；选中态 = accent-100 衬底 + accent icon；`.c-navwheel__item--active:hover .c-navwheel__icon` 保持选中态（闭环 B2-3 M-3）

## Steps

### Step 1: 写失败 e2e（app-shell.spec.js）

```js
test('图标选中态：无光晕层、衬底为选中底色', async ({ page }) => {
  await page.goto('/?mode=app');
  await expect(page.locator('.c-navwheel__glow')).toHaveCount(0);
  const bg = await page.locator('.app-main__nav-l .c-navwheel__item--active .c-navwheel__icon')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)'); // accent-100 衬底非透明
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "图标选中态"`
Expected: FAIL（glow count > 0）

### Step 3: nav-wheel.js 删光晕元素

模板（现约 31 行 `<div class="c-navwheel__glow"></div>`）删除该行。`renderItemIcons` 原地改 svg 属性逻辑（B2-3）逐字不动；setFocal 逐字不动。

### Step 4: nav-wheel.css 删光晕样式 + 补 active:hover

删除 `.c-navwheel__glow` 全部规则（现约 39-42 行的 radial-gradient / opacity / `transform: scale(.8)` 分层 / transition）。保留 `.c-navwheel__icon` 40px 衬底（B2-3 Step 7 已定：hover `--surface-hover`、active `--accent-100`）。补：
```css
.c-navwheel__item--active:hover .c-navwheel__icon {
  background: var(--accent-100); color: var(--accent); /* 选中态 hover 不被浅灰覆盖（闭环 M-3） */
}
```

### Step 5: 运行绿 + 基线重生成

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "图标选中态|图标分级"`（新用例 + B2-3 分级回归）→ `npm run test:e2e`（全量）+ `npm test` + `npm run build`；视觉基线重生成（app-main/components-partition 图标去光晕）。
Expected: 全绿

### Step 6: 提交

```bash
git add src/components/navigation-wheel/nav-wheel.js src/components/navigation-wheel/nav-wheel.css tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 图标选中态去光晕（只留衬底 + active:hover 优先）"
```
