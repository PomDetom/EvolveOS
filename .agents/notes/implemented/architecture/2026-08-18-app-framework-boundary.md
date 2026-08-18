# 应用与框架边界

**Status:** implemented

**Class:** architecture

## Problem

应用目录与共享框架目录的职责不同，应用越界会让局部任务影响整个壳和其他应用。

## Decision

应用分支只允许对应 `src/apps/<id>/`、相关测试和 docs；框架、EWP 基础设施和其他根文件按分支分类器显式授权，不能用通配规则放开所有 src。

## Alternatives

- 所有分支允许修改任意 src 文件。
- 由评审者凭经验判断越界。

## Consequences/Risks

- 新基础设施目录需要在 boundary 分类器中增加显式规则和回归测试。
- 边界规则变更本身必须经过独立验证。

参考：[boundary-check](../../../../scripts/boundary-check.js)。
