# EWP-020：历史证据聚合与 enforced 激活

- 状态：implemented
- Note 类别：process
- 记录日期：2026-08-20

## 变更

1. readiness 只使用同一 gate 最新的 evidence，历史失败或旧 HEAD 记录不再覆盖最新成功记录。
2. 增加历史 evidence 与最新成功 evidence 并存时的 enforced 回归测试。
3. 在上述修复完成后，将 `.agents/protocol.json` 切换为 `enforced`。

## 激活边界

提交守卫仍通过 `scripts/agent/install-hooks.js` 安装到目标 checkout；安装动作不写入 Git 版本库，须在合入后的主 checkout 单独执行并验证。
