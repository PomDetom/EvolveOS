# EV-023 工作流改进方案 v2.1

## Goal

在 v2 的 repository-native 事实模型上继续收敛入口，避免不同脚本对当前变更范围和 recovery task 的解释漂移。

## Scope

- `.agents/`：v2.1 task、协议文档、实施 Note 与 Skill 说明
- `scripts/agent/`：统一变更快照、严格 recovery schema、验证缓存与 gate 路由
- `scripts/merge-to-dev*.js`：复用统一事实并阻止过期 evidence
- `tests/unit/`：v2.1 契约与回归测试
- `AGENTS.md`、`README.md`、`docs/`：同步执行入口与 source-of-truth 说明

## Implementation approach

1. 先补 v2.1 契约测试，固定 snapshot、严格 task keys 和 evidence invalidation 行为。
2. 抽取 Git 变更快照，供 scope/checks/verify 复用；将 HEAD/base/path hash 一起作为证据身份。
3. 收紧 v2 recovery manifest schema，拒绝未知和旧 FSM 字段；保持历史 schema 1 只读兼容。
4. 更新验证与 merge readiness 的文档、Note 和回归门禁。

## Acceptance

- 相同工作树事实得到相同 snapshot 与 gate 路由；同一路径内容变化会改变 content fingerprint。
- task JSON 不会悄悄携带未定义 workflow 状态或 evidence 字段。
- 变更快照变化时旧 evidence 不会被当前 merge readiness 接受。
- `npm test`、`npm run build`、`npm run check:boundary` 和 docs/Notes 检查通过。

## Risks / open questions

- 旧 schema 1 task、activity 和 start-runs 继续只读兼容，不在本任务迁移或删除。
- Tauri 真实桌面验证仍由现有 manual gate 负责，本任务不以 mock 替代。
