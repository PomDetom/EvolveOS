# SDD 账本 — plan: docs/superpowers/plans/2026-08-13-password-manager-app.md

> 执行留痕（唯一权威进度来源）。每任务：计划 / 工作内容 / 提交哈希 / 评审结论。
> 分支：`app/key/password-manager`（自 dev 检出，base `61259df`）。设计规格：`docs/superpowers/specs/2026-08-13-password-manager-design.md`。
> 后端命令契约（A4 依赖）：`docs/superpowers/plans/2026-08-13-password-manager-backend.md`（chore/pwm-backend 独立推进，本前端分支以 mock 覆盖，未依赖其合入）。

## Global Constraints（执行期恒约束）

- 分支 `app/key/password-manager`；`check:boundary` 预期 `[app/key/password-manager] ✓ 应用改动，边界通过`。
- 本分支只允许改 `src/apps/key/**` + `tests/**` + `docs/**`；每次 JS 提交前 `npm run build`。
- 动态内容（条目字段/标签/错误信息）必须 `escapeHtml` 后插值，禁止 innerHTML 直接插用户数据。
- 主密码只存表单输入 + invoke 传参，成功后清空；localStorage 只存路径（`pwm.vaultPath`）与开关（`pwm.rememberPath`），**绝不存主密码**。
- 局部类名 `key__*`；CSS 全走令牌（圆角必配 `--radius-scale`），禁硬编码值。
- e2e 用 worktree 配置：`npx playwright test --config=playwright.config.worktree.js`；5174 被陈旧 server 占用时沿用 5175 本地配置。
- 提交信息中文，前缀 `feat:` / `test:` / `docs:`。

## Task A1: key-utils 纯函数 + 单测（TDD）

**计划**: 见 plan Task A1。新建 `src/apps/key/key-utils.js` + `tests/unit/key.test.js`（9 用例）。

**工作内容**: key-utils.js（49 行）10 导出（`VAULT_PATH_KEY` / `REMEMBER_PATH_KEY` / `escapeHtml` / `filterEntries` / `allTags` / `sortByName` / `splitTags` / `isRememberPathEnabled` + `matchesQuery`/`matchesAnyTag`）；单测 9 用例全落地。TDD 红（模块不存在 `Failed to resolve import`）→ 绿（9 passed）；`npm run build` 0 error。`npm install` 顺带同步 package-lock.json 版本 0.1.0→0.1.3（越界文件，已还原，提交仅含简报指定两文件）。

**提交**: `ffbd327 feat: 密码管理器 key-utils 纯函数 + 单测（过滤/标签/排序/转义）`

**评审**: ✅ Approved（2 Minor，均简报 verbatim，非实施偏离）：sortByName 非原地断言恒真（`expect([em, gh].map(...))` 用新数组字面量，若实现回归原地排序仍通过）；task-A1-report 行数与事实不符（称 103/84 行，实际 49/69）。

## Task A2: module 契约 + 页面渲染骨架（TDD）

**计划**: 见 plan Task A2。index.js dir 升级（全部/分组/回收站 → **全部/数据管理/设置**）；keyPage 浏览器空态「需桌面端使用」/ 桌面 `[data-key-body]`；mountKey stub（A4 填充）；key.css 占位；单测 12 用例。

**工作内容**: 4 文件落地（index.js +10/-4、key.js 新、key.css 占位、key.test.js 12 用例 = A1 9 + page 2 + contract 1）；契约不破壳发现（apps.test.js 13 passed，key=1 与其余 7 应用 order 无冲突、4 个 dir 图标均注册）；`npm run build` 0 error（114 modules）。e2e 未误改（app-shell 仍断言旧占位，属计划中 A5 更新范围）。

**提交**: `d9b0fe6 feat: 密码管理器 module 契约 + 页面渲染骨架（升级 key 占位为三目录）`

**评审**: ✅ Approved（2 Minor）：桌面用例 `delete globalThis.window.__TAURI__` 无 try/finally（当前为文件末位用例，影响低）；keyPage 两分支未交叉断言「不存在」（若回归为双分支合并输出仍可通过）。

## Task A3: key.css 局部样式

**计划**: 见 plan Task A3。key.css 206 行（锁定屏/工具栏/列表行/标签 chips/数据卡片/设置行/编辑器）。

