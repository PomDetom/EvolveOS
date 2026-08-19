use std::time::{Duration, SystemTime, UNIX_EPOCH};

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
        plan_type: None,
        credits: None,
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
        plan_type: None,
        credits: None,
        ok: false,
        error: Some(err),
        raw: None,
        last_updated: now(),
    }
}

/// 请求 opencode 套餐页面 (blocking)。瞬时故障（网络/超时/5xx/429）带退避重试，
/// cookie 失效等确定性错误不重试（重试只会浪费等待）。
impl HttpClient {
    pub fn get_html(base_url: &str, workspace_id: &str, cookie: &str) -> Result<String, String> {
        const RETRY_DELAYS: [Duration; 2] =
            [Duration::from_millis(1000), Duration::from_millis(2000)];
        let mut attempts = 0usize;
        let result = with_retry(
            || {
                attempts += 1;
                get_html_once(base_url, workspace_id, cookie)
            },
            |e| e.retryable,
            &RETRY_DELAYS,
        );
        match result {
            Ok(html) => Ok(html),
            Err(e) if e.retryable => {
                Err(format!("重试 {} 次后仍失败: {}", attempts - 1, e.message))
            }
            Err(e) => Err(e.message),
        }
    }
}

/// 单次请求 opencode /go 页面；错误带可重试标记
fn get_html_once(
    base_url: &str,
    workspace_id: &str,
    cookie: &str,
) -> Result<String, HttpFetchError> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| HttpFetchError::fatal(format!("创建 HTTP 客户端失败: {e}")))?;
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
        .map_err(|e| HttpFetchError::transient(format!("请求失败: {e}")))?;
    let status = resp.status();
    let text = resp
        .text()
        .map_err(|e| HttpFetchError::transient(format!("读取响应失败: {e}")))?;
    if status == reqwest::StatusCode::UNAUTHORIZED
        || status == reqwest::StatusCode::FORBIDDEN
        || status == reqwest::StatusCode::FOUND
        || status == reqwest::StatusCode::MOVED_PERMANENTLY
    {
        return Err(HttpFetchError::fatal("Cookie 已过期或无效，请重新获取"));
    }
    if !status.is_success() {
        return Err(HttpFetchError {
            message: format!("HTTP {status}"),
            retryable: retryable_status(status),
        });
    }
    Ok(text)
}

/// HTTP 状态码是否值得重试：5xx / 429（限流）/ 408（超时）属瞬时故障
fn retryable_status(status: reqwest::StatusCode) -> bool {
    status.is_server_error()
        || status == reqwest::StatusCode::TOO_MANY_REQUESTS
        || status == reqwest::StatusCode::REQUEST_TIMEOUT
}

/// 请求错误：标记是否可重试
struct HttpFetchError {
    message: String,
    retryable: bool,
}

impl HttpFetchError {
    fn fatal(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            retryable: false,
        }
    }

    fn transient(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            retryable: true,
        }
    }
}

/// 带退避的重试循环：按 `is_retryable` 判定；致命错误立即返回；
/// 失败后 sleep `delays[i]` 再试，总尝试次数 = delays.len() + 1。
fn with_retry<T, E>(
    mut op: impl FnMut() -> Result<T, E>,
    is_retryable: impl Fn(&E) -> bool,
    delays: &[Duration],
) -> Result<T, E> {
    let mut attempt = 0usize;
    loop {
        match op() {
            Ok(v) => return Ok(v),
            Err(e) if attempt < delays.len() && is_retryable(&e) => {
                std::thread::sleep(delays[attempt]);
                attempt += 1;
            }
            Err(e) => return Err(e),
        }
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
        plan_type: None,
        credits: None,
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
        plan_type: None,
        credits: None,
        ok: false,
        error: Some(msg.into()),
        raw: None,
        last_updated: now(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

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
            visible: true,
            warn_threshold: 10.0,
        }
    }

    fn is_transient(e: &&str) -> bool {
        *e == "transient"
    }

    #[test]
    fn with_retry_succeeds_on_first_attempt() {
        let mut calls = 0;
        let r = with_retry(
            || {
                calls += 1;
                Ok::<_, &str>("ok")
            },
            is_transient,
            &[Duration::from_millis(1)],
        );
        assert_eq!(r, Ok("ok"));
        assert_eq!(calls, 1);
    }

    #[test]
    fn with_retry_retries_transient_then_succeeds() {
        let calls = Cell::new(0);
        let r = with_retry(
            || {
                let n = calls.get() + 1;
                calls.set(n);
                if n < 3 {
                    Err::<&str, &str>("transient")
                } else {
                    Ok("ok")
                }
            },
            is_transient,
            &[Duration::from_millis(1), Duration::from_millis(1)],
        );
        assert_eq!(r, Ok("ok"));
        assert_eq!(calls.get(), 3, "前两次失败后第三次成功");
    }

    #[test]
    fn with_retry_fatal_error_short_circuits() {
        let calls = Cell::new(0);
        let r = with_retry(
            || {
                calls.set(calls.get() + 1);
                Err::<&str, &str>("fatal")
            },
            is_transient,
            &[Duration::from_millis(1), Duration::from_millis(1)],
        );
        assert_eq!(r, Err("fatal"));
        assert_eq!(calls.get(), 1, "致命错误不重试");
    }

    #[test]
    fn with_retry_exhausts_all_attempts() {
        let calls = Cell::new(0);
        let r = with_retry(
            || {
                calls.set(calls.get() + 1);
                Err::<&str, &str>("transient")
            },
            is_transient,
            &[Duration::from_millis(1), Duration::from_millis(1)],
        );
        assert_eq!(r, Err("transient"));
        assert_eq!(calls.get(), 3, "1 初试 + 2 重试 = 3 次");
    }

    #[test]
    fn retryable_status_classifies_http() {
        assert!(retryable_status(reqwest::StatusCode::INTERNAL_SERVER_ERROR));
        assert!(retryable_status(reqwest::StatusCode::BAD_GATEWAY));
        assert!(retryable_status(reqwest::StatusCode::SERVICE_UNAVAILABLE));
        assert!(retryable_status(reqwest::StatusCode::GATEWAY_TIMEOUT));
        assert!(retryable_status(reqwest::StatusCode::TOO_MANY_REQUESTS));
        assert!(retryable_status(reqwest::StatusCode::REQUEST_TIMEOUT));
        assert!(!retryable_status(reqwest::StatusCode::BAD_REQUEST));
        assert!(!retryable_status(reqwest::StatusCode::NOT_FOUND));
        assert!(!retryable_status(reqwest::StatusCode::OK));
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
