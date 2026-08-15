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

**提交**: `b6f21e0 docs: tokenTool 接入文档（mount 契约 + 参考实现）+ 执行留痕账本`；最终修复波 `12cba7c fix: tokenTool 空状态添加账户 CTA 接线 + 零账户 e2e`、`c5cf3f4 chore: tokenTool Rust 警告清扫（未用 Manager/label）+ ledger 文档位置说明`。

**评审**: ✅ Approved。全量回归：npm test 85/85、全量 e2e（worktree 配置）127/127、npm run build、cargo check 0 error + cargo test 11/11、`npm run check:boundary` → `[ui/tokentool] ✓ 框架改动：须全量回归 + 框架 owner 评审`。最终整分支评审 2 个 Important（空状态 CTA、plan/spec 文档位置）修复并经复评审 ADDRESSED、无新破坏；deferred-minor 全部记录如上、均不阻塞合并。

**Task 9: complete（commits 7ecb730..c5cf3f4，全量回归绿 + 边界门禁过 + 最终评审闭环）**

---

## 分支汇总（ui/tokentool，7ecb730..c5cf3f4，11 commits）

| Commit | 内容 |
|---|---|
| ce4c10d | Rust 脚手架（models + crypto + Cargo 依赖） |
| 356e5aa | config/state（DPAPI 加密存储） |
| 7f19a97 | adapters（DeepSeek + OpenCode Go） |
| 6ab1283 | scheduler + 5 命令 |
| 5dec941 | lib.rs 接线（CloseBehaviorState 更名 + 调度器启动） |
| 2f8ad82 | 壳 mod.mount 挂载钩子 |
| 0aa2416 | tokenTool 应用接入（渲染/样式/单测 + 计数 7→8 + 视觉基线） |
| 46958c2 | tokenTool 交互挂载（invoke/listen/编辑对话框） |
| dd9fbab | fix: 编辑对话框表单值转义（自 XSS） |
| b6f21e0 | docs: 接入文档 + 本账本 |
| 12cba7c + c5cf3f4 | 最终修复波（空状态 CTA + Rust 警告清扫 + ledger 文档位置） |

**待桌面真机验证**（web 测试不覆盖，`npm run tauri:dev` 人工确认）：真实 IPC（invoke 5 命令）、DPAPI 加解密、30s 调度器轮询、`config.json` 落 exe 旁。
**遗留未跟踪文件**（非本分支产物，未提交未删除）：`.idea/`（dev 分支缺 .gitignore 更新，main 已 ignore）、`AGENTS.md`（内容为项目 CLAUDE.md 旧版草稿，来源不明，留待确认）。

## 合并完成（2026-08-11）

- `ui/tokentool` 合并进 **dev**（fast-forward，dev = fcbc0a7）与 **main**（merge commit `5ee573a`，保留 main 既有 docs 提交），两处均无冲突。
- main 全量回归通过：npm test 85/85、npm run build、cargo test 11/11、全量 e2e（worktree 配置）128/128（含视觉 30 + token-tool 4 用例）。
- 分支已删除。
- 说明：post-merge 的 `npm run check:boundary` 在 main 上报 package.json/package-lock.json——经核实为 main 自身「项目更名」提交 `9974010`（dev 快进后不含），非 tokenTool 改动；分支门禁已在 ui/tokentool 上通过（框架改动提示）。

## 跟进修复轮（2026-08-11，用户 3 项）

- **Bug**：新增账户选 OpenCode 不带出 Auth Cookie——`syncKind` 用 `querySelector('[data-tt-row="opencode_go"]')` 只命中第一个匹配（workspace 行），cookie 是第二个 opencode 行永远带不出；编辑时 kind 初始即 opencode 直接渲染可见故只有编辑能填。复现 e2e 证伪后修复为 `querySelectorAll` 遍历（TDD 红→绿）。
- **优化**：新增/编辑对话框材质由透明毛玻璃（`--glass-bg` + backdrop-filter blur）改为实底不透明（`--surface-solid` + `backdrop-filter:none`，与主页面卡片同色系），经 `.tt__editor` 类作用域覆盖，app 内局部、不波及框架对话框。
- **措辞**：CLAUDE.md/README「克制的玻璃质感」→「亚克力质感」（用户：不要克制，直接亚克力）。
- 分支 `app/token-tool/fix`（自 main）承载应用改动（token-tool.js/css/spec），`main...HEAD` 边界检查 ✓ 应用改动通过；合并进 main `08b596f` + 措辞 docs 提交 `2093a38`；dev 已同步至 main（2093a38）；分支已删。
- 验证：token-tool 5 + app-shell 34 e2e 绿、npm test 85/85、build 绿。全量 e2e 一次出现 `app-shell 亚克力两档` 失败——隔离单跑通过（13.5s）、与 npm test 同窗口 flake 后复跑干净一致，判定环境 flake（改动为 `.tt__editor` 作用域 CSS + docs，碰不到 applyConfig/data-glass）；最终全量 e2e 复跑确认中。

