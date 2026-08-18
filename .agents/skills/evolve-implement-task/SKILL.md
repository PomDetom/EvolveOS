# evolve-implement-task

## Trigger

task 已处于 `planned` 且计划获得批准。

## Inputs

task.json、plan.md、相关 Note、允许路径和当前 branch。

## Outputs

符合 allowedPaths 的实现、失败测试到绿色测试的记录，以及状态更新为 `verifying` 的 task。

## Stop conditions

不在 task branch、改动越界、TDD 红灯无法复现、测试失败未定位、需要修改未授权文件或试图直接写 `ready` 时停止。

## Source of truth

task.json/plan.md、相关 Note、Git diff、测试输出和项目 AGENTS 规则。

## Procedure

1. 读取 task、plan 和 Note，确认 branch、baseSha、allowedPaths。
2. 先写一个能证明需求的失败测试并确认红灯。
3. 写最小实现，循环运行定向测试并在绿色后重构。
4. 运行范围检查，更新 task 为 `verifying`；不得直接声明 `ready`。
