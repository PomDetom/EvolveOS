# Task A6: 手机形态（底部横滑 + 全屏页面栈）— 执行报告

**分支**：`feature/iteration`
**日期**：2026-08-06
**状态**：完成（全量回归绿）

## 实现内容

### 手机形态结构（`src/app/app-main.js` / `app-main.css`）
- **媒体查询切换（同一 URL，无单独 query）**：`.app-main` 新增 `@media (max-width: 900px)`。桌面形态（≥900px）默认隐藏 `.app-main__stack` / `.app-main__dock`（`display:none`，不占网格单元），渲染与既有桌面级联双窗逐字节等价；≤900px 时双窗/内容区隐藏，网格切单列（`40px 1fr 64px`），底部 dock + 页面栈接管。
- **底部横滑应用栏（dock）**：`.app-main__dock` 内嵌 `mountNavWheel(..., { direction: 'horizontal', anchorRatio: 0.382 })` 横向应用轮，7 应用 icon 横排（名称隐藏，上下文由标题栏承担，与桌面纯 icon 栏同构）。**懒挂载**：桌面视口下 dock 为 `display:none`（`clientWidth=0` 会让几何 pad 计算失真），`isMobile()` 为真或 `matchMedia('(max-width: 900px)').change` 进入手机形态时才挂载一次。
- **全屏页面栈**：`.app-main__stack` 绝对定位页叠放，`.app-main__stack-page--push` slide 左进 `var(--dur-push)`（= `--dur-base*1.2` = 240ms）+ `--ease-spring`，只动 `transform`/`opacity`（红线）。栈为钻取路径：`基底概览 → 应用目录页 → 详情页`；设置经 ⚙ 推入设置页。
- **导航模型**：桌面/手机两套独立导航状态，经 `isMobile()` 运行时分支切换。`updateCtx` / `toggleSettings` 分别按当前形态分支（桌面分支逐字节不动）。
- **交互**：
  - dock 点击 = 一级导航（home→回基底；其他应用→推/替换目录页）。**推入由显式点击驱动**，滚动/吸附只更新轮内高亮（`onChange` 为 noop）——横滑浏览不弹页。dock 点击经 `pointerdown` 记录下标、`click` 消费（nav-wheel 对列表 `setPointerCapture` → click target 重定向到列表，不能据 `click.target` 找项，与桌面左窗同模式）。
  - 目录页点击目录项 → 详情页推入；栈内 `click` 委托统一处理返回/目录项/设置分区/概览快捷入口。
  - 返回：`.app-main__stack-back` 逐步 `popStack`（基底无返回按钮）。
  - 设置：⚙ → `pushStack({type:'settings'})`，分区 tab 横排切换 + 复用共享 `settings-pages`（8 分区）；再次点击 ⚙ toggle 弹回；⚙ 激活高亮随栈顶同步。外观分区定制器惰性挂载（容器为空即重挂）。
- **纯 UI 态**：页面栈状态会话内，不进配置存储。
- 悬浮演示（FloatBall/FloatStrip）手机视口隐藏，避免遮挡 dock。

### A2 Minor ① 闭环：horizontal 渲染层（`nav-wheel.js` / `nav-wheel.css`）
- 方案：**给 horizontal 提供独立 CSS，vertical 逐字节不动**。`mountNavWheel` 在 `direction==='horizontal'` 时给列表根加 `.c-navwheel__list--horizontal`；跳过顶部/底部竖向渐变遮罩插入（横排无竖向遮罩）。
- `.c-navwheel__list--horizontal`：`flex-direction: row` / `align-items: center` / `overflow-x: auto` / `overflow-y: hidden` / `touch-action: pan-y`（横向拖轮不吞页面纵向滚动）/ `padding: 0`（% 相对宽度在横排会撑爆纵向空间，首尾精确 padding 由 JS `paddingLeft/Right` 覆盖）。
- **间距修正**：基础 `.c-navwheel__item { margin: calc(gap/2) 12px }` 在横排会得 24px 项距 ≠ GAP 12，故 horizontal 项改 `margin: 0 calc(gap/2)`（主轴半间距 6px）+ `width: var(--navwheel-item-w, 64px)`，项中心距 = itemW + gap，与 `nav-wheel-geometry.js` 公式严格一致。
- `:root` 新增 `--navwheel-item-w: 64px`（新变量，vertical 无引用，零影响）。

