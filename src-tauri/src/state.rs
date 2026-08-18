use std::collections::HashMap;
use std::sync::RwLock;

use crate::config::ConfigStore;
use crate::models::{AppConfig, Balance};
use crate::refresh::{self, RefreshState};

/// 全局状态: 配置 + 最近一次余额结果 + 每账户动态刷新状态
pub struct AppState {
    pub config_store: ConfigStore,
    config: RwLock<AppConfig>,
    balances: RwLock<Vec<Balance>>,
    refresh_state: RwLock<HashMap<String, RefreshState>>,
}

impl AppState {
    pub fn new() -> Self {
        let store = match ConfigStore::new() {
            Ok(s) => s,
            Err(e) => {
                log::error!("初始化配置存储失败, 使用内存存储: {e}");
                ConfigStore::new_ephemeral()
            }
        };
        let config = store.load();
        // 旧版明文配置自动迁移为加密存储
        if store.needs_migration() {
            if let Err(e) = store.save(&config) {
                log::error!("迁移配置为加密存储失败: {e}");
            } else {
                log::info!("已迁移明文 api_key 为加密存储");
            }
        }
        Self {
            config_store: store,
            config: RwLock::new(config),
            balances: RwLock::new(Vec::new()),
            refresh_state: RwLock::new(HashMap::new()),
        }
    }

    pub fn config(&self) -> AppConfig {
        self.config.read().unwrap().clone()
    }

    pub fn set_config(&self, config: AppConfig) -> Result<(), String> {
        *self.config.write().unwrap() = config.clone();
        // 清理已删除账户的余额缓存 + 动态刷新状态, 仅保留活动账户
        {
            let active: std::collections::HashSet<String> =
                config.accounts.iter().map(|a| a.id.clone()).collect();
            let mut list = self.balances.write().unwrap();
            list.retain(|b| active.contains(&b.account_id));
            let mut rs = self.refresh_state.write().unwrap();
            rs.retain(|id, _| active.contains(id));
        }
        self.config_store.save(&config)
    }

    pub fn balances(&self) -> Vec<Balance> {
        self.balances.read().unwrap().clone()
    }

    pub fn update_balance(&self, balance: Balance) {
        let mut list = self.balances.write().unwrap();
        if let Some(existing) = list.iter_mut().find(|b| b.account_id == balance.account_id) {
            *existing = balance;
        } else {
            list.push(balance);
        }
    }

    /// 当前动态刷新间隔（无记录账户 = 初始 30s）
    pub fn refresh_interval(&self, account_id: &str) -> u64 {
        self.refresh_state
            .read()
            .unwrap()
            .get(account_id)
            .map(|s| s.interval_secs)
            .unwrap_or(refresh::INITIAL_SECS)
    }

    /// 记录一次刷新结果并推进该账户的动态刷新状态机
    pub fn record_refresh(&self, balance: &Balance) -> u64 {
        let mut map = self.refresh_state.write().unwrap();
        map.entry(balance.account_id.clone())
            .or_default()
            .record(balance)
    }
}
