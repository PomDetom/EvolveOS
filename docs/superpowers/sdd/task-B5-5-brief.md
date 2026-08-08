# Task B5-5: 控件语言收尾（外观页密度/对齐统一）

> 计划书章节：`docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md` 的 Task B5-5（本文件为提取全文，作为唯一实施需求）。规格：`docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md` §7（任务表 B5-5 行）及用户需求「布局对齐、密度节奏、风格割裂」。

## 绑定本任务的全局约束（必须遵守）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。本任务为对齐/间距调整，纯静态值，不动画。
- 配置链路：本任务不涉及界面参数新增（纯 CSS 对齐，不动 defaults/store/apply）。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。共享 checkout 有陈旧 5173 server（PID 11964）serve 旧代码，勿用默认 `npm run test:e2e`。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（B5-1 已改显式 `document.fonts.load`，保留）。
- 提交前 `npm run build`；每任务结束全量回归绿（`npm test` + worktree e2e + build）。

## 前置接口（B5-1/2/3/4 已交付）

- `--font-sans` 含 `"Alibaba PuHuiTi"`（外观页文字继承）。
- `.c-slider` 胶囊（外观页滑杆已统一，B5-2）。
- `data-layout` 自适应（B5-4）。

## Files

- Modify: `src/styles/customizer.css`（行对齐/间距统一：`.cust-row`、`.cust-group`、`.cust-accent-card` 对齐）
- Modify: `src/scenes/settings-window/settings-window.css`（字段/模式按钮对齐统一：`.csettings__field`、`.csettings__modes`）
- Test: `tests/e2e/customizer.spec.js`（加行对齐断言）

## Interfaces

- Consumes: Task B5-2 的 `.c-slider` 胶囊（外观页滑杆已统一）；既有 `.cust-row`/`.cust-group`/`.csettings__field` 结构
- Produces: 外观页行对齐/密度统一（标签基线对齐、行距一致、分组标题分隔线对齐）—— 独立交付

## 实现步骤

### Step 1: 写失败 e2e（tests/e2e/customizer.spec.js 追加）

```js
test('B5-5：外观页控件行对齐统一（标签基线 + 行距一致）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const appr = page.locator('.app-main__settings [data-page="appearance"]');
  // 各行 label 对齐：取前 3 行 .cust-row__label 的 top，应一致（同一行）
  const tops = await appr.locator('.cust-row__label').evaluateAll((els) => els.slice(0, 3).map((el) => el.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
  // 行距一致：相邻 .cust-row 间距差 < 2px
  const rows = await appr.locator('.cust-row').evaluateAll((els) => els.slice(0, 4).map((el) => el.getBoundingClientRect().top));
  const gaps = rows.slice(1).map((t, i) => t - rows[i]);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(4);
});
```

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "行对齐"`
Expected: FAIL（当前行 label top 不一致 / 间距不均 —— `.cust-row__head` 与 `.cust-row--switch` 结构差异导致）

### Step 3: customizer.css 对齐统一

`src/styles/customizer.css` 修改：
- `.cust-row__head`：确保 `align-items: baseline`（label/value 同基线）+ `min-height` 统一（switch 行与 slider 行头部等高）
- `.cust-row { margin-bottom: var(--space-3); }` 保持；`.cust-row--switch` 与 slider 行对齐（switch 行 `.cust-row__head` 与 slider 行 head 等高）
- `.cust-group__title` 分隔线 `::after` 对齐（已 flex，保持）；`.cust-group { margin-bottom: var(--space-5); }` 保持
- `.cust-accent-card` 网格：`align-items: stretch` 保证 3 列等高
- 具体改法（verbatim）：

```css
/* B5-5：行对齐统一 —— 标签基线一致、switch 行与 slider 行头部等高 */
.cust-row { margin-bottom: var(--space-3); }
.cust-row__head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px; min-height: 20px;
}
.cust-row--switch { display: flex; align-items: center; justify-content: space-between; min-height: 40px; }
.cust-row--switch .cust-row__head { margin-bottom: 0; min-height: auto; }
.cust-row--switch .c-switch { flex-shrink: 0; }
.cust-accent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2);
  margin-bottom: var(--space-3); align-items: stretch; }
```

> 若既有规则已满足（实际观感验收），实施者以「e2e 断言通过 + 观感一致」为准；`min-height`/`align-items` 为对齐兜底，不引入布局动画。

### Step 4: settings-window.css 字段对齐

`src/scenes/settings-window/settings-window.css` 修改：
- `.csettings__field` 与 `.cust-row` 的 label 字号/字重对齐（`.csettings__field-label` 已是 sm/medium，保持）
- `.csettings__modes` 与 `.csettings__field-label` 对齐（`align-self` 已 flex-start，保持）
- 若观感验收发现字段/模式组间距不均，统一 `margin-bottom: var(--space-5)`
- **默认改动最小**：本任务重点在 customizer.css（外观页主体），settings-window.css 仅在有明确观感偏差时微调（记入报告）

### Step 5: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "行对齐"` → 绿；再跑 customizer.spec.js 全文件零回归

### Step 6: 视觉基线重生成（外观页对齐变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: appearance 分区 6 张重生成（行对齐/间距微调）；其余零变化。**先解码比对**确认差异仅为对齐。

### Step 7: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/styles/customizer.css src/scenes/settings-window/settings-window.css tests/e2e/customizer.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 外观页控件行对齐统一（标签基线/行距/分组，B5-5）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载本任务报告/账本）。`playwright.config.worktree.js` 不得提交。

> 桌面验证（用户目检）：外观页标签基线一致、行距均匀、分组对齐；与动效/组件分区观感统一。
