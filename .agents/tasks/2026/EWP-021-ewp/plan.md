# EWP-021 EWP 提交守卫拦截空提交绕过

## 目标

禁止通过无暂存路径的空提交绕过 dev/main 提交守卫，并用自动化测试固定该行为。

## Scope

- Branch: `chore/ewp-empty-commit-guard`
- Base: `dev`
- Allowed paths: `scripts/agent/`, `scripts/`, `tests/unit/`, `.agents/`, `.agents/tasks/2026/EWP-021-ewp/`, `.agents/notes/`

## Acceptance

- [ ] `dev`/`main` 上的普通提交和空提交均被 pre-commit 守卫拒绝，合并提交仍可通过。
- [ ] 有自动化回归测试覆盖空提交绕过路径和既有正常/未审批路径。
- [ ] 验证证据绑定当前代码提交，评审记录已写入。

## 执行记录

按 `planned → implementing → verifying → reviewing → ready` 更新 task 状态；阻塞时写明原因和恢复条件。
