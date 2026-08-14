# 进度：系统托盘 + 主窗口几何记忆

- **任务**: ① 桌面右下角系统托盘图标（后台隐藏后可唤回主窗 / 退出）② 主窗口尺寸/位置/最大化跨启动记忆
- **分支**: `ui/tray-window-state`（从 dev 检出，共享 checkout，无 worktree）
- **提交**: `8ecef39` — `feat: 系统托盘唤回主窗 + 主窗口尺寸/位置跨启动记忆`；`b7a3896` — 进度账本记录
- **状态**: **已合入 dev**（`4297c1b` merge: 系统托盘唤回主窗 + 主窗几何记忆 合入 dev；基线同步 `e4bd18f` 无冲突；合并后 `cargo check` 通过）

## 设计决策

- **托盘**：`tauri` 加 `tray-icon` feature；`setup_tray()` 复用应用图标，菜单「打开主窗口 / 退出」；
  左键单击/双击唤回主窗（`show + unminimize + focus`）。`closeBehavior=background` 时主窗隐藏、
  strip 悬浮窗 `skipTaskbar`，托盘是唯一 OS 级唤回入口。
- **几何记忆**：新增 `src-tauri/src/window_state.rs`，**自实现**（不引入 `tauri-plugin-window-state`）——
  契合项目便携式零依赖惯例（strip 位置已走 localStorage，避免插件重复管理）。
  - 存储：`data_root()/window-state.json`（与 config.json 同处便携目录），逻辑坐标（DPI 无关）+ 最大化态。
  - 保存：`on_window_event` 的 `Moved`/`Resized`（仅 label=main）→ 300ms 尾沿防抖（seq 序号，只落盘最后一次）；
    `CloseRequested` 前同步 `save_now`（防抖未触发不丢）。
  - 恢复：`setup` 中 `restore()` 尺寸 → 位置（**屏外防护**：保存位置须与任一显示器矩形相交，否则跳过位置仅恢复尺寸）→ 最大化。
  - 边界：损坏/极端值拒绝（`is_valid` 有限性 + [1, 20000] 区间）；最小化时回退上次已知状态（防写入最小化尺寸）。

## 改动文件

- `src-tauri/Cargo.toml`：`tauri` 加 `features = ["tray-icon"]`（tray 模块由该 feature 门控）。
- `src-tauri/src/lib.rs`：`manage(WindowStateStore)`；setup 恢复几何 + `setup_tray`；事件处理 Moved/Resized 防抖保存 + 关闭前落盘。
- `src-tauri/src/window_state.rs`：新增模块（结构 + 纯函数 + 5 个单测）。

## 验证

- `cargo test`：61 通过（含新增 5 个 window_state 测试：serde 往返 / 非法值拒绝 / 矩形相交 / 屏外判定 / 多显示器）。
- `cargo build`：零警告；`cargo clippy`：新文件零警告（既有 crypto/pwm/config 5 条与本次无关）。
- `npm run build`：通过（web 无改动，仅门禁）。

## 需桌面真机验证（Tauri 特有路径）

- 托盘图标出现于右下角；左键单击/双击唤回隐藏的主窗；右键菜单「打开主窗口 / 退出」生效。
- 关闭（background）后仅剩托盘，点托盘可重新打开主窗。
- 调整窗口大小/位置 → 退出 → 重启，尺寸位置恢复；最大化态恢复。
- 拔掉副屏后重启：窗口不落在屏外（跳过位置恢复）。
