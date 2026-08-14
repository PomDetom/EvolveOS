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
mod pwm_commands; // 密码管理器 Tauri 命令
mod pwm_state;    // 密码管理器会话状态
mod scheduler;
mod state;
mod window_state; // 主窗口几何持久化（尺寸/位置/最大化）

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CloseBehaviorState { close_behavior: Mutex::new("exit".into()) })
        .manage(state::AppState::new())
        .manage(pwm_state::PwmState::default())
        .manage(window_state::WindowStateStore::new())
        .setup(|app| {
            // 恢复主窗口上次几何（尺寸/位置/最大化）
            if let Some(win) = app.get_webview_window("main") {
                if let Err(e) = app.state::<window_state::WindowStateStore>().restore(&win) {
                    log::warn!("恢复主窗口几何失败: {e}");
                }
            }
            // 系统托盘（右下角）：closeBehavior=background 隐藏主窗后仍可唤回 / 退出
            if let Err(e) = setup_tray(app) {
                log::error!("创建系统托盘失败: {e}");
            }
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
            pwm_commands::pick_vault_path,
        ])
        .on_window_event(|window, event| {
            // 主窗几何变更 → 防抖持久化（移动/缩放尾部落盘一次）
            if window.label() == "main" {
                if let tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) = event {
                    if let Some(ww) = window.app_handle().get_webview_window("main") {
                        window
                            .app_handle()
                            .state::<window_state::WindowStateStore>()
                            .schedule_save(ww);
                    }
                }
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    // 关闭/隐藏前同步落盘当前几何（防抖可能未触发，先存再走关闭逻辑）
                    if let Some(ww) = window.app_handle().get_webview_window("main") {
                        let _ = window
                            .app_handle()
                            .state::<window_state::WindowStateStore>()
                            .save_now(&ww);
                    }
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

// —— 系统托盘（桌面右下角）——

/// 创建托盘：菜单「打开主窗口 / 退出」；左键单击/双击托盘唤回主窗。
/// closeBehavior=background 时主窗隐藏、strip 悬浮窗 skipTaskbar，托盘是唯一 OS 级唤回入口。
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let show_i = MenuItem::with_id(app, "show", "打开主窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let mut builder = TrayIconBuilder::with_id("evolveos-tray")
        .tooltip("EvolveOS")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick { .. } => show_main(tray.app_handle()),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    log::info!("[tray] 系统托盘已创建");
    Ok(())
}

/// 显示并聚焦主窗口（托盘唤回入口：show + 取消最小化 + focus）。
fn show_main(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}
