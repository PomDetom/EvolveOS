# SDD ledger — plan: docs/superpowers/plans/2026-08-06-app-shell-b2.md

Base: 0839414（branch feature/b2-visual，自 main 检出，工作树 Cargo.toml 行尾噪声未动）

规格：docs/superpowers/specs/2026-08-06-app-shell-product-design.md（§3 B2 部分）
计划书：docs/superpowers/plans/2026-08-06-app-shell-b2.md
交接：docs/HANDOFF-B2-B3.md

## Pre-flight 扫描（2026-08-06，干净，无阻塞冲突）

- 无测试断言图标宽度 22 / 分组标题文案 / backdrop —— B2-3 尺寸分级、B3-1 重命名不打破既有断言。
- `.cust-group` count 6（app-shell.spec.js:148）不受影响（B2/B3 不新增分组）。
- apply.test.js 用真实 `document.documentElement` 作 root（非 mock）—— 计划 Step 1 测试代码需按既有结构适配（计划已注明）。
- B2-1 计划 Step 4 写 `--glass-enabled` 变量 + Step 6 注记写 `root.dataset.glass`（CSS 选择器用后者）；两者都写，变量由单测锁定。
- visual spec 硬编码 `toHaveCount(10)`（既有 deferred minor，本计划不触碰）。

## 执行状态

- Task B2-1 玻璃材质两档：已完成 55d0bcc（磨砂 backdrop-filter / 纯色不透明降级，测试全绿）
- Task B2-2 浏览器装饰背景层：待执行
- Task B2-3 导航图标四项增强：待执行
- 最终整体评审 + 合并 main：待执行
