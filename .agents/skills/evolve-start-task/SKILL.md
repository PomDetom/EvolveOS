# evolve-start-task

## Trigger

用户批准一个新任务，或需要从仓库状态恢复未完成任务。

## Inputs

需求、任务 ID、任务类型、允许路径和当前 `dev` 基线。

## Outputs

从 `dev` 创建的独立分支/worktree，以及 `.agents/tasks/<year>/<task-id>/task.json` 的 `planned` 初始事实。

## Stop conditions

当前处于 `dev` 直接修改、分支前缀非法、已有同 ID task、worktree 不独立或 pre-flight 发现基线不一致时停止。

## Source of truth

根/子目录 `AGENTS.md`、`.agents/protocol.json`、task schema 和 Git worktree 状态。

## Procedure

1. 读取规则、协议和已有 task/Note。
2. 确认 `dev` SHA，创建规定前缀分支与独立 worktree。
3. 根据模板写 task.json，记录 `baseSha`、`allowedPaths` 和 spec 链接。
4. 运行 pre-flight；只把 task 状态写为 `planned`，不宣称实现完成。
