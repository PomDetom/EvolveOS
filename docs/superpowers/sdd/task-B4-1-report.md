# Task B4-1: 窗口控制权限修复 — 实施报告

- **状态**：DONE
- **提交**：`f5a16dc`
- **需求源**：docs/superpowers/sdd/task-B4-1-brief.md（唯一需求源）
- **分支**：feature/b4-desktop-realism

## 任务背景

应用壳 B4（桌面真实化）第一个任务。Tauri 桌面模式下标题栏三按钮（最小化/最大化/关闭）"完全没反应"、窗口无法拖动。**根因**：`src-tauri/capabilities/default.json` 只授权 `core:default`，Tauri 2 的窗口**变更**操作（minimize/maximize/toggle_maximize/close/start_dragging）不在默认集内，被权限层拒绝；JS `bindWindowControls`（src/demo/window-controls.js）的 `.catch(()=>{})` 静默吞掉拒绝 → 无现象；`data-tauri-drag-region` 内部走 `start_dragging` 命令同样被拒 → 拖不动。代码接线本身正确，本任务只改 capability 配置 + 加单测守卫。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src-tauri/capabilities/default.json` | `permissions` 数组由 `["core:default"]` 改为 brief 逐字给定的 8 项列表：`core:default` + `core:window:allow-minimize` / `allow-maximize` / `allow-unmaximize` / `allow-toggle-maximize` / `allow-close` / `allow-is-maximized` / `allow-start-dragging`。其余字段（`$schema`/`identifier`/`description`/`windows`）零改动 |
| `tests/unit/window-capabilities.test.js`（新增） | 单测守卫：读 `src-tauri/capabilities/default.json`，断言 7 项窗口变更权限均在 `permissions` 内。**断言逻辑与 required 列表逐字取自 brief**；仅文件读取方式做了最小适配（见下方「verbatim 适配说明」） |

- **未改任何 JS 源**（`bindWindowControls` 接线已验证正确，本任务纯配置）。
- **配置链路**：本任务只改 Tauri capability（运行期权限配置），不触碰前端 defaults → store → apply 配置链路。
- **动画红线**：纯配置 + 单测，零动画相关改动。

### verbatim 适配说明（重要披露）

Brief 给定的单测原文使用 `new URL('../../src-tauri/capabilities/default.json', import.meta.url)` 读取文件。实测在 Vitest 3.2.7 + jsdom 环境下**该字面量模式被 Vite 的 asset-URL 转换改写**：`import.meta.url` 在 `new URL(path, import.meta.url)` 两参字面量中被替换为 dev server URL（`http://localhost:3000/...`），`readFileSync` 随即抛 `TypeError: The URL must be of scheme file`，测试在加载阶段即崩溃，**无法到达断言**（即无法以预期「7 项缺失」的方式红）。

排查证据（临时调试单测，已删除）：
- `console.log(import.meta.url)` → `file:///C:/Repository/ui-design/tests/unit/…`
- `new URL('./x', import.meta.url).href` → `http://localhost:3000/tests/unit/x`（被改写）
- `const m = import.meta.url; new URL('./x', m).href` → `file:///C:/.../tests/unit/x`（正确）

**适配**：仅把 base 先取到局部变量再作 `new URL` 第二参（避免触发 Vite 两参字面量特殊转换），并加一行注释钉住原因。**断言循环、required 列表、describe/it 文案均逐字保留**。该适配只影响文件定位方式，不影响测试语义，且使 RED 态回到 brief 预期的「7 项权限缺失」断言失败。备选方案（改 vitest 配置 / define 覆盖 import.meta.url）改动面更大、风险更高，故取最小适配。

## TDD 证据

- **Step 1（红）**：先写单测 → `npx vitest run tests/unit/window-capabilities.test.js` → **1 failed**。
  `AssertionError: expected [ 'core:default' ] to include 'core:window:allow-minimize'` —— 正是 brief 预期红态（现仅 `core:default`，7 项均缺）。
- **Step 2（改配置）**：`src-tauri/capabilities/default.json` permissions 追加 7 项。
- **Step 3（绿）**：复跑同命令 → **1 passed**（`✓ tests/unit/window-capabilities.test.js (1 test)`）。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx vitest run tests/unit/window-capabilities.test.js`（改前） | 1 failed（`expected [ 'core:default' ] to include 'core:window:allow-minimize'`，RED 符合 brief 预期） |
| `npx vitest run tests/unit/window-capabilities.test.js`（改后） | 1 passed（GREEN） |
| `npm test` | 11 files / **61 passed**（+1 为本任务新增 window-capabilities.test.js） |
| `npm run test:e2e` | **100 passed**（5.2m；含视觉回归 24 张 app-main/appearance/components/motion 分区，**零漂移**，未跑 `--update-snapshots`；交互用例全绿） |
| `npm run build` | 通过（Vite，`✓ built in 388ms`） |

**视觉基线说明**：本任务为纯 capability 配置改动，不触及任何前端渲染路径。`npm run test:e2e` 内 24 张视觉回归快照全部通过，**零漂移**——按 brief 要求**未运行 `--update-snapshots`**。

## Self-review 结论

- **规格符合**：capability permissions 按 brief 逐字 8 项；其余字段不动；未改任何 JS；未碰 `src-tauri/Cargo.toml` 行尾噪声；未跑 `--update-snapshots`。
- **单测守卫**：断言逻辑逐字取自 brief。唯一偏离是文件读取的 verbatim 适配（`new URL` 两参字面量被 Vite 改写导致加载崩溃），已在上文充分披露并论证必要性；适配后 RED 态与 brief 描述一致。
- **质量**：单测 61/61、e2e 100/100（含视觉 24 零漂移）、build 通过。
- **结论**：Ready to merge（DONE）。桌面真机（min/max/close 生效、窗口可拖拽）由用户改配置后重新 `npm run tauri:build` 目检。

## 备注

- `src-tauri/Cargo.toml` 为本会话前已有的行尾（LF→CRLF）噪声改动，**未碰、未提交、保持 unstaged**（提交前/后 `git status` 均确认）。
- 提交内容：`src-tauri/capabilities/default.json`、`tests/unit/window-capabilities.test.js`、`docs/superpowers/sdd/task-B4-1-brief.md`。
- 本报告与 `docs/superpowers/sdd/progress-b4.md` 的 Task B4-1 台账随代码另立 docs 提交（含本提交哈希）。
