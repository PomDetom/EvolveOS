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

## Task A5: FloatStrip 悬浮条组件

- **状态**：完成（2026-08-06）
- **提交**：`039800f` `feat: FloatStrip 悬浮条（横竖形态/四边磁吸/无边框）`
- **验证**：npm test 45/45；npm run test:e2e 104/104（floatstrip 6/6 + app-shell 14/14 + docs 84 零冲击 + 36 基线零变化）；npm run build 通过（float-strip 代码分包，docs 不加载）
- **实现**：`src/components/float-strip/`（`renderFloatStrip`/`mountFloatStrip`/`renderTokenMonitor`：`.c-strip` + `--strip-orientation` + data-orientation 布局、双形态旋转按钮/双击双通道、四边磁吸 transform 定位 24px 阈值、无边框 hover 浮现控制条）；`src/app/strip-main.js` `?mode=strip` body 级独立渲染（占位 → 实现）；`app-main.js` 右下 FloatBall 模拟演示
- **简报/报告**：docs/superpowers/sdd/task-A5-brief.md / task-A5-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，6 Minor）
- **Minor 留收尾**：① 旋转锚点语义（报告称保持左上角，实测 position:fixed right/bottom 重锚右下 + transform 保持；默认贴边主场景良好，侧贴边旋转时垂直轴可能跳变，A6/A7 观察）；② `renderTokenMonitor` value/status 未转义插值（内部受控调用点低风险，可加白名单/escapeHTML）；③ `--strip-orientation` 语义值 horizontal|vertical 未被布局直接消费（布局 key 到 data-orientation，同语句赋值不会漂移，未来配置层覆盖需改 row|column）；④ 微尺寸字面量 gap 2px/按钮 26px/圆角 2px（无对应令牌，结构性可接受）；⑤ floatstrip.spec 用固定 waitForTimeout(400)（当前不 flaky，toHaveCSS 轮询更稳）；⑥ app 壳 FloatBall 与展开 strip 同右下角 z 叠（ball z=40 > strip z=10，无害，strip 有关闭钮）

## Task A6: 手机形态（底部横滑 + 全屏页面栈）

- **状态**：完成（2026-08-06）
- **提交**：`396f5fc` `feat: 手机形态（底部横滑 + 页面栈）`
- **验证**：npm test 45/45；npm run test:e2e 110/110（mobile-nav 6/6 + app-shell 14/14 桌面回归 + docs 84 零冲击 + 36 基线零变化）；npm run build 通过
- **实现**：≤900px 媒体查询：双窗隐藏，底部横向应用轮（NavigationWheel horizontal + 38.2% 锚点，纯 icon，懒挂载）+ 全屏页面栈（概览→目录页→详情页；返回逐步 pop；⚙ 推入设置页；dock 点击驱动推入、横滑不弹页）；**闭环 A2 Minor ①**（`.c-navwheel__list--horizontal` 独立 CSS：横排半间距 6px/row/overflow-x/touch-action pan-y/padding 归零，vertical 逐字节零冲击）；**闭环 A2 Minor ④**（mobile-nav 用例 6 渲染级验证横向滚动 + 38.2% 锚线吸附，替代恒真式单测）
- **简报/报告**：docs/superpowers/sdd/task-A6-brief.md / task-A6-report.md
- **评审**：规格 ❌ → 修复循环（1 Important：**dock 横滑浏览触发页面推入**——nav-wheel 不 preventDefault + setPointerCapture 使 pointerup 后必发 click，app dock click 消费 dockDownIndex 无位移阈值，横滑浏览调用 handleDockTap 推页，违反「横滑浏览不弹页」；报告称「拖拽不产生 click」与机制矛盾且 drag 测试未断言 stack 计数）
- **评审修复（2026-08-06，已闭环）**：`5ed2071` `fix: 手机 dock 横滑浏览不再误触发页面推入` —— dock 点击处理器按位移阈值区分点按/拖拽（pointerdown 记录起点，click 阶段 `Math.hypot(...) > 10px` 视为横滑忽略，TAP_MAX_MOVE=10）；覆盖断言 +1（mobile-nav 用例 6 拖拽后断言 `.app-main__stack-page` 计数仍 1，先红后绿：RED 收到 2 元素 → GREEN 6/6）；验证：mobile-nav 6/6、全量 e2e 110（app-shell 14 + docs 84 + 36 基线零变化）、npm test 45、build 通过
- **Minor 留收尾**：① dock 横滑不回写标题栏 ctx（钻取模型下由页面栈承担，有意设计）；② 手机设置外观分区每次进入设置新增一次 customizer store 订阅（线性增长无视觉影响）；③ 手机形态 Esc 切桌面右窗状态不同步（键盘极少触发）；④ 「边缘右滑回退」未实现（仅返回按钮 —— 规格 §11 非目标声明：边缘右滑用简单按钮 + 可选 touch 事件，返回按钮即「简单按钮」实现，待最终评审裁决）；⑤ 「目录横滑」歧义（app 目录页是纵向按钮列表 —— 最宽容读法：设置目录经设置页 tabs overflow-x:auto 横向化已满足）

## Task A7: 基线收尾与合并指引

