# Task A5 报告：FloatStrip 悬浮条（横竖形态 / 四边磁吸 / 无边框）

- **日期**：2026-08-06
- **分支**：feature/iteration（Base：A4 修复后 47a1d76 / 本任务在 A4 全量回归之上）
- **提交**：见本账本（progress-app-shell.md）Task A5 条目

## What you implemented

### 组件 `src/components/float-strip/float-strip.js` + `float-strip.css`（新建）
- **接口**（与 brief Interfaces 一致）：
  - `renderFloatStrip({ content })` → `.c-strip`（`--strip-orientation: horizontal|vertical` 语义态 + `data-orientation`）
    > 内容区 `.c-strip__content` + hover 浮现 `.c-strip__ctrl`（旋转按钮 / 拖动柄 / 关闭按钮）。
  - `mountFloatStrip(root, { onStateChange, onClose })` → 交互挂载（旋转/拖动/磁吸/关闭），返回
    `{ setOrientation, getState }` 供宿主调用；`onStateChange({ orientation, snapped })` 回调。
  - `renderTokenMonitor({ value, status, trend })` → **token 监测内容模板**：数值 + 状态点
    （ok/warn/err → success/warning/danger 语义色）+ 迷你趋势条（纯 div + `transform: scaleY(var(--tbar))`，
    红线段）。供后续应用复用。
- **双形态**：旋转按钮 + 双击内容区**双通道**切换。`data-orientation` / `.c-strip--vertical` 翻转，
  容器 `flex-direction` 随形态 row→column（布局属性瞬时切换，**不动画**）。旋转切换的视觉过渡在
  `.c-strip__content` 上做**交叉淡入淡出**（`--rotating` 期间 opacity 0 + scale 0.95，只动 transform/opacity）。
  > 说明：`--strip-orientation` 值为 brief 规定的 `horizontal|vertical`（语义态），`flex-direction`
  > 无法直接消费该字面量，故布局规则经同源的 `[data-orientation]` 属性驱动，与 var 恒一致
  > （见 Issues ①）。
- **四边磁吸**：pointer 拖动（pointerdown/move/up + `setPointerCapture`，move/up 挂 window 兜底命中），
  内容区/拖动柄可拖；松手距屏幕边缘 **< 24px** 吸附贴边。**定位模型**：`position:fixed` 底右 dock
  （`right/bottom = --strip-gap`）+ 全部位移经 `transform: translate(dx,dy)`（`pos − 基准位`），
  **不触发布局动画**；吸附位移走容器 `transform` transition（`--dur-slow` 300ms spring）。
  拖动中 `.c-strip--dragging` 关过渡（跟手不滞后）；像素级移动阈值 2px（点击/双击不触发吸附）。
  吸附态加 `.c-strip--snapped` + `data-snapped` 边。
- **无边框内容优先**：常态 1px **透明**边框（border-width 恒定，hover 只换 border-color，无布局位移）+ 零标题栏；
  hover 浮现半透明细边框 + `box-shadow` + 迷你控制条（opacity 0→1 + pointer-events none→auto）。
  `backdrop-filter` 静态（永不动画）。时长/曲线全经 CSS 变量（`--dur-base/fast/slow`、`--ease-out/spring`）。

### 独立入口 `src/app/strip-main.js`（重写占位）
- `mountStripMode()`：body 级独立渲染一个 FloatStrip 实例（token 监测内容，`97.2% / ok / 7 段趋势`），
  挂 `document.body`，关闭即移除。`?mode=strip` 由 main.js 动态 import 进入。组件 CSS 随本模块按需加载
  （docs 不 import → 样式不进入 docs，零冲击）。Vite build 已确认 float-strip 拆为独立 chunk。

### 应用壳演示 `src/app/app-main.js` + `app-main.css`（仅 app 模式）
- 右下 FloatBall（复用 `renderFloatBall`/`mountFloatBall`，`iconName: 'bolt'`）；点击展开一个 FloatStrip
  模拟实例（右下贴边可拖），关闭移除、再点可重开；`.app-main__float-ball` / `.app-main__strip` body 级覆盖层
  （strip 宿主 pointer-events:none 不拦截应用交互，strip 自身再启用）。docs 互斥不并存。

### 测试 `tests/e2e/floatstrip.spec.js`（新建，6 用例）
渲染 / 旋转切换（类翻转 + flex-direction）/ 四边磁吸（拖动到左边缘 → `.c-strip--snapped` + 贴边
boundingBox）/ 无边框 hover 浮现（opacity + borderColor 计算样式）/ 双击旋转 / app 壳 FloatBall→FloatStrip。

## TDD Evidence

