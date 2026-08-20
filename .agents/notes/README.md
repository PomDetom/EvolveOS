# Agent Notes

Note 保存跨任务可复用的 why、决策和放弃的替代方案，不复制 task 的实施步骤或终端日志。普通单应用局部改动不强制创建 Note；跨模块契约、工作流、测试策略、Tauri 行为和持久化格式应记录 Note。

## 生命周期

- `proposed/`：尚未接受的提案。
- `implemented/`：已采用并影响当前规则的决策。
- `rejected/`：明确放弃且保留原因的提案。
- `archived/`：历史冻结记录，不再修改。

每个新 Note 必须包含标题、`Status:`、`Class:`、`Problem`、`Decision/Proposal`、`Alternatives` 和 `Consequences/Risks`。`Status:` 必须与所在目录一致；`archived` Note 冻结。历史 Note 可按迁移兼容格式保留。

## 链接与证据

Note 可以链接规格、task 或代码路径；链接必须指向仓库内真实文件。不要把完整日志复制进 Note，自动命令 evidence 放在 `.git/evolve-agent/evidence/`，人工判断才进入 tracked review/Note。
