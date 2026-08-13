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
mod pwm; // 密码管理器核心（移植 pwm-core）
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
