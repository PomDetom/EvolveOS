# SDD ledger — plan: docs/superpowers/plans/2026-08-06-app-shell-b1.md

Base: 86398d0（branch feature/b1-product，自 main 检出）

规格：docs/superpowers/specs/2026-08-06-app-shell-product-design.md（§2 B1 部分）
计划书：docs/superpowers/plans/2026-08-06-app-shell-b1.md

## Pre-flight 决策（2026-08-06，用户确认）

1. **B1 边界**：只管架构，视觉归 B2（玻璃/图标不在此计划）。
2. **B1-1 展示分区**：`APP_SECTIONS` 10 分区（共享 `SECTIONS` 保持 8，docs 场景 scene-settings count 8 零冲击）；组件/动效分区惰性挂载。
3. **B1-2 浏览器窗口控制**：按钮保留 + toast「此功能在桌面端生效」。
4. **B1-3/B1-4**：docs e2e 迁移/删除；模式简化 app/strip 两态；docs-mode.js 删除。

## Task B1-1: 设置分区扩展（组件/动效分区 + 展示内容内化）

- **状态**：完成（2026-08-06）
- **提交**：`a4fad8e` `feat: 设置分区扩展（组件/动效分区 + 展示内容内化）`
- **验证**：npm test 51/51；npm run test:e2e 119/119（app-shell 17 含新用例 + docs 84 零冲击 + scene-settings count 8 绿 + 视觉全绿）；npm run build 通过
- **实现**：`settings-pages.js` 新增 `APP_SECTIONS`（10 分区，`SECTIONS` 保持 8）+ `pageBody` 分区分支 + `renderSettingsPages(sections = SECTIONS)` 参数化；`app-main.js` 全部 SECTIONS 引用切 APP_SECTIONS（设置轮/桌面 ctx/手机 tabs/手机 ctx）+ 分区惰性动态 `import()` 挂载（桌面模块标志 + 手机 children-empty 模式）；组件分区挂剪贴板悬浮窗组合示例；展示模块自 import CSS；新建 `partitions.css`
- **简报/报告**：docs/superpowers/sdd/task-B1-1-brief.md / task-B1-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，4 Minor）
- **Brief 修正（实施实测）**：① APP_SECTIONS 追加尾部（组件8/动效9），测试 nth(8)/nth(9)；② 组件分区产出 7 个 `.csg`（6 组 + 交互块）；③ motion-lab.css 路径 `../styles/`；④ 手机路径不共享桌面 DOM（栈重建），用 children-empty 模式
- **Minor 留收尾**：① 手机动效分区 store 订阅泄漏（mountMotionLab subscribe 无退订，手机每次重进累积——与定制器 M1 已修模式不一致，B1-2+ 暴露 unsubscribe 关闭）；② 手机 components/motion tabs 无 e2e 覆盖（泄漏路径也未测）；③ 惰性加载未断言（激活前 `.csg` count 0 可加一条）；④ 动态 import 无 .catch（chunk 加载失败时桌面分区永久空，一行可修）

## 执行状态

- Task B1-1 设置分区扩展（组件/动效 + 展示内化）：✅ 完成（2026-08-06）
- Task B1-2 窗口控制双通道（浏览器降级）：待执行
- Task B1-3 docs e2e 迁移：待执行
- Task B1-4 模式简化 + docs 删除：待执行

## 执行规则（摘要，详见计划书与 docs/CLAUDE.md）

- 测试仅在 Web 环境执行；每任务结束全量回归绿（npm test + test:e2e + test:visual + build）
- 每任务：简报 → 派发 → 报告 → 审查包 → 评审 → 修复循环（≤5 轮）→ 本账本留痕（随代码提交）
- 动画红线：只动 transform/opacity；配置链路不绕过
