# Task B2-R3: 背景层预设重调（柔和补色）

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（背景层静态，不参与动画；blur 永不动画）；配置链路不绕过。
- 零运行时依赖；遵循 src/CLAUDE.md。
- **命名保留**：`data-backdrop="gradient|geo|grid"` 结构不变，只调观感。
- 视觉基线会变（app-main 预设光晕收窄）→ 确认差异由本次改动引起后 `--update-snapshots`。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## Files

- Modify: `src/app/app-main.css`（3 预设 `--backdrop-bg` 从浓艳改柔和）
- Test: `tests/e2e/app-shell.spec.js`（既有「背景层」用例回归）、视觉基线重生成

## Interfaces

- Consumes: `data-backdrop="gradient|geo|grid"`（B2-2）；`.app-main__backdrop` 背景层
- Produces: 3 预设柔和化——accent 经 `color-mix` 加 alpha、范围收窄（闭环 B2-2 I-1 暗色光晕过广）

## Steps

### Step 1: 写失败 e2e（观感守卫，弱断言——本任务 gate 以视觉基线 + 用户验收为主）

```js
test('背景层预设柔和：accent 光晕层带透明度', async ({ page }) => {
  await page.goto('/?mode=app');
  const bd = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bd).toMatch(/radial-gradient\(/);
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`
Expected: FAIL（仅当实现有破坏时；否则直接进入实现）

### Step 3: 重调 3 预设（app-main.css）

把 `.app-main[data-backdrop="gradient|geo|grid"]` 的 `--backdrop-bg` 从「`--accent-200/300` 实色 radial + `--surface-solid` 直铺」改为柔和补色——accent 经 `color-mix` 加 alpha、范围收窄：

```css
.app-main[data-backdrop="gradient"] { --backdrop-bg:
  radial-gradient(120% 120% at 20% 10%, color-mix(in srgb, var(--accent-300) 26%, transparent) 0%, transparent 60%),
  radial-gradient(100% 100% at 85% 90%, color-mix(in srgb, var(--accent-300) 18%, transparent) 0%, transparent 55%),
  var(--surface-solid); }
.app-main[data-backdrop="geo"] { --backdrop-bg:
  radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent-300) 20%, transparent) 0%, transparent 32%),
  linear-gradient(135deg, transparent 30%, rgba(255,255,255,.03) 30% 32%, transparent 32%),
  var(--surface-solid); }
.app-main[data-backdrop="grid"] { --backdrop-bg:
  linear-gradient(color-mix(in srgb, var(--accent-300) 14%, transparent) 1px, transparent 1px),
  linear-gradient(90deg, color-mix(in srgb, var(--accent-300) 14%, transparent) 1px, transparent 1px),
  var(--surface-solid); }
```

> 现实现直接用 `--accent-200/300` 实色（浅档 hex），暗色下与近黑 `--surface-solid` 叠出大面积亮晕。改 `color-mix(in srgb, var(--accent-300) X%, transparent)` 令光晕带 alpha（Chromium 111+ 支持，Playwright chromium 满足）。**原则：暗色光晕范围收窄、alpha ≤ 0.3，与亚克力着色叠后干净。** 若某处 color-mix 渲染有疑，可改用主题 RGB 变量法（仿 `--glass-bg-rgb` 为各 accent 补 `--accent-rgb`），但首选 color-mix 零新增变量。

### Step 4: 运行绿 + 基线重生成

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`（切换回归绿）+ `npm run test:e2e`（全量）+ `npm test` + `npm run build`；视觉基线重生成（暗色 app-main 光晕明显收窄，先解码比对确认差异=预设柔和化、无布局位移）。
Expected: 全绿；暗色 app-main 基线光晕范围显著小于当前

### Step 5: 提交

```bash
git add src/app/app-main.css tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 背景层预设柔和补色（accent 光晕加 alpha 收窄，暗色不发腻）"
```
