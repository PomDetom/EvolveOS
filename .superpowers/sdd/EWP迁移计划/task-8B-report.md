# Task 8B 报告

## 2026-08-19 执行记录

- 状态: DONE_WITH_CONCERNS
- 提交: `f28a3df` (`fix: 收紧 Task 8B 方案审批门禁`)
- 运行的命令及结果:
  - `npm test -- --run tests/unit/agent-approve.test.js tests/unit/agent-task-schema.test.js tests/unit/agent-finish.test.js tests/unit/merge-to-dev-agent.test.js tests/unit/agent-start.test.js`：先红后绿，最终 41/41 通过。
  - `npm test -- --run tests/unit/agent-approve.test.js tests/unit/agent-start.test.js tests/unit/agent-task-schema.test.js tests/unit/agent-verify.test.js tests/unit/agent-finish.test.js tests/unit/merge-to-dev-agent.test.js tests/unit/merge-to-dev.test.js tests/unit/agent-protocol.test.js`：通过，52/52 测试通过。
  - `git diff --check`：通过；仅剩仓库既有的 CRLF/LF 提示，无额外 patch 错误。
- 实现摘要:
  - 新增 `scripts/agent/approval.js` 和 `agent:approve` 入口，方案审批绑定 `plan / allowedPaths / acceptance / product assumptions` 的稳定 hash。
  - task schema、新启动 task 模板和 `agent:start` 现默认进入 `awaiting_approval`，并记录 approval scope。
  - `agent:verify`、`agent:finish`、`merge-to-dev` native readiness 会拒绝未审批、审批记录缺失或 scope 漂移的任务；scope 变化时本地 task 自动回退到 `awaiting_approval` 并清空旧 evidence/review。
  - legacy task 缺少 `approval` 时不会被误判为已批准，但下游 gate 会继续阻断。
- 关注点:
  - 本轮状态检查观察到多个 Node 进程且此前存在多次等待超时风险；按要求未启动全量 e2e 或长时间 runner，仅执行 Task 8B 定向 unit 测试。
  - `merge-to-dev` 侧对审批 scope 的校验依赖分支上的 `plan.md` 与 `task.json` 同步提交；若用户只改工作区未提交，阻断将在本地 `verify/finish` 先发生。
