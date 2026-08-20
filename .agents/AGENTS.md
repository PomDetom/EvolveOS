# EvolveOS Agent Workflow

`.agents/` 保存仓库原生 Evolve Workflow Protocol（EWP）的长期规则、任务事实、模板、Notes 和 Skills。

## 长期规则

- 协议配置位于 `.agents/protocol.json`；task JSON 只保存恢复事实，不保存执行阶段。
- 所有迁移任务从 `dev` 创建分支和 worktree；不得直接在 `dev` 修改。
- v2 没有 `shadow/enforced` 状态；Git boundary、hooks 和 merge gate 本身就是 enforcement。
- 自动验证证据放在 `.git/evolve-agent/evidence/`，绑定 base/head/changedPathsHash；HEAD 改变后缓存失效。
- `.agents/tasks/` 保存当前任务事实；普通单应用局部改动不强制创建 Note。
- `.agents/notes/` 只保存跨任务的架构、流程、测试、功能、修复和简化决策原因；不要用 Note 复制实施日志。
- `docs/superpowers/sdd/` 是冻结的历史证据，不迁移、不删除、不覆盖、不新增原始 `.diff`。
- EWP 不引入运行时 npm 依赖，不替换现有分支/worktree 拓扑，不把 Tauri 真实桌面验证替换为 mock e2e。

## 路由

- 新建或恢复任务：读取 `.agents/tasks/<年份>/<task-id>/task.json` 和同目录计划。
- 任务验证：使用 `scripts/agent/` 下的校验、scope、gate 和 evidence 工具。
- 任务评审：写入 task 目录的 `review.md`，评审 SHA 必须等于当前 HEAD。
- 流程决策：先查 `.agents/notes/`，再按 Note 生命周期写入对应目录。
- 旧生命周期脚本仅作为迁移兼容层，不得成为新任务入口；task 状态和 evidence 不得依赖具体模型或平台。
- 旧 `.agents/tasks` schema 1、`activity.jsonl` 和 `.agents/start-runs/` 仅作历史兼容读取；v2 不新增、不更新这些文件。
