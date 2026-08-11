# tokenTool 应用接入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 codeplan-usage（TokenPlan Monitor）的 Rust 后端与前端展示内容搬进 EvolveOS 应用壳，做成 `token-tool` 应用——后端完全复用（适配器/调度器/DPAPI 存储），前端样式全部改用 EvolveOS UI 组件与令牌。

**Architecture:** 单条 `ui/tokentool` 分支（从 dev 检出）承载全部改动。Rust 后端移植进 `src-tauri`（models/crypto/config/state/adapters/scheduler/commands，lib.rs 接线注册 5 命令 + 启动 30s 轮询调度器）；壳 `app-main.js` 加 `mod.mount?.(page, ctx)` 挂载钩子；`src/apps/token-tool/` 新应用页面经 `window.__TAURI__.core.invoke` 调后端，浏览器（无 Tauri）渲染「需桌面端使用」空态。

**Tech Stack:** Vite + 原生 HTML/CSS/JS（零运行时依赖）；Tauri 2 (Rust 1.97) + reqwest/tokio/chrono/uuid/base64/regex/windows-sys；Vitest + Playwright。

## Global Constraints

- **源仓库**: `C:\Repository\codeplan-usage\src-tauri\src\`（verbatim 复制源；按任务指示裁剪，勿自作主张改逻辑）。
- **Rust PATH**（每个 Bash 工具窗口先执行）：`export PATH="$USERPROFILE/.cargo/bin:$PATH"`，否则 cargo 找不到。
- **分支**: `ui/tokentool` 从 `dev` 检出；`npm run check:boundary` 判定为 ui/ 框架改动（须全量回归 + 框架 owner 评审 = 用户）。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js <spec>`（端口 5174 自起 server）。
- **JS 提交前必跑 `npm run build`**；Rust 改动跑 `cargo check`（涉及逻辑跑 `cargo test`）。
- **新 JS 代码 TDD**：先写失败测试→确认红→实现→跑绿→提交；Rust 为移植，用随源带过来的单测作为验证门禁。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**（B5 确立）。
- **禁触**：托盘 tray、JS 浏览器抓取兜底、旧 config 迁移、`%APPDATA%` 清理、新增图标（复用 `bolt`）。
- **安全**：密钥只走 Rust config.json（DPAPI 加密，落 exe 旁）；前端禁止 innerHTML 直接插用户数据（一律 `escapeHtml`）。
- **动画红线**：布局/几何动画只 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- **执行留痕**：控制器每任务在 `docs/superpowers/sdd/progress-tokentool.md` 追加「计划/工作内容/提交哈希/评审结论」，随代码提交。

---

### Task 1: Rust 后端脚手架 —— Cargo 依赖 + models + crypto

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`（仅加两行 `mod` 声明）
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/crypto.rs`

**Interfaces:**
- Produces: `crate::models::{Account, AccountKind, Balance, QuotaWindow, AppConfig}`；`crate::crypto::{encrypt(&str)->String, decrypt(&str)->String}`。Task 2-5 全部依赖这两个模块。

- [ ] **Step 1: 更新 `src-tauri/Cargo.toml`**，在既有 `[dependencies]` 后追加依赖块（保持既有 tauri 2.11.3、serde、serde_json、log、tauri-plugin-log 不动）：

```toml
reqwest = { version = "0.12", features = ["json", "blocking", "rustls-tls"], default-features = false }
tokio = { version = "1", features = ["full"] }
chrono = "0.4"
uuid = { version = "1", features = ["v4"] }
base64 = "0.22"
regex = "1"

[target.'cfg(windows)'.dependencies]
windows-sys = { version = "0.59", features = ["Win32_Security_Cryptography", "Win32_Foundation"] }
```

- [ ] **Step 2: 在 `src-tauri/src/lib.rs` 文件顶部（`use tauri::Manager;` 之前）追加两行模块声明**（本任务暂不接运行时，lib.rs 其余不动）：

```rust
mod crypto;
mod models;
```

- [ ] **Step 3: 创建 `src-tauri/src/models.rs`** —— 从 `C:\Repository\codeplan-usage\src-tauri\src\models.rs` **verbatim 复制整份文件**（含 `#[cfg(test)] mod tests` 单测）。

- [ ] **Step 4: 创建 `src-tauri/src/crypto.rs`** —— 从 `C:\Repository\codeplan-usage\src-tauri\src\crypto.rs` **verbatim 复制整份文件**（含单测）。

- [ ] **Step 5: 编译 + 跑测试**

```bash
export PATH="$USERPROFILE/.cargo/bin:$PATH"
cd /c/Repository/EvolveOS/src-tauri
cargo check
cargo test models:: crypto:: 2>&1 | tail -30
```

Expected: `cargo check` 0 error（unused reqwest/tokio 等警告属预期，后续任务消除）；`cargo test` 中 models 的 `account_kind_roundtrip`、`balance_windows_serde` 与 crypto 的 `roundtrip`、`legacy_plain_passthrough` PASS。（首次编译会下载/编译新 crate，耗时数分钟属预期。）

- [ ] **Step 6: 提交**（先 `git status`/`git diff --stat` 核对行尾噪声）

```bash
cd /c/Repository/EvolveOS
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/src/models.rs src-tauri/src/crypto.rs
git commit -m "feat: tokenTool Rust 后端脚手架（models + crypto + Cargo 依赖）"
```

---

### Task 2: Rust config + state

**Files:**
- Modify: `src-tauri/src/lib.rs`（加两行 `mod` 声明）
- Create: `src-tauri/src/config.rs`（裁剪版，全文见下）
- Create: `src-tauri/src/state.rs`

**Interfaces:**
- Consumes: `crate::models::AppConfig`（Task 1）、`crate::crypto::{encrypt, decrypt}`（Task 1）。
- Produces: `crate::config::{data_root()->Result<PathBuf,String>, ConfigStore::{new,new_ephemeral,load,save,needs_migration}}`；`crate::state::AppState::{new,config,set_config,balances,update_balance}`。Task 4/5 依赖。

- [ ] **Step 1: 在 `src-tauri/src/lib.rs` 追加两行 `mod` 声明**（紧邻 Task 1 的声明）：

```rust
mod config;
mod state;
```

- [ ] **Step 2: 创建 `src-tauri/src/config.rs`** —— 写入以下裁剪版（去掉源文件的 `legacy_config_path`/`migrate_from_legacy`/`migrate_from` 及对应 `migrate_moves_config` 单测，其余逻辑一致）：

