# EV-024 EWP v2.2 Policy Unification

## Goal

根据 `C:\Repository\evolveos工作流改进\evolveosv2.2.md`，把 EWP v2.1 从多个消费者各自解释 changed paths，收敛为 `change snapshot → change policy → consumers` 的单源策略链。本任务不新增 gate、task 字段、workflow state 或 evidence 类型；重点是统一现有规则、清理旧入口并补齐事实绑定。

## Scope

- `.agents/`、`AGENTS.md`、`docs/AGENTS.md`：移除旧生命周期 skill 的新入口语言，声明 Policy authority，新增 v2.2 Note、task plan 和真实 semantic review artifact；保留 TDD/评审等质量护栏与必要的历史兼容读取说明。
- `scripts/agent/change-policy.js`：根据 immutable snapshot、changed paths 和 branch taxonomy 输出 classification、requiresTask、requiresNote、requiredChecks、requiresReview、requiredAttestations 及 policyHash。
- `scripts/agent/change-scope.js`、`select-gates.js`、`note-gate.js`、`verify.js`：改为消费同一 policy，verify 写入 policy 与 start/end snapshot 事实。
- `scripts/merge-to-dev*.js`：移除重复的路径规则解释，使用 policy 的 task/review/attestation/checks 要求。
- `scripts/agent/approval.js` 及相关 task/branch 事实工具：统一 provenance、EV task ID 和 subject branch/head 表达；不引入执行状态。
- `tests/unit/`：新增 Policy matrix 与跨消费者一致性测试，迁移仍有效的旧兼容测试，删除真正废弃的 FSM-only 断言。

## Implementation order

1. 冻结 v2.1 基线，创建 EV-024、Note 与本计划，记录当前消费者和迁移边界。
2. 删除旧 lifecycle skill 目录及新入口中的 FSM 语言；更新根与 docs 规则只保留 operation skill 语义。
3. 先写 `change-policy.js` 的失败测试，再实现 policy matrix、稳定序列化和 policyHash。
4. 逐个迁移 scope/checks/note/verify/merge 消费者；每个消费者用同一 snapshot/policy fixtures 做红绿验证。
5. 分离 automated evidence、semantic review 和 human attestation 的结构；保持现有自动 evidence 目录，不把 evidence 复制到 task.json。
6. 修复 task provenance、branch facts、end snapshot drift、worktree hook/branch taxonomy 的事实校验，并补对应回归。
7. 执行全量受影响测试、build、scope/checks/verify、notes/docs/boundary 检查和独立 semantic review。

## Policy matrix

| Change surface | Task | Note | Checks | Review | Attestation |
| --- | --- | --- | --- | --- | --- |
| docs-only | no | no | docs-check | no | none |
| app-local | no | no | unit/build as routed | optional | none |
| shared/framework | yes | yes | unit/build | yes | none |
| workflow/scripts | yes | yes | scripts-unit/workflow-fixture/build | yes | none |
| Tauri OS integration | yes | yes | unit/build plus targeted | yes | desktop-manual |

## Acceptance evidence

- `change-policy.test.js` 覆盖上述 matrix，并证明 select-gates、verify、merge 对同一 snapshot 得到同一 policyHash/requiredChecks。
- 旧 lifecycle skill 检索结果只在明确 legacy/archive 兼容范围出现；新 operation skills 不定义 FSM 状态。
- verify report/evidence 同时包含 policyHash、startSnapshot、endSnapshot；执行期间变更导致失败。
- merge readiness 读取 branch ref 的 policy 与 evidence，拒绝 policyHash、snapshot、review 或 attestation 漂移。
- 所有变更通过 `npm test`、`npm run build`、`npm run check:boundary` 和受影响的 agent checks。

## Risks / open questions

- 旧 dev 上的 merge-to-dev 可能尚未理解 v2.2 policyHash；需要保留向后兼容迁移路径，不能伪造 evidence。
- 历史 EWP/legacy task 仍可读取，但不得被新 Policy 当作 FSM 输入；迁移测试必须区分读兼容与新写入。
- review.md 在 code head 之后只能有允许的 metadata-only 变更，否则必须重新评审。
