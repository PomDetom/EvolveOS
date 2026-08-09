# Task B6-2: 悬浮球去光晕保上浮

> 源：docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md（Task B6-2）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md（§4 悬浮球去光晕，唯一需求源）

## 任务目标

悬浮球 hover 从「彩色光晕阴影 + 外圈 glow 光晕环」改为「上浮 + 中性投影」：删 `.c-float-ball__glow` 光晕环（CSS 规则 + HTML 模板渲染点），hover 阴影 `0 8px 22px var(--accent-300)` → 中性 `var(--shadow-md)`（随 shadow-intensity 定制器缩放，不硬编码）。保留 `translateY(-2px)` 上浮 + `inset 0 1px 0 rgba(255,255,255,.3)` 内高光 + 静止态 `--glass-shadow` + backdrop-filter 玻璃底。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，文件已在仓库根，不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（显式 `document.fonts.load`，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。hover 仍只动 transform/box-shadow（中性投影），符合红线。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动。
- 提交前 `npm run build`；每任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。

## Files

- Modify: `src/components/float-ball/float-ball.css`（删 glow 规则 + hover 阴影改中性）
- Modify: `src/components/float-ball/float-ball.js`（若渲染 `.c-float-ball__glow` 则删）
- Modify: `tests/e2e/components-basic.spec.js`（补 hover 中性阴影断言）
- Test: 视觉基线按实测（静止态无变化则零改动）

## Interfaces

- Consumes: 既有 `--shadow-md` 令牌（themes.css，随 shadow-intensity 缩放）
- Produces: `.c-float-ball` hover = 上浮 + 中性投影，无 `.c-float-ball__glow` —— 独立交付

## 已知注意（交接沉淀）

- B6-2 静止态基线大概率零变化（glow 静止 opacity 0、box-shadow 静止态未改），先验证再决定是否 update-snapshots。
- `--shadow-md` 计算值在 Chromium 为 `rgb(...)` 中性色；若 hover 后 box-shadow 含 `color-mix` 残余即断言失败。
- Chromium 151 起 `getComputedStyle` 对 `::-webkit-slider-*` 伪元素样式反射失效（与 B6-2 无关但若断言涉伪元素须像素验证）。

---

## 实施步骤（TDD）

### Step 1: 写失败 e2e（tests/e2e/components-basic.spec.js 追加）

```js
test('B6-2：悬浮球 hover 中性投影（无彩色光晕 + 无 glow 元素）', async ({ page }) => {
  await page.goto('/?mode=app');
  const ball = page.locator('.app-main__float-ball .c-float-ball');
  await expect(ball.locator('.c-float-ball__glow')).toHaveCount(0); // glow 环已删
  await ball.hover();
  const shadow = await ball.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toContain('color('); // 非 color-mix 彩色阴影
  expect(shadow).toContain('rgb'); // 中性投影（--shadow-md 计算值）
});
```

> 注：`--shadow-md` 计算值在 Chromium 为 `rgb(...)` 中性色；若 hover 后 box-shadow 含 `color-mix` 残余即断言失败。

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-2"`
Expected: FAIL（glow 元素存在 / hover 阴影含 accent 彩）

### Step 3: 实现 float-ball.css 去光晕

`src/components/float-ball/float-ball.css` 删除 `.c-float-ball__glow` 全部规则（约 16-20 行），hover 阴影改中性：

```css
.c-float-ball:hover { transform: translateY(-2px);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
```

保留：静止态 `--glass-shadow` + 内高光、`translateY(-2px)`、backdrop-filter 玻璃底。

若 `float-ball.js` 模板渲染 `.c-float-ball__glow`，一并删除。

### Step 4: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-2"` → 绿；再跑 components-basic 全文件零回归

### Step 5: 视觉基线核验

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js` → 若静止态基线零变化（glow 静止 opacity 0、box-shadow 静止态未改），不 update-snapshots；若变化，先解码比对再 update。

### Step 6: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/components/float-ball/float-ball.css src/components/float-ball/float-ball.js tests/e2e/components-basic.spec.js
git commit -m "feat: 悬浮球 hover 去光晕（中性投影，删 glow 元素，B6-2）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本）。`playwright.config.worktree.js` 不得提交。
