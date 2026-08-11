use std::collections::HashMap;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::adapters::deepseek::DeepseekAdapter;
use crate::adapters::opencode::OpencodeGoAdapter;
use crate::adapters::Adapter;
use crate::models::{Account, AccountKind, Balance};
use crate::state::AppState;

pub struct Scheduler;

impl Scheduler {
    /// 启动后台刷新循环, 每 30 秒检查一次, 按各账户间隔节流
    pub fn start(app: AppHandle) {
        tauri::async_runtime::spawn(async move {
            // 记录各账户上次刷新时间
            let mut last_refresh: HashMap<String, std::time::Instant> = HashMap::new();
            loop {
                let accounts = {
                    let state = app.state::<AppState>();
                    state.config().accounts.clone()
                };
                for account in &accounts {
                    let now = std::time::Instant::now();
                    let due = match last_refresh.get(&account.id) {
                        Some(last) => now.duration_since(*last)
                            >= Duration::from_secs(account.refresh_interval_secs.max(30)),
                        None => true,
                    };
                    if !due {
                        continue;
                    }
                    last_refresh.insert(account.id.clone(), now);
                    let app = app.clone();
                    let account = account.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = refresh_one(&app, &account).await;
                    });
                }
                tokio::time::sleep(Duration::from_secs(30)).await;
            }
        });
    }
}

/// 刷新单个账户并广播结果
pub async fn refresh_one(app: &AppHandle, account: &Account) -> Balance {
    let balance = test_one(account).await;

    {
        let state = app.state::<AppState>();
        state.update_balance(balance.clone());
    }
    let _ = app.emit("balance-updated", balance.clone());
    let _ = app.emit("balances-updated", app.state::<AppState>().balances());

    balance
}

/// 立即刷新所有账户(手动触发)
pub fn refresh_all_now(app: &AppHandle) {
    let accounts = {
        let state = app.state::<AppState>();
        state.config().accounts.clone()
    };
    for account in accounts {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = refresh_one(&app, &account).await;
        });
    }
}

/// 提取适配器 (按账户类型分发)
pub fn get_adapter(account: &Account) -> Box<dyn Adapter> {
    match account.kind {
        AccountKind::Deepseek => Box::new(DeepseekAdapter::new()),
        AccountKind::OpencodeGo => Box::new(OpencodeGoAdapter::new()),
    }
}

/// 测试单个账户(不保存状态, 不广播), 返回查询结果
pub async fn test_one(account: &Account) -> Balance {
    let adapter = get_adapter(account);
    let account_clone = account.clone();
    let account = account.clone();
    let result = tauri::async_runtime::spawn_blocking(move || adapter.fetch(&account_clone))
        .await
        .unwrap_or_else(|e| Err(format!("任务失败: {e}")));
    result.unwrap_or_else(|e| Balance {
        account_id: account.id.clone(),
        account_name: account.name.clone(),
        kind: account.kind,
        balance: None,
        used: None,
        total: None,
        currency: None,
        windows: None,
        ok: false,
        error: Some(e),
        raw: None,
        last_updated: 0,
    })
}