**最终整分支评审（opus, 7ecb730..b6f21e0）**: ✅ 无 Critical；**2 个 Important（修复波中）** + Minor 清扫建议。
- Important 1: 空状态「添加账户」CTA 失灵——`renderAccounts` 的 `renderEmptyState({action:{label:'添加账户'}})` 渲染 `.c-btn` 但 `onGrid` 只匹配 `[data-tt-action]`、`onToolbar` 只绑工具栏 → 零账户首启点击无反应（mock e2e 未覆盖零账户态）。修复：onGrid 加 `.c-btn` 兜底或给 action 加 `data-tt-action="add"` + 补零账户 e2e。
- Important 2: plan/设计规格文档未提交到分支（在 main 66b9cfc/59c9152/57a2578），账本引用需显式说明（不重复提交以免合并冲突）。
- Minor 清扫（修复波含）：commands.rs 未用 `Manager` 导入、models.rs `AccountKind::label()` 死代码（Rust 警告清扫）；`unlisten` 赋值竞态（trivial）。
- Minor（deferred，账本已有 + 新增）：编辑对话框缺 Tab 焦点圈定（a11y 低影响）；`config-updated`/`balance-updated`(单数) 事件发射但前端未监听（无害）；`test_one` spawn 失败兜底 `last_updated:0` 显示 1970 日期（罕见路径）；Cargo.toml `tokio full`/`reqwest json` 特性可裁剪（编译时间）；ledger Task 9 块待填（修复波后控制器补）。

## 悬浮条优化轮（2026-08-15，ui/strip-ui-m9，用户 2 项）

- **Bug（唤回最小化主窗）**：跳转余量页在 UI 最小化后只后台跳页、不唤出主窗。根因双因：① `capabilities/default.json` 缺 `core:window:allow-unminimize`，`main.unminimize()` 被静默拒绝（JS `.catch` 吞错）；② unminimize/show/setFocus 三个 promise 未 await，Windows 下对最小化窗 setFocus 唤不回。修复：补 `allow-unminimize` + `allow-is-minimized` 权限；跳转处理器加 `isMinimized` 守卫（非最小化跳过 unminimize，防 SW_RESTORE 把最大化主窗还原）+ 顺序 await。e2e 新断言：isMinimized 先于 unminimize；新增「非最小化跳过 unminimize」用例锁防回归。
- **优化（实底阴影落窗）**：实底材质 box-shadow 落在透明窗口边界外被裁（窗口按 strip border-box 贴合、body margin 0）→ 观感平底。修复：themes.css 新增双层浮起令牌 `--shadow-float`（接触影 + 环境影，亮/暗两档，复用 `--shadow-intensity`）；`.strip-root--window` 加 `--strip-shadow-room: 32px`（padding + `width:max-content` 单源决定窗口尺寸）；`fit()` 改量 root（含留白）→ 阴影落在窗口内可见。e2e 新用例：贴合尺寸含 2×room + 计算样式为双层阴影。视觉基线零漂移（`.c-strip` 不在基线截图内）。
- 验证：单测 23/23（含 capabilities 补权限断言）；floatstrip e2e 14/14；app-shell 冒烟 43/43；`npm run build` 通过。
- 待桌面真机验证：真实 unminimize 唤起路径（mock 只验 JS 调用形态）。

## 悬浮条优化轮 2（2026-08-15，ui/strip-ui-m10，用户 2 项反馈）

- **优化撤回（阴影→淡灰边框）**：m9 的阴影方案（`--shadow-float` + 窗口留白）用户目检后否决——阴影在透明窗外被裁无效果，且留白增大窗口脚掌。最终方案：**去 box-shadow**（idle none，过渡列表同步移除），改**淡灰边框**——idle `1px var(--text-3)`、hover 提一级 `var(--text-2)`（复用文本色令牌做主题感知边框，同 `layout.css` 先例）。回退 m9 的全部阴影面：themes.css 删 `--shadow-float`（两档）、`.strip-root--window` 去留白块、`fit()` 改回量 strip。e2e 用例改写：删「阴影留白」用例，原「无边框 hover 浮出」改为「边框对比度 + hover 控制块浮出」（idle 边框非透明 + box-shadow none + hover 边框变化）。
- **Bug（跳转只切子菜单不切主菜单）**：m9 修复唤出后，用户反馈「主菜单没跳转、只有子菜单跳了」。根因：跳转通道直接 `setModule('token-tool')`——setModule 只切内容/右窗，左窗导航轮选中态是 nav-wheel 自管，程序化调用不经过左轮 → 左窗停在原项。修复：抽 `jumpToTokenTool()` = `setModule('token-tool', true)`（强制落 usage 余量页，含已在该应用时重置 dirId）+ `goToModule('token-tool')`（左轮 scrollToIndex → onChange → onLeftSelect 联动主菜单选中，幂等），双通道（emit / visibilitychange）统一走该 helper。e2e 新用例：jump-to-tokentool 事件后左窗 `[data-id=token-tool]` active + home 失活 + 内容 `data-page=token-tool` + 右窗 usage 选中。
- 验证：floatstrip e2e 13/13；app-shell 跳转用例 1/1；单测 23/23；`npm run build` 通过。视觉基线零漂移（`.c-strip` 不在基线截图内；`--shadow-float` 无其他消费方）。

