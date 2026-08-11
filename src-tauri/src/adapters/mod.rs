pub mod common;
pub mod deepseek;
pub mod opencode;

use crate::models::{Account, Balance};

/// 统一适配器 trait
pub trait Adapter: Send + Sync {
    /// 查询余额
    fn fetch(&self, account: &Account) -> Result<Balance, String>;
}
