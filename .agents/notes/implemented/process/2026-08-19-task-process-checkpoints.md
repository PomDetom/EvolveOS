# EWP 过程检查点与提交守卫

**Status:** implemented

**Class:** process

## Problem

任务状态、方案审批和验证记录如果只在最终合并前写入，执行中断或绕过 `agent:start` 时无法解释代码从哪里开始、是否经过审批以及哪些提交属于任务。

## Decision

任务审批、进入 implementing、进入 verifying 和进入 ready 均写入任务目录的 `activity.jsonl`，审批、implementing 和最终验证记录通过独立的 workflow checkpoint commit 持久化。`commit-guard.js` 提供提交前检查：代码提交必须绑定 native task、已批准方案、implementing 相关状态、有效启动证据和 allowedPaths；直接在 `dev`/`main` 提交或无任务分支提交会被拒绝。`install-hooks.js` 只在用户确认后安装守卫，已有非 EWP hook 时不覆盖。

## Alternatives

- **只在 `merge-to-dev` 检查：** 无法在工作中记录状态，且不能及时阻止未审批代码提交。
- **自动覆盖所有 Git hooks：** 会破坏用户已有 hook，因此安装器遇到非 EWP hook 时失败，并把激活作为显式步骤。

## Consequences/Risks

过程记录增加少量任务目录文件和检查点提交；当前迁移协议仍保持 `shadow`，待真实试点验证后再单独批准 `enforced` 激活。`--no-verify` 或低级 Git 写入仍需依赖最终合并门禁和远端 CI 防护。