## 悬浮条优化轮 3（贴边收起，2026-08-15，ui/strip-edge-collapse，用户 3 点探讨）

- **状态机（4 态）**：`自由(Free) →(溢出校正/贴靠)→ 贴边(Docked) →(空闲 1s)→ 收起(Collapsed)`；拖动 / hover 窄条弹回。贴边态光标离开起 1s 计时；收起态 `fit()` 挂起、收起滑出期间跳过位置持久化；收起 tween 为 OS 层 `setPosition` rAF 逐帧（ease-out ~500ms，非 CSS 布局动画，不触动画红线），时长经 `getComputedStyle(strip)` 读 `--strip-dur-collapse`（动效降级归零）。
- **先决校正**：拖拽结束（`onMoved` 去抖）窗口某边**溢出** monitor bounds → 先 `setPosition` 拉回贴齐完整可见 → 再进贴边计时。pre-flight 修正：`getRect` 用 `?.()` 兼容缺 screen/outerSize 的旧窗口 mock；`evaluateDock` 返回 boolean（有能力则内部持久化），onMoved 收起守卫（`collapsed||collapseRaf` 跳过评估/持久化）防 tween 程序化 setPosition 打架。
- **用户选定**：进入贴边**仅溢出校正**（不做磁吸，靠边未溢出不吸附不进计时）；收起形态 **B 边缘小把手**（~20px 边带 + `data-dock-edge` 定向 chevron grip，仅 Tauri 窗口模式渲染、收起态才显示）；触发语义**标准自动隐藏**（hover/拖动/点击取消 1s 计时，离开重计）。
- **提交**（`aa59310..edd5dc9`，9 commits）：`aa59310` 设计规格 → `7a7cc9d` 实施计划（5 任务 TDD）→ `c9902f9` Task1 几何纯函数（边缘/溢出/收起目标/grip 方向）→ `8bebbd6` 预扫描修正 → `fb13689` Task2 权限（`core:screen:allow-current-monitor` + `core:window:allow-outer-size`）→ `1f03774` Task3 grip 渲染 + 收起态样式 → `77be6d5` Task3 fix（grip 锚定特异性提 `.strip-root--window .c-strip--collapsed`）→ `127264a` Task4 状态机 + 编排 → `edd5dc9` Task4 fix（tweenTo 返回 Promise 保时序 + `readMotionDur` 改读 strip）。Task3/4 各 1 轮 fix round（评审 Important 全 ADDRESSED），Minor deferred 明细见 `.superpowers/sdd/2026-08-15-strip-edge-collapse/progress.md`。
- **收尾修正**（`95c0109` Task5 账本 + `d7f2988` 整分支评审 fix 波（collapseNow hover 间隙守卫 / e2e 移离坐标 / grip 真 (0,3,0) 特异性）+ `d8a477c` I1 口径修正）：用户拍板**严格贴边口径**（贴边 = 距离 0 精确贴齐 或 故意溢出触发校正后；≤6px 未溢出不进收起计时），`DOCK_TOLERANCE` 6→0，spec/plan/测试同步。整分支评审（opus）0 Critical，修复全 ADDRESSED。最终提交范围 `aa59310..d8a477c`（12 commits）。
- **验证**：单测 32/32（strip-edge 8 + strip-main 13 + float-strip 8 + strip-sizing 1 + window-capabilities 2）；floatstrip e2e 16/16（含 3 新增收起用例：半出屏先决校正、hover 取消计时、贴底 1s 收起→hover 弹回）+ app-shell 冒烟 44/44，合计 60/60；`npm run build` 通过。视觉基线零漂移（`.c-strip` 不在基线截图内；`--strip-dur-collapse` 无基线影响）。
- **待桌面真机验证**（web 测试只验 JS 调用形态）：真实显示器 bounds 与 DPI 坐标口径（`outerPosition`/`outerSize` 物理 vs `currentMonitor` bounds 物理）；窗口大部分滑出屏后可见窄条 hover 事件可达性（Windows 命中测试）；角位主贴靠边选择与收起方向观感。
