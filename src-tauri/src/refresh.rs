// tokenTool 动态刷新状态机（纯逻辑，可单测）：
// 初次 30s；连续 3 次无变化 → +30s（上限 5min）；任何变动（增/减）→ 重置 30s；错误 → 5s 快速重试。
use crate::models::{AccountKind, Balance};

pub const INITIAL_SECS: u64 = 30;
pub const ERROR_RETRY_SECS: u64 = 5;
pub const MAX_SECS: u64 = 300;
pub const STEP_SECS: u64 = 30;
pub const NO_CHANGE_STEPS: u8 = 3;

const EPS: f64 = 1e-6;

/// 可比签名：DeepSeek 比余额；OpenCode 比三窗口已用量（key,used 按 key 排序，
/// 忽略 resets_in/resets_at——剩余秒数每秒递减，纳入会比较会让间隔永远钉在 30s）。
#[derive(Debug, Clone, PartialEq)]
pub enum BalanceSig {
    Deepseek(Option<f64>),
    Opencode(Vec<(String, f64)>),
}

pub fn signature(b: &Balance) -> BalanceSig {
    match b.kind {
        AccountKind::Deepseek => BalanceSig::Deepseek(b.balance),
        AccountKind::OpencodeGo => {
            let mut v: Vec<(String, f64)> = b
                .windows
                .iter()
                .flatten()
                .map(|w| (w.key.clone(), w.used))
                .collect();
            v.sort_by(|a, b| a.0.cmp(&b.0));
            BalanceSig::Opencode(v)
        }
    }
}

fn opt_f64_changed(a: Option<f64>, b: Option<f64>) -> bool {
    match (a, b) {
        (None, None) => false,
        (Some(x), Some(y)) => (x - y).abs() > EPS,
        _ => true, // 从无值到有值 / 有值到无值
    }
}

fn windows_used_changed(a: &[(String, f64)], b: &[(String, f64)]) -> bool {
    if a.len() != b.len() {
        return true;
    }
    for (x, y) in a.iter().zip(b.iter()) {
        if x.0 != y.0 || (x.1 - y.1).abs() > EPS {
            return true;
        }
    }
    false
}

fn sig_changed(a: &BalanceSig, b: &BalanceSig) -> bool {
    match (a, b) {
        (BalanceSig::Deepseek(x), BalanceSig::Deepseek(y)) => opt_f64_changed(*x, *y),
        (BalanceSig::Opencode(x), BalanceSig::Opencode(y)) => windows_used_changed(x, y),
        _ => true, // 账户类型改变也视为变化
    }
}

/// 每账户动态刷新状态：当前间隔 + 连续无变化计数 + 上次成功基线签名。
#[derive(Debug, Clone, PartialEq)]
pub struct RefreshState {
    pub interval_secs: u64,
    pub no_change_count: u8,
    last_good: Option<BalanceSig>,
}

impl Default for RefreshState {
    fn default() -> Self {
        Self {
            interval_secs: INITIAL_SECS,
            no_change_count: 0,
            last_good: None,
        }
    }
}

