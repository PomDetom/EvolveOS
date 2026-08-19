# EWP-018 TokenTool 悬浮窗多账户展示修复

## 目标

将历史上误归类为 `app/*` 的 TokenTool 悬浮窗多账户展示修复，重新纳入 `ui/*` 工作流，并在不启动 Tauri/桌面端的前提下通过 Web-only 验证后合入 `dev`。

## Scope

- Branch: `ui/token-tool/float-multi-account`
- Base: `dev`
- Allowed paths: `src/app/strip-main.js`, `src/components/float-strip/float-strip.css`, `tests/e2e/floatstrip.spec.js`, `.agents/tasks/2026/EWP-018-tokentool/`, `.agents/notes/`

## Acceptance

- [ ] 悬浮窗能稳定展示多个账户，且长名称、窄宽度下不破坏布局。
- [ ] 仅迁移历史提交中的三个产品文件；不迁移旧 EWP-011 任务元数据。
- [ ] 通过 Web-only 单元测试、E2E/Playwright、构建和边界检查。
- [ ] 不执行 Tauri、桌面端或真实机器验证；本任务不属于 native 验证范围。
- [ ] 审批、验证证据和评审记录绑定到本任务提交。

## Product Assumptions

- 悬浮窗的多账户展示属于 Web UI 产品行为；验证以浏览器运行时和 Playwright 为准，不需要 Tauri 原生窗口或真实机器证据。
- 账户名称可能较长、账户数量可能超过单行可容纳范围；布局应保持可读并避免撑破悬浮条边界。
- 本次修复只调整已有悬浮条的展示与对应 E2E 覆盖，不改变账户数据来源、持久化协议或桌面端启动方式。

## 迁移说明

历史提交 `ceab34b` 的产品改动已存在，但原任务被错误归类为 `app/*`，违反 `app/*` 只能修改应用目录的边界规则。此次不直接合并原分支，而是从 `dev` 新建规范的 `ui/*` 任务，仅迁移以下产品文件：

- `src/app/strip-main.js`
- `src/components/float-strip/float-strip.css`
- `tests/e2e/floatstrip.spec.js`

原 EWP-011 任务元数据作为历史审计保留在旧 worktree/恢复分支中，不作为本任务交付物。

## 执行记录

按 `planned → implementing → verifying → reviewing → ready` 更新 task 状态；阻塞时写明原因和恢复条件。
