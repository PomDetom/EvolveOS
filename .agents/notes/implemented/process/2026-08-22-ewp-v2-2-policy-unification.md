# EWP v2.2 Policy Unification

**Status:** implemented

**Class:** process

## Problem

EWP v2.1 已建立 Git facts、change snapshot 和 evidence binding，但 `select-gates`、Note gate、verify 与 merge 仍各自解释 changed paths。旧 lifecycle skills 还保留 `planned`、`implementing`、`verifying`、`reviewing`、`ready` 语言，导致 Agent 可能同时参考 v1 FSM 和 v2 recovery manifest。

## Decision

新增 repository-native `change-policy.js` 作为唯一规则解释层。它消费 immutable change snapshot 和 branch taxonomy，稳定输出 classification、task/note/check/review/attestation 要求及 policyHash；scope、checks、verify、note、review、merge 只消费该结果。旧 lifecycle skills 作为新入口删除，历史读取兼容单独标明，不再产生新的 FSM 状态、task 字段、gate 或 evidence 类型。

## Migration principles

- 先冻结 v2.1 事实，再迁移消费者；每个迁移点保留相同 snapshot 的一致性测试。
- Policy 输出使用稳定序列化和 hash，自动 evidence 绑定 policyHash、startSnapshot、endSnapshot；执行期间 snapshot 漂移即失败。
- task 只保存 intent、scope、acceptance、recovery、provenance；运行时要求来自 policy，不从 task 状态字段推导。
- 保留 schema 1/历史 task 的只读兼容，但新 task 和新写入不再复活旧 FSM。
- 自动 evidence、semantic review 和 human attestation 分离；review/attestation 不能伪装为自动 gate 成功。

## Alternatives

1. 继续在各 consumer 中复制 changed-path 判断：拒绝，会延续 checks、verify 和 merge 路由漂移。
2. 只增加 policyHash 而不统一 consumer：拒绝，只能记录不一致，不能消除解释权分裂。
3. 直接删除所有历史 workflow 文件：拒绝，历史兼容读取仍需保留清晰边界。
4. 本方案：建立最小 Change Policy Layer，逐消费者迁移并保留只读兼容。

## Consequences/Risks

消费者规则由单一 Policy 产生，避免同一 diff 在 checks、verify 和 merge 中路由不一致；代价是迁移期需要处理旧 dev 合入器和历史 task 的兼容读取，并增加 policyHash/snapshot drift 的验证成本。

## Evidence

本 Note 对应 EV-024 的实施计划和 Policy matrix；最终结论以 Git diff、测试、verify evidence 和真实 review 为准。