```rust
use std::path::{Path, PathBuf};

use crate::models::AppConfig;

/// 数据根目录: 应用 exe 所在目录(便携式, 不写系统目录)
pub fn data_root() -> Result<PathBuf, String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));
    if let Some(dir) = exe_dir {
        if dir_is_writable(&dir) {
            return Ok(dir);
        }
    }
    // exe 目录不可写(如安装到 Program Files)时回退工作目录
    let cwd = std::env::current_dir().map_err(|e| format!("获取工作目录失败: {e}"))?;
    if dir_is_writable(&cwd) {
        return Ok(cwd);
    }
    Err("exe 目录与工作目录均不可写".into())
}

fn dir_is_writable(dir: &Path) -> bool {
    let Ok(_) = std::fs::create_dir_all(dir) else {
        return false;
    };
    let probe = dir.join(format!(".writeprobe-{}", std::process::id()));
    let ok = std::fs::write(&probe, b"1").is_ok() && std::fs::remove_file(&probe).is_ok();
    ok
}

pub struct ConfigStore {
    path: Option<PathBuf>,
}

impl ConfigStore {
    pub fn new() -> Result<Self, String> {
        let dir = data_root()?;
        Ok(Self {
            path: Some(dir.join("config.json")),
        })
    }

    /// 仅内存存储, 不落盘 (目录不可用时)
    pub fn new_ephemeral() -> Self {
        Self { path: None }
    }

    pub fn load(&self) -> AppConfig {
        let Some(path) = &self.path else {
            return AppConfig::default();
        };
        let mut config: AppConfig = match std::fs::read_to_string(path) {
            Ok(s) => serde_json::from_str(&s).unwrap_or_else(|e| {
                log::warn!("配置解析失败, 使用默认配置: {e}");
                AppConfig::default()
            }),
            Err(_) => AppConfig::default(),
        };
        // 解密 api_key / auth_cookie (兼容旧版明文配置)
        for account in &mut config.accounts {
            account.api_key = crate::crypto::decrypt(&account.api_key);
            account.auth_cookie = account
                .auth_cookie
                .take()
                .map(|c| crate::crypto::decrypt(&c));
        }
        config
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let Some(path) = &self.path else {
            return Ok(());
        };
        // 深拷贝后加密 api_key / auth_cookie 再落盘, 内存中的 config 保持明文
        let mut enc = config.clone();
        for account in &mut enc.accounts {
            account.api_key = crate::crypto::encrypt(&account.api_key);
            account.auth_cookie = account
                .auth_cookie
                .take()
                .map(|c| crate::crypto::encrypt(&c));
        }
        let s = serde_json::to_string_pretty(&enc).map_err(|e| e.to_string())?;
        std::fs::write(path, s).map_err(|e| e.to_string())
    }

    /// 磁盘上的配置是否含未加密的 api_key / auth_cookie (旧版明文配置, 需要迁移)
    pub fn needs_migration(&self) -> bool {
        let Some(path) = &self.path else {
            return false;
        };
        let Ok(s) = std::fs::read_to_string(path) else {
            return false;
        };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) else {
            return false;
        };
        let Some(accounts) = v.get("accounts").and_then(|a| a.as_array()) else {
            return false;
        };
        accounts.iter().any(|acc| {
            acc.get("apiKey")
                .and_then(|k| k.as_str())
                .map(|k| !k.starts_with("dpapi:") && !k.starts_with("plain:"))
                .unwrap_or(false)
                || acc
                    .get("authCookie")
                    .and_then(|k| k.as_str())
                    .map(|k| !k.starts_with("dpapi:") && !k.starts_with("plain:"))
                    .unwrap_or(false)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Account, AccountKind};

    #[test]
    fn data_root_writable() {
        let root = data_root().expect("data_root");
        assert!(dir_is_writable(&root), "root should be writable: {}", root.display());
    }

    #[test]
    fn auth_cookie_encrypted_on_save() {
        let tmp = std::env::temp_dir().join(format!("tpm-cookie-{}", std::process::id()));
        std::fs::create_dir_all(&tmp).unwrap();
        let store = ConfigStore {
            path: Some(tmp.join("config.json")),
        };
        let cfg = AppConfig {
            accounts: vec![Account {
                id: "x".into(),
                name: "oc".into(),
                kind: AccountKind::OpencodeGo,
                base_url: "https://opencode.ai".into(),
                api_key: String::new(),
                workspace_id: Some("wrk_test".into()),
                auth_cookie: Some("secret-cookie".into()),
                refresh_interval_secs: 300,
                warn_threshold: 10.0,
            }],
            ..AppConfig::default()
        };
        store.save(&cfg).unwrap();
        let on_disk = std::fs::read_to_string(tmp.join("config.json")).unwrap();
        assert!(!on_disk.contains("secret-cookie"), "cookie 不应明文落盘");
        assert!(on_disk.contains("dpapi:") || on_disk.contains("plain:"));
        // 读回时解密
        let loaded = store.load();
        assert_eq!(loaded.accounts[0].auth_cookie.as_deref(), Some("secret-cookie"));
        std::fs::remove_dir_all(&tmp).ok();
    }
}
```

- [ ] **Step 3: 创建 `src-tauri/src/state.rs`** —— 从 `C:\Repository\codeplan-usage\src-tauri\src\state.rs` **verbatim 复制整份文件**。

- [ ] **Step 4: 编译 + 跑测试**

```bash
export PATH="$USERPROFILE/.cargo/bin:$PATH"
cd /c/Repository/EvolveOS/src-tauri
cargo check
cargo test config:: 2>&1 | tail -30
```

Expected: `cargo check` 0 error；`config::tests` 的 `data_root_writable`、`auth_cookie_encrypted_on_save` PASS。

- [ ] **Step 5: 提交**

```bash
cd /c/Repository/EvolveOS
git add src-tauri/src/lib.rs src-tauri/src/config.rs src-tauri/src/state.rs
git commit -m "feat: tokenTool Rust config/state（DPAPI 加密存储 + 共享状态）"
```

---

### Task 3: Rust adapters（DeepSeek + OpenCode Go）

**Files:**
- Modify: `src-tauri/src/lib.rs`（加一行 `mod adapters;`）
- Create: `src-tauri/src/adapters/mod.rs`、`src-tauri/src/adapters/common.rs`、`src-tauri/src/adapters/deepseek.rs`、`src-tauri/src/adapters/opencode.rs`

**Interfaces:**
- Consumes: `crate::models::{Account, Balance, QuotaWindow}`（Task 1）。
- Produces: `crate::adapters::Adapter` trait（`fetch(&self, account:&Account) -> Result<Balance,String>`）；`crate::scheduler::get_adapter`（Task 4）依赖。
- Note: adapters 使用 reqwest/regex/chrono（Task 1 已加依赖）。

- [ ] **Step 1: 在 `src-tauri/src/lib.rs` 追加一行 `mod` 声明**：

```rust
mod adapters;
```

- [ ] **Step 2: 创建 4 个适配器文件** —— 分别从 `C:\Repository\codeplan-usage\src-tauri\src\adapters\{mod,common,deepseek,opencode}.rs` **verbatim 复制整份文件**（含各自 `#[cfg(test)]` 单测，opencode.rs 的 parse_quota 三窗口解析测试必须保留）。

- [ ] **Step 3: 编译 + 跑测试**

```bash
export PATH="$USERPROFILE/.cargo/bin:$PATH"
cd /c/Repository/EvolveOS/src-tauri
cargo check
cargo test adapters:: 2>&1 | tail -40
```

Expected: `cargo check` 0 error；adapters 单测 PASS（`build_opencode_balance_fills_windows`、`quota_error_sets_error`、`parse_quota_extracts_three_windows`、`parse_quota_multiline_decimal_extra_fields`、`parse_quota_rejects_changed_structure`）。

