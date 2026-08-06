# Task B1-1 执行报告：设置分区扩展（组件/动效分区 + 展示内容内化）

- 状态：DONE
- 提交：`feat: 设置分区扩展（组件/动效分区 + 展示内容内化）`
- 执行日期：2026-08-06

## 目标与约束回顾

把 docs 展示内容（组件矩阵 / 动效实验室 / 剪贴板悬浮窗）**内化为应用壳设置的分区**，为 B1-4 删除 docs 页铺路。硬约束：`SECTIONS` 共享 8 分区不动（docs 设置场景 `settings-window.js` + `scene-settings.spec` count 8 零冲击），新增 `APP_SECTIONS` 10 分区给应用壳专用。

## What I implemented

### 1. settings-pages.js（共享模块，SECTIONS 保持 8）

- 新增导出 `APP_SECTIONS = [...SECTIONS, { id:'components', name:'组件', icon:'box' }, { id:'motion', name:'动效', icon:'sparkles' }]` —— **追加到 SECTIONS 尾部**，故实际序为 通用0/外观1/界面2/快捷键3/通知4/数据5/高级6/关于7/**组件8/动效9**（不是 brief Step 1 注释里的 组件2/动效3，见 Self-review）。
- `pageBody` 增加 `components`/`motion` 分支：返回 `<div class="app-partition" data-partition="components|motion"></div>`（空容器，展示内容由 app-main.js 首次激活时惰性挂载）。docs 设置场景永远不触发这两 id。
- `renderSettingsPages(sections = SECTIONS)` 参数化：docs 调用方不传参 → 8 分区（零冲击）；应用壳传 `APP_SECTIONS` → 10 分区页。这是 brief「统一切 APP_SECTIONS」的必要落地（brief 未显式写参数化，属隐含要求）。
- 顶部自 import `./settings-window.css`（Vite 去重，双引无害；保证 app 分区渲染样式完整，B1-4 移除 main.js 静态引用后仍完整）。

### 2. app-main.js（应用壳）

- import 改 `{ APP_SECTIONS, renderSettingsPages, mountSettingsInteractions }`；**全部 SECTIONS 引用统一切 APP_SECTIONS**：桌面设置轮 items（原 line 157）、桌面 updateCtx（原 215）、手机设置 tabs（原 341-342）、手机 settings 页 `renderSettingsPages(APP_SECTIONS)`（原 344）、手机 updateCtxMobile（原 415）。
- 新增分区惰性挂载 helper：`mountComponentsPartition(part)` / `mountMotionPartition(part)` —— 动态 `import()` 展示模块（`Promise.all` 组件 + 剪贴板悬浮窗两模块 / motion 单模块），挂载前按 `part.children.length` 空态防御并发竞态。组件分区末尾追加「组合示例：剪贴板悬浮窗」`mountClipboardFloat(part)`（复用既有场景模块，`.cfloat` 流式 in-flow 不遮挡分区）。
- `setSettingsPageActive`（桌面路径）：`components`/`motion` 首次激活时模块级标志 `componentsMounted`/`motionMounted` 先置位（防 import 异步期间切走再切回重复挂载），再挂载。
- `activateMobileSettings`（手机路径）：组件/动效按 `!part.children.length` 惰性挂载（复用同一 helper）。**背离 brief「与桌面共用模块级标志」**：手机页面栈每次 `renderStack` 重建 DOM，容器重建后为空而标志仍 true 会漏挂；按空态判断（外观定制器同款既有模式）才能正确处理手机重进设置。功能上两路径各自只挂一次。

### 3. 展示模块自身 import CSS（内化解耦 docs）

- `component-showcase-full.js` → `import './component-showcase-full.css';`
- `motion-lab.js` → `import '../styles/motion-lab.css';`（**brief 给的 `'../../styles/motion-lab.css'` 相对路径错误**：从 `src/demo/` 出发应为 `../styles/`，`../../` 解析到仓库根不存在的 `styles/`，build 报 Could not resolve；已修正）
- `clipboard-float.js` → `import './clipboard-float.css';`
- main.js 现有静态 import 保留（Vite 按模块去重，双引无害；B1-4 才删）。

### 4. partitions.css（新建，src/app/）

局部类名 `.app-partition`（避免与 docs 计数断言冲突）：容器间距、分区标题 `<h2>`（组件/动效实验室，压掉 base reset 默认边距并对齐壳内页面标题规格）、`.ml-lead` 说明、`.cfloat` 组合示例间距。**可交互悬浮窗实例遮挡处理**：`.csg-fwin .c-fwin` 默认 fixed 于视口右下（bottom:24/right:24），与应用壳右下 FloatBall 演示（bottom:16/right:16，Task A5）重叠 —— 用 `.app-partition .csg-fwin .c-fwin { right:24px; bottom:96px; }` 抬高到 FloatBall 之上避免遮挡（仅视觉微调，不动组件默认位，docs 展示仍贴底）。`.cfloat` 组合示例本身 `.cfloat .c-fwin { position:relative }` 流式 in-flow，不遮挡分区内容（无 fixed 问题）。

### 5. tests/e2e/app-shell.spec.js

- 3 处既有断言 `.app-main__nav-r .c-navwheel__item` count 8 → 10（设置模式轮现为 APP_SECTIONS 10 项，这是切 APP_SECTIONS 的自然结果）。
- 新增用例「设置分区包含组件/动效且挂载展示内容」：count 10 → 点组件（nth 8）→ `.csg` count 7 + `.cfloat` 可见 → 点动效（nth 9）→ `.ml-grid` 可见 + `.ml-card` count 5。

## TDD Evidence

### RED

命令：`npx playwright test tests/e2e/app-shell.spec.js`

```
Error: expect(locator).toHaveCount(expected) failed
Locator:  locator('.app-main__nav-r .c-navwheel__item')
Expected: 10
Received: 8
  14 × locator resolved to 8 elements
       - unexpected value "8"
4 failed …（新用例在 count 10 断言即失败；3 处既有 8→10 断言同因 APP_SECTIONS 未实现而红）
13 passed (1.3m)
```

为何预期失败：APP_SECTIONS/分区挂载尚未实现，设置轮仍是 SECTIONS 8 项、无组件/动效分区页。

### GREEN

命令：`npx playwright test tests/e2e/app-shell.spec.js`

```
✓ 17 … › 设置分区包含组件/动效且挂载展示内容
17 passed (40.4s)
```

（中间经历两次「实现核对」修正：① APP_SECTIONS 实际序为 组件8/动效9 而非 brief 注释的 2/3；② 组件分区实际 7 个 `.csg`（6 组矩阵 + 1 个交互悬浮窗实例块 `csg csg-fwin`）而非 brief 的 6 —— 均以模块真实输出为准。）

## Test results

| 验证 | 命令 | 结果 |
|---|---|---|
| 全量 e2e | `npm run test:e2e` | **119 passed / 0 failed**（含 docs 84 零冲击 + scene-settings count 8 绿 + app-shell 17 + visual-regression 全绿） |
| 单测 | `npm test` | **51 passed**（8 文件） |
| 构建 | `npm run build` | **通过**（106 modules，app-main/partitions 等 chunk 正常产出） |

说明：首次全量跑为 118 passed + 1 failed（visual-regression `scenes · dark / emerald`，823px / 0.01% 像素差）——经单独重跑该 spec **42 全过**，确认是 Windows GPU 文字抗锯齿跨实例抖动（playwright.config 与 src/CLAUDE.md 均记载此已知偶发），**非本次改动引起**（本次改动对 docs 模式零 CSS/DOM 变化：partitions.css 仅 app 模式 import；demo 模块 CSS import 与 main.js 静态引用去重；settings-pages 的 CSS import 去重）。后续干净全量 119 全绿。

## Files changed

- `src/scenes/settings-window/settings-pages.js`（修改）
- `src/app/app-main.js`（修改）
- `src/app/partitions.css`（新建）
- `src/demo/component-showcase-full.js`（修改：自 import CSS）
- `src/demo/motion-lab.js`（修改：自 import CSS）
- `src/scenes/clipboard-float/clipboard-float.js`（修改：自 import CSS）
- `tests/e2e/app-shell.spec.js`（修改）

## Self-review findings

- **brief 内部不一致均已实现核对修正**：
  1. APP_SECTIONS 序 —— brief Interfaces 定义 `[...SECTIONS, components, motion]` 为权威（追加到尾部），Step 1 注释「通用0/外观1/组件2/动效3」与自身定义矛盾；brief 亦注明「实现后核对实际索引」，实际序 组件8/动效9，测试已改 nth(8)/nth(9)。
  2. `.csg` 计数 —— 模块真实输出 7（6 组 `group()` + `fwinBlock` 类 `csg csg-fwin`），brief 写 6；改为 7（不动共享 docs 模块的类结构，避免波及 float-components.spec 的 `.csg-fwin` 选择器）。
  3. motion-lab.css 相对路径 —— brief 的 `../../styles/` 错误（build 实证 Could not resolve），修正为 `../styles/`。
  4. 手机路径「共享模块级标志」—— brief 前提「两路径共享同一 .csettings__page DOM」与实际架构不符（手机栈每次 renderStack 重建 DOM）；改用外观定制器同款 `!children.length` 空态挂载，正确处理手机重进设置。
- **代码分包现状**：动态 `import()` 机制已就位，但因 docs 仍静态 import 三个展示模块，Vite 目前将其并入入口 chunk（无独立懒 chunk）；B1-4 移除 docs 静态引用后即真正分包（符合任务渐进设计）。
- 动画红线复核：未新增任何动画/过渡；展示模块动画（transform/opacity）沿用既有实现；分区挂载无动画。
- 文档纪律：报告随代码提交；未提交非本任务文件（plans/Cargo.toml/progress-b1.md 归编排器所有）。

## Issues / concerns

- **手机路径 motion-lab 订阅无退订**（Minor，既有限制）：`mountMotionLab` 内部 `subscribe(...)` 不返回退订函数；手机重进设置会重挂并新增订阅（桌面路径只挂一次）。与闭环 M1 的定制器退订不同，motion-lab 模块本身不暴露退订 —— 超出本任务范围，记入执行留痕留给收尾（B 系列后续或 B1-2+ 可补）。e2e 无覆盖，功能不受影响。
- `renderSettingsPages` 参数化是 brief 未显式写的必要细化（否则应用壳无法渲染 10 分区页）；默认参数保持 docs 8 分区零冲击。
- 视觉项（分区内 h2 层级、fwin 与 FloatBall 错位）按 brief「视觉归 B2」以最小改动处理，细节留 B2。
