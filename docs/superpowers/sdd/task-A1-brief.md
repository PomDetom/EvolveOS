# Task A1: 双模式入口（mode 解析 + docs 渲染搬移）

**Files:**
- Create: `src/app/mode.js`、`tests/unit/mode.test.js`
- Create: `src/docs/docs-mode.js`（从 main.js 纯搬移 docs 渲染：骨架渲染/主题切换/令牌区/组件矩阵/动效实验室/场景模板/定制器/热键/设置入口）
- Modify: `src/main.js`（模式分支 + docs 调用 + app 动态 import）

**Interfaces:**
- `mode.js` 导出 `resolveMode(params, hasTauri)`：`?mode=app|docs|strip` 显式优先；无参数 + hasTauri → 'app'；无参数浏览器 → 'docs'；非法值回落 'docs'
- `docs-mode.js` 导出 `mountDocsMode()`：渲染并挂载全部 docs 内容（现 main.js 中 docs 相关全部逻辑，逐字节等价）
- `app-main.js` 导出 `mountAppMode()`（Task A3 实现，本任务仅动态 import 占位）

- [ ] **Step 1: 写失败单测**（mode.test.js 5 例：默认浏览器→docs / Tauri→app / 显式 app / 显式 docs / 非法回落 docs）
- [ ] **Step 2: 实现 mode.js**
- [ ] **Step 3: docs 渲染搬移**：main.js 的 docs 骨架 + 全部挂载逻辑迁 docs-mode.js（NAV_CORE/NAV_ITEMS/骨架/主题切换/存储提示/定制器/令牌区/wheel/热键/设置入口/titlebar-demo/fwinDemo/组件矩阵/动效实验室/3 场景/测试桥/窗口控制桥 全部迁入，main.js 只留模式分支）
- [ ] **Step 4: 验证 docs 等价**：`npm run test:e2e` 84 全绿（docs 零冲击是硬门槛）+ 36 基线零变化 + build
- [ ] **Step 5: 提交** `feat: 应用/文档双模式入口`

---