- [ ] **Step 4: 提交**

```bash
cd /c/Repository/EvolveOS
git add src-tauri/src/lib.rs src-tauri/src/adapters/
git commit -m "feat: tokenTool Rust 适配器（DeepSeek 余额 + OpenCode Go 三窗口解析）"
```

---

### Task 4: Rust scheduler + commands

**Files:**
- Modify: `src-tauri/src/lib.rs`（加两行 `mod` 声明）
- Create: `src-tauri/src/scheduler.rs`
- Create: `src-tauri/src/commands.rs`（裁剪版，全文见下）

**Interfaces:**
- Consumes: `crate::state::AppState`（Task 2）、`crate::adapters`（Task 3）、`crate::models`（Task 1）。
- Produces: `crate::scheduler::{Scheduler::start(AppHandle), refresh_all_now(&AppHandle), test_one(&Account)->Balance}`；`crate::commands::{get_config, save_config, refresh_all, get_balances, test_account}`。Task 5 注册/启动依赖。

- [ ] **Step 1: 在 `src-tauri/src/lib.rs` 追加两行 `mod` 声明**：

```rust
mod commands;
mod scheduler;
```

- [ ] **Step 2: 创建 `src-tauri/src/scheduler.rs`** —— 从 `C:\Repository\codeplan-usage\src-tauri\src\scheduler.rs` **verbatim 复制整份文件**。

- [ ] **Step 3: 创建 `src-tauri/src/commands.rs`** —— 写入以下裁剪版（去掉源文件的 `show_main`/`quit_app` 两个托盘相关命令，其余一致）：

```rust
use tauri::{AppHandle, Emitter, Manager, State};

use crate::models::{Account, AppConfig, Balance};
use crate::scheduler::refresh_all_now;
use crate::state::AppState;

/// 获取当前配置
#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    Ok(state.config())
}

/// 保存配置 (整份替换), 保存后自动刷新
#[tauri::command]
pub fn save_config(
    app: AppHandle,
    state: State<'_, AppState>,
    config: AppConfig,
) -> Result<(), String> {
    state.set_config(config)?;
    app.emit("config-updated", state.config()).ok();
    refresh_all_now(&app);
    Ok(())
}

/// 立即刷新所有账户
#[tauri::command]
pub fn refresh_all(app: AppHandle) {
    refresh_all_now(&app);
}

/// 获取最近一次余额快照
#[tauri::command]
pub fn get_balances(state: State<'_, AppState>) -> Result<Vec<Balance>, String> {
    Ok(state.balances())
}

/// 测试单个账户(不保存, 仅返回结果)
#[tauri::command]
pub async fn test_account(account: Account) -> Balance {
    crate::scheduler::test_one(&account).await
}
```

- [ ] **Step 4: 编译**

```bash
export PATH="$USERPROFILE/.cargo/bin:$PATH"
cd /c/Repository/EvolveOS/src-tauri
cargo check
```

Expected: `cargo check` 0 error。

- [ ] **Step 5: 提交**

```bash
cd /c/Repository/EvolveOS
git add src-tauri/src/lib.rs src-tauri/src/scheduler.rs src-tauri/src/commands.rs
git commit -m "feat: tokenTool Rust 调度器 + 5 个 Tauri 命令"
```

---

### Task 5: Rust lib.rs 接线（注册命令 + 启动调度器）

**Files:**
- Modify: `src-tauri/src/lib.rs`（整份重写，全文见下）

**Interfaces:**
- Consumes: 全部前 4 个任务模块。
- Produces: 桌面端可用的 5 个 Tauri 命令（`get_config/save_config/refresh_all/get_balances/test_account`）+ 30s 轮询调度器 + 既有 `set_close_behavior` 关闭行为不变。Task 8 前端经 `invoke` 调这 5 个命令。

- [ ] **Step 1: 将 `src-tauri/src/lib.rs` 整份替换为以下内容**（关键点：既有关闭行为状态 `AppState` 更名为 `CloseBehaviorState`，tokenTool 状态用 `crate::state::AppState`，避免同名冲突）：

```rust
use tauri::Manager;
use std::sync::Mutex;

// 主窗关闭行为（B4 收尾）：JS 配置经 set_close_behavior 同步；on_window_event 消费
pub struct CloseBehaviorState {
    pub close_behavior: Mutex<String>,
}

#[tauri::command]
fn set_close_behavior(state: tauri::State<'_, CloseBehaviorState>, behavior: String) {
    *state.close_behavior.lock().unwrap() = behavior;
}

// tokenTool 后端：账户余额监测（适配器/调度器/DPAPI 配置存储）
mod adapters;
mod commands;
mod config;
mod crypto;
mod models;
mod scheduler;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CloseBehaviorState { close_behavior: Mutex::new("exit".into()) })
        .manage(state::AppState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // 启动 tokenTool 余额轮询调度器（延迟 3 秒，等前端就绪）
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                scheduler::refresh_all_now(&handle);
            });
            scheduler::Scheduler::start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_close_behavior,
            commands::get_config,
            commands::save_config,
            commands::refresh_all,
            commands::get_balances,
            commands::test_account,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let behavior = window
                        .app_handle()
                        .state::<CloseBehaviorState>()
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

- [ ] **Step 2: 编译 + 全量 Rust 测试**

```bash
export PATH="$USERPROFILE/.cargo/bin:$PATH"
cd /c/Repository/EvolveOS/src-tauri
cargo check
cargo test 2>&1 | tail -30
```

Expected: `cargo check` 0 error；`cargo test` 全绿（models/crypto/config/adapters 全部单测）。`cargo test` 断言「0 failed」。（真实进程/窗口行为需桌面真机验证，web 测试不覆盖。）

- [ ] **Step 3: 提交**

```bash
cd /c/Repository/EvolveOS
git add src-tauri/src/lib.rs
git commit -m "feat: tokenTool Rust 后端接线（注册 5 命令 + 启动 30s 轮询调度器）"
```

---

### Task 6: 壳挂载钩子（框架，app-main.js）

**Files:**
- Modify: `src/app/app-main.js:237`（renderPages 内）、`src/app/app-main.js:448`（renderStack 内，约）

**Interfaces:**
- Produces: MODULES 契约新增可选 `mount(pageEl, ctx)`——壳在 `render` 之后调用。Task 7/8 的 token-tool 模块导出 `mount` 依赖此钩子。

- [ ] **Step 1: 改 `renderPages()`**（在 `page.innerHTML = mod.render(modCtx(mod));` 之后追加一行）：

```js
    const page = pages.find((p) => p.dataset.page === state.moduleId);
    page.innerHTML = mod.render(modCtx(mod));
    mod.mount?.(page, modCtx(mod)); // 应用交互挂载钩子（render 后调用；无 mount 的占位 app 为 no-op）
