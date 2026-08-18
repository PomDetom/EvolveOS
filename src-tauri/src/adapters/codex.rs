use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};

use serde_json::{json, Value};

use super::common::{now, quota_error, raw_trim};
use super::Adapter;
use crate::models::{Account, Balance, Credits, QuotaWindow};

pub struct CodexAdapter;

impl CodexAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl Adapter for CodexAdapter {
    fn fetch(&self, account: &Account) -> Result<Balance, String> {
        let result = match query_rate_limits() {
            Ok(value) => value,
            Err(error) => return Ok(quota_error(account, error)),
        };
        let raw = raw_trim(&result.to_string());
        match parse_rate_limits(&result, now()) {
            Ok(quota) => Ok(Balance {
                account_id: account.id.clone(),
                account_name: account.name.clone(),
                kind: account.kind,
                balance: None,
                used: None,
                total: None,
                currency: None,
                windows: Some(quota.windows),
                plan_type: Some(quota.plan_type),
                credits: quota.credits,
                ok: true,
                error: None,
                raw,
                last_updated: now(),
            }),
            Err(error) => Ok(quota_error(account, error)),
        }
    }
}

struct CodexQuota {
    plan_type: String,
    windows: Vec<QuotaWindow>,
    credits: Option<Credits>,
}

fn query_rate_limits() -> Result<Value, String> {
    let mut child = spawn_app_server()?;
    let result = (|| {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Codex app-server stdin 不可用".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Codex app-server stdout 不可用".to_string())?;
        let mut reader = BufReader::new(stdout);

        send(
            &mut stdin,
            json!({
                "method": "initialize",
                "id": 1,
                "params": {
                    "clientInfo": {
                        "name": "codex_quota",
                        "title": "Codex Quota",
                        "version": "0.1.0"
                    }
                }
            }),
        )?;
        read_response(&mut reader, 1)?;
        send(&mut stdin, json!({ "method": "initialized" }))?;
        send(
            &mut stdin,
            json!({ "method": "account/rateLimits/read", "id": 2 }),
        )?;
        read_response(&mut reader, 2)
    })();

    let _ = child.kill();
    let _ = child.wait();
    result
}

fn spawn_app_server() -> Result<Child, String> {
    #[cfg(windows)]
    let mut command = {
        use std::os::windows::process::CommandExt;

        let mut command = Command::new("cmd.exe");
        command.args(["/c", "codex", "app-server"]);
        command.creation_flags(0x08000000);
        command
    };

    #[cfg(not(windows))]
    let mut command = {
        let mut command = Command::new("codex");
        command.args(["app-server"]);
        command
    };

    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("启动 Codex app-server 失败，请确认 codex 命令可用: {error}"))
}

fn send(stdin: &mut impl Write, message: Value) -> Result<(), String> {
    let line =
        serde_json::to_string(&message).map_err(|error| format!("编码 Codex 请求失败: {error}"))?;
    writeln!(stdin, "{line}").map_err(|error| format!("写入 Codex app-server 失败: {error}"))?;
    stdin
        .flush()
        .map_err(|error| format!("刷新 Codex app-server 请求失败: {error}"))
}

fn read_response(reader: &mut impl BufRead, request_id: u64) -> Result<Value, String> {
    let mut line = String::new();
    loop {
        line.clear();
        let size = reader
            .read_line(&mut line)
            .map_err(|error| format!("读取 Codex app-server 响应失败: {error}"))?;
        if size == 0 {
            return Err("Codex app-server 已退出，未返回额度响应".into());
        }
        let Ok(message) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        if message.get("id").and_then(Value::as_u64) != Some(request_id) {
            continue;
        }
        if let Some(error) = message.get("error") {
            return Err(format!("Codex 请求失败: {error}"));
        }
        return message
            .get("result")
            .cloned()
            .ok_or_else(|| "Codex 响应缺少 result 字段".into());
    }
}

fn parse_rate_limits(result: &Value, now_secs: u64) -> Result<CodexQuota, String> {
    let limits = result
        .pointer("/rateLimitsByLimitId/codex")
        .or_else(|| result.get("rateLimits"))
        .ok_or_else(|| "Codex 响应缺少 rateLimits.codex".to_string())?;
    let primary = limits
        .get("primary")
        .filter(|value| !value.is_null())
        .ok_or_else(|| "Codex 响应缺少 primary 限额".to_string())?;

    let mut windows = vec![parse_window("primary", primary, now_secs)?];
    if let Some(secondary) = limits.get("secondary").filter(|value| !value.is_null()) {
        windows.push(parse_window("secondary", secondary, now_secs)?);
    }

    let credits = limits
        .get("credits")
        .filter(|value| !value.is_null())
        .map(|value| Credits {
            has_credits: value
                .get("hasCredits")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            unlimited: value
                .get("unlimited")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            balance: value
                .get("balance")
                .and_then(Value::as_str)
                .unwrap_or("0")
                .to_string(),
        });

    Ok(CodexQuota {
        plan_type: limits
            .get("planType")
            .and_then(Value::as_str)
            .unwrap_or("unknown")
            .to_string(),
        windows,
        credits,
    })
}

