# Task A4: 设置模式（⚙ 按钮 + 右窗设置目录 + 设置页共享）

**Files:**
- Modify: `src/app/app-main.js/.css`
- Modify: `src/scenes/settings-window/settings-window.js`（提取共享函数，类名不变 — scene-settings.spec 回归为前置门槛）
- Modify: `tests/e2e/app-shell.spec.js`

**Interfaces:**
- 标题栏 ⚙ 按钮（右缘窗口控制旁）：点击 → 右窗切换为设置目录（8 分区纯 icon）；激活态高亮；再次点击收起右窗（toggle）
- 右窗设置目录 → 内容区设置页（共享 settings-window 实现：通用/外观=定制器整页/界面/快捷键/通知/数据/高级/关于）
- 设置模式标题栏上下文「设置 › 外观」
- 左栏在设置模式保持应用列表不动（全局上下文稳定）
- 用例：⚙ 点击 → 右窗 8 项设置目录 + 内容区设置页 / 外观分区含 cust-group 6 / 左栏应用仍可选（切回应用模式）

- [ ] **Step 1-3**: TDD → 共享提取（scene-settings.spec 回归绿）→ 设置模式接线 → 新用例绿
- [ ] **Step 4**: 全量回归 + build
- [ ] **Step 5: 提交** `feat: 应用壳设置模式（⚙ 按钮 + 右窗设置目录）`

---
