# Task A3 Report — 应用壳骨架（双窗口级联 + 标题栏上下文 + 7 模块占位）

**Status:** DONE
**日期:** 2026-08-05
**分支:** feature/iteration

## What I implemented

`src/app/app-main.js` 由 Task A1 占位（console.info 空实现）实现为完整应用壳骨架，新增 `src/app/app-main.css`，新建 `tests/e2e/app-shell.spec.js`（8 用例）。`src/main.js` 无需改动 —— A1 已留动态 import（`mountAppMode` 现为真实实现）。

### MODULES 扩展契约
```
模块注册 = { id, name, icon, dir: [目录项...], render: (ctx) => HTML }
目录项 = { id, name, icon }
ctx = { module, dirId, dirName }（active 模块取当前目录项，其余取各自首目录项）
```
- 左窗 7 模块：概览 home / 剪贴板 clipboard / 密码 key / 记账 wallet / 搜索 search / 帮助 help / 关于 info（纯 icon）。
- 右窗目录（每应用 2-4 项）：剪贴板→历史/固定/分组；密码→全部/分组/回收站；记账→概览/流水/分类；搜索→全部/网页/文件；帮助→使用/常见问题；关于→版本/许可；概览→`dir: []`（右窗显示空提示「无子目录」，且不展开）。
- 占位页渲染 `placeholderPage(ctx)`：页面头（应用名 + › 目录项）+ EmptyState（图标 + 功能开发中 + 接入说明）。概览页 `renderOverview()`：欢迎卡 + 7 快捷入口卡（点击 = 展开右窗 + 切到该应用）+ 主题状态卡（读 `data-theme`/`data-accent`）。
- 后续填充真实功能只改 MODULES（增/改模块项、目录项、渲染函数），壳逻辑不变。

### 纯图标方案（nav-wheel 组件零改动）
- 左右窗均为 `mountNavWheel` 实例（`anchorRatio: 0.382`、vertical），items 传 `{id, name, icon}`；name 经 `app-main.css` 局部类名隐藏（`.app-main__nav-l .c-navwheel__name { display: none }`）+ `justify-content: center` 居中图标。
- **未改 nav-wheel 组件** —— 无新增选项、无行为变更，docs 84 逐字节等价（nav-wheel.js `git diff` 为空）。

### 右窗收起三通道
1. 右窗顶部返回按钮（`.app-main__nav-r-back`，chevron-left）→ `collapseRight()`
2. 再次点击左窗已选中项 → toggle（见下方「关键实现细节」）
3. Esc（document keydown）→ `collapseRight()`

### 动画细节（红线：只动 transform/opacity）
- **右窗推入/收起**：网格列 `--app-nav-r-w`（收起 0px / 展开 64px）**瞬时切换**（不动画布局），面板自身 `transition: transform var(--dur-push) var(--ease-spring), opacity var(--dur-push) var(--ease-spring)`；`--dur-push: calc(var(--dur-base) * 1.2)` = 240ms，随 `data-motion="off"`/reduced-motion 一并归零。面板宽恒 64px（`translateX(-100%)` 基于自身宽，收起时滑出至左窗之上，z-index 浮层）。
- **内容区切页**：`.app-main__page-body` 重建时 `animation: app-main-page-in var(--dur-fast) var(--ease-out)`（120ms fade + translateY 4px），模块切换与目录项切换共用。
- hover 仅 color/background（paint-only 豁免）；backdrop-filter 静态不动画。
- 单窗口态：右窗 `visibility:hidden` + `aria-hidden=true`；内容区 = 左窗选中应用首屏（概览为默认）。

### 关键实现细节（调试发现的 nav-wheel 行为）
- **子像素滚动偏差致 onChange 补发**：`animateScrollTo` 目标 `64.24px` 被浏览器钳为整数 `scrollTop=64`，`snapNow` 守卫（0.05px 容差）未跳过 → 对同 id 补发第二次 `onChange`（点击后 ~400ms）。docs 中该补发幂等不可见；app 的「二次点击已选中项收起」若据 onChange 判定会被误触发收起。
- **解决（app 侧，不改 nav-wheel）**：`onLeftSelect` 对同 id 一律 no-op（只 `setModule` 处理新 id）；「二次点击已选中项」由 navL 上独立 `pointerdown`（记录所点项当时是否已选中 `downWasActive`）+ `click`（据此 toggle，且 `dir.length` 守卫）判定。首开不误收、二次点击精确收起、snap 补发不干扰。

