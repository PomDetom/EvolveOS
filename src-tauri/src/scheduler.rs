use std::collections::HashMap;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::adapters::codex::CodexAdapter;
use crate::adapters::deepseek::DeepseekAdapter;
use crate::adapters::opencode::OpencodeGoAdapter;
use crate::adapters::Adapter;
use crate::models::{Account, AccountKind, Balance};
use crate::state::AppState;

pub struct Scheduler;

impl Scheduler {
    /// 启动后台刷新循环：每 5 秒检查一次（支撑 5s 错误重试粒度），
    /// 按各账户**动态间隔**（30s→…→5min，见 refresh.rs）节流。
    pub fn start(app: AppHandle) {
        tauri::async_runtime::spawn(async move {
            // 各账户上次刷新时间；启动即标记为已刷新（setup 的 refresh_all_now 刚做过首轮），
            // 首个周期按间隔推进，避免启动后立刻重复拉取
            let mut last_refresh: HashMap<String, std::time::Instant> = {
                let now = std::time::Instant::now();
                let state = app.state::<AppState>();
                state
                    .config()
                    .accounts
                    .iter()
                    .map(|a| (a.id.clone(), now))
                    .collect()
            };
            loop {
                let accounts = {
                    let state = app.state::<AppState>();
                    state.config().accounts.clone()
                };
                for account in &accounts {
                    let now = std::time::Instant::now();
                    let interval = {
                        let state = app.state::<AppState>();
                        state.refresh_interval(&account.id)
                    };
                    let due = match last_refresh.get(&account.id) {
                        Some(last) => now.duration_since(*last) >= Duration::from_secs(interval),
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
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        });
    }
}

/// 刷新单个账户：抓取 → 更新快照 → 推进动态状态机 → 广播结果
pub async fn refresh_one(app: &AppHandle, account: &Account) -> Balance {
    let balance = test_one(account).await;

    {
        let state = app.state::<AppState>();
        state.update_balance(balance.clone());
        state.record_refresh(&balance);
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
        AccountKind::Codex => Box::new(CodexAdapter::new()),
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
        plan_type: None,
        credits: None,
        ok: false,
        error: Some(e),
        raw: None,
        last_updated: 0,
    })
}
