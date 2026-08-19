# EWP-019 EWP 过程记录与提交前强制门禁

## 目标

将 EWP 从“合并时才检查 native readiness”改为“启动、审批、实现、提交、验证和合并均有可追踪记录与硬门禁”，使没有经过 `agent:start`、没有审批或验证后继续改代码的分支无法通过标准提交/合并路径。

## Scope

- Branch: `chore/ewp-process-records`
- Base: `dev`
- Allowed paths: `scripts/agent/`, `scripts/`, `tests/unit/`, `.agents/`, `.agents/tasks/2026/EWP-019-ewp/`

## Acceptance

- [ ] `agent:implement` 产生持久化的 implementing 检查点。
- [ ] 受 EWP 管理的提交会记录任务、分支、审批状态和暂存路径；无任务或未审批提交被拒绝。
- [ ] 任务允许路径之外的改动在提交前被拒绝。
- [ ] `merge-to-dev` 在 enforced 模式下拒绝缺少任务、审批、过程记录或当前 HEAD 证据的分支。
- [ ] 正常路径、无任务绕过路径、未审批路径和验证后改码路径均有自动化回归测试。
- [ ] 使用说明和迁移记录写入仓库；验证证据绑定最终代码提交；评审记录已写入。

## 执行记录

按 `planned → implementing → verifying → reviewing → ready` 更新 task 状态；阻塞时写明原因和恢复条件。
