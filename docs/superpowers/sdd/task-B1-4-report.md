# Task B1-4 执行报告：模式简化 + docs 渲染删除

**状态**：DONE（全量回归绿）

## 一、实现内容

1. **resolveMode 简化**（`src/app/mode.js`）：只返回 `'app'|'strip'` —— `?mode=app|strip` 显式优先；无参数 / 非法值 / `?mode=docs` → 一律 `'app'`（浏览器与 Tauri 一致，docs 渲染已删除）。`hasTauri` 参数保留（调用方仍探测 `window.__TAURI__`，接口不变便于单测）。
2. **main.js 收敛**（`src/main.js`）：删除 `import { mountDocsMode }` 与 `else { mountDocsMode() }` 分支；模式分支收敛为 `if (mode === 'app') … else …`（strip）。CSS import 分类处理：
   - **移除**（docs 专属 / B1-1 已移入各展示模块）：`demo/token-showcase.css`、`demo/component-showcase-full.css`、`styles/motion-lab.css`、`scenes/main-window.css`、`scenes/clipboard-float.css` —— 其中 component-showcase-full / motion-lab / clipboard-float 三模块已自 import CSS（已核对），删除静态 import 后由动态 chunk 携带；token-showcase / main-window 无宿主，CSS 文件一并删除。
   - **保留**：`scenes/settings-window.css`（`.csettings__*` 启动即渲染）、`styles/customizer.css`（外观分区定制器）。
3. **删除 docs 渲染与孤儿模块**：`git rm` 删除 `src/docs/docs-mode.js` 及孤儿模块（见清单）。`git grep -l "mountDocsMode" src/` 无残留；`?mode=docs` 仅剩注释性/单测描述（均表述「docs → app」新语义）。
4. **视觉基线重构**（`tests/e2e/visual-regression.spec.js`）：删除 docs 专属 SHOTS（6 组），保留 `app-main`，新增「组件」「动效」分区基线（⚙ 进入设置 → 右窗 nth(8)/nth(9) → 等惰性挂载，`data-motion=off` + `animations: disabled` 稳定化）。先删 docs 基线 png 再 `--update-snapshots` 重生成，复跑确认稳定。
5. **README / CLAUDE.md**：模式说明改为「浏览器 `/` 直进应用壳」，docs 展示已收进设置「组件」「动效」分区；目录结构、基线计数（42 → 18）同步更新。`app-main.js:88` 注释去除「镜像 docs-mode.js」提及；`settings-pages.js` / `settings-window.css` 去除对已删场景/theme-switcher 的注释引用。

## 二、孤儿模块删除清单 + 保留清单 + 理由

**删除（删除 docs-mode.js 后无引用，核对后删）**：

| 文件 | 理由 |
|---|---|
| `src/docs/docs-mode.js` | docs 渲染本体，唯一入口（main.js）已删 |
| `src/demo/theme-switcher.js` | 仅 docs-mode.js 引用（顶栏主题切换），app 用 `.csettings__mode` 三态 |
| `src/demo/token-showcase.js` + `token-showcase.css` | 仅 docs-mode.js 引用（令牌展示区），令牌展示不保留 |
| `src/scenes/main-window/main-window.js` + `main-window.css` | 仅 docs-mode.js 引用（docs 场景模板），docs 场景删除 |
| `src/scenes/settings-window/settings-window.js` | 仅 docs-mode.js 引用（docs 设置场景模板） |

**保留（应用壳/B1-1 复用）**：

| 文件 | 理由 |
|---|---|
| `src/demo/component-showcase-full.js` (+ css) | 应用壳「组件」分区惰性挂载（B1-1），自 import CSS |
| `src/demo/motion-lab.js` (+ css) | 应用壳「动效」分区惰性挂载（B1-1），自 import CSS |
| `src/scenes/clipboard-float/clipboard-float.js` (+ css) | 应用壳「组件」分区组合示例（B1-1），自 import CSS |
| `src/demo/customizer-panel.js` | 外观分区定制器（`renderCustomizerGroups`），app-main.js 使用；`customizer.css` 保留在 main.js |
| `src/scenes/settings-window/settings-pages.js` (+ css) | 共享设置页模块，app-main.js 使用（桌面 + 手机页面栈） |
| `src/demo/component-showcase.js`、`customizer-css.js`、`window-controls.js` | 分别被 component-showcase-full / customizer-panel / app-main 复用 |

