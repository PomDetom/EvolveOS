# SDD ledger — plan: docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md

Base: 1d35504（branch fix/b4-strip-open HEAD，工作树在 .claude/worktrees/b4-close-sizing，branch worktree-b4-close-sizing）
交接：docs/HANDOFF-B3.md（B3 已完成并合并；本计划为 B4 收尾修复，由本会话执行）
规格：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源）
计划书：docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md（唯一实施需求源）

## Pre-flight 扫描（2026-08-08，干净，2 处计划冲突已由用户裁定修复）

- **冲突 ①（B4F-5 mock 缺 LogicalSize）**：B4F-1 起 `fit()` 用 `const { LogicalSize } = window.__TAURI__.window` + `new LogicalSize(...)`；B4F-5 Step 1 新恢复主窗 e2e 的 mock 只有 `getCurrentWindow`/`getAllWindows`（无 LogicalSize）→ 挂载即 `new undefined(...)` TypeError。用户裁定：按推荐修 —— B4F-5 新 mock 补 LogicalSize（与 B4F-1 Step 6 同款）。
- **冲突 ②（B4F-2 主题同步误清 close-behavior 高亮）**：settings-pages.js 主题三态 click handler 与 app-main.js `syncSettingsThemeModes` 均 `querySelectorAll('.csettings__mode')` 按 `b.dataset.mode === next.theme` 清 active；B4F-2 新增 close-behavior 按钮同用 `.csettings__mode` 类（计划 verbatim）→ 主题变更/任何 subscribe 会把 close-behavior 按钮 active 高亮误清。用户裁定：按推荐修 —— 两处主题同步循环改 `querySelectorAll('.csettings__mode[data-mode]')`（仅主题按钮），close-behavior 用独立 `[data-close-behavior-group]`/`[data-close-behavior]` 选择器不变。

- 其余：无任务间矛盾；无「测试断言空洞/逻辑块逐字重复」强制造缺陷；视觉基线零漂移（浏览器路径渲染不变）。

## Task B4F-1: 悬浮窗尺寸贴合（LogicalSize + computeFitSize + 诊断）

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，2 Minor 免修）
- **提交**：`347b628` `fix: 悬浮窗尺寸用显式 LogicalSize 贴合内容（DPI 下底部不再被裁）+ computeFitSize 单测（B4 收尾）`（amend 自 66d22ec，控制器并入 brief 按项目惯例；报告哈希已修正）
- **验证**：TDD 红→绿（`computeFitSize is not a function` 红 → 实现绿）；floatstrip 7/7；npm test 58/58（+1）；npm run test:e2e 103 passed（含视觉 24 零漂移）；npm run build 通过
- **实现**：strip-main.js 模块顶部导出 `computeFitSize`（ceil + 至少 1px 纯函数）；`fit()` 改显式 `LogicalSize`（`new LogicalSize(size.width, size.height)`）规避非 100% DPI 普通对象被当物理像素 → 底部被裁；fit 后诊断 log（outerSize/scaleFactor，`?.()` 短路安全）；新建 `tests/unit/strip-sizing.test.js`；floatstrip.spec.js mock 追加 `LogicalSize` 类
- **简报/报告**：docs/superpowers/sdd/task-B4F-1-brief.md / task-B4F-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor ① 报告哈希 amend 前值（已修正为 347b628）；Minor ② 诊断双 `.catch` 静默失败（brief verbatim 诊断，若桌面无 `[strip] fit` log 先查权限/守卫而非尺寸）
- **执行状态**：Task B4F-1：✅ 完成（347b628，评审通过）
- **Minor (deferred)**：诊断 log 静默失败兜底（双 catch）——brief verbatim，最终整体评审时 triage 是否需提示。

## Task B4F-2: closeBehavior 配置 + 设置「通用」分区选择器

（待派发实施者）

