# Evolve Workflow Protocol 原生迁移

**Status:** proposed

**Class:** process

## Problem

现有分支、worktree、验证和评审规则主要依赖聊天上下文与历史 SDD 留痕，新会话无法只从仓库状态确定当前任务和下一步。

## Proposal

采用 `.agents` 的 JSON task、Markdown 计划/评审、SHA 绑定 evidence 和确定性 gate 选择；迁移期先使用 shadow 模式，保留现有合并和发版行为。

## Alternatives

- 继续把聊天上下文作为唯一状态源。
- 第一阶段引入数据库或工作流服务。

## Consequences/Risks

- 仓库增加流程文件和校验维护成本。
- shadow 与旧 SDD 并行期间需要避免状态重复漂移。
