# 应用壳 B4 收尾修复（悬浮窗尺寸贴合 + 主窗关闭行为）设计规格

- **日期**: 2026-08-08
- **前置**: B4（桌面真实化）已合并 main；`fix/b4-strip-open` 分支含悬浮窗打不开/遮罩/圆角/尺寸贴合/任务栏等历轮修复，仍待合并
- **来源**: 用户桌面真机报告两个残留问题 + 主窗关闭行为需可配置
- **目标**: ① 修复竖排悬浮窗底部被窗口裁掉 ② 修复主窗关闭卡死 bug，并把关闭行为做成可配置（退出应用 / 保留后台）

## 1. 项目当前状态与问题

应用壳为唯一产品形态。B4 已落地独立悬浮窗（`tauri.conf.json` 预注册隐藏 strip 窗口 + `getAllWindows→show`；`skipTaskbar:true`；`resizable:false`；strip X 隐藏）。当前 `fix/b4-strip-open` 分支上还有历轮修复未合并。

**用户桌面真机报告的两个残留问题**：

1. **竖排悬浮窗底部被裁**：竖排时 strip 内容（控制条等）底部被窗口裁掉。用户判断"被裁掉了"。上一轮已把竖排宽度改为 `width:max-content`（内容宽度），但**高度方向仍被裁**。
2. **主窗关闭卡死（严重）**：点主窗关闭按钮 → 悬浮窗关闭了，但**主窗口关不掉**；再次点击也关不掉；随后点悬浮球也唤不出悬浮窗（因 strip 窗口已被 `close()` 销毁）。

**主窗关闭行为决策（用户确认）**：加一个按钮/设置项，控制主窗关闭是**直接退出应用**还是**保留后台（保留内核进程，悬浮窗继续工作）**。

## 2. 核心铁律（延续既有，违反即失败）

- 测试仅在 Web 环境执行（Playwright/Vitest）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- 每任务 TDD、独立评审、修复循环（≤5 轮）、留痕入 `docs/superpowers/sdd/`；每任务结束全量回归绿。
- 视觉基线变化须先解码比对确认由本次改动引起。

## 3. 问题 1：竖排底部被裁 —— 尺寸贴合 DPI 修复

**根因（高置信假设）**：`strip-main.js` 的 `fit()` 用 `win.setSize({ width, height })`（**普通对象**）。`getBoundingClientRect()` 返回 **CSS（逻辑）像素**；但 Tauri 2 的 `setSize` 对普通 `{width,height}` 对象的 Logical/Physical 语义**不明确**。在 Windows 非 100% DPI（常见 125%/150%）下，若被当作**物理像素**，窗口会小于 CSS 内容 → 内容（尤其竖排更高的底部）被窗口裁掉。

**修复**：
- `fit()` 改用**显式 `LogicalSize`**：`new window.__TAURI__.window.LogicalSize(Math.ceil(r.width), Math.ceil(r.height))`，传入 `setSize`。CSS px 即逻辑 px，任何 DPI 下窗口 = 内容尺寸。
- **可测性**：把尺寸计算抽成纯函数 `computeFitSize(rect) => ({ width, height })`（`Math.max(1, Math.ceil(rect.width))` 等），vitest 可单测；`fit()` 只负责取 `getBoundingClientRect()` → 纯函数 → `new LogicalSize(...)`。
- 保留 `resizable: false`（防贴边吸附；Windows 下程序化 `SetWindowPos` 对非缩放窗口同样生效，不阻塞 setSize）。
- **诊断（先做，确认根因）**：fit 后 log `strip box`（getBoundingClientRect）、`win.outerSize()`、`win.scaleFactor()` 三者；若日志显示 size 已匹配但底部仍裁 → 转向 `resizable:false` 阻塞 setSize / 子像素 / overflow 等其它假设。

**改动文件**：
- `src/app/strip-main.js`（`fit()` 用 LogicalSize + 诊断 log）

## 4. 问题 2：主窗关闭 bug → 可配置关闭行为

**现状 bug 根因**：`app-main.js` 的 JS `onCloseRequested` handler 内异步 `getAllWindows()` → `strip.close()` 关闭 strip 窗口，在 Tauri 窗口关闭序列中不可靠 → 主窗关闭被卡住（strip 关了、主窗关不掉、strip 被销毁后悬浮球也唤不出）。

**修复（关闭逻辑移到 Rust，确定性；行为可配置）**：

**4.1 Rust 侧**（`src-tauri/src/lib.rs`）：
- `AppState { close_behavior: Mutex<String> }`，默认 `"exit"`。
- `#[tauri::command] fn set_close_behavior(state, behavior: String)` —— JS 配置变化时调用。
- `tauri::Builder::on_window_event`：
  ```rust
  use tauri::Manager;
  // setup: state.manage(AppState { close_behavior: Mutex::new("exit".into()) });
  // builder:
  .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
          if window.label() == "main" {
              let behavior = window.app_handle().state::<AppState>().close_behavior.lock().unwrap().clone();
              if behavior == "background" {
                  api.prevent_close();
                  let _ = window.hide();
              } else {
                  window.app_handle().exit(0); // 退出整个应用（含 strip）
              }
          }
      }
  })
  ```
  - `exit`：`exit(0)` 整个应用退出（含 strip 窗口），不依赖 JS 异步关窗。
  - `background`：`prevent_close()` + `hide()` —— 主窗隐藏、应用常驻、strip 继续工作。
