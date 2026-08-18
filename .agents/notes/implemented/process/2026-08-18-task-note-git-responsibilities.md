# Task、Note 与 Git 的责任边界

**Status:** implemented

**Class:** process

## Problem

任务事实、决策原因、实施 diff 和终端日志混在同一处会造成重复记录，也无法判断哪一份状态有效。

## Decision

Task JSON 保存当前事实和摘要 evidence，Note 保存 why 与放弃的替代方案，Markdown 计划/评审保存职责和结论，Git 保存完整历史与 diff；完整日志不提交，HEAD 变化使旧 evidence/review 失效。

## Alternatives

- 把完整终端日志复制进 task 和 Note。
- 只依赖 Git commit message，不保存当前 task 状态。

## Consequences/Risks

- 恢复任务需要按规定顺序读取多个小文件。
- 跨任务决策必须主动链接到相关 spec/task，避免 Note 失去上下文。
