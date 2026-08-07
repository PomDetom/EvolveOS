# Task B2-R5: 自定义器调整 + 措辞同步

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（paint-only 豁免）；配置链路经 saveConfig→applyConfig。
- 零运行时依赖；遵循 src/CLAUDE.md。
- **命名保留**：`--glass-*` / `data-glass` / `--glass-enabled` / `data-glass-switch` 不改名。
- `.cust-group` count 6 不得破坏。
- 视觉基线会变（外观分区预览）→ 确认差异由本次改动引起后 `--update-snapshots`。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## Files

- Modify: `src/demo/customizer-panel.js`（组名「表面质感」、开关「亚克力材质」、glassPreview 去高光、注释同步）
- Modify: `src/styles/customizer.css`（`.cust-panel`/`.cust-glass-preview__glass` 亚克力配方统一 + 预览去高光改噪点 + 去 inset-highlight）
- Modify: `src/scenes/settings-window/settings-pages.js`（关于页「克制的亚克力质感」）
- Modify: `src/demo/component-showcase-full.js`（卡片演示 label「亚克力材质」、关于弹窗文案）
- Modify: `tests/e2e/customizer.spec.js`、`tests/e2e/app-shell.spec.js`、`tests/unit/apply.test.js`（措辞/测试名）
- Test: 视觉基线重生成（外观分区）

## Interfaces

- Consumes: `cfg.glass.noise` + `--noise-opacity`（R1）；`data-glass-switch`（B2-1）；滑杆键 `noise`（R1 已换）
- Produces: 「表面质感」组（透明度/模糊/噪点强度 3 滑杆 + 亚克力材质开关）；预览改噪点视觉；措辞全量「玻璃」→「亚克力/表面质感」

## 当前状态（R1/R2 落地后的实测事实）

- `customizer-panel.js`：GROUPS 第 2 组 `title: '玻璃材质'`（50 行）滑杆已为 `{ key: 'noise', label: '噪点强度' }`（R1 原子换键）；`glassSwitchRow` label「玻璃磨砂」（196-198 行）；`glassPreview()`（166-178 行）注释「透明度/模糊/高光」过时（R1 M1）；`syncUI` 254 行。
- `customizer.css`：`.cust-panel`（14-19 行）`backdrop-filter: blur(...) saturate(1.4)` + `box-shadow: var(--glass-shadow), var(--shadow-inset-highlight)`；`.cust-glass-preview__glass`（165-168 行）同 + `::before`（172-174 行）`background: var(--glass-highlight)`（高光预览）。这两处是 R2 复查记录的「裸 saturate(1.4) 属 R5 范围」。
- `settings-pages.js` 172 行 about：「克制的玻璃质感 · 深/浅双主题 · 6 主题色」。
- `component-showcase-full.js` 165 行卡片 label「玻璃材质」（`renderCard({ glass: true })`，卡片组件本身不变）；248 行 about 弹窗「克制的玻璃质感设计语言」。
- `apply.test.js` 32/37 行测试名含「玻璃磨砂」；`app-shell.spec.js` 328 行测试名「玻璃两档」+ 323-334 注释；`customizer.spec.js` 10 行测试名「调整玻璃透明度实时生效」。

## Steps

### Step 1: 写失败 e2e（customizer.spec.js）

```js
test('外观分区：表面质感组标题 + 亚克力开关 + 噪点滑杆', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  await expect(page.locator('.cust-group').nth(1).locator('.cust-group__title')).toContainText('表面质感');
  await expect(page.locator('[data-glass-switch]')).toContainText('亚克力材质');
  await expect(page.locator('.cust-range[data-key="noise"]')).toBeVisible();
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/customizer.spec.js -g "表面质感"`
Expected: FAIL（组名「玻璃材质」、开关「玻璃磨砂」未改）

### Step 3: customizer-panel.js 调整

- GROUPS 第 2 组 `title: '玻璃材质'` → `'表面质感'`。
- `glassSwitchRow` label「玻璃磨砂」→「亚克力材质」（含 `renderSwitch` 的 aria-label）。
- `glassPreview()` 注释「透明度/模糊/高光」→「透明度/模糊/噪点强度」（R1 M1 闭环）。
- 相关行内注释「玻璃磨砂开关」「玻璃材质」→「亚克力材质开关」「表面质感」（文件头 16 行、190 行、333 行等处）。
- `CFG_PATH` 的 `noise`（R1 已加）不动；确认无 `highlight` 残留。

### Step 4: customizer.css 亚克力统一 + 预览去高光改噪点

- `.cust-panel`（19 行）`backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness))`；`box-shadow` 去掉 `--shadow-inset-highlight`（亚克力无反光）。
- `.cust-glass-preview__glass`（168 行）backdrop-filter 同上统一；`box-shadow` 去 inset-highlight。
- `.cust-glass-preview__glass::before`（172-174 行）高光 `background: var(--glass-highlight)` 改为噪点层：`background-image: var(--acrylic-noise); background-size: 120px 120px; opacity: var(--noise-opacity, 0.04)`（预览实时反映噪点强度滑杆）。

### Step 5: 措辞同步

- `settings-pages.js` 172 行：「克制的玻璃质感」→「克制的亚克力质感」。
- `component-showcase-full.js` 165 行卡片 label「玻璃材质」→「亚克力材质」；248 行「克制的玻璃质感设计语言」→「克制的亚克力质感设计语言」。
- 测试名/注释：`apply.test.js` 32/37 行「玻璃磨砂开/关」→「亚克力材质开/关」；`app-shell.spec.js` 328 行「玻璃两档」→「亚克力两档」+ 323-334 注释同步；`customizer.spec.js` 10 行「调整玻璃透明度」→「调整亚克力透明度」。

### Step 6: 运行绿 + 基线重生成

Run: `npx playwright test tests/e2e/customizer.spec.js` + `npx playwright test tests/e2e/app-shell.spec.js -g "亚克力两档"` → `npm run test:e2e`（全量）+ `npm test` + `npm run build`；视觉基线重生成（appearance 分区含表面质感组/噪点预览；先解码比对确认差异来源）。
Expected: 全绿

### Step 7: 提交

```bash
git add src/demo/customizer-panel.js src/styles/customizer.css src/scenes/settings-window/settings-pages.js src/demo/component-showcase-full.js tests/e2e/customizer.spec.js tests/e2e/app-shell.spec.js tests/unit/apply.test.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 自定义器表面质感组（亚克力开关 + 噪点强度滑杆）+ 措辞同步"
```
