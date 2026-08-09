# Task B6-2 报告：悬浮球去光晕（删 glow 环 + hover 中性投影）

- **任务**: B6-2（来源：`docs/superpowers/sdd/task-B6-2-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md` §4）
- **分支**: `feature/b6-page-style-refresh`（共享 checkout，无 worktree 隔离）
- **状态**: DONE

## 实施内容

1. **`src/components/float-ball/float-ball.css`** — 删 `.c-float-ball__glow` 全部规则（glow 环定位/渐变/透明度过渡 + `:hover .c-float-ball__glow` 显现），hover 阴影 `0 8px 22px var(--accent-300)` → 中性 `var(--shadow-md)`（`0 4px 16px`，随 shadow-intensity 缩放，不硬编码）。保留 `translateY(-2px)` 上浮、`inset 0 1px 0 rgba(255,255,255,.3)` 内高光、静止态 `--glass-shadow`、backdrop-filter 玻璃底。
2. **`src/components/float-ball/float-ball.js`** — `renderFloatBall` 模板删除 `<span class="c-float-ball__glow">` 渲染点；顶部注释同步（40px 渐变光晕 → 44px 玻璃底 + B6-2 去光晕说明）。`component-showcase-full.js` 复用同一 `renderFloatBall`，展示矩阵 glow 随之消失，无需单独改动。
3. **`tests/e2e/components-basic.spec.js`** — 新增 B6-2 用例（见下方 TDD 适配说明）。

## TDD 证据（RED → GREEN）

**Step 1-2 RED**（实施前，源码未动）：
```
npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-2"
1 failed
  expect(locator).toHaveCount(0) failed
  Locator:  locator('.app-main__float-ball .c-float-ball').locator('.c-float-ball__glow')
  Expected: 0  Received: 1   Timeout: 5000ms
  「14 × locator resolved to 1 element - unexpected value "1"」
```
预期内：glow 环尚在 DOM（count=1），断言 0 失败。hover 阴影断言（`not.toContain('color(')` / `toContain('rgb')` / `16px` / `not 22px`）位于 count 断言之后，未执行即中止。

**Step 4 GREEN**（实现后）：
```
npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-2"
1 passed
```
components-basic 全文件 5 passed（含既有 B5-3 悬浮球玻璃底用例，零回归）。

## 测试用例适配说明（brief verbatim 在本环境不红，必须改）

brief Step 1 的 verbatim 用例照抄在本代码库**不是 RED**，两个根因（均已记录在用例注释）：
- **悬浮球挂载竞态**：`page.goto('/?mode=app')` 后悬浮球由壳挂载期惰性 append（`app-main.js` L713）。直接对 `ball.locator('.c-float-ball__glow')` 断言 `toHaveCount(0)`，Playwright 在球未挂载时解析到空 DOM → count=0 立即通过（实测首跑 GREEN 即因此）。修复：先 `await expect(ball).toBeVisible()` 等挂载，再断言 count。
- **`--accent-300` 非 color-mix**：themes.css 中 `--accent-300` 为纯 hex（如 indigo `#c4b5fd`），非 color-mix；计算值为 `rgb(...)`，不含 `color(` 残余。brief 注「若 hover 后 box-shadow 含 color-mix 残余即断言失败」在本库不成立 —— 旧彩影 `0 8px 22px var(--accent-300)` 计算值恰为 `rgb(160,169,249) 0px 8px 22px`，同时满足 `not.toContain('color(')` 与 `toContain('rgb')`。修复：追加 blur-16 特征值判别 —— `--shadow-md` = `0 4px 16px`（`toContain('16px')`），旧彩影 blur-22（`not.toContain('22px')`），实测旧代码两条均失败。

保留 brief 两条原断言（`not.toContain('color(')` + `toContain('rgb')`）作守卫，另加挂载等待与 blur 特征值判别，确保用例**真红真绿**地验证「删 glow + 中性投影」需求。

## 视觉基线（Step 5，先实测后决定）

`npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js` → **24 passed，零基线变化**。静止态 glow 本就 opacity 0、静止 box-shadow 为 `--glass-shadow`（未改），基线不涉及 hover 态 → **不 update-snapshots**（符合 brief「静止态无变化则零改动」）。

## 全量回归（Step 6）

- `npx playwright test --config=playwright.config.worktree.js` → **113 passed，2 flake**（均隔离重跑绿，与本次改动无关，见下）
- 两个 flake：`app-shell.spec.js:270` 设置分区挂载展示内容、`title-bar.spec.js:25` 注入 mock windowApi 三按钮调用 —— 全量并行负载下的既有时序抖动（B6-1 会话亦有同型「components/motion 挂载」flake 记录），隔离运行均 `1 passed`。B6-2 改动仅涉 float-ball CSS/JS + 一个 e2e 用例，不触及 title-bar/分区挂载路径。
- `npm test` → **15 files / 69 passed**
- `npm run build` → **✓**（built in 404ms）

## 文件变更

- `src/components/float-ball/float-ball.css`、`src/components/float-ball/float-ball.js`
- `tests/e2e/components-basic.spec.js`
- 视觉基线零改动（未生成快照）

## 提交

- feat `1cd42a3`：悬浮球 hover 去光晕（中性投影，删 glow 元素，B6-2）
- docs `56b9f81`：B6-2 交接（报告 + 账本进度 + brief）；docs `82060cf`：任务清单勾选

## 自评

- **完整性**：glow 全删（CSS 规则 + JS 模板渲染点，含展示矩阵共用渲染路径）、hover 中性投影、TDD RED→GREEN、全量回归绿 ✓
- **质量**：沿用既有 `--shadow-md` 令牌与逗号多影写法、CSS 变量、现有代码风格；注释同步避免误导 ✓
- **纪律**：材质体系（themes.css 亚克力配方）、`--font-mono`、配置链路（defaults→store→apply）、`playwright.config.worktree.js` 均未触碰/未提交 ✓
- **动画红线**：hover 只动 transform（上浮）+ box-shadow（中性投影，paint-only 豁免）；删掉的 glow 为 opacity 过渡（本就豁免）✓
- **零运行时依赖**：未加任何依赖 ✓

## 备注 / 关注点

- brief verbatim 用例不红的问题（挂载竞态 + accent-300 非 color-mix）是 brief 作者对 accent 令牌构成的误判，非缺陷；用例已按真实 RED 判别适配，并在用例注释与本报告说明，后续 B 系列任务若复制该用例模式可直接参考。
- `--shadow-md` 计算值在浅色为 `rgba(20,24,40,·)`、深色为 `rgba(0,0,0,·)`，均含 `rgb` 且 blur-16，判别稳定。
