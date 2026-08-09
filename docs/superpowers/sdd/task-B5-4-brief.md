# Task B5-4: 自适应布局（限宽居中 + 分区撑满）

> 计划书章节：`docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md` 的 Task B5-4（本文件为提取全文，作为唯一实施需求）。规格：`docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md` §6。

## 绑定本任务的全局约束（必须遵守）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。本任务纯布局改动，不动画。
- 配置链路：本任务不涉及界面参数新增（纯布局/类名，不动 defaults/store/apply）。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。共享 checkout 有陈旧 5173 server（PID 11964）serve 旧代码，勿用默认 `npm run test:e2e`。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（B5-1 已改显式 `document.fonts.load`，保留）。
- 提交前 `npm run build`；每任务结束全量回归绿（`npm test` + worktree e2e + build）。
- **字号间距恒定**：不引入窗口比例缩放，`--font-size-base` 保持配置驱动，与窗口尺寸解耦。

## 前置接口（B5-1/2/3 已交付）

- `--font-sans` 含 `"Alibaba PuHuiTi"`（本任务不涉及文字）。
- `.c-slider` 胶囊（本任务不涉及）。

## Files

- Modify: `src/app/app-main.css`（`.app-main__page` max-width 720→1080 居中 + `data-layout` 规则）
- Modify: `src/app/app-main.js`（渲染时给设置页/概览页设 `data-layout`；组件/动效分区容器加 fluid 标记）
- Modify: `tests/e2e/app-shell.spec.js`（加 data-layout 断言）

## Interfaces

- Consumes: 既有 `.app-main__page` 结构（app-main.css:108）+ `MODULES` 渲染（app-main.js:105-107）
- Produces: `.app-main__page[data-layout="center"]`（限宽居中）/ `[data-layout="fluid"]`（撑满）；组件/动效 `.app-partition` fluid —— 独立交付，无下游依赖

## 实现步骤

### Step 1: 写失败 e2e（tests/e2e/app-shell.spec.js 追加）

```js
test('B5-4：自适应布局 data-layout（表单限宽居中 + 展示撑满）', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 }); // 大窗口
  await page.goto('/?mode=app');
  // 概览页：center（限宽 1080 居中）
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview).toHaveAttribute('data-layout', 'center');
  const ow = await overview.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const pr = el.parentElement.getBoundingClientRect();
    return { w: r.width, parentW: pr.width, left: r.left, parentLeft: pr.left };
  });
  expect(ow.w).toBeLessThanOrEqual(1080);
  expect(Math.abs((ow.left - ow.parentLeft) * 2 + ow.w - ow.parentW)).toBeLessThan(4); // 水平居中
  // 组件分区：fluid 撑满
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const part = page.locator('.app-main__settings [data-page="components"]');
  const pw = await part.evaluate((el) => el.getBoundingClientRect().width);
  const pagesW = await page.locator('.app-main__pages').evaluate((el) => el.getBoundingClientRect().width);
  expect(pw).toBeGreaterThan(pagesW - 80); // 撑满内容区（留 padding 余量）
});
```

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"`
Expected: FAIL（`data-layout` 属性不存在）

### Step 3: app-main.css 改自适应

`src/app/app-main.css:108` 附近改为：

```css
.app-main__page { display: none; max-width: 1080px; margin-inline: auto; }
.app-main__page--active { display: block; }
/* B5-4：展示分区撑满（组件/动效），表单/概览保持限宽居中（data-layout 由 app-main.js 设置） */
.app-main__page[data-layout="fluid"] { max-width: none; margin-inline: 0; }
```

### Step 4: app-main.js 设 data-layout

`src/app/app-main.js`：
- 概览页/占位页：渲染时已有 `data-page="${m.id}"`，默认 center（不显式设 `data-layout`，靠 CSS 默认 max-width 居中即可；**为 e2e 断言稳定，给概览页显式加 `data-layout="center"`**）
- 模板（约 105-107 行）改：`<section class="app-main__page" data-page="${m.id}" data-layout="center">`、`<section class="app-main__page" data-page="settings" data-layout="fluid">`
- **组件/动效分区 fluid**：设置页整体 `data-layout="fluid"`（含表单分区）。表单分区内 `.csettings__field` 已有 `max-width:420px` 自限宽（settings-window.css:64），表单观感仍克制；组件/动效分区铺满。e2e 断言组件分区撑满即验证此模型。

> **设计决策**：设置页整体 `data-layout="fluid"`（含表单分区）。这比「按分区细分 data-layout」更简单且不破坏表单。若表单分区在超大窗口下过于松散，见 Step 5。

### Step 5: 分区内细调（按实际观感）

若设置页整体 fluid 后表单分区在超大窗口下过于松散（`.csettings__field` 420px 上限已约束，通常无碍），可给 `.app-main__settings .csettings__page` 加 `max-width: 1080px; margin-inline: auto;`（仅表单类分区）——**默认不加**，先按设置页整体 fluid 验证观感；如需再加，实施者记录并调整视觉基线。

### Step 6: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"` → 绿；再跑 app-shell 全文件零回归

### Step 7: 视觉基线重生成（内容区宽度变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 视口 1280×720 下内容区从 720 → 至多 1080（1280 视口内容区约 1152 宽，实际铺满），概览卡/组件矩阵扩列 → **大部分分区重生成**。**先解码比对**确认差异仅为布局宽度（栅格扩列），非字体/颜色意外变化。

### Step 8: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/app/app-main.css src/app/app-main.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 内容区自适应布局（表单限宽居中 + 组件/动效撑满，data-layout，B5-4）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载本任务报告/账本）。`playwright.config.worktree.js` 不得提交。

> 桌面验证（用户目检）：大窗口下内容自适应扩列/居中，字号间距恒定。