## 三、视觉基线重构

- **删除**：docs 专属 36 张（tokens / components / scenes / main-window / settings-window / clipboard 各 6 张，均 `/`）。
- **保留**：app-main 6 张（`/?mode=app`）—— `git diff` 确认**逐字节零变化**（删除 docs CSS import 未影响应用壳渲染）。
- **新增**：12 张分区基线（`data-motion=off` + `animations: disabled` 稳定化）：
  - `components-partition-{light,dark}-{indigo,amber,emerald}-chromium-win32.png`（6）
  - `motion-partition-{light,dark}-{indigo,amber,emerald}-chromium-win32.png`（6）
- **总数**：18 张（原 42 → 18）。复跑 `npm run test:visual` 18/18 通过（基线稳定）。

## 四、TDD Evidence

**RED**（Step 2，命令 `npm test`）：
```
3 failed / 49 passed（mode.test.js）
AssertionError: expected 'docs' to be 'app'
  无参数浏览器 → app / 非法值 → 回落 app / ?mode=docs 不再特殊 → app
```
预期失败：旧 resolveMode 契约返回 docs（无参数浏览器、非法值、?mode=docs），新契约要求一律 `'app'`。

**GREEN**（Step 3 实现后，命令 `npm test`）：
```
Test Files 8 passed (8) | Tests 52 passed (52)
```
mode.test.js 6 例全部通过（无参浏览器→app / 无参+Tauri→app / 非法→app / docs→app / app→app / strip→strip）。

## 五、Test Results

| 套件 | 结果 |
|---|---|
| `npm test` | 8 files / **52 passed** |
| `npm run test:e2e` | **81 passed**（app-shell / floatstrip / mobile-nav / 各分区用例全绿，无残留 docs 依赖） |
| `npm run test:visual` | **18 passed**（重生成后复跑对比通过） |
| `npm run build` | ✓ 99 modules transformed，构建成功（docs CSS 移出主 bundle，展示 CSS 进入各动态 chunk） |

## 六、Files Changed

- `src/app/mode.js`（resolveMode 简化）
- `src/main.js`（删 docs 分支 + docs CSS import）
- `src/app/app-main.js`（:88 注释去 docs-mode 提及）
- `src/scenes/settings-window/settings-pages.js`（去已删场景注释）
- `src/scenes/settings-window/settings-window.css`（去 theme-switcher 注释）
- `tests/unit/mode.test.js`（新契约 6 例）
- `tests/e2e/visual-regression.spec.js`（docs SHOTS 删除 + 分区基线）
- `tests/e2e/visual-regression.spec.js-snapshots/`（删 36 张 docs png；新增 12 张分区 png）
- `README.md`、`CLAUDE.md`、`src/CLAUDE.md`（模式说明）
- 删除：`src/docs/docs-mode.js`、`src/demo/theme-switcher.js`、`src/demo/token-showcase.js`、`src/demo/token-showcase.css`、`src/scenes/main-window/main-window.js`、`src/scenes/main-window/main-window.css`、`src/scenes/settings-window/settings-window.js`

## 七、Self-Review Findings

1. **完整性**：Step 1-9 全部执行；`git grep -l "mountDocsMode" src/` 无残留；孤儿模块核对后删除，保留清单与 brief 一致。
2. **质量**：app-main 基线逐字节零变化，证明删除 docs CSS 不冲击应用壳渲染；动画红线零触碰（无新动效/时长/曲线改动）。
3. **纪律**：测试先红后绿；删除 docs 后 e2e 全绿（81 通过），无停止调查情形；配置链路（localStorage → applyConfig → removeAttribute）沿用既有基线稳定化模式，未绕过。

## 八、Issues / Concerns

- **Minor（留痕，未处理）**：`src/styles/layout.css` 仍含 docs 时代死规则（`.app-shell`/`.topbar*`/`.navwheel*`/`.content*`/`.tsw__*`）及第 17 行引用已删 `token-showcase.css` 的过时注释。该文件不在本任务文件清单内，且 `.showcase__*` 基类为「组件」分区所依赖（保留），故整体未动，留待后续清理（风险：仅死 CSS，不影响任何渲染与基线）。
- **Note**：`resolveMode` 的 `hasTauri` 参数现未被使用（保留以维持调用接口与 Tauri 探测语义），无害。
