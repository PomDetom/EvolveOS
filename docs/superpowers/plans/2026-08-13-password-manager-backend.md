# 密码管理器后端移植实施计划（chore/pwm-backend）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `C:\Repository\password-management` 的 `pwm-core` 密码学库复制进 EvolveOS 的 `src-tauri/src/pwm/` 子模块，并加 13 个 Tauri 命令，供前端 `src/apps/key/` 调用。

**Architecture:** 独立子模块 `crate::pwm`（保留 pwm-core 全部单测）+ 独立会话状态 `PwmState`（不动 token-tool 的 `AppState`）+ 命令层 `pwm_commands.rs`。前端只 invoke 命令，不碰加密细节。

**Tech Stack:** Rust + Tauri 2；argon2 0.5 / aes-gcm 0.10 / rand 0.8 / base64 0.22 / zeroize 1 / thiserror 2（uuid/serde/serde_json 已有）。

**Spec:** `docs/superpowers/specs/2026-08-13-password-manager-design.md`

## Global Constraints

- 本分支只允许改 `src-tauri/**` + `Cargo.lock` + `docs/`；`check:boundary` 应为 `chore` 判定通过。
- 源文件路径 `C:\Repository\password-management\core\src\`（本机存在；若缺失找用户）。
- 复制后保留 pwm-core 全部 `#[cfg(test)]`；`cargo test` 必须全绿。
- Rust 命令前设 PATH：`export PATH="$USERPROFILE/.cargo/bin:$PATH"`。
- 每任务提交前 `cargo check`（0 error）+ 相关 `cargo test`；JS 侧本分支不碰（`npm run build` 不必跑）。
- Windows LF/CRLF：提交前 `git status` 核对，防 Cargo.toml 被触碰后的行尾噪声混入提交。

---

### Task 1: pwm 模块移植 + Cargo 依赖

**Files:**
- Create: `src-tauri/src/pwm/mod.rs`, `src-tauri/src/pwm/models.rs`, `src-tauri/src/pwm/error.rs`, `src-tauri/src/pwm/crypto.rs`, `src-tauri/src/pwm/generator.rs`, `src-tauri/src/pwm/vault.rs`
- Modify: `src-tauri/Cargo.toml`（加 6 依赖）、`src-tauri/src/lib.rs`（加一行 `mod pwm;`）

**Interfaces:**
- Produces: `crate::pwm::{Error, Result, Entry, EntryInput, Vault, SessionKey}`（mod.rs 的 `pub use`）；`crate::pwm::vault::{create_vault_file, open_vault_file, save_vault_file, create_entry, update_entry, delete_entry, get_entry, list_entries, export_to_file, import_from_file}`；`crate::pwm::crypto::{derive_key, random_salt, encrypt_to_disk, decrypt_disk, KDF_M_COST, KDF_T_COST, KDF_P_COST, SALT_LEN, NONCE_LEN}`；`crate::pwm::generator::{generate_password, GeneratorOptions}`。

- [ ] **Step 1: Cargo.toml 加依赖**

在 `[dependencies]` 段追加（`uuid`/`serde`/`serde_json`/`base64` 已有，base64 只在已有时不重复加）：

```toml
argon2 = "0.5"
aes-gcm = "0.10"
rand = "0.8"
zeroize = { version = "1", features = ["derive"] }
thiserror = "2"
```

- [ ] **Step 2: 复制 models.rs / error.rs（verbatim，无 crate:: 引用）**

从 `C:\Repository\password-management\core\src\models.rs` 原样复制到 `src-tauri/src/pwm/models.rs`（含其 `#[cfg(test)]`）。
从 `C:\Repository\password-management\core\src\error.rs` 原样复制到 `src-tauri/src/pwm/error.rs`（含测试）。

- [ ] **Step 3: 复制 crypto.rs / generator.rs / vault.rs 并改写内部引用**

`crypto.rs`：复制后替换全部：
- `use crate::error::Error;` → `use crate::pwm::error::Error;`
- `use crate::models::{DiskCipher, DiskFile, DiskKdf};` → `use crate::pwm::models::{DiskCipher, DiskFile, DiskKdf};`
- 3 处 `-> crate::Result<...>` → `-> crate::pwm::Result<...>`

`generator.rs`：复制后替换：
- `use crate::error::Error;` → `use crate::pwm::error::Error;`
- `-> crate::Result<String>` → `-> crate::pwm::Result<String>`

