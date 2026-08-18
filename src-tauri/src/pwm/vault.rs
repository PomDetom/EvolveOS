use std::path::Path;

use crate::pwm::crypto::{KDF_M_COST, KDF_P_COST, KDF_T_COST, SALT_LEN};
use crate::pwm::error::{Error, Result};
use crate::pwm::models::{DiskFile, Entry, EntryInput, Vault};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use zeroize::Zeroize;

#[derive(Clone, Debug)]
pub struct SessionKey {
    pub key: [u8; 32],
    pub salt: [u8; SALT_LEN],
}

impl Drop for SessionKey {
    fn drop(&mut self) {
        self.key.zeroize();
        self.salt.zeroize();
    }
}

/// 写文件前确保父目录存在（递归创建缺失的中间目录）。
fn ensure_parent(path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| Error::Io(e.to_string()))?;
        }
    }
    Ok(())
}

pub fn create_vault_file(path: &Path, master_password: &str) -> Result<(Vault, SessionKey)> {
    let salt = crate::pwm::crypto::random_salt();
    let key = crate::pwm::crypto::derive_key(master_password, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST)?;
    let vault = Vault::new();
    let json = serde_json::to_vec(&vault).map_err(|e| Error::Serialization(e.to_string()))?;
    let file = crate::pwm::crypto::encrypt_to_disk(&json, &key, &salt)?;
    let bytes = serde_json::to_vec_pretty(&file).map_err(|e| Error::Serialization(e.to_string()))?;
    ensure_parent(path)?;
    let mut f = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|e| Error::Io(e.to_string()))?;
    use std::io::Write as _;
    f.write_all(&bytes).map_err(|e| Error::Io(e.to_string()))?;
    Ok((vault, SessionKey { key, salt }))
}

pub fn open_vault_file(path: &Path, master_password: &str) -> Result<(Vault, SessionKey)> {
    let bytes = std::fs::read(path).map_err(|e| Error::Io(e.to_string()))?;
    let file: DiskFile = serde_json::from_slice(&bytes).map_err(|_| Error::InvalidVaultFile)?;
    if file.version != 1 || file.kdf.algorithm != "argon2id" || file.cipher.algorithm != "aes-256-gcm" {
        return Err(Error::InvalidVaultFile);
    }
    let salt = BASE64.decode(&file.kdf.salt).map_err(|_| Error::InvalidVaultFile)?;
    if salt.len() != SALT_LEN {
        return Err(Error::InvalidVaultFile);
    }
    let key = crate::pwm::crypto::derive_key(master_password, &salt, file.kdf.m_cost, file.kdf.t_cost, file.kdf.p_cost)?;
    let plaintext = crate::pwm::crypto::decrypt_disk(&file, &key)?;
    let vault: Vault = serde_json::from_slice(&plaintext).map_err(|_| Error::InvalidVaultFile)?;
    let mut salt_arr = [0u8; SALT_LEN];
    salt_arr.copy_from_slice(&salt);
    Ok((vault, SessionKey { key, salt: salt_arr }))
}

pub fn save_vault_file(path: &Path, vault: &Vault, sk: &SessionKey) -> Result<()> {
    let json = serde_json::to_vec(vault).map_err(|e| Error::Serialization(e.to_string()))?;
    let file = crate::pwm::crypto::encrypt_to_disk(&json, &sk.key, &sk.salt)?;
    let bytes = serde_json::to_vec_pretty(&file).map_err(|e| Error::Serialization(e.to_string()))?;
    ensure_parent(path)?;
    std::fs::write(path, bytes).map_err(|e| Error::Io(e.to_string()))?;
    Ok(())
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn create_entry(vault: &mut Vault, input: EntryInput) -> Result<Entry> {
    if input.name.trim().is_empty() {
        return Err(Error::Validation("name is required".into()));
    }
    let now = now_secs();
    let entry = Entry {
        id: uuid::Uuid::new_v4().to_string(),
        name: input.name,
        url: input.url,
        username: input.username,
        password: input.password,
        notes: input.notes,
        tags: input.tags,
        created_at: now,
        updated_at: now,
    };
    vault.entries.push(entry.clone());
    Ok(entry)
}

pub fn update_entry(vault: &mut Vault, id: &str, input: EntryInput) -> Result<Entry> {
    if input.name.trim().is_empty() {
        return Err(Error::Validation("name is required".into()));
    }
    let entry = vault
        .entries
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| Error::NotFound(id.to_string()))?;
    entry.name = input.name;
    entry.url = input.url;
    entry.username = input.username;
    entry.password = input.password;
    entry.notes = input.notes;
    entry.tags = input.tags;
    entry.updated_at = now_secs();
    Ok(entry.clone())
}

