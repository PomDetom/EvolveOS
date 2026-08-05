# SDD ledger — 应用壳实施（2026-08-05 起）

Base: 47a1d76（branch feature/iteration，自 main 检出）

规格：docs/superpowers/specs/2026-08-05-app-shell-ui-design.md
计划书：docs/superpowers/plans/2026-08-05-app-shell.md

## Pre-flight 决策（2026-08-05，用户确认）

1. **A2 基线重生成范围**：接受 **24 张**（scenes/main-window/settings-window/components × 2 主题 × 3 accent）——`#components` 展示区挂有导航轮实例（component-showcase-full.js:89），锚点变化必然移动其 focal 峰值/初始 padding，`components-*.png` 6 张一并重生成。计划「18/18」数字更新为「24/12」（不变：tokens/clipboard）。
   - **A2 落地修订**（2026-08-05，实施实测）：最终重生成 **18 张**（scenes/main-window/settings-window × 2 主题 × 3 accent）。`components-*.png` 6 张实测**零变化**——展示轮 `.c-navwheel--demo` 未进入 `#components` 全元素截图的捕获（该区域新旧基线均为纯背景，预存渲染现象，非本任务引入）。tokens/clipboard 零变化（18 张不变）。差异区域经解码比对确认仅导航轮图标带竖向条（锚点位移），内容页像素级不变。
2. **A1 docs 顶栏**：按计划**不加**「应用壳」链接——docs 模式逐字节等价（84 e2e + 基线零冲击硬门槛），应用壳入口经 `?mode=app` / README 说明。

## Task A1: 双模式入口（mode 解析 + docs 渲染搬移）

- **状态**：完成（2026-08-05）
- **提交**：`cf7f52f` `feat: 应用/文档双模式入口`
- **验证**：npm test 41/41（+5 mode.test.js）；npm run test:e2e 84/84（36 基线零变化）；npm run build 通过；手动 Playwright 4 分支（docs/app/strip/Tauri 探测）正确
- **实现**：`src/app/mode.js` `resolveMode(params, hasTauri)` 纯函数（显式优先/非法回落 docs/Tauri 探测注入）；`src/docs/docs-mode.js` docs 渲染逐字节搬移（模板字面量字节等价）；`src/main.js` 只留 CSS + 模式分支 + 动态 import；`src/app/app-main.js` + `src/app/strip-main.js` Task A3/A5 最小占位（build 可解析）
- **简报/报告/审查包**：docs/superpowers/sdd/task-A1-brief.md / task-A1-report.md / review-A1.diff
- **评审**：规格 ✅ / Approved（0 Critical/Important）
- **Minor 留收尾**：① `?mode=strip` 未入单测（与显式分支共用，A5 落地时补 1 例）；② main.js:46 `typeof window !== 'undefined'` 冗余守卫（浏览器入口恒真，无害）；③ docs 静态 import 使主 chunk 含 docs 依赖树（与旧 main.js 同，A3 起 app 变生产路径时可考虑 docs 改动态）

## Task A2: NavigationWheel 几何参数化（黄金比例锚点 + 方向）