```

- [ ] **Step 2: 改 `renderStack()`**（在 `activateMobileSettings(); updateCtx();` 之后、函数结束前追加手机 detail 路径挂载——栈顶 detail 页的 body 容器）：

```js
    // 应用交互挂载钩子（手机栈顶 detail 页，render 后调用）
    const topEntry = mobile.stack[mobile.stack.length - 1];
    const topEl = stackEl.lastElementChild;
    if (topEntry?.type === 'detail' && topEl && topEl.dataset.stack === 'detail') {
      const topMod = MODULES.find((m) => m.id === topEntry.moduleId);
      const body = topEl.querySelector('.app-main__stack-body');
      if (body) topMod.mount?.(body, { module: topMod, dirId: topEntry.dirId, dirName: topEntry.dirName });
    }
```

- [ ] **Step 3: 回归验证**（钩子对现有占位 app 是 no-op，全量 e2e 必须保持绿）：

```bash
cd /c/Repository/EvolveOS
npm run build
npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js
```

Expected: build 成功；app-shell e2e 全部 PASS（左窗仍 7 项——token-tool 尚未加入）。

- [ ] **Step 4: 提交**

```bash
git add src/app/app-main.js
git commit -m "feat: 壳 render 后调 mod.mount 挂载钩子（app 交互接线）"
```

---

### Task 7: tokenTool 应用 —— 模块 + 渲染 + 工具函数 + 样式 + 单测 + 计数更新

**Files:**
- Create: `src/apps/token-tool/token-tool-utils.js`
- Create: `src/apps/token-tool/token-tool.js`（含 render；mount 留 Task 8）
- Create: `src/apps/token-tool/index.js`
- Create: `src/apps/token-tool/token-tool.css`
- Create: `tests/unit/token-tool.test.js`
- Modify: `tests/e2e/app-shell.spec.js`（4 处计数 7→8）
- Modify: `tests/e2e/mobile-nav.spec.js`（1 处计数 7→8）
- Regen: `tests/e2e/visual-regression.spec.js-snapshots` 的 `app-main` 基线

**Interfaces:**
- Consumes: Task 6 的 `mod.mount?` 钩子。
- Produces: `module`（id `token-tool`、name `TokenTool`、icon `bolt`、order 7、dir `[]`、render、mount）；`token-tool-utils.js` 纯函数（`escapeHtml/formatReset/formatRelative/accountCard`）；Task 8 补 mount 交互。

- [ ] **Step 1: 写失败单测** `tests/unit/token-tool.test.js`：

```js
import { describe, it, expect, afterEach } from 'vitest';
import {
  accountCard,
  escapeHtml,
  formatRelative,
  formatReset,
} from '../../src/apps/token-tool/token-tool-utils.js';
import { tokenToolPage } from '../../src/apps/token-tool/token-tool.js';
import { module } from '../../src/apps/token-tool/index.js';

afterEach(() => {
  delete globalThis.window.__TAURI__;
});

describe('token-tool utils', () => {
  it('formatReset：秒转 d/h/m', () => {
    expect(formatReset(0)).toBe('即将重置');
    expect(formatReset(-5)).toBe('即将重置');
    expect(formatReset(3725)).toBe('1h 2m');
    expect(formatReset(90061)).toBe('1d 1h 1m');
  });

  it('formatRelative：相对时间', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelative(now - 30)).toBe('刚刚');
    expect(formatRelative(now - 90)).toBe('1分钟前');
    expect(formatRelative(now - 3600 * 2)).toBe('2小时前');
  });

  it('escapeHtml：转义 HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a"b\'c&d')).toBe('a&quot;b&#39;c&amp;d');
  });

  it('accountCard：DeepSeek 余额卡', () => {
    const html = accountCard(
      { id: 'a1', name: '主号', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a1', balance: 123.456, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) },
    );
    expect(html).toContain('data-tt-id="a1"');
    expect(html).toContain('123.46');
    expect(html).toContain('CNY');
    expect(html).toContain('DeepSeek');
  });

  it('accountCard：OpenCode Go 三窗口 + 剩余额度', () => {
    const html = accountCard(
      { id: 'a2', name: 'OC', kind: 'opencode_go', baseUrl: '', apiKey: '', workspaceId: 'wrk', authCookie: 'ck', refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a2', windows: [
          { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: '' },
          { key: 'weekly', label: '本周', limit: 30, used: 15, usedPct: 50, resetsIn: 43200, resetsAt: '' },
          { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
        ], ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) },
    );
    expect(html).toContain('29.2%');
    expect(html).toContain('剩余 $8.50 / $12');
    expect(html).toContain('重置: 1h 0m');
    expect(html).toContain('OpenCode Go');
  });

  it('accountCard：错误态 + 名称转义', () => {
    const html = accountCard(
      { id: 'a3', name: '<b>hack</b>', kind: 'deepseek', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
      { accountId: 'a3', balance: null, currency: null, ok: false, error: 'Cookie 已过期或无效', lastUpdated: 0 },
    );
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(html).toContain('Cookie 已过期或无效');
  });
});

describe('token-tool page', () => {
  it('浏览器（无 __TAURI__）：需桌面端空态', () => {
    expect(tokenToolPage()).toContain('需桌面端使用');
  });

  it('桌面（有 __TAURI__）：工具栏 + 网格容器', () => {
    globalThis.window.__TAURI__ = { core: {} };
    const html = tokenToolPage();
    expect(html).toContain('data-tt-grid');
    expect(html).toContain('立即刷新');
  });
});

describe('token-tool module 契约', () => {
  it('导出 module 字段齐全', () => {
    expect(module.id).toBe('token-tool');
    expect(module.name).toBe('TokenTool');
    expect(module.icon).toBe('bolt');
    expect(module.order).toBe(7);
    expect(module.dir).toEqual([]);
    expect(typeof module.render).toBe('function');
    expect(typeof module.mount).toBe('function');
  });
});
```

- [ ] **Step 2: 确认红**

```bash
cd /c/Repository/EvolveOS
npm test -- tests/unit/token-tool.test.js
```

Expected: FAIL（模块/函数不存在）。

- [ ] **Step 3: 创建 `src/apps/token-tool/token-tool-utils.js`**（全文）：

```js
// tokenTool 纯函数（无 DOM/Tauri 依赖，可单测）
import { renderBadge } from '../../components/badge/badge.js';
import { renderButton } from '../../components/button/button.js';
import { renderProgress } from '../../components/progress/progress.js';

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatReset(secs) {
  if (secs <= 0) return '即将重置';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ');
}

