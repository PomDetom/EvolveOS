# EV-022 实现计划

## Goal

把 EvolveOS 工作流切换到 repository-native v2：Git 保存执行事实，task 只负责跨会话恢复。

## Scope

- `.agents/` 协议、模板、Note、Skills、recovery manifest
- `scripts/agent/` scope/checks/verify/task/hook 工具
- `scripts/merge-to-dev*.js` live readiness
- 根规则、文档规则、CI 和 package scripts

## Implementation approach

1. 固定 schemaVersion 2 和 source-of-truth 文档。
2. 将 task/schema/status/start/verify 改为 recovery + stateless 模型。
3. 按 changed paths 路由 gate，改造 hook 和 merge readiness。
4. 运行 docs/Notes/schema、build、Vitest 和 Playwright smoke。

## Acceptance

- 自动 evidence 不进入 task.json。
- 不存在新状态迁移、activity 或 baseline 写入路径。
- 简单改动可无 task；复杂 workflow 改动可从 task/Note/review 恢复。

## Risks / open questions

- 历史 schema 1 task、activity 和 start-runs 需要长期只读兼容，后续可单独规划归档迁移。
- manual Windows/Tauri evidence 仍需在真实桌面环境完成。
