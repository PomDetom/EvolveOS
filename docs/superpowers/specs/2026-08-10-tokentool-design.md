# tokenTool 应用接入设计规格

- **日期**: 2026-08-10
- **前置**: 应用壳已就绪（`src/apps/*` glob 自动发现 + MODULES 契约，`docs/app-integration.md`）；源应用 `C:\Repository\codeplan-usage`（TokenPlan Monitor，Tauri 2 Rust + 原生 HTML）
- **来源**: 用户请求「把 codeplan-usage 搬进 EvolveOS，只复用后端和前端展示内容、不复用前端样式，所有前端全部用当前项目 UI 组件，新 app 名 tokenTool」，经头脑风暴逐项澄清确认
- **目标**: ① 复用 Rust 后端（适配器/调度器/DPAPI 存储） ② 前端展示内容忠实复刻，样式全部走 EvolveOS UI 组件与令牌 ③ 桌面优先，浏览器优雅降级
- **仓库**: `C:\Repository\EvolveOS`（main + dev 双分支）

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 后端复用 | **移植 Rust 后端进 `src-tauri`**（适配器/调度器/配置/DPAPI 存储/5 命令），前端经 `window.__TAURI__.core.invoke` 调用 |
| 挂载机制 | **扩展壳加 `mod.mount?.(page, ctx)` 钩子**（`src/app/app-main.js`，框架改动走 ui/ 分支） |
| 浏览器模式 | **桌面优先**；浏览器（无 `__TAURI__`）渲染 `renderEmptyState`「需桌面端使用」，不做 JS 兜底抓取 |
| 配置迁移 | **全新开始**（空账户列表），不做独立版旧 config 迁移 |
| 图标 | **复用现有 `bolt`**（左窗纯图标，app 分支零框架改动） |
| app 结构 | `id: 'token-tool'`、`name: 'TokenTool'`、`order: 7`、`dir: []`（无目录单页，忠实原版） |
| git 分支 | **单条 `ui/tokentool` 分支**承载框架+应用全部改动（从 dev 检出），合并前全量回归 + 框架 owner 评审 |

## 2. 总体架构

```
src-tauri/src/          ← 移植 codeplan-usage Rust 后端（框架）
  models.rs crypto.rs config.rs state.rs scheduler.rs commands.rs
  adapters/{mod,common,deepseek,opencode}.rs
  lib.rs                ← 接线：manage(AppState) + 注册 5 命令 + 启动调度器
src/app/app-main.js     ← 加 mod.mount?.(page, ctx) 钩子（框架）
src/apps/token-tool/    ← 新应用（app 目录）
  index.js              ← module { id, name, icon, order, dir, render, mount }
  token-tool.js         ← 页面渲染 + 交互（Tauri commands）
  token-tool.css        ← 局部样式（令牌驱动，tt__* 类名）
tests/e2e/app-shell.spec.js        ← 模块计数 7→8 更新
tests/e2e/token-tool.spec.js       ← 新 e2e（浏览器空态 + 壳集成 + mock invoke 形态）
tests/unit/token-tool.test.js      ← 新单测（纯函数 + module 契约）
docs/                               ← 执行留痕
```

**数据流**：所有 HTTP 走 Rust 适配器（DeepSeek 余额 API / OpenCode Go 抓 `/go` SSR 正则解析三窗口）；前端只调 `get_config`/`save_config`/`refresh_all`/`get_balances`/`test_account`，收 `balances-updated` 事件订阅。密钥仅存 Rust `config.json`（exe 旁 + DPAPI 加密），**不进 localStorage**。

## 3. 后端移植（Rust）

从 codeplan-usage `src-tauri/src/` 移植，裁剪独立版专属部分：

