//! 主窗口几何状态持久化：尺寸 / 位置 / 最大化。
//! 存便携目录 `data_root()/window-state.json`（与 config.json 同处）；全部用**逻辑坐标**（DPI 无关）。
//! 启动恢复 + 运行时 Moved/Resized 防抖保存 + 关闭/隐藏前同步落盘。
//! 桌面真机验证项：恢复后尺寸位置、隐藏→托盘唤回后几何保持、显示器移除后不落屏外。

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{LogicalPosition, LogicalSize, Manager, WebviewWindow};

use crate::config;

/// 主窗口几何状态（逻辑坐标）。
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct WindowState {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            width: 960.0,
            height: 560.0,
            maximized: false,
        }
    }
}

/// 逻辑像素合法性阈值：防损坏存档产生极端/非有限值。
const MIN_DIM: f64 = 1.0;
const MAX_DIM: f64 = 20000.0;

/// 主窗口几何存储（managed state）。
pub struct WindowStateStore {
    path: Option<PathBuf>,
    /// 防抖序列号：仅「最后一次排程」的保存任务落盘（尾沿防抖）。
    seq: AtomicU64,
    /// 最近一次成功捕获的状态；窗口最小化时回退，避免把最小化尺寸写入磁盘。
    last: Mutex<Option<WindowState>>,
}

impl WindowStateStore {
    pub fn new() -> Self {
        // 便携目录不可用时降级为内存态（保存静默跳过，不阻断应用）。
        let path = config::data_root()
            .map(|dir| dir.join("window-state.json"))
            .ok();
        Self {
            path,
            seq: AtomicU64::new(0),
            last: Mutex::new(None),
        }
    }

    /// 从磁盘读取上次几何；无文件 / 解析失败 / 非法值 → None。
    pub fn load(&self) -> Option<WindowState> {
        let path = self.path.as_ref()?;
        let raw = std::fs::read_to_string(path).ok()?;
        let state: WindowState = serde_json::from_str(&raw).ok()?;
        if is_valid(&state) {
            Some(state)
        } else {
            None
        }
    }

    /// 捕获窗口当前几何（物理 → 逻辑）；最小化时回退上次已知状态。
    fn capture(&self, window: &WebviewWindow) -> Option<WindowState> {
        if window.is_minimized().unwrap_or(false) {
            return *self.last.lock().unwrap();
        }
        let pos = window.outer_position().ok()?;
        let size = window.outer_size().ok()?;
        let sf = window.scale_factor().ok()?;
        if !sf.is_finite() || sf <= 0.0 {
            return None;
        }
        let state = WindowState {
            x: pos.x as f64 / sf,
            y: pos.y as f64 / sf,
            width: size.width as f64 / sf,
            height: size.height as f64 / sf,
            maximized: window.is_maximized().unwrap_or(false),
        };
        *self.last.lock().unwrap() = Some(state);
        Some(state)
    }

    /// 立即捕获并落盘（关闭 / 隐藏前调用，防抖未触发时不丢状态）。
    pub fn save_now(&self, window: &WebviewWindow) -> Result<(), String> {
        let Some(path) = &self.path else {
            return Ok(());
        };
        let Some(state) = self.capture(window) else {
            return Ok(());
        };
        write_state(path, &state)
    }

    /// 排程防抖保存：300ms 尾沿，期间多次 Moved/Resized 只落盘最后一次。
    pub fn schedule_save(&self, window: WebviewWindow) {
        let seq = self.seq.fetch_add(1, Ordering::SeqCst) + 1;
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            let app = window.app_handle();
            let store = app.state::<WindowStateStore>();
            if store.seq.load(Ordering::SeqCst) == seq {
                match store.save_now(&window) {
                    Ok(()) => log::info!("[win-state] 已保存窗口几何"),
                    Err(e) => log::warn!("[win-state] 保存窗口几何失败: {e}"),
                }
            }
        });
    }

    /// 启动恢复：尺寸 → 位置（屏外防护）→ 最大化。
    pub fn restore(&self, window: &WebviewWindow) -> Result<(), String> {
        let Some(state) = self.load() else {
            log::info!("[win-state] 无历史窗口几何，使用默认值");
            return Ok(());
        };
        window
            .set_size(LogicalSize::new(state.width, state.height))
            .map_err(|e| e.to_string())?;
        if state.maximized {
            window.maximize().map_err(|e| e.to_string())?;
        } else if self.visible_on_any_monitor(&state, window) {
            window
                .set_position(LogicalPosition::new(state.x, state.y))
                .map_err(|e| e.to_string())?;
        } else {
            log::warn!("[win-state] 保存的位置不在任何显示器内，跳过位置恢复（仅恢复尺寸）");
        }
        log::info!("[win-state] 已恢复主窗口几何 {state:?}");
        Ok(())
    }

    /// 保存的位置是否仍在任一显示器内（显示器移除后防窗口落在屏外不可见）。
    fn visible_on_any_monitor(&self, state: &WindowState, window: &WebviewWindow) -> bool {
        let Ok(sf) = window.scale_factor() else {
            return true; // 读不到缩放比例时保守放行（保持原位置）
        };
        let Ok(monitors) = window.available_monitors() else {
            return true;
        };
        if monitors.is_empty() {
            return true;
        }
        let logical_rects: Vec<(f64, f64, f64, f64)> = monitors
            .iter()
            .map(|m| {
                let pos = *m.position();
                let size = *m.size();
                (
                    pos.x as f64 / sf,
                    pos.y as f64 / sf,
                    size.width as f64 / sf,
                    size.height as f64 / sf,
                )
            })
            .collect();
        state_visible_on_monitors(state, &logical_rects)
    }
}