- **状态**：完成（2026-08-05）
- **提交**：`70f8a7d` `feat: NavigationWheel 黄金比例锚点（38.2%）+ 方向参数化`；`6bbea44` `docs: Task A2 执行留痕`
- **验证**：npm test 45/45（geometry 9→13）；npm run test:e2e 84/84；npm run test:visual 36/36（18 张重生成）；npm run build 通过
- **实现**：`nav-wheel-geometry.js` 参数化（anchorY / scrollTopForAnchor / findNearestIndex(+anchorRatio)，focal offset 相对锚线，删 itemCenterY/scrollTopForCenter）；`nav-wheel.js` `mountNavWheel({items,onChange,anchorRatio=0.382,direction='vertical'})` + AXIS 主轴抽象（scrollTop↔scrollLeft、translateY↔translateX 等）+ 非对称首尾 padding（两端都达锚点）；`nav-wheel.css` 无 JS 回退 → 38.2%/61.8%
- **基线重生成**：实际 **18 张**（非 24）——`components-*.png` 6 张实测**零变化**：展示轮 `.c-navwheel--demo` 未进入 `#components` 全元素截图捕获（该区域新旧基线均为纯背景，预存渲染现象，非本任务引入），经解码比对确认差异仅导航轮图标带竖向条（锚点位移），内容页像素级不变。tokens/clipboard 零变化。
- **简报/报告**：docs/superpowers/sdd/task-A2-brief.md / task-A2-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，5 Minor）
- **Minor 留收尾**：① horizontal 渲染层未闭环（无实例挂载，方向等价性仅几何层单测；A6 落地时补渲染级测试 + 修正 AXIS 假设——AXIS map 假定 marginLeft=6px，实际 CSS 横排 margin 12px，横向间距 24px≠GAP 12，且 flex-direction/overflow-y 未随方向切换，A6 横滑落地前必须处理）；② focal 衰减在视口边缘不对称（38.2% 锚线上缘 t=0.588 保热、下缘 t=0.951 冷，视觉后果 A6/A7 观察）；③ `anchorY` 5 参签名含未用参数（viewportLength/anchorRatio，按 brief 接口保留；可选精简为 3 参）；④ 「horizontal 等价性」单测是恒真式（同参调同函数断言相等，仅证确定性），A6 补渲染级测试

## Task A3: 应用壳骨架（双窗口级联 + 标题栏上下文 + 7 模块）

- **状态**：完成（2026-08-05）
- **提交**：`9a481a1` `feat: 应用壳骨架（双窗口级联 + 7 模块占位）`
- **验证**：npm test 45/45；npm run test:e2e 92/92（app-shell 8/8 + docs 84 零冲击）；npm run build 通过
- **实现**：`src/app/app-main.js`（A1 占位 → 完整壳）：MODULES 扩展契约（模块项 + 目录项 + 页面渲染函数，7 模块 dir 2-4 项）；左右窗 NavigationWheel（anchorRatio 0.382，纯 icon 经局部类名隐藏 name —— nav-wheel 组件零改动、docs 字节等价）；标题栏 `[data-ctx]`「应用名 › 页面名」联动；右窗收起三通道（返回按钮/二次点击左选中/Esc）；单窗口态默认概览页；EmptyState 占位页 + 概览页（欢迎卡 + 7 快捷入口 + 主题状态卡）；`src/app/app-main.css`（grid 40px/64px/64px/1fr，右窗推入/内容切页只动 transform/opacity，时长经 CSS 变量）
- **简报/报告**：docs/superpowers/sdd/task-A3-brief.md / task-A3-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，7 Minor）
- **Minor 留收尾**：① `downWasActive` 拖拽>5px 起于选中项时 click 仍触发 toggle（概率低，未测）；② 概览 `dir: []` 与「每应用 2-4 项」字面冲突（单窗口态默认概览的合理解释）；③ 左右窗 item 居中规则 CSS 重复（可合并选择器）；④ Esc 监听器不 remove（app 每生命周期仅挂一次，无害）；⑤ `bindWindowControls` 从 demo/ import（生产壳用 demo 目录的层次小异味，复用既有绑定 DRY）；⑥ 概览主题状态卡静态渲染（配置变更不刷新，A4 设置模式处理）；⑦ A6 注意：nav-wheel `snapNow` 同 id onChange 重复触发是既有行为（scrollTop 整数截断 vs 0.05px 小数守卫），本任务在 app 侧规避，A6 复用 nav-wheel 勿在 onChange 上建「同 id 二次选中即 toggle」逻辑

## Task A4: 设置模式（⚙ 按钮 + 右窗设置目录 + 设置页共享）