- **状态**：完成（2026-08-06；合并 main 待最终评审后由控制器执行）
- **提交**：`e4676c9` `docs: 应用壳收尾（基线 + README）`
- **验证**：npm test 45/45；npm run test:e2e 116/116（110 + 6 新 app-main 视觉）；npm run test:visual 42/42；npm run build 通过；既有 36 张基线逐字节零变化（git 显示 0 个 png 被修改，仅 6 张 app-main-* 新增，两两互异）
- **实现**：SHOTS 加 mode 维度 `[name, selector, mode='/']`（app-main 用 `/?mode=app`，其余 6 组 goto('/') 字节等价）；6 张 app-main 基线（data-motion=off + animations disabled 稳定化，单窗口态概览页）；README：形态表两→三形态（FloatStrip/手机形态升级为已实现）、目录注释、特性列表、基线数量 42
- **简报/报告**：docs/superpowers/sdd/task-A7-brief.md / task-A7-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，2 Minor）
- **Minor 留收尾**：① README「42 张基线」行是 A2 后预置、本 diff 未改（终态正确，可核实性备注）；② 概览页「当前主题/强调色」文案在 6 张 app-main 基线均为默认 light/indigo（A3 既有行为：仅文案层不随 data-theme 更新，CSS 配色随组合变化，6 张仍真实互异，纯装饰性）

## 最终整体评审（2026-08-06，合并前）

- **审查包**：docs/superpowers/sdd/review-final-branch.diff（47a1d76..HEAD，16 commit）
- **裁决**：Ready to merge: With fixes —— 0 Critical；**2 Important**（I1 app 冷启动不应用持久化配置；I2 左窗拖拽起于已选中项误触发收起——与 A6 dock 已修缺陷同机制）+ **2 建议顺手修 Minor**（M1 手机设置外观分区 customizer 订阅泄漏；M2 renderTokenMonitor 未转义插值）；M3-M15 记入收尾随合并带入
- **实测**：评审复核 npm test 45/45、e2e 116/116（42 基线 + docs 零冲击）、build 通过（app/strip/float-strip 分包正确）

## 最终评审修复波（2026-08-06，已闭环）

- **提交**：`05ae68b` `fix: 应用壳冷启动配置 + 左窗拖拽阈值 + 订阅防泄漏 + 转义卫生`；`675e6e2` `docs: 收尾评审修复报告`
- **修复**：I1 `mountAppMode` 首行 `applyConfig(getConfig())`（镜像 docs-mode，冷启动保持持久化主题/强调色/定制器，与设置页高亮两态一致；覆盖 e2e 写 theme=dark reload 断言 data-theme + 深色按钮激活）；I2 左窗 pointerdown 记录 {active,x,y}，click 阶段位移 >TAP_MAX_MOVE(10) 忽略（与 dock 同机制，模块级常量去重；覆盖 e2e 拖拽已选中项 15px 断言右窗不收起）；M1 `renderCustomizerGroups` 返回退订函数，手机 renderStack 重建前释放（覆盖单测）；M2 `renderTokenMonitor` value escapeHtml + status 白名单非法回落 ok（覆盖单测，既有 97.2%/ok 实例字节等价）
- **验证**：npm test 51/51；npm run test:e2e 118/118；npm run test:visual 42 张基线零变化；npm run build 通过
- **基线保真度裁决**：最终评审「默认配置 applyConfig 不产生内联覆盖」的**前提有误**——实测 applyConfig 恒写 `--glass-*`/`--dur-*` 内联变量（light opacity 0.62 vs 回退 0.72、blur 24 vs 20；dark highlight 0.5 vs 0.08），I1 修复后 app-main 冷启动玻璃渲染固有变化。视觉 spec 工作around（/?mode=app 经配置链路注入 + reload + removeAttribute('style') 截图纯主题态）恢复字节等价，42 基线零变化；docs 6 组不受影响。复评裁决：**Option A 可合并**（保真缺口窄——config 变量是全局变量，docs 基线即 applied 态可捕获任何配置管线视觉回归 + apply.test.js + I1 e2e 兜底；app-main 基线仍守卫结构/主题渲染）；**Option B（applied 态重生成 6 张 app-main 基线 + 移除 removeAttribute hack）列为合并后首个跟进**，需重生成权限
- **Minor 新增**：① 桌面↔手机 resize 可留一份多余外观订阅（有界 ≤2，容器活跃 DOM，无害）；② I2 downState 点击后保留旧 x/y（每次 click 前有 pointerdown 覆盖，无害）；③ I1 引入与 docs 同款 `--dur-*` 内联覆盖（既有行为，animations disabled 下截图稳定）；④ app-main.js:473 `data-index` 非数字会 throw（nav-wheel 恒设数字索引，既有表达式）；⑤ docs/tauri-integration.md:301 renderCustomizerGroups 返回忽略与新契约一致

## 执行状态

- Task A1 双模式入口：✅ 完成（2026-08-05）
- Task A2 NavigationWheel 参数化：✅ 完成（2026-08-05，基线重生成 18 张）
- Task A3 应用壳骨架：✅ 完成（2026-08-05）
- Task A4 设置模式：✅ 完成（2026-08-06）
- Task A5 FloatStrip：✅ 完成（2026-08-06）
- Task A6 手机形态：✅ 完成（2026-08-06）
- Task A7 基线收尾 + 合并 main：✅ 完成（2026-08-06）—— 基线/README + 最终评审 + 修复波闭环 + **合并 main**（`git merge feature/iteration` fast-forward 至 ac0fa6d，分支已删；合并后全量回归：npm test 51/51、npm run test:e2e 118/118、npm run build 通过）

## 执行规则（摘要，详见计划书与 docs/CLAUDE.md）

- 测试仅在 Web 环境执行（不跑 tauri dev）
- docs 模式零冲击：84 e2e + 36 基线（A2 落地后按 18/18 划分）不得越界变化
- 每任务：简报 → 派发 → 报告 → 审查包 → 评审 → 修复循环 → 本账本留痕（随代码提交）
- 完成后按 Task A7 合并 main
