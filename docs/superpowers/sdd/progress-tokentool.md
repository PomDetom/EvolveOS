# SDD 账本 — plan: docs/superpowers/plans/2026-08-10-tokentool.md

> 执行留痕（唯一权威进度来源）。每任务：计划 / 工作内容 / 提交哈希 / 评审结论。
> 分支：`ui/tokentool`（自 dev `7ecb730` 检出）。设计规格：`docs/superpowers/specs/2026-08-10-tokentool-design.md`。
>
> 计划 `docs/superpowers/plans/2026-08-10-tokentool.md` 与设计规格 `docs/superpowers/specs/2026-08-10-tokentool-design.md` 已提交在 `main`（规格 `66b9cfc`，计划 `59c9152` + 计划修正 `57a2578`），本分支按其 verbatim 执行、有意不在分支重复提交（避免合并冲突）。

## Global Constraints（执行期恒约束）

- 分支 `ui/tokentool`；`check:boundary` 预期输出「框架改动：须全量回归 + 框架 owner 评审」。
- Rust 命令前设 PATH：`export PATH="$USERPROFILE/.cargo/bin:$PATH"`。
- e2e 用 worktree 配置：`npx playwright test --config=playwright.config.worktree.js`。
- JS 提交前 `npm run build`；Rust 改 `cargo check`/`cargo test`。
- 密钥只走 Rust DPAPI config.json；前端禁止 innerHTML 直接插用户数据（escapeHtml）。
- 禁托盘 / 禁浏览器 JS 抓取兜底 / 禁旧 config 迁移 / 禁新增图标（复用 bolt）。

## Task 1: Rust 后端脚手架（Cargo + models + crypto）

