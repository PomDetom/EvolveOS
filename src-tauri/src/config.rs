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
