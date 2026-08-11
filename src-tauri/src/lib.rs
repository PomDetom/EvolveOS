mod crypto;
mod models;
mod config;
mod state;
mod adapters;
mod commands;
mod scheduler;

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
