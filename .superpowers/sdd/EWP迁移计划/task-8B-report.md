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

## 2026-08-19 审查修复轮次

- 状态: DONE_WITH_CONCERNS
- 修复提交: `69e5ff0` (`fix: 修复 Task 8B merge readiness 门禁`)；报告提交另行记录。
- 修复内容:
  - 修复 `scripts/merge-to-dev.js` 的非法模板字符串和错误处理模板，并补齐 `evaluateTaskApproval` 导入。
  - `nativeReadinessFor` 现在读取目标分支的 `plan.md`，并把 `approvalIssues` 真实传入 `evaluateNativeReadiness`。
  - 新增真实加载 merge 主入口的回归测试，覆盖未审批、审批漂移、历史 task 无 approval、只有 code review 无 approval 四类阻断行为。
- 测试命令及结果:
  - `npm test -- --run --configLoader runner tests/unit/merge-to-dev-entry.test.js`：通过，5/5。
  - `npm test -- --run --configLoader runner tests/unit/merge-to-dev-entry.test.js tests/unit/merge-to-dev-agent.test.js tests/unit/merge-to-dev.test.js tests/unit/agent-approve.test.js tests/unit/agent-start.test.js tests/unit/agent-task-schema.test.js tests/unit/agent-verify.test.js tests/unit/agent-finish.test.js tests/unit/agent-protocol.test.js`：通过，9 个测试文件、57/57。
  - `node --check scripts/merge-to-dev.js`：通过。
  - `node --input-type=module -e "import('./scripts/merge-to-dev.js')..."`：通过，主入口可加载。
  - `node scripts/merge-to-dev.js`：按预期以退出码 1 输出用法，不执行合并。
  - `git diff --check`：通过，无 patch 错误。
- 关注点:
  - 首次 Vitest 启动因现有 Node 会话占用 `node_modules/.vite-temp` 返回 EPERM；未结束或清理其他会话，改用 `--configLoader runner` 完成同等定向测试。
  - 未运行全量 e2e 或长时间 runner，未进入 Task 8C。

## 2026-08-19 修复轮次 2

- 状态: DONE
- 修复内容:
  - `merge-to-dev` 主入口新增可注入的 `argv`、`rootDir` 和 `dryRun` 参数；默认 CLI 仍使用真实参数、仓库根目录并执行原有同步/边界/合并/清理流程。
  - 主入口阻断改为抛出带 readiness 明细的错误，由 CLI 顶层统一转换为退出码 1，便于安全入口测试验证实际拒绝结果。
  - 回归测试不再调用 `nativeReadinessFor()`，而是把临时 Git fixture 置于 `dev` checkout，直接调用完整 `main()`；四类 fixture 均在 readiness 阻断前不会进入合并副作用路径。
  - 历史 task fixture 移除现代启动、验证和评审证据；仅 code review fixture 保留独立的代码评审记录，两者均明确无方案 approval。
- 测试及检查:
  - 先红：旧模块未导出 `main`，4 个真实入口测试均失败并报告 `main is not a function`。
  - 定向入口测试：5/5 通过。
  - Task 8B 相关回归集合：9 个测试文件、57/57 通过。
  - `node --check scripts/merge-to-dev.js`：通过。
  - `git diff --check`：通过。
- 安全边界:
  - 测试只使用临时 Git repository、`rootDir` 注入和 `dryRun`；未真实合并、删除分支或修改 `dev`。
