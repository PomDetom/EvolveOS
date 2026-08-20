# EWP-021：提交守卫拦截空提交绕过

**Status:** implemented

**Class:** process

## Problem

`commit-guard.js` 在检查暂存路径前直接对空路径返回成功，导致 `git commit --allow-empty` 可以绕过 dev/main 守卫。

## Resolution

先判断当前分支：dev/main 非合并提交一律拒绝；其他分支若没有暂存路径也拒绝。保留合并提交例外，并用单元测试覆盖空提交路径。

## Consequences/Risks

空提交不会产生业务代码变化，但会污染过程历史；修复后不应再出现新的空提交。
