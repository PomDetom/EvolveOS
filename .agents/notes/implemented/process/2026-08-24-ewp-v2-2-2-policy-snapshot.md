# Policy snapshot 是所有 workflow consumer 的唯一策略事实

**Status:** implemented

**Class:** process

## Problem

v2.2.1 已让 checks、verify 和 merge 使用 Change Policy，但 scope 仍以旧路径分类输出范围。这会让 app 加 task sidecar 在 scope 中显示 `workflow + app`，而实际门禁是 app-local。

## Decision

scope 直接输出由同一 change snapshot 推导的 Policy、`policyHash`、artifacts 与 artifact-aware classification；checks、verify、Note gate 和 merge 只消费该 canonical 结果或严格验证传入 Policy 与 snapshot 的一致性。verify 会拒绝传入的 Policy 与当前 snapshot hash 不一致的调用。

## Alternatives

- 保留 scope 的旧分类并在客户端解释差异。
- 让每个 consumer 继续独立重算 Policy。

## Consequences/Risks

- 所有策略输出可用同一 hash 对比，调用方传入陈旧或错误 policy 时必须被拒绝。
- sidecar 不升级风险，但 task/plan/Note/代码在 judgment 后的变更仍会使 trailing judgment stale。
