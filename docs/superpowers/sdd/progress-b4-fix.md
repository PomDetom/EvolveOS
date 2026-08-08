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

- **状态**：完成（2026-08-08，评审通过）
- **提交**：`69c032b` `feat: 主窗关闭行为可配置（closeBehavior 退出应用/保留后台，通用分区选择器，B4 收尾）`（amend 自 6ac9afc，控制器并入 brief）
- **验证**：TDD 红→绿（stash 回退 3 源文件复测红 → pop 绿）；npm test 58/58；e2e 104/104（含新增 closeBehavior 用例 + 视觉基线 12 张零漂移）；npm run build 通过。**注意**：e2e 在 5174 新鲜 server 上跑（见下方环境告警）
- **实现**：defaults.js `DEFAULTS` 加 `closeBehavior: 'exit'`；settings-pages.js `CLOSE_BEHAVIORS` + 通用页「关闭主窗口时」两态选择器（`[data-close-behavior-group]`）+ 接线（saveConfig→applyConfig）；**控制器裁定修复**：settings-pages.js 主题三态 handler + app-main.js `syncSettingsThemeModes` 两处主题同步循环收敛 `.csettings__mode[data-mode]`（防误清 close-behavior 高亮）；app-shell.spec.js 新用例
- **简报/报告**：docs/superpowers/sdd/task-B4F-2-brief.md / task-B4F-2-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，3 Minor 免修）——Minor ① 报告哈希 amend 前值（已修正为 69c032b）；Minor ② 无回归测试锁 `[data-mode]` 裁定（点主题后断言 close-behavior 高亮仍在，可选加）；Minor ③ `.csettings__modes--close` 无 CSS 规则（brief verbatim 死钩，无害）
- **执行状态**：Task B4F-2：✅ 完成（69c032b，评审通过）
- **Minor (deferred)**：① `[data-mode]` 裁定无回归测试（最终评审 triage 是否补一行「点主题→断言 close-behavior 高亮仍在」）；② `.csettings__modes--close` 死 CSS 钩（brief verbatim，B4F-3/4 可沿用）

## Task B4F-3: Rust 关闭行为（AppState + set_close_behavior + on_window_event）

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，3 Minor 免修）
- **提交**：`7be2c59` `feat: 主窗关闭行为 Rust 侧（exit→app.exit / background→prevent_close+hide，set_close_behavior 命令，B4 收尾）`（amend 自 1498bba，控制器并入 brief；报告哈希已修正）
- **验证**：cargo check 零错误零警告；npm test 58/58；e2e（worktree 配置 5174）104/104 + 视觉 24 零漂移；npm run build 通过
- **实现**：lib.rs 完整替换（brief verbatim）——`AppState { close_behavior: Mutex<String> }` + `#[tauri::command] set_close_behavior` + `.manage/.invoke_handler` + `.on_window_event` 主窗 CloseRequested（exit→`app.exit(0)` / background→`prevent_close`+`hide`）；`use tauri::Manager;` 引入；`.setup()` 插件逻辑保留；主窗 label "main" 经 tauri.conf.json 核对（无显式 label 默认 "main"）
- **简报/报告**：docs/superpowers/sdd/task-B4F-3-brief.md / task-B4F-3-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，3 Minor 免修）——Minor ① 报告哈希 amend 前值（已修正为 7be2c59）；Minor ② `let _ = window.hide()` 吞错（plan-mandated，hide 失败窗口不消失可接受）；Minor ③ `lock().unwrap()` poison 理论性（唯一 writer 纯赋值不可能 panic，安全）
- **执行状态**：Task B4F-3：✅ 完成（7be2c59，评审通过）

## Task B4F-4: JS 同步与清理（移除脆弱 onCloseRequested handler + set_close_behavior 同步）

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，2 Minor 免修）
- **提交**：`1d49280` `fix: 移除 JS onCloseRequested 异步关 strip（主窗关不掉根因），配置经 set_close_behavior 同步 Rust（B4 收尾）`（amend 自 22e27be，控制器并入 brief；报告哈希已修正）
- **验证**：TDD 红→绿（e2e 单用例红 `invokes=[]` → 绿）；npm test 58/58；e2e（worktree 配置 5174）104/104 + 视觉 24 零漂移；npm run build 通过
- **实现**：app-main.js 移除 JS `onCloseRequested` 块（无残留引用）+ 加 `syncCloseBehavior`（Tauri `core?.invoke?.('set_close_behavior', {behavior: cfg.closeBehavior ?? 'exit'})`，浏览器 no-op），挂载 + subscribe 各调一次；app-shell.spec.js strip 用例替换为 set_close_behavior 同步断言（mock 去 onCloseRequested/close、加 core.invoke）
- **简报/报告**：docs/superpowers/sdd/task-B4F-4-brief.md / task-B4F-4-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor ① 报告哈希 amend 前值（已修正为 1d49280）；Minor ② 配置变更 sync 路径（subscribe→invoke）无 e2e 覆盖（brief-mandated 范围，final wrap 可补）
- **执行状态**：Task B4F-4：✅ 完成（1d49280，评审通过）
- **Minor (deferred)**：配置变更（切 closeBehavior）→ Rust invoke 的 subscribe 路径无 e2e 断言（brief 只断言挂载默认 exit；最终整体评审 triage 是否补「切 background → invoke behavior:'background'」用例）