- 注意：`window.app_handle()` 需 `use tauri::Manager;`；`AppState` 用 `app.manage(...)` 注册。

**4.2 JS 侧**：
- **移除** `app-main.js` 的 JS `onCloseRequested` 关 strip handler（当前 bug 根源）。
- 配置变化时同步到 Rust：`window.__TAURI__.core.invoke('set_close_behavior', { behavior })`。在 app-main 挂载时 + `subscribe` 配置变更时调用（仅 Tauri 环境；浏览器降级 no-op）。
- **strip 悬浮窗「恢复主窗」按钮**（`background` 模式下的出路）：`strip-main.js` 在 Tauri 分支给 `.c-strip__ctrl` 加一个「恢复主窗」按钮（icon 如 `layout`/`panel-top`），点击 `getAllWindows().find(w => w.label === 'main')` → `show()` + `setFocus()`。仅 Tauri 分支渲染（浏览器 strip 演示不加，零 e2e 冲击）。位置：控制条最前（rotate 之前）。

**4.3 配置与 UI**：
- `defaults.js` `DEFAULTS` 加 `closeBehavior: 'exit'`。
- 设置「通用」分区（`settings-pages.js` generalPage）加「关闭主窗口时」选择（`退出应用` / `保留后台`），经 `saveConfig({ closeBehavior })` 链路；选择器样式复用 `.csettings__modes` 三态按钮模式（两态）。

**4.4 生命周期说明**：
- `exit`：点主窗关闭 → Rust `exit(0)` → 全部退出（含 strip）。strip 的位置保存（onMoved 去抖）在退出瞬间可能丢最后 <200ms 移动，可接受。
- `background`：点主窗关闭 → 主窗隐藏，应用常驻；strip 可通过「恢复主窗」按钮唤回主窗。

**改动文件**：
- `src-tauri/src/lib.rs`（AppState + command + on_window_event）
- `src-tauri/capabilities/default.json`（若 invoke 自定义命令需权限；Tauri 2 应用自定义命令默认允许，如被拒则加 `core:event:allow-*`/命令权限）
- `src/app/app-main.js`（移除 onCloseRequested handler；配置→Rust 同步）
- `src/app/strip-main.js`（恢复主窗按钮 + 接线）
- `src/components/float-strip/float-strip.js`（`renderFloatStrip` 支持可选恢复主窗按钮 slot）
- `src/config/defaults.js`（`closeBehavior`）
- `src/scenes/settings-window/settings-pages.js`（通用分区选择器 + 接线）
- `src/components/float-strip/float-strip.css`（恢复主窗按钮样式，可选）
- `tests/`（见 §5）

## 5. 测试策略（仅 Web 环境）

| 改动 | 验证 |
|---|---|
| `fit()` LogicalSize + 诊断 | `computeFitSize` 纯函数单测（ceil/min-1/数值型）；桌面真机 log 确认 outerSize==strip box |
| Rust on_window_event / command | Rust 编译通过（`cargo check`）；无法 web 单测——补 capability/命令存在性守卫或文档化 |
| JS 配置→Rust 同步 | e2e mock `__TAURI__.core.invoke` 断言 `set_close_behavior` 被调用（挂载 + 配置变更） |
| 移除 onCloseRequested handler | 现有 app-shell 主窗关闭连带关 strip 的 e2e 断言**删除/改写**（该逻辑移入 Rust，web 测不到） |
| strip 恢复主窗按钮 | e2e mock `getAllWindows` 断言点击按钮 → main `show`+`setFocus`；浏览器 strip 演示零冲击 |
| 通用分区选择器 | e2e 断言选择器存在 + 切换写 store（`closeBehavior`） |

**桌面真机由用户目检**：① 竖排底部不再裁、圆角完整 ② 主窗关闭：`退出应用` → 全部退出；`保留后台` → 主窗隐藏、strip 常驻、恢复按钮唤回主窗。

## 6. 非目标

- 不做系统托盘图标（background 模式仅靠 strip 恢复主窗按钮）。
- 不改 strip 关闭语义（X 仍隐藏，仅主窗关闭行为可配置）。
- 不做多悬浮窗 / 悬浮窗独立常驻于主窗退出后（`exit` 模式主窗关=全退）。
- 不重做 B4 已完成的悬浮窗显示/遮罩/圆角/任务栏等（已在 `fix/b4-strip-open`，收尾时合并）。

## 7. 交接指引

- 本规格 + 实施计划由**下一轮对话**执行（当前对话产出规格与计划）。
- 起点：`fix/b4-strip-open` 分支（含历轮修复）或自 main 检出，按实施计划逐任务 SDD 执行。
- 每任务：TDD、独立评审、全量回归绿、留痕 `docs/superpowers/sdd/progress-b4-fix.md`；完成后最终评审 + 合并 main。
