# Task B4F-3 执行报告 — Rust 关闭行为（AppState + set_close_behavior + on_window_event）

- **状态**：DONE
- **提交哈希**：`7be2c5970b7f798844ffbd8ce1d8fde490d074c9`（评审修正：原报告 1498bba 为 amend 前哈希，控制器并入 brief 后为 7be2c59）
- **Branch**：worktree-b4-close-sizing
- **日期**：2026-08-08

## 实现内容

完整替换 `src-tauri/src/lib.rs`（原为极简 `run()` 骨架），按简报 verbatim 代码块落成：

1. **`AppState`**：`pub struct AppState { pub close_behavior: Mutex<String> }`，经 `.manage(AppState { close_behavior: Mutex::new("exit".into()) })` 注册，默认 `"exit"`。
2. **`#[tauri::command] set_close_behavior(state, behavior)`**：JS 侧（B4F-4）`core.invoke('set_close_behavior', ...)` 消费，写入 `AppState`。
3. **`.on_window_event` 主窗 `CloseRequested` 处理**：
   - `window.label() == "main"` 时读 `AppState.close_behavior`；
   - `"background"` → `api.prevent_close()` + `window.hide()`（保留后台）；
   - 其他（默认 `"exit"`）→ `window.app_handle().exit(0)`（整个应用退出，含 strip 悬浮窗，不再依赖 JS 异步关窗）。
4. **`.setup()`（tauri_plugin_log）逻辑保持不变**；新增 `.manage` / `.invoke_handler` / `.on_window_event` 链式调用。
5. `use tauri::Manager;`（`window.app_handle()` 所需）与 `use std::sync::Mutex;` 已引入。未新增任何依赖。

## cargo check 输出摘要

命令：`cd src-tauri && cargo check`（工作树 src-tauri 目录）

- 全量编译依赖（tauri 2.11.5、tauri-plugin-log 2.9.0、wry 等），1m36s。
- **结果：Finished `dev` profile [unoptimized + debuginfo] target(s)，无错误、无警告**。
- 触碰文件核对：`git status --porcelain src-tauri/Cargo.lock src-tauri/Cargo.toml` 为空 → **Cargo.lock 未被 cargo check 改动，Cargo.toml 未触碰**，无行尾噪声需处理。

## 全量回归三命令输出摘要

| 命令 | 结果 |
|---|---|
| `npm test` | 12 files / **58 passed**，全绿 |
| `npx playwright test --config=playwright.config.worktree.js`（e2e，workaround 配置 5174 新鲜 server，规避共享 checkout 陈旧 5173 server） | **104 passed** (3.9m)，视觉回归 24 项零漂移 |
| `npm run build` | vite build 成功，99 modules transformed，built in 423ms |

JS 侧零改动，符合预期全绿。

## 提交

- 命令：`git add src-tauri/src/lib.rs` → `git commit`（commit message 用简报 Step 3 原文：`feat: 主窗关闭行为 Rust 侧（exit→app.exit / background→prevent_close+hide，set_close_behavior 命令，B4 收尾）`）。
- 提交内容：1 file changed, 48 insertions(+), 13 deletions(-)，**仅 `src-tauri/src/lib.rs`**。
- 提交后 `git status` 干净（仅剩预存在的 untracked 文件 `docs/superpowers/sdd/task-B4F-3-brief.md` 与 `playwright.config.worktree.js`，均非本任务产出，不提交）。
- 提交哈希：`1498bbaf57caf3c10064bde10bfd56622bf4180f`。

## 自评

- **无越界改动**：只改了 `src-tauri/src/lib.rs`；Cargo.lock / Cargo.toml 均未被构建触碰；JS 侧零改动（B4F-4 职责，遵守顺序约束）。
- **无遗漏**：brief Step 1→3 全部执行完毕；verbatim 代码逐字落成，`.setup()` 原逻辑（debug_assertions 下 tauri_plugin_log）原样保留。
- **桌面验证留待用户目检**（`tauri dev`），符合全局约束（测试仅在 Web 环境执行）。
- 唯一提示：git 对 lib.rs 有 LF→CRLF 行尾转换 warning，属正常自动转换，不影响提交内容正确性。
