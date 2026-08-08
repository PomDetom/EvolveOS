# SDD ledger — plan: docs/superpowers/plans/2026-08-08-app-shell-b4-desktop-realism.md

Base: 79d866f（branch feature/b4-desktop-realism，自 main 检出；工作树 Cargo.toml 行尾噪声未动）
交接：无（本迭代由 brainstorming 产出）
规格：docs/superpowers/specs/2026-08-08-app-shell-b4-desktop-realism-design.md（唯一需求源）
计划书：docs/superpowers/plans/2026-08-08-app-shell-b4-desktop-realism.md（唯一实施需求源）

## Pre-flight 扫描（2026-08-08，干净，无阻塞冲突）

- 无任务间矛盾；无「测试断言空洞/逻辑块逐字重复」的计划强制造缺陷。
- B4-2 默认 14×1 计算值不变 → 视觉零漂移；B4-3/4 各重生成 appearance-partition 6 张（删滑杆 + 网格 6→12）。
- B4-3 删色彩微调链：先 grep `hexToHsl`/`temperatureToHue` 消费点再删导出；存量 localStorage `color:{...}` 死键不清理。
- B4-5/6 e2e 用 `page.addInitScript` 注入 mock `__TAURI__`；浏览器路径必须零回归。capability `windows` 须含 `"strip"` 否则 strip 窗口自身权限被拒。
- B4-2 e2e 断言读真实元素解析 `fontSize`（getComputedStyle 自定义属性返回未解析 calc 字符串）。

## Task B4-1: 窗口控制权限修复

- **状态**：完成（2026-08-08，见 task-B4-1-report.md）
- **提交**：`f5a16dc` `fix: Tauri 窗口控制权限（min/max/close/拖拽 capability 授权，闭环 B4-1）`
- **验证**：TDD 红→绿（单测断言 7 项窗口权限，纯配置改动）；npm test 61/61（11 files，+1 新增）；npm run test:e2e 100 passed（含视觉基线 24，纯配置零漂移，未跑 --update-snapshots）；npm run build 通过
- **实现**：`src-tauri/capabilities/default.json` permissions 追加 7 项 `core:window:allow-*`（minimize/maximize/unmaximize/toggle-maximize/close/is-maximized/start-dragging）；新增 `tests/unit/window-capabilities.test.js` 作配置守卫
- **简报/报告**：docs/superpowers/sdd/task-B4-1-brief.md / task-B4-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor：① 单测断言包含而非精确集（brief 字面，后续可收紧）；② 提交拆为 fix + docs 两枚（B3 既有惯例，非偏差）
- **执行状态**：Task B4-1：✅ 完成（f5a16dc，评审通过）