`vault.rs`：复制后替换：
- `use crate::crypto::{KDF_M_COST, KDF_P_COST, KDF_T_COST, SALT_LEN};` → `use crate::pwm::crypto::{KDF_M_COST, KDF_P_COST, KDF_T_COST, SALT_LEN};`
- `use crate::error::{Error, Result};` → `use crate::pwm::error::{Error, Result};`
- `use crate::models::{DiskFile, Entry, EntryInput, Vault};` → `use crate::pwm::models::{DiskFile, Entry, EntryInput, Vault};`
- 全部 `crate::crypto::` 调用 → `crate::pwm::crypto::`（`derive_key`/`random_salt`/`encrypt_to_disk`/`decrypt_disk`）
- `use crate::models::Entry;`（测试块内）→ `use crate::pwm::models::Entry;`

- [ ] **Step 4: 写 mod.rs**

```rust
//! 密码管理器核心（移植自 password-management / pwm-core，本项目继续维护）。
//! Argon2id KDF + AES-256-GCM 加密保险库；本模块无 Tauri 依赖，保留源仓库全部单测。

pub mod crypto;
pub mod error;
pub mod generator;
pub mod models;
pub mod vault;

pub use error::{Error, Result};
pub use models::{Entry, EntryInput, Vault};
pub use vault::SessionKey;
```

- [ ] **Step 5: lib.rs 加模块声明**

在 `src-tauri/src/lib.rs` 的 `mod` 区（`mod adapters;` 上方或下方均可）加一行：

```rust
mod pwm; // 密码管理器核心（移植 pwm-core）
```

- [ ] **Step 6: cargo check + cargo test**

Run: `export PATH="$USERPROFILE/.cargo/bin:$PATH"; cargo check && cargo test`
Expected: check 0 error；test 全绿（pwm 模块 ~25 用例：models 3 + error 1 + crypto 7 + generator 6 + vault 15）。允许大量 dead-code 警告（Task 3 接线前预期）。

- [ ] **Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/pwm/ src-tauri/src/lib.rs
git commit -m "feat: 移植 pwm-core 密码学库为 src-tauri/src/pwm 子模块（Argon2id + AES-256-GCM）"
```

---

### Task 2: 会话状态 + 命令层（pwm_state.rs + pwm_commands.rs）

**Files:**
- Create: `src-tauri/src/pwm_state.rs`, `src-tauri/src/pwm_commands.rs`
- Modify: `src-tauri/src/lib.rs`（加 `mod pwm_state;` `mod pwm_commands;`）

**Interfaces:**
- Produces: `crate::pwm_state::{PwmState, PwmSession}`；`crate::pwm_commands::{create_vault, unlock_vault, lock_vault, list_entries, get_entry, create_entry, update_entry, delete_entry, generate_password, export_vault, import_vault, default_vault_path, current_vault_path}`（均为 `#[tauri::command]`）。各命令包装 `*_impl(state: &PwmState, …)` 纯函数供单测调用。

- [ ] **Step 1: 写 pwm_state.rs**

```rust
use crate::pwm::vault::SessionKey;
use crate::pwm::Vault;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct PwmSession {
    pub vault_path: PathBuf,
    pub vault: Vault,
    pub key: SessionKey,
}

#[derive(Default)]
pub struct PwmState {
    pub session: Mutex<Option<PwmSession>>,
}
```

- [ ] **Step 2: 写 pwm_commands.rs（13 命令 + 单测）**

完整内容如下（命令为薄包装，逻辑在 `*_impl`，单测走 `*_impl`）：

