# Task A1 报告：双模式入口（mode 解析 + docs 渲染搬移）

日期：2026-08-05 · 分支：feature/iteration · 基址：47a1d76

## 实现内容

1. **`src/app/mode.js`**（新建）：导出纯函数 `resolveMode(params, hasTauri)`。规则：
   - 显式 `?mode=app|docs|strip` 优先；
   - 显式参数存在但非法（如 `?mode=bogus`）→ 回落 `'docs'`（**不**落入 Tauri 探测，避免非法参数把桌面端切进 app —— 此分支由 TDD 红测发现并修正）；
   - 无参数 + hasTauri → `'app'`；无参数浏览器 → `'docs'`。
   - `params` 接受 URLSearchParams / 等价对象（有 `.get`）/ 字符串 `'?mode=...'`；不读全局，hasTauri 由调用方注入。
2. **`src/docs/docs-mode.js`**（新建）：docs 渲染**纯搬移**，导出 `mountDocsMode()`。逐项迁入：NAV_CORE/NAV_ITEMS、骨架 HTML、`applyConfig(getConfig())`、theme-switcher、`onStorageError` 存储降级 toast、customizer 挂载 + topbar 按钮接线、token-showcase 订阅、nav-wheel 挂载与窄屏下拉同步、全局热键注册（`window.__bindHotkey` + keydown）、设置入口、titlebar-demo、fwinDemo、组件矩阵、动效实验室、3 场景模板、测试桥（`window.__toast`/`__openDialog`）、窗口控制桥（`bindWindowControls()`）。顺序与原 main.js 完全一致（热键注册在 fwinDemo 的 mountSearchBar 之前，桥接线在全部挂载之后）。
3. **`src/main.js`**（修改）：保留全部 CSS import（全局样式所有模式加载）+ 模式解析 + 分支。docs 静态 import 同步挂载（逐字节等价、无时序风险）；app/strip 动态 `import()` 到占位模块。
4. **`src/app/app-main.js` / `src/app/strip-main.js`**（新建占位）：导出 `mountAppMode(root)` / `mountStripMode()`，空实现 + `console.info` 标注「Task A3/A5 实现」，保证 Vite build 可解析动态 import 目标（build 已产出 app-main/strip-main 独立 chunk）。

## TDD Evidence

**RED**（Step 1，先写失败测试）：
```
npm test
FAIL tests/unit/mode.test.js — Error: Failed to resolve import "../../src/app/mode.js".
Does the file exist?
```
预期红因：`src/app/mode.js` 尚未实现，导入解析失败 → 模块级失败（比断言失败更彻底的红）。

**中间红（实现后一次断言失败）**：首版实现把「非法值」落在 Tauri 探测上，导致 `('?mode=bogus', true) → 'app'`（实际应为 'docs'）。测试按规格「非法值回落 docs」拦截——修正为显式非法参数无条件回落 `'docs'` 后转绿。

**GREEN**（Step 2 实现后）：
```
npm test
Test Files 6 passed (6) · Tests 41 passed (41)  # 36 既有 + 5 新增 mode 用例
```

## 测试结果

- **`npm test`**：41/41 绿（6 文件，含 mode.test.js 5 例：默认浏览器→docs / 无参+Tauri→app / 显式 app / 显式 docs / 非法回落 docs；app 用例另覆盖显式优先于 Tauri 探测、字符串等价对象）。
- **`npm run test:e2e`**：**84/84 绿**（含 36 张视觉基线测试零变化 —— 深/浅 × 3 accent × 6 selector：tokens/components/scenes/main-window/settings-window/clipboard）。docs 模式零冲击达标。
- **`npm run build`**：通过（101 modules；主 chunk 含 docs 同步打包，app-main/strip-main 为独立懒 chunk）。
- **手动模式分支验证**（临时 Playwright 脚本，已删除）：`/`→docs 渲染 .app-shell/#tokens；`?mode=app`→`[app] Task A3 实现…`；`?mode=strip`→`[strip] Task A5 实现…`；注入 `window.__TAURI__` 全局（withGlobalTauri 同通道）→ app 占位。
- **逐字节等价机械比对**：git HEAD 的 main.js 逻辑块 vs docs-mode.js 函数体 —— 骨架模板字面量（25 行内容 + 闭合反引号）逐字节相同；其余代码去首空白后结构一致（差异仅为函数体内 +2 缩进，属代码空白、非渲染输出）。

## Files changed

- 新建：`src/app/mode.js`、`tests/unit/mode.test.js`、`src/docs/docs-mode.js`、`src/app/app-main.js`、`src/app/strip-main.js`
- 修改：`src/main.js`（20 增 / 172 删）

## Self-review findings

- **模板字面量缩进陷阱**（自检发现并修复）：初版把骨架模板整体缩进 +2，导致 `#app` 内空白文本节点多 2 空格、非逐字节等价（视觉/类名断言不受影响，但违背「DOM 文本逐字节等价」）。已改为保留原始列字节，机械 diff 确证模板逐字节相同。
- 无运行时依赖新增；未加 topbar「应用壳」链接（符合 pre-flight 决策）；遵循既有注释/风格。
- `__hotkeyHandlers` 由模块作用域移入函数作用域，闭包引用（`window.__bindHotkey` 与 keydown 监听器）均在函数内定义，行为等价；`mountDocsMode` 仅被 main.js 调用一次，无双挂载风险。

## Issues / concerns

- `?mode=strip` 分支经实现路径（`resolveMode` 返回 'strip' + main.js 动态 import）手动验证通过，但按任务书「5 例」未单独入单测；如后续 A5 前想加固可补一条（非本任务范围）。
- 已知风险（沿用计划书）：`window.__TAURI__` 注入时序与 bindWindowControls 同模式，风险低；Tauri 壳内 app 模式实为占位，最终验证在 Task A3。