## Task B4F-5: strip 悬浮窗「恢复主窗」按钮（后台模式出路）

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，2 Minor 免修）
- **提交**：`70f3c1f` `feat: strip 悬浮窗恢复主窗按钮（后台模式下唤回主窗，B4 收尾）`（amend 自 7ebd7e1，控制器并入 brief；报告哈希已修正）
- **验证**：TDD 红→绿（新用例红 `.c-strip__restore` 不存在 → 绿）；npm test 58/58；e2e（worktree 配置 5174）105/105（含视觉 24 零漂移）；floatstrip 8/8 零回归；npm run build 通过
- **实现**：float-strip.js `renderFloatStrip({content, showRestore=false})` ctrl 内 rotate 前渲染 `.c-strip__restore`（icon('layout',14)，零新增 CSS）；strip-main.js `const win` 提前、`showRestore: !!win`、恢复按钮接线（`getAllWindows().find(label==='main') → show()+setFocus()` 全 catch）置 `if (win)` 外；e2e mock 含控制器裁定必补的 LogicalSize
- **verbatim 适配（已披露）**：简报 verbatim 按钮位置使横向控制条多一按钮，既有窗口用例「旋转后点 X 关闭」hover 假设被打破（旋转后 strip 缩 34px 鼠标落出 → ctrl pointer-events:none）——close 点击前补一次 re-hover（最小改动，close→hide 断言语义不变，注释诚实说明桌面同场景亦有此摩擦）
- **简报/报告**：docs/superpowers/sdd/task-B4F-5-brief.md / task-B4F-5-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor ① 报告「纯测试环境产物」叙述不及测试注释准确（桌面旋转→close 亦有 re-hover 摩擦，测试注释为诚实记录，非代码缺陷）；Minor ② 浏览器 strip 路径无显式 `.c-strip__restore` toHaveCount(0)（既有用例 + 视觉 24 零漂移已覆盖，可选加）
- **执行状态**：Task B4F-5：✅ 完成（70f3c1f，评审通过）
- **Minor (deferred)**：① 桌面 rotate→close 的 re-hover 摩擦（布局固有，用户目检时知晓）；② 浏览器 strip 无恢复按钮的显式负断言（可选加 toHaveCount(0)）

## 全部任务完成 → 最终整体评审（2026-08-08，合并前）

- **审查包**：docs/superpowers/sdd/review-B4F-final.diff（5b4d73f..HEAD，18 commits = fix/b4-strip-open 历轮修复 + B4F-1..5）
- **裁决**：Ready to merge: With fixes —— 2 Important + Minor triage；评审独立验证 closeBehavior 全链闭环（defaults→store→subscribe→invoke→Rust AppState→on_window_event）、ACL 无缺（set_close_behavior 自定义命令默认允许；allow-outer-size/scale-factor 在 core:window:default）、浏览器三路径零回归
- **修复波**：`a13413d` `fix: 最终评审修复（删死 onShow re-fit + 补 closeBehavior 变更 invoke 测试锁，B4 收尾）`
  - **Important ①**：删 `win.onShow?.(() => fit())` 死代码（Tauri 2 Window 无 onShow，re-fit 兜底从未运行）——删行 + 诚实注释
  - **Important ②**：补配置变更→Rust invoke 路径测试锁（新 e2e 注入 core.invoke mock，点「保留后台」断言 invoke behavior:'background' + 锁挂载默认 exit）
  - **Minor ①（顺手）**：`[data-mode]` 裁定回归测试（点主题后 close-behavior 高亮保持）
  - **Minor ②（顺手）**：浏览器 strip 无 `.c-strip__restore` 负断言（toHaveCount(0)）
- **fix 波评审（scoped）**：4 findings 全 ADDRESSED，无新破坏；diff 严格 3 文件
- **执行状态**：全部任务完成 + 修复波闭环 → 待合并 main + 合并后全量回归

## 合并 main + 合并后全量回归（待执行）

- 合并：`git merge --no-ff`（合并前先跑最终全量回归：unit + e2e worktree 配置 + build + cargo check）
- 合并后全量回归（注意环境告警：5173 陈旧 server 污染默认 npm run test:e2e，须 worktree 配置或重启）
- 合并后按项目惯例：删除已合并分支？fix/b4-strip-open 与 worktree-b4-close-sizing 的处置由控制器/用户决定

## 环境告警（本会话，用户需知悉）

- **共享 checkout `C:\Repository\ui-design` 有陈旧 Vite dev server（PID 2528，端口 5173，2026-08-08 19:47 启动）**，serve 的是共享 checkout 的旧代码（无 computeFitSize/closeBehavior）。Playwright `playwright.config.js` 的 `reuseExistingServer: true` 会误连它 → `npm run test:e2e` 会测到旧代码，结果失真。
- **处置**：控制器已自建 `playwright.config.worktree.js`（端口 5174，`reuseExistingServer: false`）作为 e2e 跑法，验证 B4F-1+B4F-2 全量 104/104 真绿。后续 B4F-3/4/5 e2e 用此配置。
- **建议用户**：手动终止 PID 2528（`Stop-Process -Id 2528 -Force`），或重启共享 checkout 的 dev server，否则 `npm run test:e2e` 默认命令持续失真。