export function formatRelative(epochSecs) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - epochSecs);
  if (diff < 60) return '刚刚';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}天前`;
  const dt = new Date(epochSecs * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function accountCard(account, balance) {
  const isOpen = account.kind === 'opencode_go';
  const last = balance?.lastUpdated
    ? `<span class="tt__card-last" data-tt-last="${balance.lastUpdated}">上次刷新: ${formatRelative(balance.lastUpdated)}</span>`
    : '';
  const actions = `
    <span class="tt__card-actions">
      <span data-tt-action="test">${renderButton({ label: '测试', variant: 'secondary', size: 'sm' })}</span>
      <span data-tt-action="edit">${renderButton({ label: '编辑', variant: 'secondary', size: 'sm' })}</span>
      <span data-tt-action="del">${renderButton({ label: '删除', variant: 'danger', size: 'sm' })}</span>
    </span>`;
  let body = '';
  if (balance?.error) {
    body += `<div class="tt__card-error">${escapeHtml(balance.error)}</div>`;
  }
  if (isOpen) {
    const wins = balance?.windows ?? [];
    if (!wins.length) body += '<div class="tt__card-none">暂无窗口数据</div>';
    for (const w of wins) {
      const used = w.used ?? (w.limit * w.usedPct / 100);
      const remaining = w.limit - used;
      body += `
        <div class="tt__window">
          <div class="tt__window-head">
            <span class="tt__window-label">${escapeHtml(w.label)}</span>
            <span class="tt__window-meta">${w.usedPct.toFixed(1)}% · 剩余 $${remaining.toFixed(2)} / $${w.limit}</span>
          </div>
          ${renderProgress({ value: w.usedPct, variant: w.usedPct >= 90 ? 'danger' : w.usedPct >= 70 ? 'warning' : 'accent' })}
          <div class="tt__window-sub">重置: ${formatReset(w.resetsIn)}</div>
        </div>`;
    }
  } else {
    const has = balance?.balance != null;
    body += `
      <div class="tt__card-balance${has ? '' : ' tt__card-balance--empty'}">${has ? `${balance.balance.toFixed(2)} ${escapeHtml(balance.currency ?? '')}` : '—'}</div>`;
  }
  return `
    <div class="tt__card" data-tt-id="${escapeHtml(account.id)}">
      <div class="tt__card-head">
        <strong class="tt__card-name">${escapeHtml(account.name)}</strong>
        ${renderBadge({ label: isOpen ? 'OpenCode Go' : 'DeepSeek', variant: isOpen ? 'info' : 'accent' })}
        ${last}
        ${actions}
      </div>
      ${body}
    </div>`;
}
```

- [ ] **Step 4: 创建 `src/apps/token-tool/token-tool.js`**（render + 交互挂载骨架；`mountTokenTool` 完整交互在 Task 8 填充，此处先导出可被单测调用的 `tokenToolPage` 与空 `mountTokenTool` 占位——占位在 Task 8 替换）：