pub fn delete_entry(vault: &mut Vault, id: &str) -> Result<()> {
    let idx = vault
        .entries
        .iter()
        .position(|e| e.id == id)
        .ok_or_else(|| Error::NotFound(id.to_string()))?;
    vault.entries.remove(idx);
    Ok(())
}

pub fn get_entry(vault: &Vault, id: &str) -> Result<Entry> {
    vault
        .entries
        .iter()
        .find(|e| e.id == id)
        .cloned()
        .ok_or_else(|| Error::NotFound(id.to_string()))
}

pub fn list_entries(vault: &Vault, query: Option<&str>, tags: &[String]) -> Vec<Entry> {
    let q = query.map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty());
    vault
        .entries
        .iter()
        .filter(|e| {
            let matches_query = match &q {
                None => true,
                Some(q) => {
                    e.name.to_lowercase().contains(q)
                        || e.url.as_deref().unwrap_or("").to_lowercase().contains(q)
                        || e.username.to_lowercase().contains(q)
                }
            };
            let matches_tags = if tags.is_empty() {
                true
            } else {
                tags.iter().any(|t| e.tags.iter().any(|et| et.eq_ignore_ascii_case(t)))
            };
            matches_query && matches_tags
        })
        .cloned()
        .collect()
}

pub fn export_to_file(vault: &Vault, path: &Path) -> Result<()> {
    let json = serde_json::to_string_pretty(&vault.entries).map_err(|e| Error::Serialization(e.to_string()))?;
    ensure_parent(path)?;
    std::fs::write(path, json).map_err(|e| Error::Io(e.to_string()))?;
    Ok(())
}

