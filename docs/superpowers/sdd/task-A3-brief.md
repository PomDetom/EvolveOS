# Task A3: 应用壳骨架（双窗口级联 + 标题栏上下文 + 7 模块）

**Files:**
- Create: `src/app/app-main.js`、`src/app/app-main.css`
- Create: `tests/e2e/app-shell.spec.js`
- Modify: `src/main.js`（动态 import 挂载）

**Interfaces:**
- `app-main.js` 导出 `mountAppMode(root)`：
  - DOM：`.app-main`（100vw/100vh grid 40px 1fr / 64px 64px 1fr）> `.c-titlebar` + `.app-main__nav-l`（左窗）+ `.app-main__nav-r`（右窗，默认隐藏）+ `.app-main__pages`（7 × `.app-main__page[data-page]`）
  - 左窗：7 模块（概览 home/剪贴板 clipboard/密码 key/记账 wallet/搜索 search/帮助 help/关于 info）纯 icon
  - 右窗：应用目录（每应用 2-4 项占位目录：如剪贴板 → 历史/固定/分组；密码 → 全部/分组/回收站；记账 → 概览/流水/分类…）— MODULES 数组驱动（扩展契约：应用注册 = 模块项 + 目录项 + 页面渲染函数）
  - 标题栏上下文：`[data-ctx]` 文本节点「应用名 › 页面名」随左/右窗选中联动
  - 级联联动：左窗选中 → 右窗推入（弹性）+ 载入该应用目录；右窗选中 → 内容区切页；右窗收起三通道（返回按钮/二次点击左选中/Esc）
  - 单窗口态：内容区 = 左窗选中应用首屏（概览页为默认）
  - 占位页骨架：EmptyState（图标 + 「功能开发中」+ 接入说明）+ 页面头；概览页：欢迎卡 + 7 快捷入口卡 + 主题状态卡
- `app-shell.spec.js` 用例：壳结构（TitleBar/7 项/单窗口态概览页）/ 点击应用 → 右窗展开 + 目录项 + 内容区切换 / 三通道收起 / 换应用右窗内容切换 / 标题栏上下文文本联动

- [ ] **Step 1-3**: 写失败 e2e → 实现骨架（MODULES 驱动 + 级联 + 上下文 + 占位页）→ 绿
- [ ] **Step 4**: 全量回归（docs 84 零冲击 + 新 spec 绿）+ build
- [ ] **Step 5: 提交** `feat: 应用壳骨架（双窗口级联 + 7 模块占位）`

---
