use std::sync::RwLock;

use crate::config::ConfigStore;
use crate::models::{AppConfig, Balance};

/// 全局状态: 配置 + 最近一次余额结果
pub struct AppState {
    pub config_store: ConfigStore,
    config: RwLock<AppConfig>,
    balances: RwLock<Vec<Balance>>,
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
        }
    }

    pub fn config(&self) -> AppConfig {
        self.config.read().unwrap().clone()
    }

    pub fn set_config(&self, config: AppConfig) -> Result<(), String> {
        *self.config.write().unwrap() = config.clone();
        // 清理已删除账户的余额缓存, 仅保留活动账户的余额
        {
            let active: std::collections::HashSet<String> =
                config.accounts.iter().map(|a| a.id.clone()).collect();
            let mut list = self.balances.write().unwrap();
            list.retain(|b| active.contains(&b.account_id));
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
}