| 模块 | 处理 |
|---|---|
| `models.rs` | 原样（Account/AccountKind/Balance/QuotaWindow/AppConfig + serde 单测） |
| `adapters/mod.rs` | 原样（`Adapter` trait） |
| `adapters/common.rs` | 原样（HttpClient/now/raw_trim/build_balance/error_balance/build_opencode_balance/quota_error + 单测） |
| `adapters/deepseek.rs` | 原样（`GET {base}/user/balance`，Bearer key，优先 CNY） |
| `adapters/opencode.rs` | 原样（`GET {base}/workspace/{ws}/go`，auth cookie，`GO_LIMITS` rolling/weekly/monthly = 12/30/60，正则解析 + 单测） |
| `crypto.rs` | 原样（Windows DPAPI + base64，非 Windows plain 降级 + 单测） |
| `config.rs` | 移植 `data_root()` + `ConfigStore`（load 解密 / save 加密 / `needs_migration` 明文→加密自动迁移 + 单测）；**去掉** `legacy_config_path`/`migrate_from_legacy` |
| `state.rs` | 原样（config + balances RwLock，`set_config` 清理已删账户余额缓存） |
| `scheduler.rs` | 原样（30s 轮询 + 按账户 `refresh_interval_secs.max(30)` 节流 + `refresh_all_now` + `test_one` + `get_adapter`） |
| `commands.rs` | 移植 `get_config`/`save_config`/`refresh_all`/`get_balances`/`test_account`；**去掉** `show_main`/`quit_app`（不做托盘，EvolveOS 自管窗口生命周期） |
| `lib.rs` | 既有 `set_close_behavior` + `on_window_event` 保留；新增 `manage(AppState::new())`、`invoke_handler` 注册 5 命令、`Scheduler::start`（3s 延迟首刷） |

**Cargo.toml** 新增依赖：`reqwest`（`blocking`+`json`+`rustls-tls`，default-features=false）、`tokio`、`chrono`、`uuid`(v4)、`thiserror`、`base64`、`regex`、`windows-sys`（Cryptography+Foundation）。tauri features 不加 tray。首编译拉取新 crate 属预期。

**存储**：`config.json` 落 EvolveOS.exe 旁（便携式 `data_root()`），DPAPI 加密密钥；全新空账户。

## 4. 壳挂载钩子（框架改动）

`src/app/app-main.js` 扩展 MODULES 契约（render 之外新增可选 `mount`）：

- `renderPages()`（桌面）：`page.innerHTML = mod.render(modCtx(mod))` 之后调 `mod.mount?.(page, modCtx(mod))`。
- `renderStack()`（手机 detail 路径）：innerHTML 设置后，对栈顶 `type === 'detail'` 项调 `mod.mount?.(bodyEl, ctx)`（查 `.app-main__stack-body`）。
- 占位 app 无 `mount` → no-op，零影响。

**已知限制**（设计确认接受）：`dir: []` 的 app 在手机 dock 不可达（`handleDockTap` 对 `!dir.length` resetStack），概览页快捷卡手机上点击无反应。因 tokenTool 依赖 Tauri 桌面后端，手机不可达可接受，记入文档。备选（未选）：给单目录项使手机可达，代价是标题栏变「TokenTool › 账户」。

## 5. tokenTool 前端（app/token-tool/）

### 5.1 module 契约

```js
export const module = {
  id: 'token-tool', name: 'TokenTool', icon: 'bolt', order: 7, dir: [],
  render: (ctx) => tokenToolPage(ctx),
  mount: (pageEl, ctx) => mountTokenTool(pageEl, ctx),
};
```

### 5.2 页面结构

骨架遵守 `app-integration.md` §5.1（page-head + page-body，`data-layout="center"`）：

- `page-head`：标题 **TokenTool**。
- `page-body`：
  - **工具栏**：`立即刷新`（`renderButton` primary + refresh 图标）、`添加账户`（secondary + plus）。
  - **账户卡片网格**（每账户一卡，类 `app-main__card` 风格 + 局部 `tt__*`）：
    - 卡头：名称 + kind 徽标（`renderBadge`：DeepSeek / OpenCode Go）+ 上次刷新相对时间（30s 定时器刷新）。
    - 操作：`测试` / `编辑` / `删除`（`renderButton` small：secondary / secondary / danger）。
    - 错误态：`bal.error` 时 danger 提示行。
    - DeepSeek：余额大数字 + 货币（`renderProgress` 不适用，直接数值）；低于 `warnThreshold` 标警示色。
    - OpenCode Go：三窗口行——label + `已用% · 剩余 $x / $y` + `renderProgress`（按百分比 accent/warning/danger）+ 重置倒计时（`formatReset`）。
  - **空账户**：`renderEmptyState`「暂无账户」+ 添加按钮。
  - **浏览器模式**：无 `__TAURI__` → `renderEmptyState`「需桌面端使用」。

