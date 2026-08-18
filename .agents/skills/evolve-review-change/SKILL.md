# evolve-review-change

## Trigger

验证 evidence 已写入，task 状态为 `verifying`，需要独立评审。

## Inputs

真实 Git diff、task/plan/spec、acceptance、evidence、相关 Note 和当前 HEAD。

## Outputs

task 目录内的 `review.md`，包含 reviewedHead、结论、acceptance 对照和 findings。

## Stop conditions

无法读取真实 diff、reviewedHead 不是当前 HEAD、存在未解决 Critical/Important、acceptance 缺证据或人工 gate pending 时停止。

## Source of truth

task.json、plan.md、spec、`review.md` 模板、Git diff 和 verify evidence。

## Procedure

1. 独立读取 diff 与 acceptance，不以实现者自述代替证据。
2. 核对 scope、测试、Notes、SHA 和项目边界。
3. 记录 Critical/Important/Minor findings 与结论。
4. 只有所有阻断项解决且 reviewedHead 等于当前 HEAD，才允许后续状态判定 ready。
