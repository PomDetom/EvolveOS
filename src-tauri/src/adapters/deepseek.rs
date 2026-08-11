use super::Adapter;
use super::common::{HttpClient, build_balance, error_balance, raw_trim};
use crate::models::{Account, Balance};

/// DeepSeek 官方余额接口
/// GET {base_url}/user/balance
/// Authorization: Bearer <api_key>
/// 响应: { "is_available": true, "balance_infos": [{ "currency": "CNY", "total_balance": "110.00", "granted_balance": "10.00", "topped_up_balance": "100.00" }] }
pub struct DeepseekAdapter;

impl DeepseekAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl Adapter for DeepseekAdapter {
    fn fetch(&self, account: &Account) -> Result<Balance, String> {
        let json = match HttpClient::get_json(&account.base_url, "user/balance", &account.api_key)
        {
            Ok(j) => j,
            Err(e) => return Ok(error_balance(account, e)),
        };
        let raw = raw_trim(&json.to_string());

        // 优先取人民币, 没有则取第一个
        let infos = json
            .pointer("/balance_infos")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let info = infos
            .iter()
            .find(|i| i.get("currency").and_then(|c| c.as_str()) == Some("CNY"))
            .or_else(|| infos.first());

        let (balance, currency) = match info {
            Some(i) => {
                let bal = i
                    .get("total_balance")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse::<f64>().ok());
                let cur = i
                    .get("currency")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                (bal, cur)
            }
            None => (None, None),
        };

        Ok(build_balance(account, balance, None, None, currency, raw))
    }
}
