# Evolve Workflow Protocol

EWP 把 EvolveOS 的任务事实、执行边界、验证证据和评审记录放回仓库，使新会话可以从文件恢复任务，而不依赖聊天上下文。

## v2 协议

协议配置见 [`protocol.json`](protocol.json)。v2 不保存 Agent 的执行阶段；Git HEAD、diff、分支和 merge-base 是执行事实，task 只保存跨会话恢复所需的 intent/scope/decision。不存在 `shadow/enforced` 迁移状态。

## v2.1 改进

v2.1 将当前工作树的 `baseSha`、`headSha`、排序去重后的 `changedPaths`、`changedPathsHash` 和内容 `changeFingerprint` 组成单一 change snapshot。`agent:scope`、`agent:checks`、`agent:verify` 与 merge readiness 必须使用同一组事实；验证 evidence 同时绑定这些指纹，任一项变化都必须重新验证。

v2 recovery manifest 使用严格字段集合：未知字段和旧 FSM/evidence 字段均拒绝，历史 schema 1 task 仍只读兼容。自动 evidence 继续写入 worktree-local `.git/evolve-agent/evidence/`，不写 tracked task。

## v2.2 Change Policy

`scripts/agent/change-policy.js` 是 workflow requirements 的唯一解释层。它消费 change snapshot 和 branch taxonomy，输出 classification、task/note/check/review/attestation 要求及 `policyHash`；scope、checks、Note、verify 和 merge 必须消费同一结果。`agent:scope` 直接输出 canonical Policy、artifacts、classification 和 `policyHash`，不得再以旧通用路径分类作为 Policy 结论。verify evidence 绑定 `policyHash`、`startSnapshot` 和 `endSnapshot`，执行期间 snapshot 漂移即失败。

自动 evidence、semantic review 和 human attestation 分离：自动 evidence 仍在 `.git/evolve-agent/evidence/`，review 绑定 `Subject head`/`changeFingerprint`，人工记录放在 task 的 `attestations/` 下。task 新写入使用 `createdFromSha` provenance；历史 `baseSha` task 仅只读兼容。

## 目录职责

- `tasks/`：需要跨会话恢复的最小 JSON manifest，以及可选 plan/review。
- `templates/`：task、计划、评审和 Note 的最小结构。
- `notes/`：跨任务决策原因及其生命周期。
- `skills/`：按操作场景组织的 worktree、pre-push、review、Note、merge 和 release Skill，不定义 workflow lifecycle。
- `../scripts/agent/`：纯校验、范围选择、gate 选择、验证和状态读取脚本。

## 执行入口

- `npm run agent:start -- --title "标题" --paths <path1,path2>`：需要恢复能力时创建分支/worktree 和最小 task；不运行 baseline、不创建 Note、不切换状态。
- `npm run agent:scope` / `npm run agent:checks`：从真实 Git diff 推导变更面和最窄充分门禁，不要求 task。
- `npm run agent:verify`：无状态运行当前 HEAD 的门禁；自动证据写入 `.git/evolve-agent/evidence/`，不写 task.json。
- `node scripts/agent/install-hooks.js`：安装 worktree-local 的 cheap deterministic pre-commit gate；新 worktree 创建时自动安装。
- `merge-to-dev`：读取实时 branch/diff/boundary/Policy/evidence/review/Note/attestation 事实，不读取持久化 workflow 状态。

operation Skill 必须引用 task/spec/Note/Git 作为 source of truth，不以模型或聊天平台作为状态源。Notes 使用 `proposed/implemented/rejected/archived` 生命周期，可通过 `npm run agent:notes-check` 校验。

## 标准恢复顺序

1. 读取根和相关子目录的 `AGENTS.md`。
2. 读取 `.agents/protocol.json`，确认 base branch 和 Note classes。
3. 从 Git 读取实际 branch、HEAD、merge-base、diff 和 changed paths。
4. 若存在 recovery task，读取其 intent、allowedPaths、acceptance、references 和 recovery state。
5. 读取相关 Note、plan 和 review；验证结果以当前命令/CI/人工证据为准。

`docs/superpowers/sdd/` 是冻结的历史证据，只读保留；新任务不得把它当作状态数据库。

`docs/superpowers/sdd/` 保留历史任务恢复和审计用途，但在 native task 迁移完成后不再承载新任务运行状态。
