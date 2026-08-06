# Task B2-1: 玻璃材质两档（磨砂/纯色不透明）

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行（不跑 tauri dev）；动画红线（只动 transform/opacity，模糊永不动画，时长/曲线经 CSS 变量）；配置链路（defaults→store→apply，不绕过）。
- 零运行时依赖；组件无抽象封装；遵循现有代码风格（src/CLAUDE.md）。
- **视觉基线会变**：应用壳接玻璃必然改变 `app-main-*.png` 与 `components-partition-*.png` 渲染 → 需重生成基线；确认差异由本次改动引起后 `--update-snapshots`。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/`。
- **任务结束时 `npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿**。
- docs 模式已删除（B1 完成）；浏览器 `/` 直进应用壳；`?mode=strip` 保留。

## Files

- Modify: `src/config/defaults.js`（glass 加 `blurEnabled`，默认 true）
- Modify: `src/config/apply.js`（blurEnabled → CSS 变量层）
- Modify: `src/styles/themes.css`（纯色不透明变量 `--surface-solid`，深浅两套）
- Modify: `src/app/app-main.css`（导航栏/内容区/卡片从 `--surface-1` 切换为 `.glass` 体系 + blurEnabled 降级）
- Modify: `tests/unit/apply.test.js`、`tests/e2e/app-shell.spec.js`
- Modify: `tests/e2e/visual-regression.spec.js`（app-main 基线重生成）

## Interfaces

- Consumes: `applyConfig(cfg, root)`（apply.js，写 `--glass-*` 变量）；`.glass` 类（base.css:17-21）；`--surface-1`/`--glass-bg`/`--glass-blur`（themes.css）
- Produces: `DEFAULTS.glass.blurEnabled = true`；`applyConfig` 写 `--glass-enabled: 1|0`（或等价 data-attr）；themes.css `--surface-solid`（light `#f8f9fb` / dark `#14161c`）；app-main.css 表面接 `.glass` 材质 + `[data-glass="off"]` 降级为纯色实背景

## Steps

### Step 1: 写失败单测（apply.test.js）

```js
it('blurEnabled=true 时写 --glass-enabled: 1', () => {
  const s = { setProperty: vi.fn(), removeProperty: vi.fn() };
  applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, blurEnabled: true } }, { style: s, dataset: {} });
  expect(s.setProperty).toHaveBeenCalledWith('--glass-enabled', '1');
});
it('blurEnabled=false 时写 --glass-enabled: 0', () => {
  const s = { setProperty: vi.fn(), removeProperty: vi.fn() };
  applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, blurEnabled: false } }, { style: s, dataset: {} });
  expect(s.setProperty).toHaveBeenCalledWith('--glass-enabled', '0');
});
```

注：现有 apply.test.js 的 mock 结构需先读，按其 `root`/`s` 形式适配（`vi.fn()` 若项目用 `vi`，否则 `() => {}` + 手动断言）。

### Step 2: 运行确认红

Run: `npm test -- apply.test.js`
Expected: FAIL（`--glass-enabled` 未写入）

### Step 3: defaults.js 加 blurEnabled

```js
glass: { opacity: 0.62, blur: 24, highlight: 0.5, blurEnabled: true },
```

### Step 4: apply.js 写玻璃开关

在 `applyConfig` 玻璃变量区（~line 62-64）加：

```js
s.setProperty('--glass-enabled', cfg.glass.blurEnabled ? '1' : '0');
```

### Step 5: themes.css 加纯色实背景变量

light（`[data-theme="light"]`）加 `--surface-solid: #f8f9fb;`；dark 加 `--surface-solid: #14161c;`（与 `--glass-bg-rgb` 对应纯色，不透明）。

### Step 6: app-main.css 表面接玻璃 + 降级

导航栏/内容区/卡片背景从 `var(--surface-1)` 改为玻璃材质，并用 `--glass-enabled` 控制 backdrop-filter 与背景：

```css
.app-main__nav-l, .app-main__nav-r, .app-main__pages {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-enabled, 1) === 1 ? blur(var(--glass-blur)) saturate(1.4) : none;
}
.app-main__card { background: var(--glass-bg); }
```

CSS 不支持三元——用两个规则：默认（磨砂）`backdrop-filter: blur(var(--glass-blur)) saturate(1.4)`；`[data-glass="off"]` 时 `backdrop-filter: none; background: var(--surface-solid);`。glass-enabled 开关落地为 `<html data-glass="off">`（apply.js 写 `root.dataset.glass = cfg.glass.blurEnabled ? 'on' : 'off'`），CSS 选择器 `:root[data-glass="off"] .app-main__nav-l` 降级。**注意：apply.js 需同步写 dataset**（Step 4 补 `root.dataset.glass = ...`）。

玻璃应用到：`.app-main__nav-l`、`.app-main__nav-r`、`.app-main__pages`、`.app-main__card`、手机 `.app-main__dock`/`.app-main__stack-page`（若视觉上需要）。**切页/推入动画仍只动 transform/opacity**（背景变化是静态，不参与动画）。

### Step 7: 写失败 e2e（app-shell.spec.js）

```js
test('玻璃两档：默认磨砂，关闭后纯色不透明', async ({ page }) => {
  await page.goto('/?mode=app');
  // 默认磨砂：html data-glass=on + 导航栏有 backdrop-filter
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'on');
  const blur = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(blur).toContain('blur');
  // 设置→通用：动效开关下方无玻璃开关……玻璃开关放外观分区定制器？B3 才有完整 UI。
  // 简化：直接改配置验证降级
  await page.evaluate(() => localStorage.setItem('ui-design-config', JSON.stringify({
    glass: { opacity: 0.62, blur: 24, highlight: 0.5, blurEnabled: false },
  })));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'off');
  const blur2 = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(blur2).toBe('none');
});
```

### Step 8: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "玻璃两档"`
Expected: FAIL（data-glass 未实现）

### Step 9: 玻璃开关 UI（外观分区）

设置「外观」分区（settings-pages.js appearancePage 或 app-main 惰性挂载的定制器区域）加一个「玻璃磨砂」开关（`renderSwitch`，写 `saveConfig({ glass: { blurEnabled } })`）。这是 B3 外观完善的前置最小入口。e2e 可改为：设置→外观→切开关→断言 data-glass 翻转。

### Step 10: 全量回归 + 基线重生成

Run: `npm run test:e2e`（新用例绿 + 其余零冲击）+ `npm test` + `npm run build`；视觉基线 `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots`（app-main 及分区基线随玻璃变化重生成，先解码比对差异区域确认）。
Expected: 全绿；基线差异仅为玻璃材质变化

### Step 11: 提交

```bash
git add src/config/defaults.js src/config/apply.js src/styles/themes.css src/app/app-main.css src/scenes/settings-window/settings-pages.js tests/unit/apply.test.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 玻璃材质两档（磨砂 backdrop-filter / 纯色不透明降级）"
```
