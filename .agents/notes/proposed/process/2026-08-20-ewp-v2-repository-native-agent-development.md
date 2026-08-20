# Repository-native Agent Development Protocol v2

**Status:** proposed

**Class:** process

## Problem

旧 EWP 把 planned、implementing、verifying、reviewing、ready 等执行阶段持久化到 task，并重复保存 evidence、baseline、activity 和 review。这样会产生多个 source of truth：task 状态可能落后于 Git，脚本还可以伪造“已批准”的 review。

## Proposal

EvolveOS v2 采用四层事实模型：Git 保存实际分支、HEAD、diff 和 merge-base；AGENTS.md 保存长期边界；Agent Note 保存跨任务可复用的 why/decision/rationale；可选 task 只保存 intent、allowedPaths、acceptance、references 和 recovery state。验证是无状态、按 changed paths 选择最窄充分 gates 的 runner；自动 evidence 放在 `.git/evolve-agent/`，不写 tracked task。merge gate 根据实时事实判断，不读取 `task.status === ready`。

普通明确需求直接实施；重大未决设计先写 proposed Note，接受方向后再实施；release 始终需要用户确认。review 必须由真实 reviewer 读取 diff 后产生，脚本只能校验 subject head 和 findings，不能生成 approved review。

## Source of truth

- 当前代码：Git HEAD
- 当前改动：Git diff
- 分支/基线：Git refs / merge-base
- 长期边界：根及相关目录 AGENTS.md
- 已采用决定：`.agents/notes/implemented/`
- 未决定方案：`.agents/notes/proposed/`
- 任务 intent/scope：可选 `.agents/tasks/`
- 自动验证：当前命令/CI 与 `.git/evolve-agent/evidence/`
- 人工判断：真实 review、视觉、Windows/Tauri evidence
- 历史 Superpowers：`docs/superpowers/sdd/`，只读

## Task model

Task 是 recovery manifest，不是开发许可证。只在预计跨会话、跨 Agent、跨模块、需要明确 scope、设计审批、Tauri 或 release 时创建。recovery state 只允许 `active`、`blocked`、`cancelled`、`closed`，不表达执行阶段。

## Skills

Skill 按专业操作组织：worktree、pre-push checks、code review、agent note、merge-to-dev 和 release。plan 是可选 artifact；implement 不建模为通用生命周期。

## Verification

根据真实 diff 选择最窄充分 evidence：docs-only 做 docs/schema/link 检查；app-local 做 owning unit、必要 e2e 和 build；framework/shared 做受影响单测、smoke、build 和 review；Tauri/OS integration 增加 cargo 与真实 Windows evidence；release 才扩大到 full matrix。

## Review

mechanical 和小型 app-local 改动可免独立 review；shared framework、design-system contract、Tauri、workflow tooling、release/hotfix 和 proposed Note 实施必须独立 review。review.md 必须绑定 subject head，保留真实 findings；不能由 finish 脚本批量生成“全部通过”。

## Git hooks

Hook 只做 cheap deterministic checks：禁止 dev/main 普通提交、禁止空提交、`git diff --cached --check`、staged boundary 和存在 task 时的 allowedPaths。Hook 不创建 activity、不更新 task state、不要求 task 或 approval。

## Merge

merge-to-dev 按 branch、base/head、changed paths、boundary、当前 evidence、Note、review 和 human checkpoint 判定。验证后 HEAD 变化即重新验证；没有 task 不应自动成为阻断条件，但需要 task 的 scope/review 事实缺失时必须阻断。

## Migration

protocol 升为 schemaVersion 2；旧 task/activity/start-runs 仅作历史兼容读取，不再被新入口写入。旧 approve/implement/finish 入口退出 package 默认流程。SDD 永久冻结为 legacy。

## Alternatives considered

1. 保留现有 FSM 继续优化：拒绝，状态和 evidence 重复 Git 事实。
2. 完全删除 tasks：拒绝，复杂跨会话任务仍需要恢复 manifest。
3. 使用外部 issue/project tracker：不作为仓库内协议的前置依赖。
4. 当前选择：minimal task + repository-native workflow。

## Acceptance

- 新 task 不包含 planned/implementing/verifying/reviewing/ready。
- 简单改动不需要 task 或 Note。
- verify 不写 task state，自动 evidence 不进入 tracked task。
- hook 不要求 task/approval，不修改 activity。
- merge 不读取 ready state。
- changed paths 是 scope 唯一事实；review 必须是真实 artifact。

## Consequences/Risks

- 失去强制步骤感，Agent 需要更好地进行动态路由。
- CI/merge gate 必须承担更多机械保证。
- 需要团队维护清晰的 Note、review 和人工 evidence 质量。
