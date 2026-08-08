# Task B4-5 执行报告：独立悬浮窗 —— 主窗创建 strip 窗口

- 任务：B4-5（B4 桌面真实化第 5 任务）
- 状态：DONE
- 提交：`f307803`（feat；docs 留痕按 repo 惯例随评审后提交）
- 日期：2026-08-08

## 一、变更总览

主窗 FloatBall 在 **Tauri 环境**点击时，用 JS `WebviewWindow` 创建独立透明置顶小窗（label `'strip'`，加载 `?mode=strip`），替代现状窗口内 strip 演示。**浏览器环境行为不变**（无 `__TAURI__` → 仍走窗口内 strip）。本任务纯窗口创建，配置链路零触碰，动画红线零触碰，渲染零改动（视觉基线零漂移）。

| 文件 | 变更 |
|---|---|
| `src-tauri/capabilities/default.json` | `windows` `["main"]` → `["main", "strip"]`；`permissions` 追加 4 项（`core:webview:allow-create-webview-window` / `core:window:allow-set-position` / `core:window:allow-outer-position` / `core:window:allow-set-size`）——strip 窗口自身权限不被拒（B4-6 依赖） |
| `src/app/app-main.js` | 模块变量 `let stripWindow = null;`（挂 `mountAppMode` 前）；`mountFloatBall` onExpand 顶部加 Tauri 分支：已建则 `setFocus`，否则 `new WebviewWindow('strip', {...320×64/transparent/decorations:false/alwaysOnTop/resizable:false})` + `once('tauri://destroyed')` 置空；既有窗口内 strip 逻辑原样保留在 else（`if (stripHost) return;` 不变） |
| `tests/unit/window-capabilities.test.js` | 追加 it「授权 strip 悬浮窗（创建 + 自定位/自缩放）」（brief 逐字） |
| `tests/e2e/app-shell.spec.js` | 末尾追加 e2e「Tauri：FloatBall 展开创建独立 strip 窗口（透明置顶）」（brief 逐字：`addInitScript` 注入 mock `__TAURI__`，`WebviewWindow` 记录 `__stripWinCalls__`） |

## 二、TDD 执行记录

### 1. 单测先红 → 改 capability → 绿

追加 it 后 `npx vitest run tests/unit/window-capabilities.test.js`：

```
AssertionError: expected [ 'main' ] to include 'strip'
  ❯ tests/unit/window-capabilities.test.js:25:26
```

红符合预期（windows 无 strip / 权限缺）。改 `capabilities/default.json` 后复跑：

```
Test Files  1 passed (1)
     Tests  2 passed (2)
```

### 2. e2e 先红 → 改 app-main.js → 绿

写 e2e（brief 逐字）后 `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip 窗口"`：

```
Error: expect(received).toHaveLength(1)
Expected length: 1
Received length: 0
Received array:  []
```

红符合预期（现 FloatBall 走窗口内 strip，`__stripWinCalls__` 空）。改 app-main.js（模块变量 + Tauri 分支）后复跑：

```
1 passed (9.6s)
```

### 3. 浏览器分支回归

`npx playwright test tests/e2e/floatstrip.spec.js`（无 `__TAURI__` → 仍走窗口内 strip）：

```
6 passed (13.9s)
```

含「app 壳：右下 FloatBall → 点击展开 FloatStrip 演示」用例 —— 浏览器路径零回归。

### 4. 全量回归

```
npm test            → 11 files / 57 tests passed（含新窗口能力单测）
npm run test:e2e    → 102 passed（3.9m，含视觉基线 24/24 零漂移）
npm run build       → ✓ built in 428ms
```

视觉基线 **24/24 零漂移**：本任务不改渲染（Tauri 分支仅浏览器无 `__TAURI__` 时跳过；`.app-main` 截图不含 body 级 FloatBall），未跑 `--update-snapshots`。

## 三、Mock 注入兼容性确认

`addInitScript` 注入的 mock `__TAURI__` 提供 `window.getCurrentWindow`（minimize/toggleMaximize/isMaximized/close 全 no-op）与 `window.WebviewWindow`（记录 + setFocus/once no-op）。`mountAppMode` 内既有 `bindWindowControls()` 也会探测 `getCurrentWindow`，mock 提供所需方法，正常不破（e2e 全程通过证明）。

## 四、偏差修正（verbatim 适配，Concerns）

1. **全量 e2e 首跑 2 例 flaky**：`smoke.spec.js`「app shell renders」（`.app-main` 超时 5s 未找到）与 `app-shell.spec.js`「浏览器模式下窗口控制按钮点击给出桌面端提示」（toast 未出现）——两例均非本任务改动路径（浏览器分支、不点 FloatBall），为并行加载时序 flake。单跑隔离各 1 秒级通过，二次全量 `npm run test:e2e` 102/102 绿，确证非本任务引入。
2. **模块变量放置**：brief「在 `mountAppMode` 顶部（ballHost 声明附近）加模块变量」——按字面「模块变量」置于模块作用域 `mountAppMode` 声明前（`let stripWindow = null;`）。与函数内 `stripHost`（闭包持有）功能等价（mountAppMode 每次加载只跑一次），但模块级可跨潜在重挂载持久，且与 brief 注释「销毁后置空，重开可再建」语义一致。
3. **brief 文件未纳入 feat 提交**：按本次执行指令（仅 stage 4 个改动文件，排除 Cargo.toml 行尾噪声与 untracked brief），feat 提交仅含代码 + 测试；brief 与报告按 repo 惯例随 docs 留痕提交。

## 五、自评（self-review）

- **规格符合**：需求 1-4 逐字落地（capability windows 含 `"strip"` + 4 项权限；单测/e2e 均 brief 逐字；app-main Tauri 分支与既有窗口内 strip 逻辑完全隔离，浏览器零回归）。
- **质量**：与既有 `typeof window.__TAURI__ !== 'undefined'` 检测模式一致（`data-tauri` 同源）；`stripWindow.once('tauri://destroyed')` 置空支持重开再建；重复点击 `setFocus` 防重复创建。
- **测试**：单测 57/57、e2e 102/102（含视觉 24/24 零漂移）、build 通过。
- **遗留（None）**：无本任务范围内遗留项。

## 六、提交记录

- `f307803` `feat: 主窗 FloatBall 创建独立 strip 窗口（透明置顶，B4-5）`（4 files，+64/-2）
- docs 提交（本报告 + 简报 + 台账 progress-b4.md，随评审后留痕）
