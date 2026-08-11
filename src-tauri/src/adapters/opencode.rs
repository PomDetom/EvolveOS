use super::common::{build_opencode_balance, quota_error, raw_trim};
use super::common::HttpClient;
use super::Adapter;
use crate::models::{Account, Balance, QuotaWindow};

/// OpenCode Go 套餐限额常量
const GO_LIMITS: &[(&str, &str, f64)] = &[
    ("rolling", "5小时", 12.0),
    ("weekly", "本周", 30.0),
    ("monthly", "本月", 60.0),
];

pub struct OpencodeGoAdapter;

impl OpencodeGoAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl Adapter for OpencodeGoAdapter {
    fn fetch(&self, account: &Account) -> Result<Balance, String> {
        let Some(ws) = account.workspace_id.as_deref() else {
            return Ok(quota_error(account, "缺少 workspace_id"));
        };
        let Some(cookie) = account.auth_cookie.as_deref() else {
            return Ok(quota_error(account, "缺少 auth_cookie"));
        };
        let html = match HttpClient::get_html(&account.base_url, ws, cookie) {
            Ok(h) => h,
            Err(e) => return Ok(quota_error(account, e)),
        };
        // 站点返回 200 但 body 已重定向到登录页时, cookie 同样视为失效
        let head: String = html.chars().take(2000).collect();
        if head.contains("login") {
            return Ok(quota_error(account, "Cookie 已过期或无效，请重新获取"));
        }
        let now_secs = super::common::now();
        match parse_quota(&html, now_secs) {
            Ok(windows) => {
                let mut b = build_opencode_balance(account, windows);
                b.raw = raw_trim(&html);
                Ok(b)
            }
            Err(e) => Ok(quota_error(account, e)),
        }
    }
}

/// 从 /go 页面 SSR 提取三窗口用量 (纯函数)
fn parse_quota(html: &str, now_secs: u64) -> Result<Vec<QuotaWindow>, String> {
    // (?s) 启用 DOTALL, 让 .*? 分隔符可跨行 (三窗口可能分布在多行);
    // 每个窗口子句放宽: 接受小数 usagePercent, 容忍 resetInSec/usagePercent 之间夹带其他字段
    let re = regex::Regex::new(
        r#"(?s)rollingUsage:\$R\[\d+\]=\{[^}]*resetInSec:(\d+)[,}][^}]*usagePercent:([0-9.]+)\}.*?weeklyUsage:\$R\[\d+\]=\{[^}]*resetInSec:(\d+)[,}][^}]*usagePercent:([0-9.]+)\}.*?monthlyUsage:\$R\[\d+\]=\{[^}]*resetInSec:(\d+)[,}][^}]*usagePercent:([0-9.]+)\}"#,
    )
    .map_err(|e| format!("正则编译失败: {e}"))?;
    let caps = re
        .captures(html)
        .ok_or_else(|| "无法解析 /go 页面，页面结构可能已变更".to_string())?;

    let mut windows = Vec::new();
    for (idx, (key, label, limit)) in GO_LIMITS.iter().enumerate() {
        let group = idx * 2 + 1; // resetInSec, usagePercent
        let resets_in: u64 = caps
            .get(group)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        let used_pct: f64 = caps
            .get(group + 1)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0.0);
        windows.push(QuotaWindow {
            key: key.to_string(),
            label: label.to_string(),
            limit: *limit,
            used: limit * used_pct / 100.0,
            used_pct,
            resets_in,
            // resets_at 用 +08:00 墙钟: from_timestamp 产生 UTC, 需换算到东八区再格式化
            resets_at: chrono::DateTime::from_timestamp(now_secs as i64 + resets_in as i64, 0)
                .map(|dt| {
                    dt.with_timezone(&chrono::FixedOffset::east_opt(8 * 3600).unwrap())
                        .format("%Y-%m-%dT%H:%M:%S%:z")
                        .to_string()
                })
                .unwrap_or_default(),
        });
    }
    Ok(windows)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_HTML: &str = r#"<html><script>window.$R={};$R[0]={usagePercent:5};</script>
<script>
$R[1]=[];rollingUsage:$R[2]={status:"ok",resetInSec:123,usagePercent:29};weeklyUsage:$R[3]={status:"ok",resetInSec:43200,usagePercent:50};monthlyUsage:$R[4]={status:"ok",resetInSec:99999,usagePercent:80};
</script></html>"#;

    #[test]
    fn parse_quota_extracts_three_windows() {
        let ws = parse_quota(SAMPLE_HTML, 1_700_000_000).unwrap();
        assert_eq!(ws.len(), 3);
        assert_eq!(ws[0].key, "rolling");
        assert_eq!(ws[0].label, "5小时");
        assert_eq!(ws[0].limit, 12.0);
        assert_eq!(ws[0].used_pct, 29.0);
        assert_eq!(ws[0].resets_in, 123);
        assert_eq!(ws[0].used, 12.0 * 29.0 / 100.0);
        assert!(!ws[0].resets_at.is_empty(), "resets_at 不应为空");
        assert!(
            ws[0].resets_at.contains("+08:00"),
            "resets_at 应含 +08:00 时区: {}",
            ws[0].resets_at
        );
        assert_eq!(ws[1].key, "weekly");
        assert_eq!(ws[1].used_pct, 50.0);
        assert_eq!(ws[2].key, "monthly");
        assert_eq!(ws[2].used_pct, 80.0);
        assert_eq!(ws[2].limit, 60.0);
    }

    #[test]
    fn parse_quota_multiline_decimal_extra_fields() {
        // 三窗口分处多行 (依赖 DOTALL), usagePercent 带小数, resetInSec 与 usagePercent 之间夹带多余字段
        let html = r#"<script>
rollingUsage:$R[2]={status:"ok",resetInSec:123,extra:true,usagePercent:29.5}
weeklyUsage:$R[3]={status:"ok",resetInSec:43200,extra:"x",usagePercent:50.25}
monthlyUsage:$R[4]={status:"ok",resetInSec:99999,usagePercent:80}
</script>"#;
        let ws = parse_quota(html, 1_700_000_000).unwrap();
        assert_eq!(ws.len(), 3);
        assert_eq!(ws[0].used_pct, 29.5);
        assert_eq!(ws[0].used, 12.0 * 29.5 / 100.0);
        assert_eq!(ws[0].resets_in, 123);
        assert_eq!(ws[1].used_pct, 50.25);
        assert_eq!(ws[1].limit, 30.0);
        assert_eq!(ws[2].used_pct, 80.0);
        assert_eq!(ws[2].limit, 60.0);
        assert!(!ws[2].resets_at.is_empty(), "resets_at 不应为空");
        assert!(
            ws[2].resets_at.contains("+08:00"),
            "resets_at 应含 +08:00 时区: {}",
            ws[2].resets_at
        );
    }

    #[test]
    fn parse_quota_rejects_changed_structure() {
        let html = "<html>no usage data here</html>";
        assert!(parse_quota(html, 0).is_err());
    }
}
