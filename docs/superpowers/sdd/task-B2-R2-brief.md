# Task B2-R2: 表面应用亚克力 + 去高光 + 噪点层 + 闭环 M-1

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（只动 transform/opacity，**blur 永不动画**）；配置链路不绕过。
- 零运行时依赖；遵循 src/CLAUDE.md。
- **命名保留**：`--glass-*` / `data-glass` / `--glass-enabled` 一律不改名。
- `.cust-group` count 6 不得破坏。
- 视觉基线会变（全部 18 张）→ 确认差异由本次改动引起后 `--update-snapshots`。
- TDD（先红后绿）；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## Files

- Modify: `src/app/app-main.css`（全部表面消费亚克力配方 + `.app-main::after` 噪点层 + `data-glass=off` 扩到标题栏/遮罩）
- Modify: `src/styles/base.css`（`.glass` 类去 inset-highlight 反光、用亚克力配方）
- Modify: `src/components/title-bar/title-bar.css`（亚克力 + `data-glass=off` 降级）
- Modify: `src/components/navigation-wheel/nav-wheel.css`（遮罩渐变用亚克力底色 + `data-glass=off` 降级）
- Modify: `src/components/card/card.css`、`src/components/dialog/dialog.css`、`src/components/floating-window/floating-window.css`（去 `--shadow-inset-highlight` 反光、用亚克力配方）
- Test: `tests/e2e/app-shell.spec.js`（新「亚克力材质」用例）、视觉基线重生成

## Interfaces

- Consumes: `--acrylic-saturate`（1.8）/ `--acrylic-brightness`（1.1/0.92）/ `--acrylic-noise` / `--noise-opacity`（0.04，Task R1）；`data-glass`（B2-1）
- Produces: 全部表面 `backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness))`；`.app-main::after` 噪点覆盖层；`[data-glass="off"]` 覆盖 `.c-titlebar` 与遮罩渐变（闭环 B2-1 M-1）

## Steps

### Step 1: 写失败 e2e（app-shell.spec.js）

```js
test('亚克力材质：表面增饱和模糊 + 噪点层存在', async ({ page }) => {
  await page.goto('/?mode=app');
  const filter = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(filter).toContain('saturate(1.8)');
  expect(filter).toContain('brightness(');
  const noise = await page.locator('.app-main').evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
  expect(noise).toContain('data:image/svg+xml');
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "亚克力材质"`
Expected: FAIL（现 saturate(1.4)、无噪点层）

### Step 3: app-main.css 表面接亚克力配方

把全部表面的 `backdrop-filter: blur(var(--glass-blur)) saturate(1.4)`（`.app-main__nav-l/.nav-r/.pages/.card` + 手机 `.app-main__stack/.stack-page/.dock`，B2-1 已接玻璃）改为：
```css
backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness));
```
背景保持 `background: var(--glass-bg)`（着色底）。`[data-glass="off"]` 降级块（现约 155-161、231-236 行）不变。

### Step 4: 加噪点覆盖层

`.app-main` 加伪元素噪点层（app-main.css 内，`.app-main` 已有 `position: relative`）：
```css
.app-main::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: var(--acrylic-noise); background-size: 120px 120px;
  opacity: var(--noise-opacity, 0.04);
  z-index: var(--z-float); /* 覆盖右窗轮（同为 --z-float，DOM 序靠后故在上）；pointer-events:none 不挡交互 */
}
:root[data-glass="off"] .app-main::after { opacity: 0; }
```

### Step 5: base.css `.glass` 去反光

`.glass`（base.css:17-21）去掉 `box-shadow: var(--glass-shadow), var(--shadow-inset-highlight)` 的 `--shadow-inset-highlight` 项（玻璃反光边缘），改 `backdrop-filter` 为亚克力配方（同 Step 3）。同步把 `card.css`、`dialog.css`、`floating-window.css` 里 `box-shadow: var(--glass-shadow), var(--shadow-inset-highlight)` 与 `background: var(--glass-highlight)` 的玻璃反光消费移除（亚克力无反光；保留玻璃阴影 `--glass-shadow`）。

### Step 6: 标题栏 + 遮罩闭环 M-1

`title-bar.css`：`.c-titlebar` 用亚克力配方背景 + backdrop-filter；补降级：`:root[data-glass="off"] .c-titlebar { background: var(--surface-solid); backdrop-filter: none; }`。`nav-wheel.css` 顶/底遮罩渐变（`.c-navwheel__mask` 用 `var(--glass-bg)`）在 `data-glass="off"` 时同样换 `var(--surface-solid)`。

### Step 7: 运行绿 + 基线重生成

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "亚克力材质|玻璃两档"`（新用例 + B2-1 两档回归）→ `npm run test:e2e`（全量，其余零冲击）+ `npm test` + `npm run build`；视觉基线 `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots`（18 张全重生成，先解码比对确认差异=材质/去反光，无布局位移）。
Expected: 全绿

### Step 8: 提交

```bash
git add src/app/app-main.css src/styles/base.css src/components/title-bar/title-bar.css src/components/navigation-wheel/nav-wheel.css src/components/card/card.css src/components/dialog/dialog.css src/components/floating-window/floating-window.css tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 表面应用亚克力材质（去高光反光 + 噪点层 + 标题栏/遮罩降级闭环）"
```
