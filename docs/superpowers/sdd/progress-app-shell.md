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
- **提交**：`70f8a7d` `feat: NavigationWheel 黄金比例锚点（38.2%）+ 方向参数化`
- **验证**：npm test 45/45（geometry 9→13）；npm run test:e2e 84/84；npm run test:visual 36/36（18 张重生成）；npm run build 通过
- **实现**：`nav-wheel-geometry.js` 纯函数参数化（anchorY / scrollTopForAnchor / findNearestIndex(+anchorRatio)，focal offset 相对锚线，删 itemCenterY/scrollTopForCenter）；`nav-wheel.js` `mountNavWheel({items,onChange,anchorRatio=0.382,direction='vertical'})` + AXIS 主轴抽象（scrollTop↔scrollLeft、translateY↔translateX 等）+ 非对称首尾 padding；`nav-wheel.css` 无 JS 回退 → 38.2%/61.8%
- **简报/报告**：docs/superpowers/sdd/task-A2-brief.md / task-A2-report.md
- **评审**：待独立评审（规格符合 + 质量）
- **Minor 留收尾**：① horizontal 渲染层未闭环（无实例挂载，方向等价性仅几何层单测；A6 落地时补渲染级测试）；② `anchorY` 5 参签名含未用参数（viewportLength/anchorRatio，按 brief 接口保留；可选精简为 3 参）

## 执行状态

- Task A1 双模式入口：✅ 完成（2026-08-05）
- Task A2 NavigationWheel 参数化：✅ 完成（2026-08-05，基线重生成 18 张）
- Task A3 应用壳骨架：待执行
- Task A4 设置模式：待执行
- Task A5 FloatStrip：待执行
- Task A6 手机形态：待执行
- Task A7 基线收尾 + 合并 main：待执行

## 执行规则（摘要，详见计划书与 docs/CLAUDE.md）

- 测试仅在 Web 环境执行（不跑 tauri dev）
- docs 模式零冲击：84 e2e + 36 基线（A2 后按 24/12 划分）不得越界变化
- 每任务：简报 → 派发 → 报告 → 审查包 → 评审 → 修复循环 → 本账本留痕（随代码提交）
- 完成后按 Task A7 合并 main
