# SDD ledger — 迭代期（2026-08-05 起）

Base: 7b9b71b (branch feature/iteration)

计划书：docs/superpowers/plans/2026-08-05-iteration.md

## Task I1: Tauri 壳搭建

- **状态**：完成（2026-08-05）
- **提交**：`5035457` `chore: Tauri 壳搭建（src-tauri + 配置 + scripts）`
- **验证**：`npx tauri dev` 编译 3m59s 成功，窗口启动（MainWindowHandle 4459056，标题 "UI Design System"），无 panic；smoke e2e 1 passed；前端零改动
- **报告**：docs/superpowers/sdd/task-I1-report.md
- **待决**：窗口控制接线（I2）、真机透明/无边框目检（I5）、`tauri build` release 验证（未纳入本任务范围）
- **评审**：规格 ✅ / Approved（2 Minor 留收尾：Cargo.toml 占位元数据 authors/license/description 待清理；I1 验证范围 smoke 而非全量 — 前端零改动下可接受）

## Task I2: 窗口控制桥

- **状态**：完成（2026-08-05；用户修正：不做真机验证 — 测试仅在 Web 环境执行）
- **提交**：`b9d2740` `feat: 窗口控制桥（Tauri API 接线 + 浏览器降级）`
- **验证**：npm test 31 passed；npm run test:e2e 77 passed（36 基线未重生成）；npm run build 通过
- **实现**：`src/demo/window-controls.js` `bindWindowControls(api?)` 双通道（注入 / `window.__TAURI__` 探测），三按钮 → minimize/toggleMaximize(+图标按真实状态同步)/close，失败静默降级；浏览器无 API 不绑定保持演示；main.js 全部挂载后统一绑定全部 .c-titlebar 实例
- **报告**：docs/superpowers/sdd/task-I2-report.md
- **待决**：拖拽属性劫持修复（drag 属性只留 .c-titlebar__drag，指南 §2）待用户真机复核；fwin 标题栏同类风险（超出本任务范围）；`core:default` 不含 allow-unminimize（本桥不依赖，恢复走任务栏）
- **评审**：规格 ✅ / Approved（2 Minor 留收尾：min/close 同步抛错未覆盖 — 建议 `Promise.resolve().then(...)` 包装；Tauri 下 max 双击演示乐观翻转与桥竞争 — 可留收尾处理）
- **待决**：fwin 标题栏拖拽劫持同类风险（报告已标注，超出 I2 范围 — 可并入 I3 小修批）