**工作内容**: 逐字落地；两处授权替换核对为真实令牌（`--font-size-md`→`--font-size-base`、`--danger`→`--danger-500`）；令牌走查全过（间距/颜色/时长/缓动，7 处圆角全 `calc(var(--radius-*) * var(--radius-scale,1))`）；动画仅 paint-only（background/color/border-color/opacity），无 backdrop-filter 动画；A4 引用类名 11/11 齐全。

**提交**: `f1cad0f feat: 密码管理器 key.css 局部样式（锁定屏/工具栏/列表/数据/设置）`

**评审**: ✅ Approved（2 Minor，均简报规格值）：`.key__mode-btn/:hover` 与 `.key__row/:hover` 的 border-color 与基准态同值 no-op；文件含简报规格化非令牌布局数值（460/56/28/64/240/280px、line-height 1.6、opacity 0.75），不在令牌体系覆盖范围。

## Task A4: mount 交互 + mock e2e

**计划**: 见 plan Task A4。key.js `mountKey` 完整实现（锁定屏/全部/数据管理/设置 + 条目编辑器 + 复制/删除/锁定 + 密码生成器），mock e2e 5 用例。

**工作内容**: key.js 484 行按简报 verbatim；13 命令契约全覆盖（`create_vault`/`unlock_vault`/`lock_vault`/`list_entries`/`create_entry`/`update_entry`/`delete_entry`/`generate_password`/`export_vault`/`import_vault`/`default_vault_path`/`current_vault_path`）；锁定态 `!vaultPath → renderLocked` 优先于任何目录；e2e 5 用例 + 4 处裁定修正（installMock 字符串、密码选择器 `[type="password"]`、设置用例补解锁、导入 toast `.filter({hasText})`）；`npm test` 22 files / 119 passed；build 0 error。

**提交**: `63771a0 feat: 密码管理器 mount 交互（解锁/CRUD/生成/复制/导出导入/锁定）+ mock e2e`

**评审**: ⚠️ Not Approved（2 Important + 2 Minor，均简报/框架原样带入，非实施者引入）：
- [Important] 遮罩点击关闭死代码——`mask`（`.key__editor`）内首层是 `.c-dialog__mask`，`e.target===mask` 恒不成立，点暗处无反应。
- [Important] `data-key-id="${e.id}"` 未 escapeHtml——key.js 全部动态插值唯一漏点（实际可利用性低：id 后端生成 + 保险库加密，但安全原则要求条目字段一律转义）。
- [Minor] 标签切换调 `renderAll()` 整页重建 → 搜索框显示为空且焦点丢失，列表按不可见旧 `query` 过滤。
- [Minor] `openEntryEditor` 无 Tab 焦点圈定（a11y 缺口）。

**修复循环 Round 1**: `6355ea7 fix: 密码管理器对话框遮罩关闭 + data-key-id 转义 + 标签切换保留搜索（评审修复）` — 遮罩改 `e.target!==dialog && !dialog.contains(e.target)`；`data-key-id="${escapeHtml(e.id)}"`；renderAll 读回 `.c-search-bar__input` value + `--has-input` 类；新增覆盖 e2e 用例 6（backdrop 关闭）+ 用例 7（id 含引号 `e"x` round-trip）+ 用例 2 Fix-3 段。复评审 **ADDRESSED**、无新破坏（2 Important + 1 Minor 修复，Minor-② Tab 焦点圈定 deferred）。单测 22 files / 119 passed、e2e 7/7、build 0 error。

**Task A4: complete（commits 63771a0..6355ea7，1 处 fix round 解决，1 minor deferred）**

## Task A5: 既有 e2e 断言更新 + 全量校验 + 文档

**计划**: 见 plan Task A5。grep 定位 app-shell/mobile-nav 的 key 旧断言 → 按新三目录/空态同步 → 定向 e2e + 全量 + check:boundary → 新建执行留痕账本。