pub fn import_from_file(vault: &mut Vault, path: &Path) -> Result<usize> {
    let text = std::fs::read_to_string(path).map_err(|e| Error::Io(e.to_string()))?;
    let entries: Vec<Entry> = serde_json::from_str(&text).map_err(|e| Error::Serialization(e.to_string()))?;
    for e in &entries {
        if e.name.trim().is_empty() {
            return Err(Error::Validation("imported entry has empty name".into()));
        }
    }
    let count = entries.len();
    for mut e in entries {
        e.id = uuid::Uuid::new_v4().to_string();
        vault.entries.push(e);
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    use crate::pwm::models::Entry;

    const PASSWORD: &str = "correct horse battery staple";

    fn temp_vault_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("pwm-test-{}-{}", std::process::id(), name))
    }

    fn sample_vault() -> Vault {
        Vault {
            version: 1,
            entries: vec![Entry {
                id: "e1".into(),
                name: "GitHub".into(),
                url: Some("https://github.com".into()),
                username: "user".into(),
                password: "secret".into(),
                notes: None,
                tags: vec!["work".into()],
                created_at: 1000,
                updated_at: 1000,
            }],
        }
    }

    #[test]
    fn create_then_open_round_trip() {
        let path = temp_vault_path("roundtrip");
        let _ = std::fs::remove_file(&path);
        let (vault, _key) = create_vault_file(&path, PASSWORD).unwrap();
        assert!(vault.entries.is_empty());
        assert!(path.exists());
        let (vault2, _k2) = open_vault_file(&path, PASSWORD).unwrap();
        assert!(vault2.entries.is_empty());
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn create_vault_refuses_to_overwrite_existing_file() {
        let path = temp_vault_path("nooverwrite");
        let _ = std::fs::remove_file(&path);
        create_vault_file(&path, PASSWORD).unwrap();
        // 第二次创建不得删除原文件，必须因文件已存在而失败
        let err = create_vault_file(&path, PASSWORD).unwrap_err();
        assert!(matches!(err, Error::Io(_)));
        // 原文件未被覆盖/损坏，仍可用原密码打开
        let (vault, _k2) = open_vault_file(&path, PASSWORD).unwrap();
        assert!(vault.entries.is_empty());
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn open_with_wrong_password_fails() {
        let path = temp_vault_path("wrongpwd");
        let _ = std::fs::remove_file(&path);
        create_vault_file(&path, PASSWORD).unwrap();
        let err = open_vault_file(&path, "wrong password").unwrap_err();
        assert_eq!(err, Error::IncorrectPassword);
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn open_non_vault_file_fails() {
        let path = temp_vault_path("notavault");
        std::fs::write(&path, b"this is not a vault").unwrap();
        let err = open_vault_file(&path, PASSWORD).unwrap_err();
        assert_eq!(err, Error::InvalidVaultFile);
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn save_persists_entries() {
        let path = temp_vault_path("savepersist");
        let _ = std::fs::remove_file(&path);
        let (_vault, key) = create_vault_file(&path, PASSWORD).unwrap();
        let vault = sample_vault();
        save_vault_file(&path, &vault, &key).unwrap();
        let (vault2, _k2) = open_vault_file(&path, PASSWORD).unwrap();
        assert_eq!(vault2.entries.len(), 1);
        assert_eq!(vault2.entries[0].name, "GitHub");
        assert_eq!(vault2.entries[0].password, "secret");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn on_disk_file_has_no_plaintext() {
        let path = temp_vault_path("noplain");
        let _ = std::fs::remove_file(&path);
        let (_vault, key) = create_vault_file(&path, PASSWORD).unwrap();
        let vault = sample_vault();
        save_vault_file(&path, &vault, &key).unwrap();
        let raw = std::fs::read_to_string(&path).unwrap();
        assert!(!raw.contains("secret"), "明文密码泄露到磁盘");
        assert!(!raw.contains("GitHub"));
        std::fs::remove_file(&path).ok();
    }

    fn input(name: &str) -> EntryInput {
        EntryInput {
            name: name.to_string(),
            url: Some("https://example.com".into()),
            username: "alice".into(),
            password: "s3cret".into(),
            notes: Some("note".into()),
            tags: vec!["tag1".into(), "tag2".into()],
        }
    }

    #[test]
    fn create_entry_generates_id_and_timestamps() {
        let mut vault = Vault::new();
        let e = create_entry(&mut vault, input("GitHub")).unwrap();
        assert!(!e.id.is_empty());
        assert!(e.created_at > 0);
        assert!(e.updated_at > 0);
        assert_eq!(vault.entries.len(), 1);
    }

    #[test]
    fn create_entry_requires_non_empty_name() {
        let mut vault = Vault::new();
        let err = create_entry(&mut vault, input("  ")).unwrap_err();
        assert!(matches!(err, Error::Validation(_)));
        assert!(vault.entries.is_empty());
    }

    #[test]
    fn get_entry_finds_by_id_and_rejects_unknown() {
        let mut vault = Vault::new();
        let e = create_entry(&mut vault, input("GitHub")).unwrap();
        let found = get_entry(&vault, &e.id).unwrap();
        assert_eq!(found.id, e.id);
        assert!(matches!(get_entry(&vault, "nope"), Err(Error::NotFound(_))));
    }

    #[test]
    fn update_entry_changes_fields_and_touches_updated_at() {
        let mut vault = Vault::new();
        let e = create_entry(&mut vault, input("GitHub")).unwrap();
        let before = e.updated_at;
        let mut new = input("GitHub");
        new.password = "newpass".into();
        let updated = update_entry(&mut vault, &e.id, new).unwrap();
        assert_eq!(updated.password, "newpass");
        assert_eq!(updated.name, "GitHub");
        assert!(updated.updated_at >= before);
        assert!(matches!(update_entry(&mut vault, "nope", input("x")), Err(Error::NotFound(_))));
    }

    #[test]
    fn delete_entry_removes_it() {
        let mut vault = Vault::new();
        let e = create_entry(&mut vault, input("GitHub")).unwrap();
        delete_entry(&mut vault, &e.id).unwrap();
        assert!(vault.entries.is_empty());
        assert!(matches!(delete_entry(&mut vault, &e.id), Err(Error::NotFound(_))));
    }

    fn seed(vault: &mut Vault) {
        let mk = |name: &str, url: &str, username: &str, tags: &[&str]| EntryInput {
            name: name.into(),
            url: Some(url.into()),
            username: username.into(),
            password: "p".into(),
            notes: None,
            tags: tags.iter().map(|s| s.to_string()).collect(),
        };
        create_entry(vault, mk("GitHub", "https://github.com", "alice", &["work", "dev"])).unwrap();
        create_entry(vault, mk("GitLab", "https://gitlab.com", "bob", &["work"])).unwrap();
        create_entry(vault, mk("Email", "https://mail.example.com", "alice@corp", &["personal"])).unwrap();
    }

    #[test]
    fn query_matches_name_case_insensitive() {
        let mut vault = Vault::new();
        seed(&mut vault);
        assert_eq!(list_entries(&vault, Some("git"), &[]).len(), 2);
        assert_eq!(list_entries(&vault, Some("GITHUB"), &[]).len(), 1);
    }

    #[test]
    fn query_matches_url_and_username() {
        let mut vault = Vault::new();
        seed(&mut vault);
        assert_eq!(list_entries(&vault, Some("gitlab.com"), &[]).len(), 1);
        assert_eq!(list_entries(&vault, Some("alice"), &[]).len(), 2);
    }

    #[test]
    fn tag_filter_includes_entries_with_any_selected_tag() {
        let mut vault = Vault::new();
        seed(&mut vault);
        assert_eq!(list_entries(&vault, None, &["dev".to_string()]).len(), 1);
        assert_eq!(list_entries(&vault, None, &["work".to_string(), "personal".to_string()]).len(), 3);
        assert!(list_entries(&vault, None, &["nope".to_string()]).is_empty());
    }

    #[test]
    fn query_and_tags_combine_with_and() {
        let mut vault = Vault::new();
        seed(&mut vault);
        assert_eq!(list_entries(&vault, Some("git"), &["work".to_string()]).len(), 2);
        assert!(list_entries(&vault, Some("mail"), &["work".to_string()]).is_empty());
    }

    #[test]
    fn no_filter_returns_all() {
        let mut vault = Vault::new();
        seed(&mut vault);
        assert_eq!(list_entries(&vault, None, &[]).len(), 3);
    }

    #[test]
    fn export_writes_json_array() {
        let mut vault = Vault::new();
        create_entry(&mut vault, input("GitHub")).unwrap();
        let path = temp_vault_path("export");
        export_to_file(&vault, &path).unwrap();
        let text = std::fs::read_to_string(&path).unwrap();
        let parsed: Vec<Entry> = serde_json::from_str(&text).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].name, "GitHub");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn import_round_trip_regenerates_ids() {
        let mut vault = Vault::new();
        let e = create_entry(&mut vault, input("GitHub")).unwrap();
        let path = temp_vault_path("impexp");
        export_to_file(&vault, &path).unwrap();

        let mut vault2 = Vault::new();
        let n = import_from_file(&mut vault2, &path).unwrap();
        assert_eq!(n, 1);
        assert_ne!(vault2.entries[0].id, e.id);
        assert_eq!(vault2.entries[0].name, e.name);
        assert_eq!(vault2.entries[0].password, e.password);
        assert_eq!(vault2.entries[0].tags, e.tags);
        assert_eq!(vault2.entries[0].created_at, e.created_at);
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn import_invalid_json_fails() {
        let path = temp_vault_path("badimport");
        std::fs::write(&path, b"not json").unwrap();
        let mut vault = Vault::new();
        assert!(matches!(import_from_file(&mut vault, &path), Err(Error::Serialization(_))));
        assert!(vault.entries.is_empty());
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn import_with_empty_name_is_rejected_atomically() {
        let path = temp_vault_path("badname");
        let mut vault = Vault::new();
        create_entry(&mut vault, input("ok")).unwrap();
        export_to_file(&vault, &path).unwrap();
        // 篡改第一个条目的 name 为空
        let mut entries: Vec<Entry> = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        entries[0].name = "  ".into();
        std::fs::write(&path, serde_json::to_string_pretty(&entries).unwrap()).unwrap();

        let mut vault2 = Vault::new();
        assert!(matches!(import_from_file(&mut vault2, &path), Err(Error::Validation(_))));
        assert!(vault2.entries.is_empty(), "原子性：整体拒绝");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn create_vault_file_creates_missing_parent_dirs() {
        let base = std::env::temp_dir().join(format!("pwm-evo-parent-{}", std::process::id()));
        let path = base.join("a").join("b").join("vault.json");
        let _ = std::fs::remove_dir_all(&base);
        let (vault, _k) = create_vault_file(&path, PASSWORD).unwrap();
        assert!(vault.entries.is_empty());
        assert!(path.exists(), "嵌套缺失父目录应被自动创建");
        // 落盘后重开
        let (v2, _k2) = open_vault_file(&path, PASSWORD).unwrap();
        assert!(v2.entries.is_empty());
        std::fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn save_and_export_create_missing_parent_dirs() {
        let base = std::env::temp_dir().join(format!("pwm-evo-saveexp-{}", std::process::id()));
        let vpath = base.join("x").join("vault.json");
        let _ = std::fs::remove_dir_all(&base);
        let (_vault, key) = create_vault_file(&vpath, PASSWORD).unwrap();
        let mut vault = Vault::new();
        vault.entries.push(Entry { id: "e1".into(), name: "GitHub".into(), url: Some("https://github.com".into()), username: "u".into(), password: "p".into(), notes: None, tags: vec![], created_at: 1, updated_at: 1 });
        save_vault_file(&vpath, &vault, &key).unwrap(); // 已存在目录，save 不应报错
        let epath = base.join("y").join("export.json");
        export_to_file(&vault, &epath).unwrap(); // 嵌套缺失父目录自动创建
        assert!(epath.exists());
        std::fs::remove_dir_all(&base).ok();
    }
}