impl RefreshState {
    /// 记录一次刷新结果并推进状态机，返回下一轮刷新间隔（秒）。
    pub fn record(&mut self, result: &Balance) -> u64 {
        let new_sig = signature(result);
        if !result.ok {
            // 错误：5s 快速重试；保留上次成功基线（恢复后对比基线判定变化/无变化）
            self.interval_secs = ERROR_RETRY_SECS;
            self.no_change_count = 0;
            return self.interval_secs;
        }
        match &self.last_good {
            None => {
                // 首次成功：确立基线，保持 30s
                self.interval_secs = INITIAL_SECS;
                self.no_change_count = 0;
                self.last_good = Some(new_sig);
            }
            Some(last) if sig_changed(last, &new_sig) => {
                // 变动（增/减）：重置 30s
                self.interval_secs = INITIAL_SECS;
                self.no_change_count = 0;
                self.last_good = Some(new_sig);
            }
            Some(_) => {
                // 无变化：累计计数，每满 3 次 +30s（上限 5min）
                self.no_change_count += 1;
                self.interval_secs = self.interval_secs.max(INITIAL_SECS); // 错误 5s 恢复后回到 30 基线
                if self.no_change_count >= NO_CHANGE_STEPS {
                    self.no_change_count = 0;
                    self.interval_secs = (self.interval_secs + STEP_SECS).min(MAX_SECS);
                }
                self.last_good = Some(new_sig);
            }
        }
        self.interval_secs
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::QuotaWindow;

    fn ds(balance: Option<f64>, ok: bool) -> Balance {
        Balance {
            account_id: "a1".into(),
            account_name: "t".into(),
            kind: AccountKind::Deepseek,
            balance,
            used: None,
            total: None,
            currency: None,
            windows: None,
            ok,
            error: if ok { None } else { Some("err".into()) },
            raw: None,
            last_updated: 0,
        }
    }

    fn oc(windows: Vec<(String, f64)>, ok: bool) -> Balance {
        Balance {
            account_id: "a1".into(),
            account_name: "t".into(),
            kind: AccountKind::OpencodeGo,
            balance: None,
            used: None,
            total: None,
            currency: None,
            windows: Some(
                windows
                    .into_iter()
                    .map(|(key, used)| QuotaWindow {
                        key,
                        label: String::new(),
                        limit: 1.0,
                        used,
                        used_pct: used,
                        resets_in: 999,
                        resets_at: String::new(),
                    })
                    .collect(),
            ),
            ok,
            error: if ok { None } else { Some("err".into()) },
            raw: None,
            last_updated: 0,
        }
    }

    fn state(interval: u64, count: u8, last: Option<BalanceSig>) -> RefreshState {
        RefreshState {
            interval_secs: interval,
            no_change_count: count,
            last_good: last,
        }
    }

    #[test]
    fn default_is_initial_30s() {
        assert_eq!(RefreshState::default().interval_secs, INITIAL_SECS);
        assert_eq!(RefreshState::default().no_change_count, 0);
    }

    #[test]
    fn error_sets_5s_retry_and_clears_counter() {
        let mut s = state(120, 2, Some(BalanceSig::Deepseek(Some(10.0))));
        let next = s.record(&ds(None, false));
        assert_eq!(next, ERROR_RETRY_SECS);
        assert_eq!(s.no_change_count, 0);
        // 基线保留：错误不覆盖 last_good
        assert_eq!(s.last_good, Some(BalanceSig::Deepseek(Some(10.0))));
    }

    #[test]
    fn first_success_establishes_baseline_at_30s() {
        let mut s = RefreshState::default();
        let next = s.record(&ds(Some(88.0), true));
        assert_eq!(next, INITIAL_SECS);
        assert_eq!(s.no_change_count, 0);
        assert_eq!(s.last_good, Some(BalanceSig::Deepseek(Some(88.0))));
    }

    #[test]
    fn changed_resets_to_30s() {
        let mut s = state(180, 2, Some(BalanceSig::Deepseek(Some(88.0))));
        let next = s.record(&ds(Some(120.0), true)); // 增长
        assert_eq!(next, INITIAL_SECS);
        assert_eq!(s.no_change_count, 0);
        assert_eq!(s.last_good, Some(BalanceSig::Deepseek(Some(120.0))));
    }

    #[test]
    fn decrease_also_counts_as_change() {
        let mut s = state(90, 1, Some(BalanceSig::Deepseek(Some(88.0))));
        let next = s.record(&ds(Some(70.0), true)); // 减少也是变动
        assert_eq!(next, INITIAL_SECS);
        assert_eq!(s.no_change_count, 0);
    }

    #[test]
    fn three_no_change_steps_to_plus_30s() {
        let mut s = state(30, 0, Some(BalanceSig::Deepseek(Some(88.0))));
        assert_eq!(s.record(&ds(Some(88.0), true)), 30); // 第1次无变化
        assert_eq!(s.interval_secs, 30);
        assert_eq!(s.no_change_count, 1);
        assert_eq!(s.record(&ds(Some(88.0), true)), 30); // 第2次
        assert_eq!(s.no_change_count, 2);
        assert_eq!(s.record(&ds(Some(88.0), true)), 60); // 第3次 → +30s
        assert_eq!(s.no_change_count, 0);
    }

    #[test]
    fn steps_progress_each_three_unchanged() {
        let mut s = state(60, 0, Some(BalanceSig::Deepseek(Some(88.0))));
        s.record(&ds(Some(88.0), true));
        s.record(&ds(Some(88.0), true));
        assert_eq!(s.record(&ds(Some(88.0), true)), 90);
    }

    #[test]
    fn caps_at_5min() {
        let mut s = state(300, 0, Some(BalanceSig::Deepseek(Some(88.0))));
        s.record(&ds(Some(88.0), true));
        s.record(&ds(Some(88.0), true));
        assert_eq!(s.record(&ds(Some(88.0), true)), 300); // 300+30 → 封顶 300
        assert_eq!(s.interval_secs, MAX_SECS);
    }

    #[test]
    fn error_keeps_baseline_and_recovery_returns_to_30_ladder() {
        let mut s = state(60, 0, Some(BalanceSig::Deepseek(Some(88.0))));
        s.record(&ds(None, false));
        assert_eq!(s.interval_secs, ERROR_RETRY_SECS);
        // 恢复且值同基线 → 无变化 #1，间隔回到 30 基线（避免 5→35 跳变）
        let next = s.record(&ds(Some(88.0), true));
        assert_eq!(next, INITIAL_SECS);
        assert_eq!(s.no_change_count, 1);
        assert_eq!(s.last_good, Some(BalanceSig::Deepseek(Some(88.0))));
    }

    #[test]
    fn deepseek_epsilon_ignores_tiny_drift() {
        let mut s = state(60, 0, Some(BalanceSig::Deepseek(Some(88.0))));
        let next = s.record(&ds(Some(88.0000001), true)); // 差远小于 ε → 无变化
        assert_eq!(next, 60);
        assert_eq!(s.no_change_count, 1);
    }

    #[test]
    fn opencode_signature_is_order_independent_and_ignores_resets() {
        let a = oc(vec![("weekly".into(), 5.0), ("rolling".into(), 3.0)], true);
        let b = oc(vec![("rolling".into(), 3.0), ("weekly".into(), 5.0)], true);
        assert_eq!(signature(&a), signature(&b));
        let mut s = state(30, 0, Some(signature(&a)));
        assert_eq!(s.record(&b), 30); // 顺序不同但 used 相同 → 无变化
        assert_eq!(s.no_change_count, 1);
    }

    #[test]
    fn opencode_used_change_detected() {
        let a = oc(vec![("rolling".into(), 3.0)], true);
        let b = oc(vec![("rolling".into(), 3.5)], true);
        let mut s = state(90, 0, Some(signature(&a)));
        assert_eq!(s.record(&b), INITIAL_SECS);
        assert_eq!(s.no_change_count, 0);
    }

    #[test]
    fn kind_mismatch_counts_as_change() {
        let mut s = state(60, 0, Some(BalanceSig::Deepseek(Some(88.0))));
        let next = s.record(&oc(vec![("rolling".into(), 1.0)], true));
        assert_eq!(next, INITIAL_SECS);
        assert_eq!(s.no_change_count, 0);
    }
}