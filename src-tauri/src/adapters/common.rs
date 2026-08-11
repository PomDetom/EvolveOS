use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::Value;

use crate::models::{Account, Balance, QuotaWindow};

pub struct HttpClient;

impl HttpClient {
    pub fn get_json(base_url: &str, path: &str, api_key: &str) -> Result<Value, String> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| format!("创建 HTTP 客户端失败: {e}"))?;
        let url = format!("{}/{}", base_url.trim_end_matches('/'), path);
        let resp = client
            .get(&url)
            .header("Authorization", format!("Bearer {api_key}"))
            .send()
            .map_err(|e| format!("请求失败: {e}"))?;
        let status = resp.status();
        let text = resp.text().map_err(|e| format!("读取响应失败: {e}"))?;
        if !status.is_success() {
            return Err(format!("HTTP {status}: {text}"));
        }
        serde_json::from_str(&text).map_err(|e| format!("解析 JSON 失败: {e}, body: {text}"))
    }
}

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn raw_trim(raw: &str) -> Option<String> {
    if raw.is_empty() {
        return None;
    }
    let truncated = raw.chars().take(600).collect::<String>();
    if truncated.len() < raw.len() {
        Some(format!("{truncated}...(截断)"))
    } else {
        Some(truncated)
    }
}

/// 组装 Balance 结果
pub fn build_balance(
    account: &Account,
    balance: Option<f64>,
    used: Option<f64>,
    total: Option<f64>,
    currency: Option<String>,
    raw: Option<String>,
) -> Balance {
    Balance {
        account_id: account.id.clone(),
        account_name: account.name.clone(),
        kind: account.kind,
        balance,
        used,
        total,
        currency,
        windows: None,
        ok: true,
        error: None,
        raw,
        last_updated: now(),
    }
}

pub fn error_balance(account: &Account, err: String) -> Balance {
    Balance {
        account_id: account.id.clone(),
        account_name: account.name.clone(),
        kind: account.kind,
        balance: None,
        used: None,
        total: None,
        currency: None,
        windows: None,
        ok: false,
        error: Some(err),
        raw: None,
        last_updated: now(),
    }
}

/// 请求 opencode 套餐页面 (blocking), 返回 HTML 文本
impl HttpClient {
    pub fn get_html(base_url: &str, workspace_id: &str, cookie: &str) -> Result<String, String> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| format!("创建 HTTP 客户端失败: {e}"))?;
        let url = format!(
            "{}/workspace/{}/go",
            base_url.trim_end_matches('/'),
            workspace_id
        );
        let resp = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
            .header("Accept", "text/html,application/xhtml+xml,*/*")
            .header("Cookie", format!("auth={cookie}; oc_locale=zh"))
            .send()
            .map_err(|e| format!("请求失败: {e}"))?;
        let status = resp.status();
        let text = resp.text().map_err(|e| format!("读取响应失败: {e}"))?;
        if status == reqwest::StatusCode::UNAUTHORIZED
            || status == reqwest::StatusCode::FORBIDDEN
            || status == reqwest::StatusCode::FOUND
            || status == reqwest::StatusCode::MOVED_PERMANENTLY
        {
            return Err("Cookie 已过期或无效，请重新获取".into());
        }
        if !status.is_success() {
            return Err(format!("HTTP {status}"));
        }
        Ok(text)
    }
}

/// 组装 opencode 套餐结果 (余额字段为空, windows 承载三窗口)
pub fn build_opencode_balance(account: &Account, windows: Vec<QuotaWindow>) -> Balance {
    Balance {
        account_id: account.id.clone(),
        account_name: account.name.clone(),
        kind: account.kind,
        balance: None,
        used: None,
        total: None,
        currency: None,
        windows: Some(windows),
        ok: true,
        error: None,
        raw: None,
        last_updated: now(),
    }
}

/// opencode 错误结果
pub fn quota_error(account: &Account, msg: impl Into<String>) -> Balance {
    Balance {
        account_id: account.id.clone(),
        account_name: account.name.clone(),
        kind: account.kind,
        balance: None,
        used: None,
        total: None,
        currency: None,
        windows: None,
        ok: false,
        error: Some(msg.into()),
        raw: None,
        last_updated: now(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AccountKind;

    fn account() -> Account {
        Account {
            id: "a1".into(),
            name: "oc".into(),
            kind: AccountKind::OpencodeGo,
            base_url: "https://opencode.ai".into(),
            api_key: String::new(),
            workspace_id: Some("wrk_test".into()),
            auth_cookie: Some("ck".into()),
            refresh_interval_secs: 300,
            warn_threshold: 10.0,
        }
    }

    #[test]
    fn build_opencode_balance_fills_windows() {
        let ws = vec![QuotaWindow {
            key: "rolling".into(),
            label: "5小时".into(),
            limit: 12.0,
            used: 3.5,
            used_pct: 29.2,
            resets_in: 3600,
            resets_at: "2026-08-07T18:00:00+08:00".into(),
        }];
        let b = build_opencode_balance(&account(), ws);
        assert!(b.ok);
        assert!(b.balance.is_none());
        assert!(b.currency.is_none());
        assert_eq!(b.windows.as_ref().unwrap().len(), 1);
        assert_eq!(b.windows.as_ref().unwrap()[0].used_pct, 29.2);
        assert!(b.windows.is_some());
    }

    #[test]
    fn quota_error_sets_error() {
        let b = quota_error(&account(), "Cookie 已过期");
        assert!(!b.ok);
        assert_eq!(b.error.as_deref(), Some("Cookie 已过期"));
        assert!(b.windows.is_none());
    }
}
