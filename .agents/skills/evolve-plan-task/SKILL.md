# evolve-plan-task

## Trigger

已有批准需求，需要转为可恢复的 native task 计划。

## Inputs

批准需求、规格/Note、task.json、项目边界和验收条件。

## Outputs

task 目录内的 `plan.md`，包含 scope、接口、验收、风险和 gate 依据。

## Stop conditions

需求未批准、规格链接不存在、allowedPaths 不明确、计划引入未授权范围或 acceptance 无法验证时停止。

## Source of truth

task.json、对应 spec、相关 Note、`.agents/protocol.json` 和当前项目 `AGENTS.md`。

## Procedure

1. 读取 task、spec 和相关 Note，不从聊天历史猜状态。
2. 明确文件范围、依赖接口、验收条件和预期 gate。
3. 写入 `plan.md`，保持 task 的 branch/base/allowedPaths 一致。
4. 计划完成后仍保持 `planned`，交由 implement Skill 执行。
