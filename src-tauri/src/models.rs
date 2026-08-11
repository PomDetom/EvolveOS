use serde::{Deserialize, Serialize};

/// 账户类型: DeepSeek 官方(余额型) / OpenCode Go 套餐(三窗口用量型)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountKind {
    Deepseek,
    OpencodeGo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    #[serde(default = "gen_id")]
    pub id: String,
    /// 显示名称
    pub name: String,
    pub kind: AccountKind,
    /// 接口基础地址,如 https://api.deepseek.com
    pub base_url: String,
    pub api_key: String,
    /// opencode 套餐专用: 工作区 ID (明文存储，无需加密的工作区标识)
    pub workspace_id: Option<String>,
    /// opencode 套餐专用: 会话 cookie (DPAPI 加密存储)
    pub auth_cookie: Option<String>,
    /// 刷新间隔(秒)
    #[serde(default = "default_interval")]
    pub refresh_interval_secs: u64,
    /// 保留字段，预警已移除（不再触发任何通知逻辑）
    #[serde(default = "default_threshold")]
    pub warn_threshold: f64,
}

fn gen_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn default_interval() -> u64 {
    300
}

fn default_threshold() -> f64 {
    10.0
}

/// 一次查询的余额结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Balance {
    pub account_id: String,
    pub account_name: String,
    pub kind: AccountKind,
    pub balance: Option<f64>,
    pub used: Option<f64>,
    pub total: Option<f64>,
    pub currency: Option<String>,
    /// opencode 套餐专用: 三窗口用量
    pub windows: Option<Vec<QuotaWindow>>,
    /// 查询状态
    pub ok: bool,
    pub error: Option<String>,
    /// 原始响应(截断,供调试)
    pub raw: Option<String>,
    pub last_updated: u64,
}

/// 一个套餐限额窗口
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaWindow {
    pub key: String,       // "rolling" | "weekly" | "monthly"
    pub label: String,     // "5小时" | "本周" | "本月"
    pub limit: f64,        // 限额：12 / 30 / 60
    pub used: f64,         // 已用金额
    pub used_pct: f64,     // 已用百分比
    pub resets_in: u64,    // 剩余秒
    pub resets_at: String, // 重置时间 ISO
}

/// 全局配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub accounts: Vec<Account>,
    /// 悬浮窗是否置顶显示
    #[serde(default = "default_true")]
    pub floating_always_on_top: bool,
    /// 悬浮窗透明度 0.1-1.0
    #[serde(default = "default_opacity")]
    pub floating_opacity: f64,
    /// 悬浮形态: panel(小卡片) / bar(长条)
    #[serde(default = "default_mode")]
    pub floating_mode: String,
    /// 贴边自动收缩
    #[serde(default = "default_true")]
    pub floating_collapse: bool,
}

fn default_true() -> bool {
    true
}

fn default_opacity() -> f64 {
    0.92
}

fn default_mode() -> String {
    "panel".into()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            accounts: Vec::new(),
            floating_always_on_top: true,
            floating_opacity: 0.92,
            floating_mode: "panel".into(),
            floating_collapse: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_kind_roundtrip() {
        // 新增的 OpencodeGo 枚举序列化为 snake_case
        let s = serde_json::to_string(&AccountKind::OpencodeGo).unwrap();
        assert_eq!(s, "\"opencode_go\"");
        let k: AccountKind = serde_json::from_str("\"opencode_go\"").unwrap();
        assert_eq!(k, AccountKind::OpencodeGo);
    }

    #[test]
    fn balance_windows_serde() {
        let b = Balance {
            account_id: "a1".into(),
            account_name: "t".into(),
            kind: AccountKind::OpencodeGo,
            balance: None,
            used: None,
            total: None,
            currency: None,
            windows: Some(vec![QuotaWindow {
                key: "rolling".into(),
                label: "5小时".into(),
                limit: 12.0,
                used: 3.5,
                used_pct: 29.2,
                resets_in: 3600,
                resets_at: "2026-08-07T18:00:00+08:00".into(),
            }]),
            ok: true,
            error: None,
            raw: None,
            last_updated: 0,
        };
        let j = serde_json::to_string(&b).unwrap();
        assert!(j.contains("\"windows\""));
        assert!(j.contains("\"usedPct\""));
        assert!(!j.contains("belowThreshold"));
    }
}
