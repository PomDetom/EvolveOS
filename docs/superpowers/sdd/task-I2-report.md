# Task I2 实施报告：窗口控制桥（Tauri API 接线 + 浏览器降级）

**需求源**：`docs/superpowers/plans/2026-08-05-iteration.md` Task I2（含用户修正：不做真机验证 — 测试仅在 Web 环境执行，webview 内行为由用户日后自行验证）；配置权威 `docs/tauri-integration.md` §2/§3

**状态**：完成 — 桥双通道接线 + 浏览器降级行为零变化；单测/全量 e2e/构建全绿；真机验证按修正后标准跳过（验证期间发现并处理一个拖拽劫持问题，见第四节）

**提交**：`b9d2740`（`feat: 窗口控制桥（Tauri API 接线 + 浏览器降级）`）；本报告随 docs 留痕提交

## 一、桥实现说明

新文件 `src/demo/window-controls.js` 导出 `bindWindowControls(api?)`（独立小模块，按任务建议而非并入 main.js）：

- **双通道**：`api` 注入参数缺省时探测 `window.__TAURI__?.window?.getCurrentWindow()`（`withGlobalTauri: true` 全局通道，零新依赖 — 未引入 `@tauri-apps/api` 前端包）；探测不到返回 `false` 不绑定。
- **三按钮映射**：`.c-titlebar__control--min` → `win.minimize()`；`--max` → `win.toggleMaximize()`，成功后按 `isMaximized()` 真实状态同步图标与 `data-maxed`（与 `mountTitleBar` 演示切换同款图标/标记）；`--close` → `win.close()`。
- **失败静默降级**：min/close 用 `Promise.resolve(...).catch(() => {})`，max 用 try/catch — 任一 API 失败不抛错、按钮保留当前状态。
- **绑定策略**：`querySelectorAll('.c-titlebar__control')` 统一绑定全部实例（titlebar-demo / 场景模板 / 组件矩阵，共 6 处）—— 同一 `getCurrentWindow()` 句柄对每个实例操作同一主窗口，重复绑定无副作用（注释说明）。
- **main.js 接线**：调用放在全部挂载之后（场景模板/矩阵的实例已渲染）；浏览器环境探测不到 API 自动不绑定，`mountTitleBar` 演示行为（max 图标切换）原样保留。

## 二、测试（红 → 绿）

`tests/e2e/title-bar.spec.js` 追加 2 用例（Playwright 无法测真实 Tauri API，按计划书「桥接可测」设计，测试经 `/src/demo/window-controls.js` 动态 import 注入 mock）：

1. **注入 mock windowApi**：`minimize/toggleMaximize/close` 记录调用 → 点击三按钮断言 `['minimize', 'toggleMaximize', 'close']`。
2. **无 windowApi（浏览器）**：`bindWindowControls()` 返回 `false` 不绑定；max 图标切换演示行为保持（`data-maxed` 两次点击往返）。

红：2 新用例失败（模块不存在 → 动态 import 报错），原有 1 用例通过。绿：实现后 3/3 通过。

## 三、回归（全量）

| 项 | 结果 |
|---|---|
| `npm test`（Vitest） | 31 passed（4 文件） |
| `npm run test:e2e`（Playwright 全量） | **77 passed**（含 36 张视觉基线 — 未重生成，默认渲染零变化） |
| `npm run build` | 96 modules，built in 623ms |

## 四、真机验证（按用户修正跳过 + 过程中发现并处理的事项）

用户修正后 Step 3（真机验证）不做：Tauri 壳可启动已由 I1 确认，webview 内页面行为由用户日后自行验证；`src/CLAUDE.md` 已固化「测试仅在 Web 环境执行」。

验证尝试期间（修正前，WebView2 CDP 附加 + 真实输入探测）发现一个**拖拽劫持问题**并已处理：

- **问题**：`data-tauri-drag-region` 挂在 `.c-titlebar` 根元素，其子树包含三按钮 — 接入指南 §2 明示该坑（「属性会覆盖整条子树；若窗口控制按钮点击被拖动『劫持』（偶发），把属性只保留在 `.c-titlebar__drag` 上即可」）。验证过程中的部分真机观察与 §2 描述一致（minimize 后窗口状态快速恢复、按钮区域真实点击无 DOM 事件）。
- **处理**：`title-bar.js` 移除根元素属性，只保留 `.c-titlebar__drag`（组件设计即「最小安全拖区」，与指南建议一致）；`title-bar.spec.js` 契约同步更新（断言 drag 区有属性、根元素无）。浏览器演示行为零变化（该属性在浏览器无意义），e2e 全绿。
- **证据边界**：验证环境存在坐标/遮挡干扰（终端窗口遮挡、窗口曾被移出屏幕），观察为部分证据；最终以指南 §2 为依据落地，待用户真机复核确认。
- **验证设施清理**：tauri dev 后台实例 / app.exe / 9222 CDP 端口 / 临时脚本全部清理；`tauri.conf.json` 验证期间临时添加的 `additionalBrowserArgs`（CDP 调试端口）已还原，生产配置零改动。

## 五、顾虑与备注

1. **`core:default` 能力集不含 `allow-unminimize`**：JS 侧 `unminimize()` 会被权限拦截（验证时实测报错）。本桥不调用 unminimize（恢复走系统任务栏），能力配置保持默认；若未来需要 JS 恢复需显式加权限。
2. **`floating-window.js` 的 `.c-fwin__titlebar` 同类风险**：该组件整条标题栏挂拖拽属性且含折叠等交互按钮 — 同类劫持风险，超出 Task I2 范围（本任务为 TitleBar 组件），建议用户真机验证时留意或后续任务处理。
3. **拖拽属性契约变更**：此前契约「挂根元素」（title-bar.js 旧注释）改为「只挂 drag 区」— 指南 §2 授权，浏览器行为零变化。
4. **视觉基线**：36 张未重生成（默认渲染零变化，符合迭代全局约束）。
