# Task B4F-3 简报 — Rust 关闭行为（AppState + set_close_behavior + on_window_event）

- **计划**：docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md（唯一实施需求源）
- **规格**：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源，§4.1）
- **Branch**：worktree-b4-close-sizing
- **任务定位**：B4 收尾修复第三个任务。把主窗关闭逻辑从脆弱的 JS `onCloseRequested`（异步关 strip 卡死 bug）移到 **Rust `on_window_event`**：`exit` → `app.exit(0)` 整个应用退出 / `background` → `prevent_close`+`hide` 保留后台。**必须在本任务（B4F-3）之后才执行 B4F-4（移除 JS handler）** —— 顺序不可反。

## 背景

**Bug 根因**：`app-main.js` 的 JS `onCloseRequested` handler 内异步 `getAllWindows() → strip.close()`，在 Tauri 窗口关闭序列中不可靠 → 主窗关不掉、strip 被销毁后悬浮球唤不出。修法：关闭逻辑移 Rust 确定性处理；行为经 `AppState` + `set_close_behavior` command 由 JS 配置同步（消费 B4F-2 的 `cfg.closeBehavior`）。

本任务只做 **Rust 侧**（AppState + command + on_window_event + manage 注册）。JS 侧同步/清理在 B4F-4。

## Files

- Modify: `src-tauri/src/lib.rs`（AppState + command + on_window_event + state.manage）

## Interfaces

- Consumes: Task B4F-2 的 `cfg.closeBehavior`（'exit' | 'background'）
- Produces: Rust `AppState { close_behavior: Mutex<String> }` + `#[tauri::command] set_close_behavior(state, behavior)` + 主窗 `CloseRequested` 处理（exit → `app.exit(0)`；background → `prevent_close`+`hide`）—— Task B4F-4 的 JS `core.invoke('set_close_behavior', ...)` 消费

## Step 1: 写 Rust 实现（src-tauri/src/lib.rs，完整替换）

**关键：`cargo check` 前先看当前 lib.rs**（当前是极简 `run()` 骨架，仅 `.setup()` + `.run()`）。按计划完整替换为：

```rust
use tauri::Manager;
use std::sync::Mutex;

// 主窗关闭行为（B4 收尾）：JS 配置经 set_close_behavior 同步；on_window_event 消费
pub struct AppState {
    pub close_behavior: Mutex<String>,
}

#[tauri::command]
fn set_close_behavior(state: tauri::State<'_, AppState>, behavior: String) {
    *state.close_behavior.lock().unwrap() = behavior;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState { close_behavior: Mutex::new("exit".into()) })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_close_behavior])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let behavior = window
                        .app_handle()
                        .state::<AppState>()
                        .close_behavior
                        .lock()
                        .unwrap()
                        .clone();
                    if behavior == "background" {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        // exit：整个应用退出（含 strip 悬浮窗）——不依赖 JS 异步关窗
                        window.app_handle().exit(0);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Step 2: cargo check 确认编译

Run: `cargo check`（在 `src-tauri/` 目录，即 `cd src-tauri && cargo check`）
Expected: 编译通过，无错误。若工具链不可用，记录并说明（不阻塞，Rust 改动由桌面 `tauri dev` 最终验证）。

**注意**：
- `cargo check` 可能触碰 `src-tauri/Cargo.lock`（被跟踪文件）——若产生行尾/LF-CRLF 噪声或版本漂移，`git status`/`git diff` 核对：Cargo.lock 若因本任务被改动但非预期，不提交该噪声；本任务 git add 只加 `src-tauri/src/lib.rs`。
- **`window.app_handle()` 需要 `use tauri::Manager;`**（上方已含）；主窗 label 默认 `"main"`。

## Step 3: 全量回归 + 提交

Run: `npm test` + `npm run test:e2e` + `npm run build`（JS 侧零改动，应全绿）

**⚠️ e2e 跑法（重要，本会话环境告警）**：共享 checkout 有陈旧 Vite server（端口 5173）serve 旧代码，Playwright 默认 `reuseExistingServer:true` 会误连 → e2e 失真。**e2e 必须用本工作树的 workaround 配置**（指向 5174 新鲜 server）：
`npx playwright test --config=playwright.config.worktree.js`

Expected: 全绿（JS 零改动，应为 104/104 + 视觉 24 零漂移）

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: 主窗关闭行为 Rust 侧（exit→app.exit / background→prevent_close+hide，set_close_behavior 命令，B4 收尾）"
```

> 桌面验证（用户目检）：`tauri dev` 编译通过；主窗关闭走 Rust 处理（不卡死）。

## 全局约束（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 本任务 Rust 改动不可 web 测试——`cargo check` 验证编译，桌面 `tauri dev` 最终验证。
- 动画红线、配置链路、零运行时依赖、禁止升级核心依赖（本任务不引入新依赖——`tauri`/`log`/`tauri-plugin-log` 已在 Cargo.toml）。
- 视觉基线零漂移（JS 零改动）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交；Cargo.lock 非预期改动不提交。
- 提交前检查 `git status`/`git diff --stat`，防 Cargo.toml 等被构建触碰文件的行尾噪声混入提交。