fn parse_window(key: &str, value: &Value, now_secs: u64) -> Result<QuotaWindow, String> {
    let used_pct = value
        .get("usedPercent")
        .and_then(Value::as_f64)
        .ok_or_else(|| format!("Codex {key} 限额缺少 usedPercent"))?;
    let duration_mins = value
        .get("windowDurationMins")
        .and_then(Value::as_u64)
        .ok_or_else(|| format!("Codex {key} 限额缺少 windowDurationMins"))?;
    let resets_at = value
        .get("resetsAt")
        .and_then(Value::as_u64)
        .ok_or_else(|| format!("Codex {key} 限额缺少 resetsAt"))?;

    Ok(QuotaWindow {
        key: key.to_string(),
        label: duration_label(duration_mins),
        limit: 100.0,
        used: used_pct,
        used_pct,
        resets_in: resets_at.saturating_sub(now_secs),
        resets_at: chrono::DateTime::from_timestamp(resets_at as i64, 0)
            .map(|date| {
                date.with_timezone(&chrono::FixedOffset::east_opt(8 * 3600).unwrap())
                    .format("%Y-%m-%dT%H:%M:%S%:z")
                    .to_string()
            })
            .unwrap_or_default(),
    })
}

fn duration_label(minutes: u64) -> String {
    if minutes >= 1440 && minutes % 1440 == 0 {
        format!("{}天", minutes / 1440)
    } else if minutes >= 60 && minutes % 60 == 0 {
        format!("{}小时", minutes / 60)
    } else {
        format!("{minutes}分钟")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PARAMS: &str = r#"{
        "rateLimits": {
            "limitId": "codex",
            "limitName": null,
            "primary": { "usedPercent": 11, "windowDurationMins": 10080, "resetsAt": 1787624339 },
            "secondary": null,
            "credits": { "hasCredits": false, "unlimited": false, "balance": "0" },
            "planType": "plus"
        },
        "rateLimitsByLimitId": {
            "codex": {
                "primary": { "usedPercent": 11, "windowDurationMins": 10080, "resetsAt": 1787624339 },
                "secondary": null,
                "credits": { "hasCredits": false, "unlimited": false, "balance": "0" },
                "planType": "plus"
            }
        }
    }"#;

    #[test]
    fn parse_params_json_keeps_codex_plan_window_and_credits() {
        let result: Value = serde_json::from_str(PARAMS).unwrap();
        let quota = parse_rate_limits(&result, 1_787_624_000).unwrap();

        assert_eq!(quota.plan_type, "plus");
        assert_eq!(quota.windows.len(), 1);
        assert_eq!(quota.windows[0].key, "primary");
        assert_eq!(quota.windows[0].label, "7天");
        assert_eq!(quota.windows[0].used_pct, 11.0);
        assert_eq!(quota.windows[0].resets_in, 339);
        assert_eq!(quota.credits.as_ref().unwrap().balance, "0");
        assert!(!quota.credits.as_ref().unwrap().has_credits);
    }

    #[test]
    fn parse_rate_limits_accepts_unknown_plan_and_secondary_window() {
        let result = serde_json::json!({
            "rateLimits": {
                "planType": "enterprise-custom",
                "primary": { "usedPercent": 10, "windowDurationMins": 300, "resetsAt": 5000 },
                "secondary": { "usedPercent": 20.5, "windowDurationMins": 60, "resetsAt": 4000 },
                "credits": { "hasCredits": true, "unlimited": true, "balance": "42" }
            }
        });
        let quota = parse_rate_limits(&result, 4500).unwrap();

        assert_eq!(quota.plan_type, "enterprise-custom");
        assert_eq!(quota.windows.len(), 2);
        assert_eq!(quota.windows[0].label, "5小时");
        assert_eq!(quota.windows[1].label, "1小时");
        assert_eq!(quota.windows[0].resets_in, 500);
        assert_eq!(quota.windows[1].resets_in, 0);
        assert!(quota.credits.unwrap().unlimited);
    }

    #[test]
    fn parse_rate_limits_rejects_missing_primary() {
        let result = serde_json::json!({ "rateLimits": { "secondary": null } });
        assert!(parse_rate_limits(&result, 0).is_err());
    }
}
