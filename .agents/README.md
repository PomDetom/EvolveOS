# Evolve Workflow Protocol

EWP 把 EvolveOS 的任务事实、执行边界、验证证据和评审记录放回仓库，使新会话可以从文件恢复任务，而不依赖聊天上下文。

## v2 协议

协议配置见 [`protocol.json`](protocol.json)。v2 不保存 Agent 的执行阶段；Git HEAD、diff、分支和 merge-base 是执行事实，task 只保存跨会话恢复所需的 intent/scope/decision。不存在 `shadow/enforced` 迁移状态。

## 目录职责

- `tasks/`：需要跨会话恢复的最小 JSON manifest，以及可选 plan/review。
- `templates/`：task、计划、评审和 Note 的最小结构。
- `notes/`：跨任务决策原因及其生命周期。
- `skills/`：按操作场景组织的 worktree、pre-push、review、Note、merge 和 release Skill。
- `../scripts/agent/`：纯校验、范围选择、gate 选择、验证和状态读取脚本。

## 执行入口

- `npm run agent:start -- --title "标题" --paths <path1,path2>`：需要恢复能力时创建分支/worktree 和最小 task；不运行 baseline、不创建 Note、不切换状态。
- `npm run agent:scope` / `npm run agent:checks`：从真实 Git diff 推导变更面和最窄充分门禁，不要求 task。
- `npm run agent:verify`：无状态运行当前 HEAD 的门禁；自动证据写入 `.git/evolve-agent/evidence/`，不写 task.json。
- `node scripts/agent/install-hooks.js`：安装 worktree-local 的 cheap deterministic pre-commit gate。
- `merge-to-dev`：读取实时 branch/diff/boundary/evidence/review/Note 事实，不读取 `task.status === ready`。

首批 Skill 的职责依次是 start、plan、implement、verify、review；它们都必须引用 task/spec/Note/Git 作为 source of truth，不以模型或聊天平台作为状态源。Notes 使用 `proposed/implemented/rejected/archived` 生命周期，可通过 `npm run agent:notes-check` 校验。

## 标准恢复顺序

1. 读取根和相关子目录的 `AGENTS.md`。
2. 读取 `.agents/protocol.json`，确认 base branch 和 Note classes。
3. 从 Git 读取实际 branch、HEAD、merge-base、diff 和 changed paths。
4. 若存在 recovery task，读取其 intent、allowedPaths、acceptance、references 和 recovery state。
5. 读取相关 Note、plan 和 review；验证结果以当前命令/CI/人工证据为准。

`docs/superpowers/sdd/` 是冻结的历史证据，只读保留；新任务不得把它当作状态数据库。

`docs/superpowers/sdd/` 保留历史任务恢复和审计用途，但在 native task 迁移完成后不再承载新任务运行状态。