**计划**: 见 plan Task 1。改 Cargo.toml 加依赖；lib.rs 加 `mod crypto; mod models;`；verbatim 复制 models.rs / crypto.rs（源 `C:\Repository\codeplan-usage\src-tauri\src\`）。

**工作内容**: Cargo.toml 加 6 依赖 + windows-sys；lib.rs 加 `mod crypto; mod models;`；verbatim 复制 models.rs（175 行）/ crypto.rs（161 行）。cargo check 0 error；cargo test 4/4 PASS（models roundtrip + crypto roundtrip/legacy，roundtrip 实测真实 Windows DPAPI）。

**提交**: `ce4c10d feat: tokenTool Rust 后端脚手架（models + crypto + Cargo 依赖）`

**评审**: ✅ Approved（spec 合规，无 Critical/Important）。⚠️ 分支位置（已确认在 ui/tokentool）、字节级保真（内容已逐行核验，✓）。Minor：Cargo.lock 含 quinn 等不在活跃构建图的孤儿锁条目（与源项目 lock 一致，信息性）；report 计数 off-by-2（无实义）。

## Task 2: Rust config + state

**计划**: 见 plan Task 2。裁剪 config.rs（去 legacy 迁移）+ verbatim 复制 state.rs；lib.rs 加 `mod config; mod state;`。

**工作内容**: config.rs 逐字符写入 brief 裁剪版（data_root + ConfigStore load/save/needs_migration，无 legacy 迁移）；state.rs 复制并**移除 `AppState::new()` 里 `migrate_from_legacy()` 调用块 4 行**（计划文本不一致：brief 要求 verbatim state.rs，但裁剪 config.rs 已删该方法 → 无法编译；移除是该计划缺陷的唯一连贯解，符合设计「全新开始、不做旧配置迁移」，`needs_migration` 明文→加密自动迁移保留）。cargo check 0 error；cargo test 6/6 PASS。

**提交**: `356e5aa feat: tokenTool Rust config/state（DPAPI 加密存储 + 共享状态）`

**评审**: ✅ Approved（spec 合规，无 Critical/Important；state.rs 偏离已验证为仅 4 行调用移除、源文件逐行核验）。Minor（信息性）：crate 根 `AppState`（close_behavior）与新 `state::AppState` 同名不同路径，Task 5 已计划将根类型更名 `CloseBehaviorState`；26 个 dead-code 警告属任务边界（Task 4/5 接线），正确保留未静默。

## Task 3: Rust adapters

**计划**: 见 plan Task 3。verbatim 复制 adapters/{mod,common,deepseek,opencode}.rs 四文件；lib.rs 加 `mod adapters;`。

**工作内容**: 四文件逐字节复制（各文件保留源仓库自身的 LF/CRLF 风格，deepseek.rs 源即 LF）；lib.rs 加一行 `mod adapters;`。cargo check 0 error；cargo test 11/11 PASS。

**提交**: `7f19a97 feat: tokenTool Rust 适配器（DeepSeek 余额 + OpenCode Go 三窗口解析）`

**评审**: ✅ Approved（spec 合规，无 Critical/Important/Minor）。字节级保真经 cmp 独立核验。

## Task 4: Rust scheduler + commands

**计划**: 见 plan Task 4。verbatim 复制 scheduler.rs + 裁剪 commands.rs（去 show_main/quit_app）；lib.rs 加 `mod commands; mod scheduler;`。

**工作内容**: scheduler.rs 逐字节复制；commands.rs 逐字符写入 brief 裁剪版（5 命令）；lib.rs 加两行。cargo check 0 error（54 警告均属 Task 5 前预期 dead-code/unused）；cargo test 11/11 PASS。

**提交**: `6ab1283 feat: tokenTool Rust 调度器 + 5 个 Tauri 命令`

**评审**: ✅ Approved（spec 合规，无 Critical/Important）。
- Task 4: minor (deferred): commands.rs:1 `use tauri::{..., Manager, ...}` 中 `Manager` 未使用（裁剪 show_main 后成孤儿导入，计划原文逐字指定故实现者未偏离）——产生 unused import 警告。交最终整分支评审裁定是否在合并前移除。

## Task 5: Rust lib.rs 接线

**计划**: 见 plan Task 5。lib.rs 整份替换为 brief 全文：根 `AppState` 更名 `CloseBehaviorState` + 双状态 manage + 注册 6 命令 + 3s 首刷 + Scheduler::start。

**工作内容**: lib.rs 逐字符写入 brief 全文（75 行）；cargo check 0 error；cargo test 11/11 PASS。更名范围仅在 lib.rs 四处（结构/命令签名/manage/on_window_event），tokenTool 状态统一走 `crate::state::AppState`。

**提交**: `5dec941 feat: tokenTool Rust 后端接线（注册 5 命令 + 启动 30s 轮询调度器）`

**评审**: ✅ Approved（spec 合规，无 Critical/Important/Minor）。评审侧 diff 截断疑虑已用工作区补验。
- 追加 deferred-minor：models.rs `AccountKind::label()` 因不做托盘而未被调用（verbatim 移植自带），产生 dead-code 警告——交最终整分支评审。

## Task 6: 壳 mount 钩子

**计划**: 见 plan Task 6。app-main.js 加两处 `mod.mount?.(...)`（renderPages 桌面 + renderStack 手机 detail）。

**工作内容**: 两处插入逐字符落地 brief（renderPages 在 `page.innerHTML=...` 后加一行；renderStack 在 `activateMobileSettings(); updateCtx();` 后加栈顶 detail body 挂载块）。npm run build PASS；app-shell e2e 34/34 PASS（左窗仍 7 项）。diff 仅 app-main.js +9 行。

**提交**: `2f8ad82 feat: 壳 render 后调 mod.mount 挂载钩子（app 交互接线）`

**评审**: ✅ Approved（spec 合规，无 Critical/Important）。Minor（信息性）：手机路径 `topMod` 未防御 null（若 stack entry 的 moduleId 在 MODULES 解析失败会 TypeError）——plan 原样代码，且 renderPages 有同款未防御模式（既有），不属实现缺陷，交最终评审留意。

## Task 7: tokenTool 渲染/样式/单测 + 计数更新

**计划**: 见 plan Task 7。新建 token-tool 四文件 + 单测（TDD 红→绿）+ e2e 计数 7→8 + 视觉基线重生成。

**工作内容**: index.js/token-tool.js/token-tool-utils.js/token-tool.css 逐字符落地 brief；单测 9 用例（6 utils + 2 page + 1 contract）；计数 7→8（app-shell 4 处 toHaveCount + L3/L10 文本、mobile-nav L20）；视觉基线 `--update-snapshots` 仅 app-main 6 张变更。实现者额外补齐 4 处测试名/注释文本 7→8（app-shell L110/L304、mobile-nav L13/L16，纯文本非断言，评审判定范围内）。单测 85/85、e2e 42/42、视觉 30/30、build + check:boundary 通过。

**提交**: `0aa2416 feat: tokenTool 应用接入（渲染/样式/纯函数单测 + 壳计数 7→8 + 视觉基线）`

**评审**: ✅ Approved（spec 合规，无 Critical/Important）。Minor（信息性，均 brief 原样代码）：`data-tt-last` 属性未转义（lastUpdated 为后端 epoch 数字非用户数据）；`tokenToolPage()/mountTokenTool()` 参数空但 render/mount 传 ctx（Task 8 解决）；CSS `minmax(320px,1fr)` 布局维度硬编码与 `--radius-scale,1` 兜底（非颜色令牌）。交最终评审留意。

## Task 8: tokenTool 交互挂载 + mock e2e

**计划**: 见 plan Task 8。mountTokenTool 完整实现（invoke/listen/编辑对话框/测试/刷新/dispose）+ mock e2e。

**工作内容**: token-tool.js 整份替换为 brief 全文（render + mount + openEditorDialog）；token-tool.spec.js 两用例（浏览器空态 + mock 桌面）。TDD 红→绿（RED 1 fail / GREEN 2 pass）；单测 85/85；build + check:boundary 通过；实现者另跑后台全量 e2e 校验。

**提交**: `46958c2 feat: tokenTool 交互挂载（invoke/listen/编辑对话框/测试/刷新，mock e2e）`

**评审**: ✅ Approved（task quality），含 1 个 Important（plan 原样代码缺陷，用户裁定修复中）+ 2 个 Minor（deferred）+ 1 处已接受偏离。
- Important：editorFormHtml 表单值未转义 → renderInput `value="${value}"` 不转义，账户名含 `"` 可突破属性（存储型自 XSS 边角 + 输入框损坏）。卡片路径已转义，编辑器漏了。plan 文本内部矛盾（自身安全铁律要求转义，但编辑器代码没转）。**用户裁定：修复**（editorFormHtml 5 个值包 escapeHtml），修复循环 Round 1 进行中。
- 已接受偏离：e2e test 1「概览快捷卡」断言移到切页前（brief 原顺序因 `.app-main__page{display:none}` 必然失败，实现者修正正确）。
- Task 8: minor (deferred): ① 遮罩点击关闭是死代码（openEditorDialog 挂到匿名 wrapper 而 renderDialog 根是 .c-dialog__mask，`e.target===mask` 永不触发——与框架 openDialog 同款潜藏行为，Esc/取消仍可关）。② `unlisten` 赋值竞态（listen resolve 晚于 dispose 时 inert 订阅残留，disposed 标志防执行）。

