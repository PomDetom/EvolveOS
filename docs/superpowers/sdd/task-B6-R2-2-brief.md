# Task B6-R2-2: 按钮精致浅色半透明材质

> 源：docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh-r2.md（Task B6-R2-2）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md（§5 按钮精致浅色，唯一需求源）

## 任务目标

B6-3 按钮 primary 纯平 `var(--accent)` 不好看。改为**精致浅色半透明材质**（对齐菜单选中态 `.c-navwheel__item--active` 的 `--accent-100` 浅 tint 材质）：底 `--accent-100` + 字 `--accent-600` + 柔和 accent 描边 + 顶部白内高光 + hover 上浮/加深；danger 同机制。顺带**补按钮像素基线**（修复 B6 最终评审 Important-1 跟进项：按钮矩阵在设置窗 fold 下，components 分区截图不含按钮）。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，本地不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- e2e 截图前必须等待字体加载完成（`document.fonts.load` 三档，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active（按钮 hover 背景/阴影/transform 属豁免）。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动；12 套强调色/语义色色板不动（只消费 `--accent-100/200/500/600`、`--danger-50/500/600`）。
- 提交前 `npm run build`；任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。
- 已知环境怪癖：Chromium 151 将 `color-mix` 计算值序列化为 `oklab(...)`，断言须经 toRGB 归一化（与序列化格式解耦）。

## Files

- Modify: `src/components/button/button.css`（primary/danger 改浅色 tint + 描边 + 上浮 hover）
- Modify: `tests/e2e/components-basic.spec.js`（更新 B6-3 按钮断言为新材质语义）
- Modify: `tests/e2e/visual-regression.spec.js`（SHOTS 加 `buttons` 项，补按钮像素基线）
- Test: `tests/e2e/visual-regression.spec.js-snapshots`（新增 buttons 基线）

## Interfaces

- Consumes: `--accent-100`/`--accent-200`/`--accent-500`/`--accent-600`、`--danger-50`/`--danger-500`/`--danger-600`、`--shadow-sm`/`--shadow-md`（themes.css 已有）
- Produces: `.c-btn--primary`/`.c-btn--danger` 浅色材质三态 —— 独立交付

---

## 实施步骤（TDD）

### Step 1: 更新失败 e2e（components-basic.spec.js，把「B6-3 按钮 primary 实色扁平」用例更新为新材质语义）

```js
test('B6-R2-2：按钮 primary 浅色材质（accent-100 底 + accent-600 字 + 描边 + 上浮 hover）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const comp = page.locator('.app-main__settings [data-page="components"]');
  const btn = comp.locator('.c-btn--primary').first();
  await expect(btn).toBeVisible();
  // 归一化任意 CSS 色为 [r,g,b]（hex 或 rgb()）
  const toRGB = (color) => {
    const c = color.trim();
    if (c.startsWith('#')) {
      const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    return m ? m[1].split(',').slice(0, 3).map(Number) : null;
  };
  const token = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  // 底 = --accent-100（浅 tint，非旧 var(--accent) 纯色）
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--accent-100')));
  // 字 = --accent-600
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).color)))
    .toEqual(toRGB(await token('--accent-600')));
  // 描边存在
  expect(await btn.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px');
  // hover：上浮 translateY(-1px) + 阴影加深（--shadow-md blur 16px）+ 底色 accent-200
  await btn.hover();
  await expect(btn).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, -1\)/);
  expect(await btn.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('16px');
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--accent-200')));
});
```

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-R2-2"`
Expected: FAIL（旧实现底为 `var(--accent)` 非 accent-100、无描边、hover 无上浮）

### Step 3: 实现 button.css（primary + danger 重写）

```css
.c-btn--primary {
  background: var(--accent-100);
  color: var(--accent-600);
  border: 1px solid color-mix(in srgb, var(--accent-500) 45%, transparent);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--primary:hover {
  transform: translateY(-1px);
  background: var(--accent-200);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--primary:active {
  transform: translateY(0) scale(0.97);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--danger {
  background: var(--danger-50);
  color: var(--danger-600);
  border: 1px solid color-mix(in srgb, var(--danger-500) 45%, transparent);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--danger:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--danger-50) 75%, var(--danger-500));
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--danger:active {
  transform: translateY(0) scale(0.97);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

> 删除旧的 `:root[data-theme]` color-mix 明暗 hover 规则（B6-3，已被上浮+加深取代）。`.c-btn` 基类 transition 已有 transform/background/box-shadow（hover 过渡生效）。全局 `box-sizing: border-box` → 加 1px 描边不改 32px 高度。`secondary`/`ghost` 不动。

### Step 4: e2e 红→绿 + 清理旧断言

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-R2-2"` → 绿；检查该文件其余按钮断言（B5-3「主按钮 hover」等）无引用已删的 color-mix 明暗语义，需同步则按新材质语义改。再跑 components-basic 全文件零回归 + `grep -rn "accent-300\|color-mix" tests/e2e/components-basic.spec.js` 确认无残留旧断言。

### Step 5: 补按钮像素基线（修复 B6 最终评审 Important-1 跟进项）

`tests/e2e/visual-regression.spec.js` 的 `SHOTS` 数组加一项（components 分区下滚到按钮 showcase 截图）：
```js
const SHOTS = [
  ['app-main', '.app-main', null],
  ['appearance-partition', '.app-main__settings [data-page="appearance"]', 1],
  ['components-partition', '.app-main__settings [data-page="components"]', 8],
  ['motion-partition', '.app-main__settings [data-page="motion"]', 9],
  ['buttons', '.app-main__settings [data-page="components"] .showcase:has-text("按钮")', 8],
];
```
Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 新增 6 张 `buttons-*` 基线（light/dark × indigo/amber/emerald）；既有 24 张零变化（按钮矩阵在 fold 下，components-partition 截图不含）。

### Step 6: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/components/button/button.css tests/e2e/components-basic.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 按钮精致浅色材质（accent-100 浅 tint + 描边 + 上浮 hover，补按钮像素基线，B6-R2-2）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本，追加到 `docs/superpowers/sdd/progress-b6-r2.md`）。`playwright.config.worktree.js` 不得提交。