## TDD Evidence

### RED
- 步骤：先写 `tests/e2e/app-shell.spec.js`（8 用例），此时 `mountAppMode` 仍是 A1 占位（无 `.app-main` DOM）。
- 命令：`npx playwright test tests/e2e/app-shell.spec.js`
- 输出（摘要）：`8 failed`（壳结构 → 概览页结构），全部因 `locator('.app-main')` 等元素不存在（`element(s) not found`）。
- 为何预期失败：应用壳 DOM/逻辑尚未实现。

### GREEN（迭代两次）
- 首次实现后：2 passed / 6 failed —— 状态机与内容联动正确（标题栏上下文用例绿），但右窗保持 `visibility:hidden`（见上文 snap 补发问题，`aria-hidden=true` 泄露 rightOpen 已回退）。
- 修复（app 侧 toggle 判定）后：**8 passed (11.1s)**。

## Test results

| 命令 | 结果 |
|---|---|
| `npx playwright test tests/e2e/app-shell.spec.js` | **8/8** |
| `npx playwright test`（全量 e2e） | **92/92**（docs 84 零冲击 + 新 8） |
| `npm test` | **45/45** |
| `npm run build` | **通过**（102 modules；app-main 独立 chunk 6.21 kB，docs 默认路径零额外加载） |

视觉基线：未改动（36 张 docs 基线零变化，`visual-regression` 全绿）。应用壳基线由 Task A7 增加。

## Files changed

- `src/app/app-main.js`（占位 → 完整骨架，288 行）
- `src/app/app-main.css`（新建，3.87 kB chunk）
- `tests/e2e/app-shell.spec.js`（新建，8 用例）
- `src/main.js`（**未改动** —— A1 已接好动态 import）
- `docs/superpowers/sdd/task-A3-report.md`（本报告）

## Self-review findings

- **完整性**：brief 全部接口齐备（`.app-main` grid/标题栏 `[data-ctx]`/左 7 模块/右目录/级联/三通道收起/单窗口态/占位页/概览页）；MODULES 扩展契约驱动；DOM 实测：单窗口内容 x=64、双窗口右窗 x=64 + 内容推至 x=128。
- **纪律**：TDD 先红后绿（RED 8 失败 → GREEN 8 绿）；动画红线只动 transform/opacity（网格列瞬时切换不动画布局）；时长经 CSS 变量（`--dur-push` 派生自 `--dur-base`，动效关停归零）；零新依赖；测试仅在 Web 执行；局部类名 `.app-main__*` 与 docs 隔离。
- **质量**：nav-wheel 零改动（纯 icon 经 CSS 隐藏）；右窗状态纯 UI 态不进 store；`setDir`/`setModule` 幂等守卫防 onChange 回环。
- **遗留（Minor）**：① 概览无目录 → 右窗空提示「无子目录」分支仅防御性存在（概览不展开右窗，正常路径不可见）；② `downWasActive` 对「pointerdown 在已选中项上但随后拖拽 >5px」的极端拖拽场景可能误判（浏览器拖拽通常不派发 click，风险极低）；③ 主题状态卡为静态渲染（不在配置变化时实时刷新，A4 设置模式时评估）。

## Issues / concerns

- **nav-wheel 是否改动：未改动**。纯图标经 app-main.css 局部类名隐藏实现，符合约束「若必须改 nav-wheel 只能新增可选参数」的最低要求 —— 实际上无需改组件。
- **已记录（供后续任务知悉）**：nav-wheel `snapNow` 对同 id 的 onChange 补发（子像素滚动偏差 <1px > 0.05px 守卫容差）是既有组件行为，docs 幂等不可见；A6 手机形态复用 nav-wheel 时若依赖 onChange 做 toggle 类判定需注意（本任务已用 app 侧 click 判定规避）。
