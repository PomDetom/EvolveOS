# 基于改动路径选择验证集

**Status:** implemented

**Class:** testing

## Problem

由 Agent 临时猜测测试范围会导致相同 diff 得到不同验证集，且容易漏掉边界或构建检查。

## Decision

`agent:scope` 对 base...head 的路径排序去重并判断 allowedPaths；`agent:gates` 根据分支分类、改动路径和 task kind 返回稳定 gate 集合，但不执行命令。

## Alternatives

- 每次由 Agent 自由选择测试命令。
- 所有任务无差别运行完整验证集。

## Consequences/Risks

- gate registry 必须随着新目录和新验证能力同步更新。
- 选择正确不等于执行通过，evidence 仍须绑定当前 HEAD。

参考：[scope](../../../../scripts/agent/change-scope.js) 和 [gate selector](../../../../scripts/agent/select-gates.js)。