### A2 Minor ④ 闭环：渲染级 horizontal 测试
- 原 `geometry.test.js` 的「horizontal 等价性」单测是恒真式（横/纵参数同值代入纯函数，只验证几何层方向无关，不验证渲染）。本任务 `mobile-nav.spec.js` 用例 6 补真实渲染验证：390×844 视口下底部 dock 横向排列（items x 递增）、横向拖拽 `scrollLeft` 增加、点击项 3 后 active 中心对齐 38.2% 锚线（`|center - listBox.x + width*0.382| < 5px`）。

## TDD Evidence

### RED（写失败测试 → 红）
命令：`npx playwright test tests/e2e/mobile-nav.spec.js --reporter=line`

预期失败原因：手机形态（dock/页面栈/horizontal CSS）尚未实现，`.app-main__stack` / `.app-main__dock` 不存在。

输出（节选）：
```
[6/6] ... horizontal 渲染层（闭环 A2 Minor ①/④）...
Error: locator.boundingBox: Test timeout of 30000ms exceeded.
  - waiting for locator('.app-main__dock .c-navwheel__list')
6 failed
```

### GREEN（实现后 → 绿）
命令：`npx playwright test tests/e2e/mobile-nav.spec.js --reporter=line`

输出：`6 passed (23.9s)`

实现中途发现并修复一处真 bug：dock 点击因 nav-wheel 的 `setPointerCapture` 使 click target 重定向到列表，`e.target.closest('.c-navwheel__item')` 恒 null → 改 `pointerdown` 记录下标 + `click` 消费（修复后 6 用例全绿）。

## 测试结果

| 项目 | 结果 |
|---|---|
| `mobile-nav.spec.js`（手机形态） | **6/6 通过**（390×844：手机形态/目录页推入/详情页推入/返回回退/设置推入/horizontal 渲染层） |
| `app-shell.spec.js`（桌面回归） | **14/14 通过**（桌面双窗级联零冲击） |
| 全量 `npm run test:e2e` | **110 通过**（含 docs 全量 + 36 视觉基线零变化 + 14 app-shell + 6 mobile-nav） |
| `npm test`（单测） | **45 通过** |
| `npm run build` | 通过（105 模块） |

## A2 Minor ①/④ 闭环说明
- **① horizontal CSS 方案**：独立 `.c-navwheel__list--horizontal` 分支（如上），vertical 默认无类、规则逐字节等价 → docs 84 e2e + 36 视觉基线 + app-shell 14 全绿零冲击。
- **④ 渲染级测试**：mobile-nav 用例 6 以真实浏览器渲染验证横排方向、横向滚动与 38.2% 锚点吸附（替代恒真式单测）。

## Files Changed
- `src/app/app-main.js` — 手机形态结构/页面栈/dock/媒体查询切换/上下文与设置分支（+197）
- `src/app/app-main.css` — `--app-dock-h` + ≤900px 媒体查询块（+69）
- `src/components/navigation-wheel/nav-wheel.js` — horizontal 类 + 跳过横向遮罩（+8/-2）
- `src/components/navigation-wheel/nav-wheel.css` — `--navwheel-item-w` + horizontal 独立规则（+23）
- `tests/e2e/mobile-nav.spec.js` — 新增 6 用例
- `docs/superpowers/sdd/task-A6-brief.md` — 随附任务书

## Self-Review Findings
- **动画红线**：页面栈 slide、设置/目录切换仅 transform/opacity；时长/曲线全经 CSS 变量（`--dur-push`/`--ease-spring`）；模糊不动画。✔
- **桌面零冲击**：`updateCtx`/`toggleSettings` 桌面分支逐字节不动；移动 DOM 桌面 `display:none`；nav-wheel 仅新增 horizontal 分支。app-shell 14 + 视觉基线 36 全绿。✔
- **零运行时依赖**：纯原生 JS/CSS。✔
- **代码风格**：局部类名 `.app-main__*`，BEM `c-` 前缀复用，与既有 app 壳风格一致；注释标注 Task 出处。✔
- **状态纪律**：页面栈/右窗状态均会话内纯 UI 态，不进配置存储。✔