- **RED**：先写 6 用例 → `npx playwright test tests/e2e/floatstrip.spec.js` → **6 failed**：
  - `渲染`：`locator('.c-strip')` toHaveCount 收到 0（strip-main.js 仍是 console.info 占位，无 `.c-strip` DOM）
  - `旋转 / 磁吸 / 无边框 / 双击`：均因 `.c-strip` 不存在而超时失败
  - `app 壳`：`locator('.app-main__float-ball .c-float-ball')` toHaveCount 收到 0（app-main 未接 FloatBall）
  - 预期失败：组件/入口/演示均未实现。
- **GREEN**：实现组件 + 入口 + 演示后 → **6 passed**（含旋转后 flex-direction=column、磁吸贴边
  `|after.x| ≤ 2`、hover borderColor 由 transparent 变实色、双击旋转第二通道、app 壳点击出条）。

## Test results

- **floatstrip.spec**：6/6 绿。
- **全量 `npm run test:e2e`**：**104 passed** —— docs 模式 84 零冲击（回归零失败）+ 36 视觉基线零变化
  （visual-regression 全绿，快照文件无改动）+ app-shell 14/14 + floatstrip 6/6。
- **`npm test`**：45/45（单元测试零变化）。
- **`npm run build`**：通过（105 modules，672ms；`dist/assets/float-strip-*.css/js` 独立 chunk 按需加载）。

## Files changed

- `src/components/float-strip/float-strip.css`（**新建**）
- `src/components/float-strip/float-strip.js`（**新建**：renderFloatStrip / mountFloatStrip / renderTokenMonitor）
- `src/app/strip-main.js`（重写：`?mode=strip` 独立渲染）
- `src/app/app-main.js`（右下 FloatBall + FloatStrip 模拟演示，仅 app 模式）
- `src/app/app-main.css`（`.app-main__float-ball` / `.app-main__strip` 覆盖层）
- `tests/e2e/floatstrip.spec.js`（**新建**，6 用例）

## Self-review findings

- **红线合规证据**（旋转 / 磁吸 / 浮现）：
  - 旋转：`.c-strip__content` 过渡仅 `opacity + transform`（交叉淡入淡出）；容器 `flex-direction` 经
    `data-orientation` 瞬时切换（无 width/height/left/top 过渡）；容器 transition 列表仅
    `transform / border-color / box-shadow`。
  - 磁吸：全部位移 `transform: translate`，吸附位移走 transform transition（`--dur-slow` spring）；
    **无任何 layout 属性动画**（无 width/height/left/top/margin/padding 在 transition/animation 中）。
  - 浮现：`.c-strip__ctrl` opacity + transform + border-color（border/box-shadow/color 为 paint-only 豁免）；
    `backdrop-filter` 静态、永不动画；时长/曲线全经 CSS 变量；`data-motion=off`/reduced-motion 时长归零后
    JS 旋转延迟同步归零（`readDur('--dur-base')`）。
- **docs 零冲击**：float-strip CSS 仅经 strip-main / app-main 动态 chunk 按需加载，docs 模式不 import；
  `.c-strip__*` / `.c-tmon__*` 类名全部组件局部，不进入 docs DOM/样式 → 36 基线像素级零变化 + 84 docs e2e 零失败。
- **隔离**：app 演示（`.app-main__float-ball` / `.app-main__strip`）仅 app 模式出现，body 级覆盖层，
  strip 宿主 pointer-events:none 不拦截应用交互；app-shell.spec 14 例全绿（球/条不干扰既有点击路径）。
- **零运行时依赖**：仅原生 JS，无新增依赖；遵循既有组件风格（BEM `c-` 前缀、icon(name,size)、
  `calc(var(--radius-*) * var(--radius-scale))`、令牌引用禁硬编码）。
- **TDD 纪律**：先红后绿（6 红 → 6 绿），提交前全量回归 + build。

## Issues / concerns

- 无 blocker。观察项：
  1. **`--strip-orientation` 语义态 vs flex-direction**：brief 规定 var 值为 `horizontal|vertical`
     （语义态），`flex-direction` 不消费该字面量，故布局经同源的 `data-orientation` 属性驱动
     （CSS 注释已说明）。若需「布局字面量经 var」可在未来把 var 定义为 `row|column` 并保留
     `horizontal|vertical` 另设语义态 —— 本任务按 brief 字面值实现。
  2. **旋转锚点**：已吸附边旋转后按新尺寸重新贴边（保持吸附不变量）；自由位旋转后夹在视口内
     （transform 定位）。自由位旋转保持左上角锚点，dock 角控件旋转后可能轻微位移 —— 可接受，未断言。
  3. **磁吸阈值语义**：默认 dock（底右 gap 16 < 24）本身即吸附区，小幅拖动松手会吸附贴边（0 gap）——
     符合「<24px 吸附」规格，属预期行为。
  4. **e2e 覆盖**：旋转/磁吸/浮现断言了类与计算样式（transform 恒 matrix 故不直接断言矩阵）；
     关闭按钮行为由 app 演示用例隐式覆盖（未单独断言移除 —— 可留给 A6/收尾）。
