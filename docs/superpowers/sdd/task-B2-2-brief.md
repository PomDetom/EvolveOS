# Task B2-2: 浏览器装饰背景层（模糊对象）

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行（不跑 tauri dev）；动画红线（只动 transform/opacity，模糊永不动画，时长/曲线经 CSS 变量）；配置链路（defaults→store→apply，不绕过）。
- 零运行时依赖；组件无抽象封装；遵循现有代码风格（src/CLAUDE.md）。
- **视觉基线会变**：应用壳加背景层改变 `app-main-*.png` 渲染 → 需重生成基线；确认差异由本次改动引起后 `--update-snapshots`。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/`。
- **任务结束时 `npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿**。
- docs 模式已删除（B1 完成）；浏览器 `/` 直进应用壳；`?mode=strip` 保留。

## Files

- Modify: `src/app/app-main.css`（`.app-main__backdrop` 装饰层 + 3 预设）
- Modify: `src/app/app-main.js`（渲染背景层 + 会话内预设切换）
- Modify: `src/app/partitions.css`（外观分区背景装饰选择 UI）
- Modify: `tests/e2e/app-shell.spec.js`（新用例）
- Modify: `tests/e2e/visual-regression.spec.js`（app-main 基线重生成）

## Interfaces

- Consumes: `mountAppMode(root)`（app-main.js）；应用壳 `.app-main` grid 布局
- Produces: `.app-main__backdrop`（`position: fixed; inset: 0; z-index: -1`）承载 3 预设背景；`data-backdrop="gradient|geo|grid"` 切换（默认 gradient）；Tauri 环境背景层透明（模糊真实壁纸）；浏览器默认可见

## Steps

### Step 1: 写失败 e2e（app-shell.spec.js）

```js
test('浏览器装饰背景层存在且可切换预设', async ({ page }) => {
  await page.goto('/?mode=app');
  const backdrop = page.locator('.app-main__backdrop');
  await expect(backdrop).toBeVisible();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'gradient');
  // 外观分区切换背景预设
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  await page.locator('.app-main__backdrop-opt[data-bd="geo"]').click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'geo');
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`
Expected: FAIL（`.app-main__backdrop` 不存在）

### Step 3: app-main.css 装饰背景层

```css
.app-main__backdrop { position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: var(--backdrop-bg); }
.app-main[data-backdrop="gradient"] { --backdrop-bg:
  radial-gradient(120% 120% at 20% 10%, var(--accent-200) 0%, transparent 55%),
  radial-gradient(100% 100% at 85% 90%, var(--accent-300) 0%, transparent 50%),
  var(--surface-solid); }
.app-main[data-backdrop="geo"] { --backdrop-bg:
  radial-gradient(circle at 30% 30%, var(--accent-200) 0%, transparent 30%),
  linear-gradient(135deg, transparent 30%, rgba(255,255,255,.04) 30% 32%, transparent 32%),
  var(--surface-solid); }
.app-main[data-backdrop="grid"] { --backdrop-bg:
  linear-gradient(var(--accent-100) 1px, transparent 1px),
  linear-gradient(90deg, var(--accent-100) 1px, transparent 1px),
  var(--surface-solid); background-size: 40px 40px; }
/* Tauri：背景层透明，模糊真实壁纸（apply.js 或 JS 探测写 data-tauri） */
.app-main[data-tauri="1"] .app-main__backdrop { opacity: 0; }
```

动画红线：背景预设切换是静态背景（`--backdrop-bg` 变化，非动画属性）；不参与 transform/opacity 动画。

### Step 4: app-main.js 渲染背景层 + 会话内切换

mountAppMode 内 `.app-main` 首个子元素前插 `.app-main__backdrop`；Tauri 探测（`window.__TAURI__`）写 `data-tauri="1"`；外观分区（settings-pages.js appearancePage 或 app-main 惰性定制器区）加「背景装饰」3 个预设按钮（`.app-main__backdrop-opt[data-bd]`），点击更新 `.app-main` 的 `data-backdrop`（纯会话内状态，不进 store）。

### Step 5: 运行回归 + 基线重生成

Run: `npm run test:e2e`（新用例绿 + 其余零冲击）+ `npm test` + `npm run build`；视觉基线重生成（app-main 含背景层）。
Expected: 全绿

### Step 6: 提交

```bash
git add src/app/app-main.css src/app/app-main.js src/app/partitions.css src/scenes/settings-window/settings-pages.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 浏览器装饰背景层（渐变/几何/网格三预设 + Tauri 透明）"
```