### 5.3 添加/编辑表单

- `dialog`（`openDialog`）承载表单，字段用 `input`/`select`/`button` 组件：
  - 名称（text）、类型（select：deepseek / opencode_go）。
  - kind 联动显隐：deepseek → 接口地址 / API Key（password）；opencode_go → Workspace ID / Auth Cookie（password）。
  - 刷新间隔秒（number，min 30）。
  - 保存（primary）→ `save_config`；取消。
- 编辑 = 预填表单；删除 = `save_config`（过滤列表）；测试 = `test_account`（不保存，更新卡片）。

### 5.4 交互（mount 函数）

- 探 `window.__TAURI__`：浏览器 → 渲染空状态，结束。
- 桌面 → `invoke('get_config')` + `invoke('get_balances')`（冷启动快照，防错过 3s 延迟首刷事件）→ 渲染；`listen('balances-updated')` 订阅更新；30s 相对时间定时器；按钮事件委托。
- 每次壳重渲染（左右窗切换）会重新 `render` + `mount`，mount 做完整重载（config/balances 可模块级缓存减少闪烁）。

### 5.5 安全

- 账户名 / 错误信息等用户数据**禁止 innerHTML 直接插值**，一律 `escapeHtml` 后插值或 `textContent`（沿用源应用铁律）。
- 密钥只经 Rust 存 DPAPI 加密 `config.json`，前端内存态明文、不落 localStorage。

### 5.6 样式

- `token-tool.css` 全走令牌（`--glass-bg`/`--glass-border`/`--space-*`/`--radius-*`（必配 `--radius-scale`）/`--text-*`/`--accent-*`/`--danger-*`），禁止硬编码值。
- 局部类名 `tt__*`（避免与全页计数断言冲突，见 app-integration §5.6）。
- 动画只 transform/opacity，模糊永不动画；paint-only 豁免照 `docs/CLAUDE.md`。

## 6. 测试与验证

| 层 | 内容 |
|---|---|
| Rust | 移植源仓库全部适配器/config/crypto/models 单测；`cargo test` + `cargo check` |
| 单测（Vitest） | `token-tool.test.js`：`formatReset`/`formatRelative`/`escapeHtml`/账户卡渲染（给定 config+balances 纯函数）+ module 契约（id/name/icon/order/dir/render/mount 存在） |
| e2e（Playwright） | `app-shell.spec.js` 模块计数 7→8（左窗项 + 概览快捷卡）；新增 `token-tool.spec.js`：浏览器空状态、左窗第 8 项出现、快捷卡跳转；注入 `__TAURI__` mock 验证 invoke 调用形态（真实命令流需桌面真机，标注面诊/真机验证） |
| 提交前 | `npm run build` + `cargo check` |

Tauri 特有路径（真实窗口/IPC/DPAPI）按 `src/CLAUDE.md` 规则：mock e2e 只验证 JS 调用形态，桌面可用性由用户桌面真机验证，不做 webview 内验证。

## 7. 治理与分支

- 单条 `ui/tokentool` 分支（从 dev 检出），`check:boundary` 判定为 ui/ 框架改动（须全量回归 + 框架 owner 评审）。
- 合并流程：全量回归（`npm test` + `npm run test:e2e` + `npm run build` + `cargo check` + `cargo test`）→ 合并 main → 删分支。
- 框架改动点：`src-tauri/**`（后端）、`src/app/app-main.js`（mount 钩子）；应用改动点：`src/apps/token-tool/**`；测试：`tests/unit|e2e`；文档：`docs/`。

## 8. 范围外（YAGNI）

- 系统托盘（tray.rs 及其 show_main/quit_app）——app 内有「立即刷新」，调度器常驻轮询即可。
- 独立版旧 config 迁移 / `%APPDATA%` 遗留清理。
- 浏览器模式抓取兜底（CORS/安全不可行）。
- 新增专用图标（复用 bolt，后续如需 activity/gauge 走独立 ui/ 分支）。
