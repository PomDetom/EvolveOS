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

## Task I3: 迭代修复批 1

- **状态**：完成（2026-08-05）
- **提交**：`7e32f27`（滚轮吸附 e2e）/ `231bc60`（toast flake）/ `37c4a46`（红线口径文档）/ `267631e`（小修批 a-g）/ `c013996`（留痕）
- **验证**：npm test 34/34、e2e 83/83（基线零重生成）、build 通过；toast flake 另 2 次全量确认稳定
- **评审**：规格 ✅ / Approved（4 Minor 留收尾：红线口径仅入 docs 未同步 src — 控制器已补；toast 断言 15s 超时；报告 --shadow-md 措辞；Step 1 e2e 无红态）

## Task I4: 迭代修复批 2

- **状态**：完成（2026-08-05）
- **提交**：`56e63a1`（窄屏折叠导航方案 A + 存储降级提示条，6 文件 +180/−4）
- **验证**：npm test 36/36（+2 store 单测）、e2e 84/84（+1 窄屏用例）、基线零重生成、build 通过
- **评审**：规格 ✅ / Approved（3 Minor 留收尾：回退指引未注明测试同步改动；单测 mock 清理位置 afterEach 建议；设置入口窄屏随侧栏隐藏 — 功能由下拉第 4 项承接能力无损）
- **遗留确认**：wheel.setActive 不重列滚动位置 — 评审补充支持论据（窄屏 display:none 下 scrollToIndex 几何失真，setActive 是安全选择），接受

## Task I5: 收尾

- **状态**：完成（2026-08-05；用户修正后无真机验收 — 全量回归各任务已覆盖）
- **迭代期成果**：Tauri 壳（I1）+ 窗口控制桥（I2）+ 修复批 1/2（I3/I4）— 9 个功能/修复提交 + 规范修订（测试仅 Web 执行、paint-only 豁免口径）
- **待用户决事项**：Cargo.toml 占位元数据清理（I1 minor）；I2 桥的同步抛错包装与 max 双击竞争（I2 minor）；EMA alpha 0.3 与 btn hover 观感（I3 minor，需真机复核）；窄屏设置入口显式化（I4 minor）；`tauri build` release 打包验证
