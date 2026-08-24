# EV-026 EWP v2.2.2 Policy Snapshot Unification & Freshness Fixtures

## Goal

让 scope、checks、verify、Note gate 和 merge readiness 共享 Change Policy 的 canonical snapshot 与 `policyHash`，并用真实 Git fixture 覆盖 judgment 后所有禁止的变更。

## Scope

- `scripts/agent/`、merge readiness 工具与相应 unit tests。
- EV-026 recovery manifest、process Note 及 `.agents/README.md` 的 contract 说明。
- 不改动产品应用、框架、Tauri 运行时、依赖或历史 SDD。

## Implementation order

1. 先补 scope Policy 输出和跨消费者 hash contract 的失败测试。
2. 以一个共享 Policy snapshot 构造入口收敛 scope/checks/verify/Note/merge 的计算。
3. 扩展真实 Git trailing fixture，断言 task、plan、Note、代码和无关/嵌套 artifact 的具体失败。
4. 运行 policy 风险面所需 tests、workflow checks 和 build，并记录独立 semantic review。

## Constraints

- Policy 仍是 workflow requirements 的唯一解释层；不新增 lifecycle state。
- review 与 attestation 仍绑定 subject head/fingerprint/policyHash；trailing artifact 不能自引用。