- **状态**：完成（2026-08-06）
- **提交**：`7368011` `feat: 应用壳设置模式（⚙ 按钮 + 右窗设置目录）`
- **验证**：npm test 45/45；npm run test:e2e 97/97（app-shell 13/13 = 8+5，docs 84 零冲击 + 36 基线零变化）；npm run build 通过
- **实现**：
  - **共享提取**（前置门槛 scene-settings 回归绿）：新建 `src/scenes/settings-window/settings-pages.js` —— 纯渲染（SECTIONS / pageBody / renderSettingsPages 页面栈 / loadHotkeys）+ 交互接线 `mountSettingsInteractions`（主题三态→store、动效开关、保存、快捷键录制、开源链接、开关）；`settings-window.js` 重构复用，场景 DOM 逐字节等价（类名 `.csettings__*` 不变）
  - **设置模式接线**（`app-main.js` + `app-main.css`）：标题栏 ⚙（title-bar.js `settings:true` 选项，默认 false docs 零冲击；窗口控制前）；右窗设置目录 = NavigationWheel（SECTIONS 8 分区，纯 icon，anchorRatio 0.382）；内容区第 8 区 `[data-page=settings]` 复用设置页页面栈（外观定制器首次激活惰性挂载 → cust-group 6）；⚙ toggle（进入/激活高亮/再点收起）+ 返回/Esc/左窗已选中项退出设置模式；左栏应用恒可选（点应用切回应用模式）；上下文「设置 › 分区」联动
- **简报/报告**：docs/superpowers/sdd/task-A4-brief.md / task-A4-report.md
- **评审**：规格 ❌ → 修复循环（1 Important：退出设置模式后同应用重开右窗显示**残留设置目录轮**——exitSettingsMode/collapseRight 未 renderRight，左窗同应用重开路径只 applyRightOpen，apps 模式右窗却显示 8 分区设置轮；三通道退出 + 同应用左点都可达，5 个新用例未覆盖重开路径）
- **评审修复（2026-08-06，已闭环）**：`ad3e05d` `fix: 退出设置模式后右窗目录轮残留修复` —— 在设置退出路径补 `renderRight()`（`exitSettingsMode` + `collapseRight` wasSettings 分支），任一右Mode 回 'apps' 都同步重渲染右窗轮；覆盖测试 +1 `设置模式退出后右窗目录轮回归`（先红后绿：RED `toHaveCount(3)` 收到 8 → GREEN 3 项 + `[data-id="general"]` 0 项 + 上下文「剪贴板 › 历史」）；验证：app-shell 14/14、e2e 98/98、npm test 45/45、build 通过
- **Minor 留收尾**：① 设置页交互（主题三态/动效/快捷键）e2e 仅覆盖渲染/导航/定制器挂载，交互行为依赖与场景共用共享模块（同构）；② `exitSettingsMode` 重渲染左窗选中应用页（滚动位置重置，与 A3 收起一致）；③ 设置通用页主题态在挂载时烘焙 getConfig（配置变更后重进设置模式才刷新，与场景一致）

## 执行状态

- Task A1 双模式入口：✅ 完成（2026-08-05）
- Task A2 NavigationWheel 参数化：✅ 完成（2026-08-05，基线重生成 18 张）
- Task A3 应用壳骨架：✅ 完成（2026-08-05）
- Task A4 设置模式：✅ 完成（2026-08-06）
- Task A5 FloatStrip：待执行
- Task A6 手机形态：待执行
- Task A7 基线收尾 + 合并 main：待执行

## 执行规则（摘要，详见计划书与 docs/CLAUDE.md）

- 测试仅在 Web 环境执行（不跑 tauri dev）
- docs 模式零冲击：84 e2e + 36 基线（A2 落地后按 18/18 划分）不得越界变化
- 每任务：简报 → 派发 → 报告 → 审查包 → 评审 → 修复循环 → 本账本留痕（随代码提交）
- 完成后按 Task A7 合并 main