## Issues / Concerns
1. **Minor**：dock 横滑滚动只更新轮内高亮，不回写标题栏上下文（与桌面左窗滚动即联动不同）——钻取模型下上下文应由页面栈承担，属有意设计；若用户希望 dock 滚动预览，可后续接 `onChange` 更新 ctx（不推页）。
2. **Minor**：手机设置页外观分区定制器每次进入设置会重建（`renderCustomizerGroups` 新增一次 store 订阅）——由「每次渲染容器为空即重挂」策略兜底正确性，订阅数随进入次数线性增长（每次仅 1 个，同步目标为已脱离 DOM 的旧容器，无视觉影响）。demo 壳可接受。
3. **Edge**：手机形态下按 Esc（桌面逻辑）会切桌面右窗状态，与手机栈状态不同步——手机键盘极少触发 Esc，风险可忽略。
4. 视口横纵切换（resize）时 dock 几何基于首次挂载视口；手机视口近似恒定，可接受。

---

## 修复循环 1（独立评审 Important #1）— dock 横滑浏览误触发页面推入

### 问题（评审原话要点）
dock 拖拽滚动后**必然**触发一次页面推入，违反「横滑浏览不弹页」设计意图：
nav-wheel 未 `preventDefault` pointerdown/pointermove，且 `setPointerCapture` 把随后的 `pointerup`
重定向到列表 —— 按浏览器规范任意 pointerup 后都会派发 `click`（Chrome 无位移抑制；
`touch-action: pan-y` 只把纵向 pan 交给浏览器，横向 touch 拖拽同样以 click 收尾）。
原 dock `click` 处理器消费 `pointerdown` 记录的下标时**无位移阈值**，浏览滑动即调
`handleDockTap` 推入/替换目录页。原拖拽测试只断言 `scrollLeft`，未断言页面栈数量，
故未暴露该问题。

### 修复方案（最小稳健）
`app-main.js` dock 事件：pointerdown 记录「所点项下标 + 起点 clientX/Y」，`click` 阶段按
位移阈值区分点按与横滑 —— `Math.hypot(e.clientX - x, e.clientY - y) > 10`（`TAP_MAX_MOVE`）
视为浏览拖拽直接忽略（不调 `handleDockTap`）。真点按位移 ≈ 0，点击推入行为不变。
未改动 nav-wheel（避免触碰既有 vertical/horizontal 行为面）。

### 覆盖断言
`tests/e2e/mobile-nav.spec.js` 用例 6（horizontal 渲染层）：拖拽结束后
`expect(page.locator('.app-main__stack-page')).toHaveCount(1)`（横滑浏览不弹页）。

### RED（先加断言、未修复）
命令：`npx playwright test tests/e2e/mobile-nav.spec.js -g "horizontal 渲染层"`
输出（节选）：
```
Error: expect(locator).toHaveCount(expected) failed
  - waiting for locator('.app-main__stack-page')
    14 × locator resolved to 2 elements
       - unexpected value "2"
1 failed
```
预期失败原因：拖拽后浏览器派发 `click` → dock 处理器无位移阈值消费下标 → 推入目录页，栈变 2 页。

### GREEN（修复后）
命令：`npx playwright test tests/e2e/mobile-nav.spec.js`
输出：`6 passed (24.0s)`

### 全量回归
- `npm run test:e2e` → **110 passed**（含 app-shell 14 桌面回归 + docs 84 零冲击 + 36 视觉基线零变化）
- `npm test` → 45 passed
- `npm run build` → 通过

### 变更文件
- `src/app/app-main.js` — dock 点击位移阈值（`TAP_MAX_MOVE = 10`）
- `tests/e2e/mobile-nav.spec.js` — 用例 6 增补覆盖断言
- `docs/superpowers/sdd/task-A6-report.md` — 本修复留痕

