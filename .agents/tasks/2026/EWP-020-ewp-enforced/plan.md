# EWP-020 EWP 历史证据聚合与 enforced 激活

## 目标

修复 readiness 对历史 evidence 的错误判定，并在修复经过验证后将 EWP 协议安全切换为 enforced。

## Scope

- Branch: `chore/ewp-enforced-activation`
- Base: `dev`
- Allowed paths: `scripts/agent/`, `scripts/`, `tests/unit/`, `.agents/`, `.agents/tasks/2026/EWP-020-ewp-enforced/`

## Acceptance

- [ ] 同一 gate 的历史 evidence 只保留最新记录参与 readiness 判定，当前成功记录不再被旧记录覆盖。
- [ ] enforced 模式下，完整的最新 evidence、审批、过程记录和评审通过；验证后代码改动仍被阻断。
- [ ] `.agents/protocol.json` 切换为 `enforced`，并提供提交守卫安装/运行验证。
- [ ] 相关自动化回归测试通过，验证证据绑定当前代码 HEAD，评审记录已写入。

## 执行记录

按 `planned → implementing → verifying → reviewing → ready` 更新 task 状态；阻塞时写明原因和恢复条件。