fn write_state(path: &PathBuf, state: &WindowState) -> Result<(), String> {
    let s = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    std::fs::write(path, s).map_err(|e| e.to_string())
}

/// 状态值合法性（有限 + 合理尺寸区间）。
fn is_valid(s: &WindowState) -> bool {
    s.width.is_finite()
        && s.height.is_finite()
        && s.x.is_finite()
        && s.y.is_finite()
        && s.width >= MIN_DIM
        && s.width <= MAX_DIM
        && s.height >= MIN_DIM
        && s.height <= MAX_DIM
}

/// 两矩形（逻辑坐标）是否相交（边缘相贴不算）。
fn rects_intersect(a: (f64, f64, f64, f64), b: (f64, f64, f64, f64)) -> bool {
    let (ax, ay, aw, ah) = a;
    let (bx, by, bw, bh) = b;
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

/// 状态窗口矩形是否与任一显示器矩形（逻辑坐标）相交（纯函数，可单测）。
fn state_visible_on_monitors(state: &WindowState, monitor_rects: &[(f64, f64, f64, f64)]) -> bool {
    let window_rect = (state.x, state.y, state.width, state.height);
    monitor_rects.iter().any(|m| rects_intersect(window_rect, *m))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serde_round_trip() {
        let state = WindowState {
            x: 120.5,
            y: 80.25,
            width: 960.0,
            height: 560.0,
            maximized: true,
        };
        let s = serde_json::to_string(&state).unwrap();
        let back: WindowState = serde_json::from_str(&s).unwrap();
        assert_eq!(state, back);
    }

    #[test]
    fn invalid_state_rejected() {
        // 损坏/极端值 → is_valid 拒绝
        assert!(!is_valid(&WindowState {
            width: -1.0,
            ..Default::default()
        }));
        assert!(!is_valid(&WindowState {
            width: f64::NAN,
            ..Default::default()
        }));
        assert!(!is_valid(&WindowState {
            height: 1.0e9,
            ..Default::default()
        }));
        assert!(!is_valid(&WindowState {
            x: f64::INFINITY,
            ..Default::default()
        }));
        assert!(is_valid(&WindowState::default()));
    }

    #[test]
    fn rects_intersect_cases() {
        // 相交
        assert!(rects_intersect((0.0, 0.0, 100.0, 100.0), (50.0, 50.0, 100.0, 100.0)));
        // 完全包含
        assert!(rects_intersect((0.0, 0.0, 100.0, 100.0), (10.0, 10.0, 20.0, 20.0)));
        // 相离
        assert!(!rects_intersect((0.0, 0.0, 100.0, 100.0), (200.0, 200.0, 100.0, 100.0)));
        // 边缘相贴不算相交
        assert!(!rects_intersect((0.0, 0.0, 100.0, 100.0), (100.0, 0.0, 100.0, 100.0)));
    }

    #[test]
    fn visible_on_some_monitor() {
        let monitors = [(0.0, 0.0, 1920.0, 1080.0)];
        // 屏内
        let on = WindowState {
            x: 100.0,
            y: 100.0,
            ..Default::default()
        };
        assert!(state_visible_on_monitors(&on, &monitors));
        // 完全屏外（负坐标越界）
        let off = WindowState {
            x: 5000.0,
            y: 5000.0,
            ..Default::default()
        };
        assert!(!state_visible_on_monitors(&off, &monitors));
        // 部分越界但仍有交集 → 可见（窗口标题栏区域大多在屏内即可恢复）
        let partial = WindowState {
            x: -50.0,
            y: -50.0,
            width: 400.0,
            height: 300.0,
            ..Default::default()
        };
        assert!(state_visible_on_monitors(&partial, &monitors));
    }

    #[test]
    fn multi_monitor_restore_target() {
        // 主屏 1920x1080 + 右侧扩展屏 2560x1440（x 偏移 1920）
        let monitors = [(0.0, 0.0, 1920.0, 1080.0), (1920.0, 0.0, 2560.0, 1440.0)];
        let on_second = WindowState {
            x: 2500.0,
            y: 400.0,
            ..Default::default()
        };
        assert!(state_visible_on_monitors(&on_second, &monitors));
        // 第二屏被拔掉后，同一位置落在主屏外
        let monitors_after = [(0.0, 0.0, 1920.0, 1080.0)];
        assert!(!state_visible_on_monitors(&on_second, &monitors_after));
    }
}
