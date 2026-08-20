# Evolve Workflow Protocol

EWP 把 EvolveOS 的任务事实、执行边界、验证证据和评审记录放回仓库，使新会话可以从文件恢复任务，而不依赖聊天上下文。

## 当前模式

协议配置见 [`protocol.json`](protocol.json)。当前仍处于迁移期 `shadow`：native gate 生成 readiness 报告；EWP-019 先补齐过程记录和可选提交守卫，完成真实试点后再单独批准 `shadow → enforced` 激活。

## 目录职责

- `tasks/`：当前任务的 JSON 状态、计划和评审。
- `templates/`：task、计划、评审和 Note 的最小结构。
- `notes/`：跨任务决策原因及其生命周期。
- `skills/`：仓库原生执行 SOP；迁移前五个 Skill 先落地，后续再补 merge、Note 和 release Skill。
- `../scripts/agent/`：纯校验、范围选择、gate 选择、验证和状态读取脚本。

## 执行入口

- `npm run agent:start -- --title "标题" --kind <kind> --paths <path1,path2>`：必须从干净的 `dev` 启动；自动创建任务 ID、独立 worktree、`task.json`、`plan.md` 和非平凡任务的 proposed Note，并提交初始化记录。
- `npm run agent:approve -- --task <id> --approver <name>` 与 `npm run agent:implement -- --task <id>` 会分别提交审批检查点和 implementing 检查点，并在任务目录追加 `activity.jsonl`。
- `node scripts/agent/install-hooks.js` 可在用户确认后安装 pre-commit 守卫；已有非 EWP hook 时拒绝覆盖。
- `npm run agent:finish -- --task <id> --reviewer <name> --review-result approved`：运行验证、检查改动范围和 Note，并将任务推进到 `ready`；验证和评审绑定代码 `changeHead`，后续只追加任务记录不会使证据失效。
- `merge-to-dev` 从待合入分支读取 task，而不是依赖主 checkout 是否已经包含 task 文件；当前 `shadow` 只告警，`enforced` 激活后才阻断。

首批 Skill 的职责依次是 start、plan、implement、verify、review；它们都必须引用 task/spec/Note/Git 作为 source of truth，不以模型或聊天平台作为状态源。Notes 使用 `proposed/implemented/rejected/archived` 生命周期，可通过 `npm run agent:notes-check` 校验。

## 标准恢复顺序

1. 读取根和相关子目录的 `AGENTS.md`。
2. 读取 `.agents/protocol.json`，确认 mode 和 base branch。
3. 从 `.agents/tasks/` 找到当前未完成 task，核对实际 branch、HEAD 和 allowed paths。
4. 读取 task 的 `plan.md`、相关 Note 和现有 evidence/review。
5. 按 task 的下一状态调用对应 Skill 或脚本；不要从旧 SDD 猜测当前状态。

`docs/superpowers/sdd/` 保留历史任务恢复和审计用途，但在 native task 迁移完成后不再承载新任务运行状态。
