# Repository-native Agent Development Protocol v2.1

**Status:** implemented

**Class:** process

## Problem

v2 已将 Git 设为事实源，但 scope、checks、verify 和 merge readiness 各自读取变更路径与 refs。调用之间如果工作树或基线变化，可能出现门禁计划和 evidence 指纹不一致；recovery task 也可能重新携带未定义的 workflow 字段。

## Decision

采用统一 change snapshot，固定 `baseSha`、`headSha`、排序去重后的 `changedPaths`、`changedPathsHash`、内容 `changeFingerprint` 和分类结果，供所有 workflow 入口复用。evidence 必须同时匹配这些指纹。v2 task schema 改为严格字段集合，旧 schema 1 继续只读兼容但不允许新入口写入。

## Alternatives

- 继续由每个脚本独立读取 Git：拒绝，容易产生门禁与 evidence 漂移。
- 将完整执行日志或 evidence 写回 task：拒绝，会恢复 v1 的重复事实源。
- 删除历史 schema 1 数据：拒绝，保留既有审计和迁移读取能力。

## Consequences/Risks

- 验证期间 base、HEAD、变更路径或同一路径内容发生变化会更早失效，需要重新运行 verify。
- merge readiness 对旧缓存更严格；这是避免过期 evidence 被复用的预期行为。
- Tauri/Windows manual gate 仍需要真实环境记录，本改动不改变该要求。

## Evidence

- `npm test -- --configLoader runner --maxWorkers=1`
- `npm run build`
- `npm run check:boundary`
- `npm run agent:notes-check`