**工作内容**:
- 定位（`grep -rn "功能开发中\|全部/分组\|密码 › 分组\|分组\|回收站"`）：app-shell.spec.js 4 处 + 2 处 `data-id="groups"`（L87 换应用、L104 上下文联动）；mobile-nav.spec.js 无 key 目录/占位文本直断言，但详情页 L58 `toContainText('全部')` 在真实 e2e 中已红——新 keyPage 浏览器空态提前 return 不再渲染 `› ${dirName}` 副标题（旧 placeholderPage 渲染），故同步为 `需桌面端使用`。
- app-shell.spec.js：右窗目录项文本 `['全部','分组']` → `['全部','数据管理']`（`toHaveCount(3)` 不变）；页面内容 `功能开发中` → `需桌面端使用`；上下文联动点击 `[data-id="groups"]` → `[data-id="data"]`、`密码 › 分组` → `密码 › 数据管理`（`密码 › 全部` / `密码` 不变）；换应用后 memo 右窗断言 `groups` → `data`（保留「目录内容切换」意图，断言 memo 右窗不含 key 新目录）；注释 `（目录：全部/分组/回收站）` → `（目录：全部/数据管理/设置）`。
- mobile-nav.spec.js：详情页 L58 `toContainText('全部')` → `toContainText('需桌面端使用')`；dir 3 项计数、`[data-dir="all"]`、`密码 › 全部` 上下文不变。
- 定向 e2e `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/key-password.spec.js` → **56/56 passed**（基线先证 3 红，更新后全绿）。
- 全量：`npm test` **22 files / 119 passed**；`npm run build` 0 error；`node scripts/check-boundary.js` → `[app/key/password-manager] ✓ 应用改动，边界通过`。

**提交**（分两次：断言更新 + 账本文档）:
- `test: 密码管理器 app-shell/mobile-nav 断言更新（三目录/空态）` — tests/e2e/app-shell.spec.js + tests/e2e/mobile-nav.spec.js
- `docs: 密码管理器执行留痕账本（progress-key-app）` — docs/superpowers/sdd/progress-key-app.md

**评审**: 自评 ✅——断言改动仅 key 相关（目录文本/空态/上下文/注释），未碰其他应用/框架断言；测试意图（导航、目录计数 3、上下文联动、快捷卡跳转、换应用目录切换）保留；56 e2e + 119 单测 + build + check:boundary 全绿。整分支评审与合并验收由分支汇总环节完成。

---

## 分支汇总（app/key/password-manager，61259df..HEAD）

| Commit | 内容 |
|---|---|
| 51340d3 | docs: 密码管理器应用设计规格（升级 key 占位 + 复用 pwm-core 后端） |
| e34769d | docs: 规格补 current_vault_path 命令（数据管理页需显示保险库路径） |
| ee4b79b | docs: 密码管理器实施计划（chore 后端移植 + app 前端应用） |
| ffbd327 | A1: key-utils 纯函数 + 单测 |
| d9b0fe6 | A2: module 契约 + 页面渲染骨架（三目录升级） |
| f1cad0f | A3: key.css 局部样式 |
| 63771a0 | A4: mount 交互 + mock e2e |
| 6355ea7 | A4 fix: 遮罩关闭 + data-key-id 转义 + 标签搜索保留 |
| 8690efa | A5: app-shell/mobile-nav 断言更新 |
| 本提交 | A5: 执行留痕账本（progress-key-app） |

- 边界：`check:boundary` `[app/key/password-manager] ✓ 应用改动，边界通过`；合并 dev 用 `--no-ff`。
- 变更范围：`src/apps/key/**`（index.js/key.js/key.css/key-utils.js）+ `tests/**`（key.test.js / key-password.spec.js / app-shell.spec.js / mobile-nav.spec.js）+ `docs/**`（spec/plan/ledger），无框架/壳/vite/package.json 改动。

## deferred-minor 清单（均不阻塞合并）

- A1: sortByName 非原地断言恒真（verbatim 简报，实现本身正确为副本排序）。
- A2: 桌面用例 `__TAURI__` 清理无 try/finally（文件末位用例，影响低）；keyPage 双分支未交叉断言「不存在」。
- A3: `:hover` border-color no-op；非令牌布局数值（简报规格值）。
- A4: `openEntryEditor` 无 Tab 焦点圈定（a11y 低影响，deferred）。
- A4 ⚠️（真机/后端验证项，web mock 不覆盖）：`list_entries` 无参调用真实后端语义、`navigator.clipboard.writeText` 真机 webview 可用性、`window.confirm` 真机原生确认框、`default_vault_path` 真实返回来源。

## 待桌面真机验证（web 测试不覆盖，`npm run tauri:dev` 人工确认）

- 真实 IPC invoke 13 命令。
- Argon2id 派生解锁（真实后端密码校验）。
- 磁盘加解密（AES-256-GCM 保险库）。
- `%APPDATA%\com.evolveos.system\vault.json` 默认路径。
- 导出明文 JSON 含密码。
