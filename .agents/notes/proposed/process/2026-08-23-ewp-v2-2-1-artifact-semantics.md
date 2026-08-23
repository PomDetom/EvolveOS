# EWP v2.2.1 Artifact Semantics

**Status:** proposed

**Class:** process

## Problem

v2.2 已统一 Change Policy，但 changed paths 中仍混合业务 subject、治理规则、决策 Note 和 workflow sidecar。`*.md` 的优先级、task/Note sidecar 的风险升级以及 review/attestation 的 trailing 事实边界，可能使同一业务 diff 在不同消费者中获得错误风险语义。

## Proposal

本 Note 提议以 Subject Change、Governance Change、Decision Artifact 和 Workflow Sidecar 四类语义重写 Policy 输入与判断 artifact freshness。

## Subject Change

subject 是真正被验证的业务、框架、native、脚本和配置改动。Policy 的 task、review、checks 和 attestation 风险主要由 subject 与 governance 推导；task.json、plan、review 和 attestation 不应把 app-local subject 自动升级为 workflow change。

## Governance Change

AGENTS、`.agents/protocol.json`、`.agents/README.md` 和 skills 是治理输入，不是普通 docs。它们可以提升 workflow-policy 风险，但不复活 lifecycle state，也不创建新的 persisted orchestration。

## Decision Artifact

Agent Note、semantic review 和 human attestation 是决策/判断 artifact。它们绑定一个 subject snapshot；subject 之后只允许当前 task 目录内明确白名单的 trailing artifact，task/plan/Note/代码变更都会使旧判断失效。

## Workflow Sidecar

task.json、plan.md、review.md 和 `attestations/*.json` 是 workflow sidecar。它们参与完整 fingerprint 和 freshness 校验，但不直接成为业务风险分类；merge 只接受与当前 task、subject head 和 policyHash 一致的 sidecar。

## Alternatives

1. 继续按文件后缀分类：拒绝，会把治理和决策错误归入 docs。
2. 让 sidecar 直接升级所有变更为 workflow：拒绝，会把 app-local 变更误判为高风险。
3. 只放宽 review/attestation 的 trailing 范围：拒绝，会允许 task/Note/代码变化绕过重新判断。

## Consequences/Risks

artifact 语义分类与 subject-head 模型会增加 merge readiness 的事实校验，但能避免 Policy 输入漂移和“人工判断绑定自身提交”的自引用问题。历史 schema、ui 分支和旧文档继续只读兼容。

## Evidence

最终结论以 EV-025 的真实 Git fixture、Policy matrix、verify evidence、独立 semantic review 和 merge readiness 为准。
