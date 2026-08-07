# B2 + 亚克力返工：最终整体评审 5 条 Minor 收尾 — 修复报告

- **状态**：DONE
- **提交**：`<committed-below>`（fix：最终评审收尾 —— 概览主题卡同步 + 卫生项清理）
- **需求源**：最终整体评审发现（5 条 Minor，合并前顺手清掉）
- **分支**：feature/b2-visual（Ready to merge；Cargo.toml 为本会话前已有的行尾噪声改动，未碰）

## 逐条修复

| # | 严重度 | 发现 | 修复 |
|---|---|---|---|
| 1 | Minor·用户可见 | `src/app/app-main.js` 概览页「主题状态」卡在标题栏切主题后陈旧（`renderOverview` 渲染时捕获 data-theme，标题栏按钮经 applyConfig 改 html data-theme 不重渲概览页） | 在既有主题 `subscribe` 回调内补：若概览页为 active 页（`.app-main__page[data-page="home"].app-main__page--active` 存在），更新 `.app-main__theme-row` 首 span 文本为 `当前主题：${document.documentElement.dataset.theme === 'dark' ? '深色' : '浅色'}`。只改文本节点，**不重渲整个概览页**（不破坏动画/性能） |
| 2 | Minor | `src/app/app-main.css:20-29` 头部块注释失实 | 第 20 行「渐变/几何/网格三预设」→「渐变/几何/网格/关闭四预设」；第 25 行「Tauri 背景层透明，模糊真实壁纸」→「Tauri 同显背景层（窗口已不透明 transparent:false，观感与浏览器一致）」 |
| 3 | Minor | `src/app/app-main.js:159` `const themeUnsub = subscribe(...)` 死变量 | 删 `const themeUnsub =`，直接 `subscribe(...)`（桌面常驻不退订，注释已说明；全仓库无其他引用） |
| 4 | Minor | `tests/unit/apply.test.js:42-44` 覆盖测试退化为同义重复（`noise: 0.06` 恰等于新默认 0.06） | 改为 `noise: 0.08` + 断言 `--noise-opacity` = `'0.08'`（恢复「覆盖非默认值」区分度，与「默认 0.06 写入」用例互补） |
| 5 | Minor | CSS 噪点兜底 0.04 与新默认 0.06 不一致 | `src/styles/themes.css` `:root { --noise-opacity: 0.06 }` 与 `src/app/app-main.css:58` `opacity: var(--noise-opacity, 0.06)` 均对齐 defaults.js `glass.noise: 0.06`（原 0.04 仅无 applyConfig 的死路径生效，正常链路恒被 applyConfig 覆盖，故渲染像素零变化） |

## 变更文件

| 文件 | 变更 |
|---|---|
| `src/app/app-main.js` | 主题 `subscribe` 回调扩展：活动概览页「主题状态」首 span 文本随 data-theme 同步；`const themeUnsub =` 删除（发现 1 + 3） |
| `src/app/app-main.css` | 头部块注释两处改准（四预设 + Tauri 同显背景层，发现 2）；噪点兜底 0.04→0.06（发现 5） |
| `src/styles/themes.css` | `:root` 噪点兜底 0.04→0.06（发现 5） |
| `tests/unit/apply.test.js` | 噪点覆盖用例 0.06→0.08（发现 4） |

## 验证结果

- `npm test`：**60/60**（10 files）
- `npm run test:e2e`：**97/97**（含视觉 24；app-shell 27 + mobile-nav/smoke/title-bar 等 46 + 视觉 24 —— 全绿）
- `npm run test:visual`：**24/24**（视觉基线零漂移 —— 无快照重生成，证实 5 处改动均不改变默认渲染像素：发现 1 仅运行时文本同步、发现 2 纯注释、发现 3 死变量删除、发现 4 单测参数、发现 5 死路径兜底对齐）
- `npm run build`：**通过**

## 命名/边界核对

- 配置链路不绕过：发现 1 读 `document.documentElement.dataset.theme`（applyConfig 已写后的最终解析值），不改写任何 CSS 变量、不重渲页面 ✓
- 动画红线不动：全部改动为文本节点更新 / 注释 / 单测参数 / CSS 静态兜底值，无任何动画涉及 ✓
- 只改上述 5 处；未碰 `src/demo/customizer.css:175` 同类 `var(--noise-opacity, 0.04)` 兜底（评审发现明确只列 themes.css 与 app-main.css 两处，遵守铁律不越界）✓