```rust
use crate::pwm::generator::{generate_password, GeneratorOptions};
use crate::pwm::vault::{self, SessionKey};
use crate::pwm::{Entry, EntryInput, Vault};
use crate::pwm_state::{PwmSession, PwmState};
use std::path::Path;
use tauri::{AppHandle, Manager, State};

pub fn with_session<T>(
    state: &PwmState,
    f: impl FnOnce(&mut PwmSession) -> crate::pwm::Result<T>,
) -> Result<T, String> {
    let mut guard = state.session.lock().unwrap();
    let session = guard.as_mut().ok_or_else(|| "vault locked".to_string())?;
    f(session).map_err(|e| e.to_string())
}

fn set_session(state: &PwmState, path: &str, vault: Vault, key: SessionKey) {
    *state.session.lock().unwrap() =
        Some(PwmSession { vault_path: Path::new(path).to_path_buf(), vault, key });
}

#[tauri::command]
pub fn create_vault(state: State<'_, PwmState>, path: String, master_password: String) -> Result<(), String> {
    create_vault_impl(&state, &path, &master_password)
}

fn create_vault_impl(state: &PwmState, path: &str, master_password: &str) -> Result<(), String> {
    let (vault, key) = vault::create_vault_file(Path::new(path), master_password).map_err(|e| e.to_string())?;
    set_session(state, path, vault, key);
    Ok(())
}

#[tauri::command]
pub fn unlock_vault(state: State<'_, PwmState>, path: String, master_password: String) -> Result<(), String> {
    unlock_vault_impl(&state, &path, &master_password)
}

fn unlock_vault_impl(state: &PwmState, path: &str, master_password: &str) -> Result<(), String> {
    let (vault, key) = vault::open_vault_file(Path::new(path), master_password).map_err(|e| e.to_string())?;
    set_session(state, path, vault, key);
    Ok(())
}

#[tauri::command]
pub fn lock_vault(state: State<'_, PwmState>) -> Result<(), String> {
    lock_vault_impl(&state)
}

fn lock_vault_impl(state: &PwmState) -> Result<(), String> {
    *state.session.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub fn current_vault_path(state: State<'_, PwmState>) -> Result<String, String> {
    let guard = state.session.lock().unwrap();
    let session = guard.as_ref().ok_or_else(|| "vault locked".to_string())?;
    Ok(session.vault_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_entries(
    state: State<'_, PwmState>,
    query: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Vec<Entry>, String> {
    list_entries_impl(&state, query.as_deref(), &tags.unwrap_or_default())
}

fn list_entries_impl(state: &PwmState, query: Option<&str>, tags: &[String]) -> Result<Vec<Entry>, String> {
    let guard = state.session.lock().unwrap();
    let session = guard.as_ref().ok_or_else(|| "vault locked".to_string())?;
    Ok(vault::list_entries(&session.vault, query, tags))
}

#[tauri::command]
pub fn get_entry(state: State<'_, PwmState>, id: String) -> Result<Entry, String> {
    get_entry_impl(&state, &id)
}

fn get_entry_impl(state: &PwmState, id: &str) -> Result<Entry, String> {
    with_session(state, |s| vault::get_entry(&s.vault, id))
}

#[tauri::command]
pub fn create_entry(
    state: State<'_, PwmState>,
    name: String,
    url: Option<String>,
    username: String,
    password: String,
    notes: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Entry, String> {
    create_entry_impl(
        &state,
        EntryInput { name, url, username, password, notes, tags: tags.unwrap_or_default() },
    )
}

fn create_entry_impl(state: &PwmState, input: EntryInput) -> Result<Entry, String> {
    with_session(state, |s| {
        let entry = vault::create_entry(&mut s.vault, input)?;
        vault::save_vault_file(&s.vault_path, &s.vault, &s.key)?;
        Ok(entry)
    })
}

#[tauri::command]
pub fn update_entry(
    state: State<'_, PwmState>,
    id: String,
    name: String,
    url: Option<String>,
    username: String,
    password: String,
    notes: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Entry, String> {
    update_entry_impl(
        &state,
        &id,
        EntryInput { name, url, username, password, notes, tags: tags.unwrap_or_default() },
    )
}

fn update_entry_impl(state: &PwmState, id: &str, input: EntryInput) -> Result<Entry, String> {
    with_session(state, |s| {
        let entry = vault::update_entry(&mut s.vault, id, input)?;
        vault::save_vault_file(&s.vault_path, &s.vault, &s.key)?;
        Ok(entry)
    })
}

#[tauri::command]
pub fn delete_entry(state: State<'_, PwmState>, id: String) -> Result<(), String> {
    delete_entry_impl(&state, &id)
}

fn delete_entry_impl(state: &PwmState, id: &str) -> Result<(), String> {
    with_session(state, |s| {
        vault::delete_entry(&mut s.vault, id)?;
        vault::save_vault_file(&s.vault_path, &s.vault, &s.key)
    })
}

#[tauri::command]
pub fn generate_password(
    length: Option<u32>,
    use_lower: Option<bool>,
    use_upper: Option<bool>,
    use_digits: Option<bool>,
    use_symbols: Option<bool>,
    exclude_ambiguous: Option<bool>,
) -> Result<String, String> {
    let d = GeneratorOptions::default();
    let opts = GeneratorOptions {
        length: length.unwrap_or(d.length),
        use_lower: use_lower.unwrap_or(d.use_lower),
        use_upper: use_upper.unwrap_or(d.use_upper),
        use_digits: use_digits.unwrap_or(d.use_digits),
        use_symbols: use_symbols.unwrap_or(d.use_symbols),
        exclude_ambiguous: exclude_ambiguous.unwrap_or(d.exclude_ambiguous),
    };
    generate_password(&opts).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_vault(state: State<'_, PwmState>, path: String) -> Result<(), String> {
    export_vault_impl(&state, &path)
}

fn export_vault_impl(state: &PwmState, path: &str) -> Result<(), String> {
    with_session(state, |s| vault::export_to_file(&s.vault, Path::new(path)))
}

#[tauri::command]
pub fn import_vault(state: State<'_, PwmState>, path: String) -> Result<usize, String> {
    import_vault_impl(&state, &path)
}

fn import_vault_impl(state: &PwmState, path: &str) -> Result<usize, String> {
    with_session(state, |s| {
        let n = vault::import_from_file(&mut s.vault, Path::new(path))?;
        vault::save_vault_file(&s.vault_path, &s.vault, &s.key)?;
        Ok(n)
    })
}

#[tauri::command]
pub fn default_vault_path(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("vault.json").to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_path(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("pwm-evo-{}-{}", std::process::id(), name))
    }

    fn unlocked_state(name: &str, master: &str) -> PwmState {
        let path = temp_path(name);
        let _ = fs::remove_file(&path);
        let (vault, key) = vault::create_vault_file(&path, master).unwrap();
        let st = PwmState::default();
        *st.session.lock().unwrap() = Some(PwmSession { vault_path: path, vault, key });
        st
    }

    fn input(name: &str) -> EntryInput {
        EntryInput {
            name: name.to_string(),
            url: Some("https://example.com".into()),
            username: "alice".into(),
            password: "s3cret".into(),
            notes: None,
            tags: vec!["work".into()],
        }
    }

    #[test]
    fn locked_session_returns_vault_locked() {
        let st = PwmState::default();
        assert_eq!(with_session(&st, |_| Ok(0)), Err("vault locked".to_string()));
        assert_eq!(list_entries_impl(&st, None, &[]), Err("vault locked".to_string()));
        assert_eq!(current_vault_path_guard(&st), Err("vault locked".to_string()));
    }

    fn current_vault_path_guard(state: &PwmState) -> Result<String, String> {
        let guard = state.session.lock().unwrap();
        let session = guard.as_ref().ok_or_else(|| "vault locked".to_string())?;
        Ok(session.vault_path.to_string_lossy().to_string())
    }

    #[test]
    fn unlock_then_crud_round_trip() {
        // 创建 → 解锁 → 增改查删
        let path = temp_path("crud");
        let _ = fs::remove_file(&path);
        let st = PwmState::default();
        create_vault_impl(&st, path.to_str().unwrap(), "master").unwrap();
        assert_eq!(current_vault_path_guard(&st).unwrap(), path.to_str().unwrap().to_string());

        let e = create_entry_impl(&st, input("GitHub")).unwrap();
        assert_eq!(e.name, "GitHub");
        assert!(!e.id.is_empty());
        assert_eq!(list_entries_impl(&st, None, &[]).unwrap().len(), 1);
        assert_eq!(list_entries_impl(&st, Some("git"), &[]).unwrap().len(), 1);
        assert_eq!(list_entries_impl(&st, None, &["work".to_string()]).unwrap().len(), 1);

        let mut upd = input("GitHub");
        upd.password = "newpass".into();
        update_entry_impl(&st, &e.id, upd).unwrap();
        assert_eq!(get_entry_impl(&st, &e.id).unwrap().password, "newpass");

        // 落盘验证：用同一主密码重开
        lock_vault_impl(&st);
        unlock_vault_impl(&st, path.to_str().unwrap(), "master").unwrap();
        assert_eq!(list_entries_impl(&st, None, &[]).unwrap().len(), 1);

        delete_entry_impl(&st, &e.id).unwrap();
        assert_eq!(list_entries_impl(&st, None, &[]).unwrap().len(), 0);
        fs::remove_file(&path).ok();
    }

    #[test]
    fn wrong_password_fails_unlock() {
        let path = temp_path("wrongpw");
        let _ = fs::remove_file(&path);
        let st = PwmState::default();
        create_vault_impl(&st, path.to_str().unwrap(), "master").unwrap();
        lock_vault_impl(&st);
        let err = unlock_vault_impl(&st, path.to_str().unwrap(), "nope").unwrap_err();
        assert!(err.contains("password"), "错误信息应含 password: {err}");
        fs::remove_file(&path).ok();
    }

    #[test]
    fn create_vault_refuses_existing_file() {
        let path = temp_path("exists");
        let _ = fs::remove_file(&path);
        let st = PwmState::default();
        create_vault_impl(&st, path.to_str().unwrap(), "master").unwrap();
        lock_vault_impl(&st);
        assert!(create_vault_impl(&st, path.to_str().unwrap(), "master").is_err());
        fs::remove_file(&path).ok();
    }

    #[test]
    fn generate_password_respects_options() {
        let p = generate_password(None, None, None, None, None, None).unwrap();
        assert_eq!(p.chars().count(), 16);
        let short = generate_password(Some(8), Some(true), Some(false), Some(false), Some(false), None).unwrap();
        assert_eq!(short.chars().count(), 8);
        assert!(short.chars().all(|c| c.is_ascii_lowercase()));
    }
}
```