**修复循环 Round 1/5（Important）**: `dd9fbab fix: tokenTool 编辑对话框表单值转义（防属性突破自 XSS）` —— editorFormHtml 五字段（name/baseUrl/apiKey/workspaceId/authCookie）包 escapeHtml（import 已加）；covering e2e 断言「解码 round-trip `a"b` + outerHTML 原始转义形 `value="a&amp;quot;b"`」（实现者技术性修正：`getAttribute('value')` 会实体解码，不能用 `a&quot;b` 断言）。复评审 **ADDRESSED**、无新破坏。单测 85/85、token-tool e2e 3/3、全量 e2e 126 通过、build + boundary OK。

**Task 8: complete（commits 0aa2416..dd9fbab，1 处 fix round 解决，2 minor deferred）**

## Task 9: 文档 + 全量回归 + 边界门禁

**计划**: 见 plan Task 9。更新 docs/app-integration.md（mount 契约 + 参考实现）；执行留痕账本随代码提交；全量回归 + check:boundary。

**工作内容**: app-integration.md §2.2 补「可选 mount(pageEl, ctx)」契约（含重挂/释放提示、手机 detail 路径），§5.7 参考实现加 token-tool 条目；本账本随各任务持续维护。全量回归见下方提交后的命令输出。

**提交**: （待填）

**评审**: （待最终修复波后填）

**最终整分支评审（opus, 7ecb730..b6f21e0）**: ✅ 无 Critical；**2 个 Important（修复波中）** + Minor 清扫建议。
- Important 1: 空状态「添加账户」CTA 失灵——`renderAccounts` 的 `renderEmptyState({action:{label:'添加账户'}})` 渲染 `.c-btn` 但 `onGrid` 只匹配 `[data-tt-action]`、`onToolbar` 只绑工具栏 → 零账户首启点击无反应（mock e2e 未覆盖零账户态）。修复：onGrid 加 `.c-btn` 兜底或给 action 加 `data-tt-action="add"` + 补零账户 e2e。
- Important 2: plan/设计规格文档未提交到分支（在 main 66b9cfc/59c9152/57a2578），账本引用需显式说明（不重复提交以免合并冲突）。
- Minor 清扫（修复波含）：commands.rs 未用 `Manager` 导入、models.rs `AccountKind::label()` 死代码（Rust 警告清扫）；`unlisten` 赋值竞态（trivial）。
- Minor（deferred，账本已有 + 新增）：编辑对话框缺 Tab 焦点圈定（a11y 低影响）；`config-updated`/`balance-updated`(单数) 事件发射但前端未监听（无害）；`test_one` spawn 失败兜底 `last_updated:0` 显示 1970 日期（罕见路径）；Cargo.toml `tokio full`/`reqwest json` 特性可裁剪（编译时间）；ledger Task 9 块待填（修复波后控制器补）。
