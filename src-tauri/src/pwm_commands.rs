use crate::pwm::generator::{generate_password as gen_password, GeneratorOptions};
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
    gen_password(&opts).map_err(|e| e.to_string())
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

    #[test]
    fn export_then_import_round_trip() {
        // 导出 → 再导入（id 重新生成、追加到会话）→ 落盘验证
        let path = temp_path("exim");
        let _ = fs::remove_file(&path);
        let st = PwmState::default();
        create_vault_impl(&st, path.to_str().unwrap(), "master").unwrap();

        create_entry_impl(&st, input("GitHub")).unwrap();
        let exp = temp_path("exim-export");
        let _ = fs::remove_file(&exp);
        export_vault_impl(&st, exp.to_str().unwrap()).unwrap();

        let n = import_vault_impl(&st, exp.to_str().unwrap()).unwrap();
        assert_eq!(n, 1);
        assert_eq!(list_entries_impl(&st, None, &[]).unwrap().len(), 2);

        // 导入已随会话持久化
        lock_vault_impl(&st);
        unlock_vault_impl(&st, path.to_str().unwrap(), "master").unwrap();
        assert_eq!(list_entries_impl(&st, None, &[]).unwrap().len(), 2);

        fs::remove_file(&path).ok();
        fs::remove_file(&exp).ok();
    }
}