- [ ] **Step 3: lib.rs 加模块声明**

在 `mod pwm;` 后追加：

```rust
mod pwm_commands; // 密码管理器 Tauri 命令
mod pwm_state;    // 密码管理器会话状态
```

- [ ] **Step 4: cargo check + cargo test**

Run: `export PATH="$USERPROFILE/.cargo/bin:$PATH"; cargo check && cargo test`
Expected: check 0 error（dead-code 警告允许，Task 3 接线后消）；test 全绿（Task 1 既有 + 新增 6 用例）。

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/pwm_state.rs src-tauri/src/pwm_commands.rs src-tauri/src/lib.rs
git commit -m "feat: 密码管理器命令层（13 命令 + PwmState 会话 + 单测）"
```

---

### Task 3: lib.rs 接线（manage + 注册命令）

**Files:**
- Modify: `src-tauri/src/lib.rs`（`.manage(PwmState::default())` + `invoke_handler` 追加 13 命令）

**Interfaces:**
- Produces: 前端 `window.__TAURI__.core.invoke('create_vault'|'unlock_vault'|…|'current_vault_path')` 全部可用。

- [ ] **Step 1: 编辑 lib.rs**

在 `.manage(state::AppState::new())` 后加一行：

```rust
.manage(pwm_state::PwmState::default())
```

在 `invoke_handler(tauri::generate_handler![` 列表里追加（保留既有 5 命令）：

```rust
pwm_commands::create_vault,
pwm_commands::unlock_vault,
pwm_commands::lock_vault,
pwm_commands::list_entries,
pwm_commands::get_entry,
pwm_commands::create_entry,
pwm_commands::update_entry,
pwm_commands::delete_entry,
pwm_commands::generate_password,
pwm_commands::export_vault,
pwm_commands::import_vault,
pwm_commands::default_vault_path,
pwm_commands::current_vault_path,
```

- [ ] **Step 2: cargo check + cargo test + 全量**

Run: `export PATH="$USERPROFILE/.cargo/bin:$PATH"; cargo check && cargo test`
Expected: check 0 error、0 新增警告（pwm 相关 dead-code 消除）；test 全绿。
再跑 `npm run build`（确认 JS 侧未受影响，可选但建议）。

- [ ] **Step 3: check:boundary**

Run: `node scripts/check-boundary.js`
Expected: `[chore/pwm-backend] ✓ 维护改动，边界通过`（本分支只改 src-tauri + Cargo.lock + docs）。

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: 注册密码管理器 13 命令 + PwmState 状态（lib.rs 接线）"
```

---

## 分支汇总验收

- 分支 `chore/pwm-backend`（自 dev 检出），3 commits。
- `cargo check` 0 error、`cargo test` 全绿（Task1 ~25 + Task2 6 = ~31 用例）。
- `check:boundary` 通过；合并 dev 用 `--no-ff`。
- **待桌面真机验证**（web 测试不覆盖）：真实 IPC invoke、Argon2id 派生、磁盘加解密、`%APPDATA%\com.evolveos.system\vault.json` 默认路径。
