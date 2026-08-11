use tauri::{AppHandle, Emitter, State};

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
