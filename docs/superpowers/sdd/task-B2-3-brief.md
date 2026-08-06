# Task B2-3: 导航图标四项增强

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行（不跑 tauri dev）；动画红线（只动 transform/opacity，模糊永不动画，时长/曲线经 CSS 变量）；配置链路（defaults→store→apply，不绕过）。
- 零运行时依赖；组件无抽象封装；遵循现有代码风格（src/CLAUDE.md）。
- **视觉基线会变**：导航图标变化改变 `app-main-*.png` 与 `components-partition-*.png` 渲染 → 需重生成基线；确认差异由本次改动引起后 `--update-snapshots`。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/`。
- **任务结束时 `npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿**。
- docs 模式已删除（B1 完成）；浏览器 `/` 直进应用壳；`?mode=strip` 保留。

## Files

- Modify: `src/components/navigation-wheel/nav-wheel.css`（衬底/光晕/颜色/尺寸）
- Modify: `src/components/navigation-wheel/nav-wheel.js`（active 项图标尺寸/粗细分级）
- Modify: `src/components/icon/icon.js`（加 stroke-width 参数或 active 变体）
- Modify: `src/app/app-main.css`（应用壳图标栏微调，如需）
- Modify: `tests/unit/geometry.test.js`（如需）/ `tests/e2e/nav-wheel.spec.js` 迁移后所在 spec
- Modify: `tests/e2e/visual-regression.spec.js`（app-main/components-partition 基线重生成）

## Interfaces

- Consumes: `icon(name, size)`（icon.js，现固定 stroke-width 1.8）；`.c-navwheel__item/.c-navwheel__icon/.c-navwheel__glow`（nav-wheel.css）
- Produces: `icon(name, size, stroke?)` 第三参可选（默认 1.8 向后兼容）；`mountNavWheel` 渲染 active 项用 `icon(it.icon, 24, 2.2)`、非 active `icon(it.icon, 20)`；CSS 加 `.c-navwheel__icon-chips`（衬底）与增强 `.c-navwheel__glow`（选中光晕分层）；颜色 `--text-3`→`--text-2` 提亮 + active accent

## Steps

### Step 1: 写失败单测（icon 或新增 icon.test.js）

```js
import { icon } from '../../src/components/icon/icon.js';
it('icon 支持 stroke-width 参数', () => {
  const svg = icon('home', 20, 2.2);
  expect(svg).toContain('stroke-width="2.2"');
});
it('默认 stroke-width 1.8（向后兼容）', () => {
  expect(icon('home', 20)).toContain('stroke-width="1.8"');
});
```

### Step 2: 运行确认红

Run: `npm test`
Expected: FAIL（icon 无 stroke 参数）

### Step 3: icon.js 加 stroke 参数

`export function icon(name, size = 18, stroke = 1.8)`，svg `stroke-width="${stroke}"`。

### Step 4: 写失败 e2e（应用壳导航图标分级）

```js
test('导航图标选中项放大加粗、非选中项常规', async ({ page }) => {
  await page.goto('/?mode=app');
  const activeIcon = page.locator('.app-main__nav-l .c-navwheel__item--active .c-navwheel__icon svg');
  const inactiveIcon = page.locator('.app-main__nav-l .c-navwheel__item:not(.c-navwheel__item--active) .c-navwheel__icon svg').first();
  const activeW = await activeIcon.getAttribute('width');
  const inW = await inactiveIcon.getAttribute('width');
  expect(Number(activeW)).toBeGreaterThan(Number(inW)); // 24 > 20
});
```

### Step 5: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "图标分级"`
Expected: FAIL（两图标等宽 22）

### Step 6: nav-wheel.js 分级渲染 + 重挂载

`mountNavWheel` 渲染 item 时按初始 active 决定尺寸；`select(i)` 更新后重渲染该项图标（或 CSS class 控制——若用 CSS 无法改 svg 宽高属性，需 JS 重渲染 icon HTML）。实现建议：`itemEls.forEach` 时据 `--active` 类重设 `.c-navwheel__icon` innerHTML = `icon(it.icon, isActive ? 24 : 20, isActive ? 2.2 : 1.8)`。在 `select()` 内对前后两个 item 重渲染图标。**保持 setFocal 的 transform/opacity 逻辑不受影响**（图标尺寸变化是静态重渲染，非动画）。

### Step 7: nav-wheel.css 衬底/光晕/颜色

```css
.c-navwheel__icon { display: grid; place-items: center; color: var(--text-2);
  width: 40px; height: 40px; border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.c-navwheel__item:hover .c-navwheel__icon { background: var(--surface-hover); color: var(--text-1); }
.c-navwheel__item--active .c-navwheel__icon { color: var(--accent); background: var(--accent-100); }
.c-navwheel__item--active .c-navwheel__glow { opacity: 1; transform: scale(1); }
.c-navwheel__glow { opacity: 0; transform: scale(.8);
  transition: transform var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-out); }
```

衬底 = `.c-navwheel__icon` 40px 圆角底（选中/hover 显）；光晕增强 = glow scale 分层（只动 transform/opacity，红线合规）。应用壳左右窗纯图标栏（`.app-main__nav-l/.nav-r .c-navwheel__name { display: none }`）——衬底占 40px 栏宽 64px 内可容纳。

### Step 8: 全量回归 + 基线重生成

Run: `npm run test:e2e`（新用例绿 + 其余零冲击）+ `npm test` + `npm run build`；视觉基线重生成（app-main/components-partition 图标变化）。
Expected: 全绿

### Step 9: 提交

```bash
git add src/components/navigation-wheel/nav-wheel.css src/components/navigation-wheel/nav-wheel.js src/components/icon/icon.js src/app/app-main.css tests/unit/icon.test.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 导航图标四项增强（提亮高对比/衬底/选中光晕/尺寸粗细分级）"
```
