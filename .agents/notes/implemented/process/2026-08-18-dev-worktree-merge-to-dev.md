# dev、worktree 与 merge-to-dev 责任边界

**Status:** implemented

**Class:** process

## Problem

并行 worktree 中的分支容易因基线漂移、手工合并或错误删除而失去可恢复性。

## Decision

所有迁移任务从 `dev` 创建独立分支和 worktree；主 checkout 常驻 `dev`；合入统一调用 `merge-to-dev`，保留同步、boundary、`--no-ff`、祖先验证和清理流程。

## Alternatives

- 在当前 dev checkout 直接修改。
- 手工 checkout、merge 和删除分支。

## Consequences/Risks

- 合并需要经过固定脚本，临时绕过会破坏证据链。
- 当前 Codex worktree 占用时可暂留 `--no-cleanup`，切换后仍须由脚本完成清理。

参考：[根规则](../../../../AGENTS.md) 和 [`merge-to-dev`](../../../../scripts/merge-to-dev.js)。
