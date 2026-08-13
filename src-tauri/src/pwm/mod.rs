//! 密码管理器核心（移植自 password-management / pwm-core，本项目继续维护）。
//! Argon2id KDF + AES-256-GCM 加密保险库；本模块无 Tauri 依赖，保留源仓库全部单测。

pub mod crypto;
pub mod error;
pub mod generator;
pub mod models;
pub mod vault;

#[allow(unused_imports)]
pub use error::{Error, Result};
pub use models::{Entry, EntryInput, Vault};
#[allow(unused_imports)]
pub use vault::SessionKey;