```js
// tokenTool 应用页：余额 / OpenCode Go 套餐用量监测（复用 codeplan-usage Rust 后端）。
// 桌面（Tauri）经 invoke 调 5 命令 + 收 balances-updated 事件；浏览器（无 __TAURI__）只渲染
// 「需桌面端使用」空态。壳契约：render(ctx) → HTML；mount(pageEl, ctx) → 交互挂载。
import { renderButton } from '../../components/button/button.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import './token-tool.css';

export function tokenToolPage() {
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">TokenTool</h2>
    </div>`;
  if (typeof window.__TAURI__ === 'undefined') {
    return `${head}
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'bolt',
          title: '需桌面端使用',
          desc: 'tokenTool 依赖 Tauri 后端抓取 DeepSeek / OpenCode 余额，请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  return `${head}
    <div class="app-main__page-body">
      <div class="tt__toolbar">
        <span class="tt__toolbar-hint">账户余额 / OpenCode Go 套餐用量监测</span>
        <div class="tt__toolbar-actions">
          ${renderButton({ label: '立即刷新', iconName: 'refresh' })}
          ${renderButton({ label: '添加账户', variant: 'secondary', iconName: 'plus' })}
        </div>
      </div>
      <div class="tt__grid" data-tt-grid>
        ${renderEmptyState({ iconName: 'box', title: '加载中…' })}
      </div>
    </div>`;
}

// Task 8 填充完整交互；本任务先占位保证 module.mount 为函数、单测可跑绿。
export function mountTokenTool() {}
```

- [ ] **Step 5: 创建 `src/apps/token-tool/index.js`**：

```js
// tokenTool 应用 —— 复用 codeplan-usage Rust 后端（DeepSeek 余额 / OpenCode Go 三窗口用量）。
// 桌面优先：浏览器显示「需桌面端使用」空态；交互挂载见 token-tool.js mountTokenTool。
import { tokenToolPage, mountTokenTool } from './token-tool.js';

export const module = {
  id: 'token-tool', name: 'TokenTool', icon: 'bolt', order: 7, dir: [],
  render: (ctx) => tokenToolPage(ctx),
  mount: (pageEl, ctx) => mountTokenTool(pageEl, ctx),
};
```

- [ ] **Step 6: 创建 `src/apps/token-tool/token-tool.css`**（全部令牌，局部 `tt__*` 类名）：

```css
/* tokenTool 应用局部样式 —— 全部消费设计令牌，类名 tt__*（避免全页计数断言冲突） */
.tt__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.tt__toolbar-hint {
  font-size: var(--font-size-sm);
  color: var(--text-3);
}
.tt__toolbar-actions {
  display: flex;
  gap: var(--space-2);
}
.tt__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}
.tt__card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.tt__card-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.tt__card-name {
  color: var(--text-1);
}
.tt__card-last {
  font-size: var(--font-size-xs);
  color: var(--text-3);
  margin-left: auto;
}
.tt__card-actions {
  display: flex;
  gap: var(--space-1);
}
.tt__card-error {
  font-size: var(--font-size-sm);
  color: var(--danger-600);
  background: var(--danger-50);
  border-radius: calc(var(--radius-sm) * var(--radius-scale, 1));
  padding: var(--space-2) var(--space-3);
}
.tt__card-balance {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-1);
}
.tt__card-balance--empty {
  color: var(--text-3);
}
.tt__window {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.tt__window-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.tt__window-label { color: var(--text-2); }
.tt__window-meta { color: var(--text-1); }
.tt__window-sub {
  font-size: var(--font-size-xs);
  color: var(--text-3);
}
/* 进度条色彩变体（进度组件仅内置 accent，按用量分级着色） */
.tt__window .c-progress__fill--warning { background: var(--warning-500); }
.tt__window .c-progress__fill--danger { background: var(--danger-500); }
.tt__card-none {
  font-size: var(--font-size-sm);
  color: var(--text-3);
}
```

- [ ] **Step 7: 跑单测确认绿**

```bash
cd /c/Repository/EvolveOS
npm test -- tests/unit/token-tool.test.js
```

Expected: 全部 PASS。

- [ ] **Step 8: 更新模块计数断言（7→8）** —— `tests/e2e/app-shell.spec.js` 4 处：

| 行 | 现值 | 改为 |
|---|---|---|
| L3 注释 | `// 应用壳骨架（Task A3...7 模块占位。` | `// ...8 模块占位。` |
| L10 测试名 | `'壳结构：标题栏/左窗 7 模块/...'` | `'壳结构：标题栏/左窗 8 模块/...'` |
| L17 | `.c-navwheel__item` toHaveCount(7) | toHaveCount(8) |
| L113 | `.app-main__shortcut` toHaveCount(7) | toHaveCount(8) |
| L459 | `.c-navwheel__item` toHaveCount(7)（注释含「(7 项)」） | toHaveCount(8)（注释改「(8 项)」） |
| L475 | `.c-navwheel__item` toHaveCount(7)（注释含「(7 项)」） | toHaveCount(8)（注释改「(8 项)」） |

`tests/e2e/mobile-nav.spec.js` L20：`await expect(items).toHaveCount(7);` → `toHaveCount(8)`。

> 注意：`.nth(n)` 定位不变（token-tool 在 index 7 追加，不影响既有 nth(1)=clipboard、nth(2)=key）。

- [ ] **Step 9: 跑 e2e 确认计数更新绿**

```bash
cd /c/Repository/EvolveOS
npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js
```

Expected: 全部 PASS（app-shell 现左窗 8 项、概览快捷卡 8 张）。

- [ ] **Step 10: 重生成视觉基线**（`.app-main` SHOT 含概览快捷卡，加 token-tool 后布局变化）：

```bash
cd /c/Repository/EvolveOS
npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots
```

然后 `git status tests/e2e/visual-regression.spec.js-snapshots` 确认**只有 `app-main` 相关基线文件**变化（其余 SHOT 不应变动）；若出现非 app-main 基线变动，说明非本次改动引起，需回退并排查。

- [ ] **Step 11: 提交**

```bash
cd /c/Repository/EvolveOS
npm run build
git add src/apps/token-tool/ tests/unit/token-tool.test.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: tokenTool 应用接入（渲染/样式/纯函数单测 + 壳计数 7→8 + 视觉基线）"
```

---

### Task 8: tokenTool 交互挂载（桌面 Tauri 流）

**Files:**
- Modify: `src/apps/token-tool/token-tool.js`（补 mountTokenTool 完整实现）
- Create: `tests/e2e/token-tool.spec.js`

**Interfaces:**
- Consumes: Task 5 的 5 个 Rust 命令 + `balances-updated` 事件；Task 6 的 mount 钩子；Task 7 的 `token-tool-utils.js` 纯函数。
- Produces: 桌面端完整交互（加载/添加/编辑/删除/测试/立即刷新/实时订阅）。依赖 `openEditorDialog`（编辑对话框，自定义——`openDialog` 组件在确认时即移除 DOM 无法取表单值，故复用 `renderDialog` 结构自行接线）。

- [ ] **Step 1: 写失败 e2e** `tests/e2e/token-tool.spec.js`：

```js
import { test, expect } from '@playwright/test';

const APP_URL = '/?mode=app';

// 浏览器（无 Tauri）：tokenTool 显示「需桌面端使用」空态，且作为第 8 个模块可导航
test('tokenTool：浏览器空态 + 左窗第 8 项 + 概览快捷卡', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(7).click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'token-tool');
  await expect(active).toContainText('需桌面端使用');
  // 概览快捷卡存在
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview.locator('.app-main__shortcut[data-shortcut="token-tool"]')).toBeVisible();
});

// mock __TAURI__：验证桌面端 invoke 调用形态 + 账户卡渲染 + 立即刷新
test('tokenTool：桌面端（mock __TAURI__）加载账户、渲染卡片、触发刷新', async ({ page }) => {
  await page.addInitScript(() => {
    const invokes = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: {
        invoke: async (cmd, args) => {
          invokes.push({ cmd, args });
          if (cmd === 'get_config') {
            return {
              accounts: [
                { id: 'a1', name: 'DeepSeek 主号', kind: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-x', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
                { id: 'a2', name: 'OpenCode Go', kind: 'opencode_go', baseUrl: 'https://opencode.ai', apiKey: '', workspaceId: 'wrk_1', authCookie: 'ck', refreshIntervalSecs: 300, warnThreshold: 10 },
              ],
            };
          }
          if (cmd === 'get_balances') {
            const ts = Math.floor(Date.now() / 1000);
            return [
              { accountId: 'a1', accountName: 'DeepSeek 主号', kind: 'deepseek', balance: 88.5, currency: 'CNY', windows: null, ok: true, error: null, lastUpdated: ts },
              { accountId: 'a2', accountName: 'OpenCode Go', kind: 'opencode_go', balance: null, currency: null, windows: [
                  { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: '' },
                  { key: 'weekly', label: '本周', limit: 30, used: 15, usedPct: 50, resetsIn: 43200, resetsAt: '' },
                  { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
                ], ok: true, error: null, lastUpdated: ts },
            ];
          }
          if (cmd === 'test_account') {
            return { ...args.account, balance: 77.0, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) };
          }
          if (cmd === 'refresh_all' || cmd === 'save_config') return null;
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
    window.__tokenToolInvokes__ = invokes;
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(7).click();
  await page.waitForTimeout(400);

  // 两账户卡渲染（DeepSeek 余额 + OpenCode 三窗口）
  await expect(page.locator('.tt__card')).toHaveCount(2);
  await expect(page.locator('.tt__card', { hasText: 'DeepSeek 主号' })).toContainText('88.50');
  await expect(page.locator('.tt__card', { hasText: 'OpenCode Go' })).toContainText('29.2%');
  await expect(page.locator('.tt__card', { hasText: 'OpenCode Go' })).toContainText('剩余 $8.50 / $12');

  // 挂载即拉配置 + 快照
  let invokes = await page.evaluate(() => window.__tokenToolInvokes__);
  expect(invokes.map((i) => i.cmd)).toContain('get_config');
  expect(invokes.map((i) => i.cmd)).toContain('get_balances');

  // 立即刷新 → invoke refresh_all
  await page.locator('.tt__toolbar .c-btn', { hasText: '立即刷新' }).click();
  await page.waitForTimeout(100);
  invokes = await page.evaluate(() => window.__tokenToolInvokes__);
  expect(invokes.map((i) => i.cmd)).toContain('refresh_all');
});
```

- [ ] **Step 2: 确认红**

```bash
cd /c/Repository/EvolveOS
npx playwright test --config=playwright.config.worktree.js tests/e2e/token-tool.spec.js
```

Expected: 桌面 mock 用例 FAIL（mountTokenTool 还是空占位，卡片不渲染）；浏览器空态用例应 PASS。

- [ ] **Step 3: 用完整实现替换 `token-tool.js` 的 `mountTokenTool` 占位**（保留文件顶部已有 import 不动，把 Task 7 的占位函数替换为下面全文，并在文件顶部补 import `renderDialog`/`renderInput`/`renderSelect`/`toast` 与 utils）：

```js
// tokenTool 应用页：余额 / OpenCode Go 套餐用量监测（复用 codeplan-usage Rust 后端）。
// 桌面（Tauri）经 invoke 调 5 命令 + 收 balances-updated 事件；浏览器（无 __TAURI__）只渲染
// 「需桌面端使用」空态。壳契约：render(ctx) → HTML；mount(pageEl, ctx) → 交互挂载。
import { renderButton } from '../../components/button/button.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderDialog } from '../../components/dialog/dialog.js';
import { renderInput } from '../../components/input/input.js';
import { renderSelect } from '../../components/select/select.js';
import { toast } from '../../components/toast/toast.js';
import { accountCard, formatRelative } from './token-tool-utils.js';
import './token-tool.css';

export function tokenToolPage() {
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">TokenTool</h2>
    </div>`;
  if (typeof window.__TAURI__ === 'undefined') {
    return `${head}
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'bolt',
          title: '需桌面端使用',
          desc: 'tokenTool 依赖 Tauri 后端抓取 DeepSeek / OpenCode 余额，请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  return `${head}
    <div class="app-main__page-body">
      <div class="tt__toolbar">
        <span class="tt__toolbar-hint">账户余额 / OpenCode Go 套餐用量监测</span>
        <div class="tt__toolbar-actions">
          ${renderButton({ label: '立即刷新', iconName: 'refresh' })}
          ${renderButton({ label: '添加账户', variant: 'secondary', iconName: 'plus' })}
        </div>
      </div>
      <div class="tt__grid" data-tt-grid>
        ${renderEmptyState({ iconName: 'box', title: '加载中…' })}
      </div>
    </div>`;
}

// —— 交互挂载（壳 render 后调用；每次进页重挂，先释放上次挂载，防监听/定时器泄漏）——

const disposes = new WeakMap();

export function mountTokenTool(pageEl) {
  if (typeof window.__TAURI__ === 'undefined') return; // 浏览器：空态已由 render 输出
  const api = window.__TAURI__.core;
  const grid = pageEl.querySelector('[data-tt-grid]');
  const toolbar = pageEl.querySelector('.tt__toolbar');
  if (!grid || !toolbar) return;

  disposes.get(pageEl)?.(); // 壳重渲染复用同一 pageEl → 先释放上次挂载
  let disposed = false;
  let unlisten = null;
  let timer = null;
  let config = { accounts: [] };
  let balances = [];

  const renderAccounts = () => {
    if (disposed) return;
    grid.innerHTML = config.accounts.length
      ? config.accounts
          .map((acc) => accountCard(acc, balances.find((b) => b.accountId === acc.id)))
          .join('')
      : renderEmptyState({
          iconName: 'box',
          title: '暂无账户',
          desc: '添加一个 DeepSeek 或 OpenCode Go 账户开始监测。',
          action: { label: '添加账户', variant: 'primary', iconName: 'plus' },
        });
  };

  const renderLastRefreshes = () => {
    if (disposed) return;
    pageEl.querySelectorAll('[data-tt-last]').forEach((el) => {
      el.textContent = `上次刷新: ${formatRelative(Number(el.dataset.ttLast))}`;
    });
  };

  const errMsg = (err) => (typeof err === 'string' ? err : (err && err.message) || '未知错误');

  const load = async () => {
    try {
      config = await api.invoke('get_config');
    } catch (err) {
      toast(`读取配置失败: ${errMsg(err)}`, { variant: 'danger' });
    }
    try {
      balances = await api.invoke('get_balances');
    } catch (err) {
      /* 冷启动快照失败可忽略，等 balances-updated */
    }
    renderAccounts();
  };

  const saveConfig = async () => {
    try {
      await api.invoke('save_config', { config });
    } catch (err) {
      toast(`保存失败（变更可能未持久化）: ${errMsg(err)}`, { variant: 'danger' });
    }
    await load();
  };

  const openEditor = async (id) => {
    const existing = id ? config.accounts.find((a) => a.id === id) : null;
    const acc = await openEditorDialog(existing);
    if (!acc) return;
    acc.id = existing?.id ?? crypto.randomUUID();
    const idx = config.accounts.findIndex((a) => a.id === acc.id);
    if (idx >= 0) config.accounts[idx] = acc;
    else config.accounts.push(acc);
    await saveConfig();
  };

  const testAccount = async (id) => {
    const acc = config.accounts.find((a) => a.id === id);
    if (!acc) return;
    try {
      const bal = await api.invoke('test_account', { account: acc });
      balances = balances.filter((b) => b.accountId !== id);
      balances.push(bal);
      renderAccounts();
    } catch (err) {
      toast(`测试失败: ${errMsg(err)}`, { variant: 'danger' });
    }
  };

  const deleteAccount = async (id) => {
    config.accounts = config.accounts.filter((a) => a.id !== id);
    await saveConfig();
  };

  const onToolbar = (e) => {
    const btn = e.target.closest('.c-btn');
    if (!btn) return;
    if (btn.textContent.includes('立即刷新')) {
      api.invoke('refresh_all').catch(() => {});
    } else if (btn.textContent.includes('添加账户')) {
      openEditor();
    }
  };

  const onGrid = (e) => {
    const actionEl = e.target.closest('[data-tt-action]');
    if (!actionEl) return;
    const card = actionEl.closest('.tt__card');
    if (!card) return;
    const action = actionEl.dataset.ttAction;
    const id = card.dataset.ttId;
    if (action === 'test') testAccount(id);
    else if (action === 'edit') openEditor(id);
    else if (action === 'del') deleteAccount(id);
  };

  toolbar.addEventListener('click', onToolbar);
  grid.addEventListener('click', onGrid);

  window.__TAURI__.event.listen('balances-updated', (e) => {
    if (disposed) return;
    balances = e.payload ?? [];
    renderAccounts();
  }).then((un) => { unlisten = un; }).catch(() => {});

  timer = window.setInterval(renderLastRefreshes, 30 * 1000);

  disposes.set(pageEl, () => {
    disposed = true;
    clearInterval(timer);
    unlisten?.();
    toolbar.removeEventListener('click', onToolbar);
    grid.removeEventListener('click', onGrid);
  });

  load();
}

// —— 添加/编辑账户对话框 ——
// openDialog 组件在确认时即移除 DOM，无法在 Promise 外取表单值；故复用 renderDialog 结构
// 自行接线：kind 联动显隐、确认时收集字段、Esc/遮罩/取消关闭。

function editorFormHtml(existing, kind) {
  const e = existing ?? {};
  const ds = kind === 'opencode_go' ? ' hidden' : '';
  const oc = kind === 'opencode_go' ? '' : ' hidden';
  return `
    <div class="tt__form">
      <label class="tt__field" data-tt-field="name">
        <span class="tt__field-label">名称</span>
        ${renderInput({ value: e.name ?? '', placeholder: '账户备注名', label: '名称' })}
      </label>
      <label class="tt__field" data-tt-field="kind">
        <span class="tt__field-label">类型</span>
        ${renderSelect({
          value: kind,
          options: [
            { value: 'deepseek', label: 'DeepSeek 官方' },
            { value: 'opencode_go', label: 'OpenCode Go 套餐' },
          ],
        })}
      </label>
      <div class="tt__field" data-tt-field="baseUrl" data-tt-row="deepseek"${ds}>
        <span class="tt__field-label">接口地址</span>
        ${renderInput({ value: e.baseUrl ?? 'https://api.deepseek.com', placeholder: 'https://api.deepseek.com', label: '接口地址' })}
      </div>
      <div class="tt__field" data-tt-field="apiKey" data-tt-row="deepseek"${ds}>
        <span class="tt__field-label">API Key</span>
        ${renderInput({ type: 'password', value: e.apiKey ?? '', placeholder: 'sk-...', label: 'API Key' })}
      </div>
      <div class="tt__field" data-tt-field="workspace" data-tt-row="opencode_go"${oc}>
        <span class="tt__field-label">Workspace ID</span>
        ${renderInput({ value: e.workspaceId ?? '', placeholder: 'wrk_xxx', label: 'Workspace ID' })}
      </div>
      <div class="tt__field" data-tt-field="cookie" data-tt-row="opencode_go"${oc}>
        <span class="tt__field-label">Auth Cookie</span>
        ${renderInput({ type: 'password', value: e.authCookie ?? '', placeholder: 'auth=... 整段', label: 'Auth Cookie' })}
      </div>
      <div class="tt__field" data-tt-field="interval">
        <span class="tt__field-label">刷新间隔(秒)</span>
        ${renderInput({ type: 'number', value: e.refreshIntervalSecs ?? 300, placeholder: '300', label: '刷新间隔(秒)' })}
      </div>
    </div>`;
}

function collectEditor(body) {
  const val = (key) => body.querySelector(`[data-tt-field="${key}"] .c-input, [data-tt-field="${key}"] .c-select`)?.value.trim() ?? '';
  const name = val('name');
  if (!name) {
    toast('请填写账户名称', { variant: 'danger' });
    return null;
  }
  const kind = body.querySelector('[data-tt-field="kind"] .c-select').value;
  const isOpen = kind === 'opencode_go';
  const interval = Number(val('interval')) || 300;
  return {
    name,
    kind,
    baseUrl: isOpen ? 'https://opencode.ai' : (val('baseUrl') || 'https://api.deepseek.com'),
    apiKey: isOpen ? '' : val('apiKey'),
    workspaceId: isOpen ? (val('workspace') || null) : null,
    authCookie: isOpen ? (val('cookie') || null) : null,
    refreshIntervalSecs: Math.max(30, interval),
    warnThreshold: 10,
  };
}

function openEditorDialog(existing) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    const kind = existing?.kind ?? 'deepseek';
    mask.innerHTML = renderDialog({
      title: existing ? '编辑账户' : '添加账户',
      content: editorFormHtml(existing, kind),
      confirmLabel: '保存',
      cancelLabel: '取消',
    });
    const dialog = mask.querySelector('.c-dialog');
    const body = mask.querySelector('.c-dialog__body');
    const kindSel = body.querySelector('[data-tt-field="kind"] .c-select');

    const syncKind = () => {
      const k = kindSel.value;
      body.querySelector('[data-tt-row="deepseek"]').hidden = k !== 'deepseek';
      body.querySelector('[data-tt-row="opencode_go"]').hidden = k !== 'opencode_go';
    };

    const done = (acc) => {
      document.removeEventListener('keydown', onKey);
      mask.remove();
      resolve(acc);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };

    kindSel.addEventListener('change', syncKind);
    mask.querySelector('[data-action="cancel"]').addEventListener('click', () => done(null));
    mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', () => done(null));
    mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', () => {
      const acc = collectEditor(body);
      if (acc) done(acc);
    });
    mask.addEventListener('click', (e) => { if (e.target === mask) done(null); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    dialog.querySelector('.c-dialog__close').focus();
    syncKind();
  });
}
```

- [ ] **Step 4: 跑 e2e 确认绿**

```bash
cd /c/Repository/EvolveOS
npx playwright test --config=playwright.config.worktree.js tests/e2e/token-tool.spec.js
```

Expected: 两用例全部 PASS（浏览器空态 + 桌面 mock 调用形态）。

- [ ] **Step 5: 提交**

```bash
cd /c/Repository/EvolveOS
npm run build
git add src/apps/token-tool/token-tool.js tests/e2e/token-tool.spec.js
git commit -m "feat: tokenTool 交互挂载（invoke/listen/编辑对话框/测试/刷新，mock e2e）"
```

> **Tauri 真机验证标注**：mock e2e 只验证 JS 调用形态与渲染；真实 IPC/DPAPI/调度器行为需桌面真机（`npm run tauri:dev`）人工验证，web 测试不覆盖。

---

### Task 9: 文档 + 全量回归 + 边界门禁

**Files:**
- Modify: `docs/app-integration.md`（§2.2/§3.2 补 mount 钩子契约；§5.7/§7 加 tokenTool 参考）
- Create: `docs/superpowers/sdd/progress-tokentool.md`（执行留痕账本）
- 全量回归确认

**Interfaces:**
- 无新接口。收尾 + 交付。

- [ ] **Step 1: 更新 `docs/app-integration.md`**

- §2.2 的 `render(ctx)` 上下文下方补一段「可选 `mount(pageEl, ctx)`」：
  > `module` 还可导出可选 `mount(pageEl, ctx)`：壳在 `render` 之后、页面注入 `innerHTML` 后调用，用于接线交互（事件/订阅/定时器）。**每次左右窗切换重渲染都会重跑 render + mount**，mount 内须先释放上次挂载的监听/定时器（tokenTool 用 WeakMap 按 pageEl 管理 dispose），否则泄漏。浏览器/桌面统一经此钩子，无 mount 的占位 app 为 no-op。
- §5.7「参考实现」加一条：
  > 完整独立真实应用：`src/apps/token-tool/`（复用 Tauri 后端 + EvolveOS 组件，桌面优先/浏览器空态，mount 交互 + 编辑对话框）。

- [ ] **Step 2: 写执行留痕账本** `docs/superpowers/sdd/progress-tokentool.md`——按「每任务：计划、工作内容、提交哈希、评审结论」追加各 Task 记录（提交哈希来自 `git log`）。

- [ ] **Step 3: 全量回归**

```bash
cd /c/Repository/EvolveOS
npm test                                   # Vitest 全量单测
npx playwright test --config=playwright.config.worktree.js   # 全量 e2e（含视觉）
npm run build                              # 构建
export PATH="$USERPROFILE/.cargo/bin:$PATH"
cd src-tauri && cargo test && cd ..        # Rust 全量
npm run check:boundary                     # ui/ 分支 → 返回框架改动提示即通过
```

Expected: 全部绿；`check:boundary` 输出 `[ui/tokentool] ✓ 框架改动：须全量回归 + 框架 owner 评审`。

- [ ] **Step 4: 提交**

```bash
git add docs/app-integration.md docs/superpowers/sdd/progress-tokentool.md
git commit -m "docs: tokenTool 接入文档（mount 契约 + 参考实现）+ 执行留痕账本"
```

- [ ] **Step 5: 汇报交付**（本任务由控制器执行）——提交后向用户报告：分支、各任务提交哈希、`cargo test`/`npm test`/e2e/build 结论、需桌面真机验证点（`npm run tauri:dev` 验证 IPC/DPAPI/调度器）、待用户确认后合并 `ui/tokentool` → `main` 并全量回归收尾。

---

## Self-Review

- **Spec 覆盖**：后端移植（spec §3）→ Task 1-5；mount 钩子（spec §4）→ Task 6；前端/组件/样式/安全（spec §5）→ Task 7-8；测试与验证（spec §6）→ Task 7/8 单测+e2e + Task 9 全量回归；治理/分支（spec §7）→ Global Constraints + Task 9。范围外（spec §8 托盘/迁移/兜底/新图标）均未纳入。
- **占位扫描**：所有代码步骤给出完整内容；verbatim 复制给出确切源路径；无「TBD/TODO」。
- **类型一致性**：`accountCard`（utils）与 `mountTokenTool`（token-tool.js）签名、`module.mount` 契约、Rust 命令名/入参（`save_config {config}`、`test_account {account}`、`get_balances`）前后一致；`formatRelative/formatReset/escapeHtml` 在单测与实现中签名一致。
