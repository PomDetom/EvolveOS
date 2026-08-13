# 密码管理器应用接入设计规格

- **日期**: 2026-08-13
- **前置**: 应用壳已就绪（`src/apps/*` glob 自动发现 + MODULES 契约 + `mod.mount` 挂载钩子，见 `docs/integration/app-integration.md`）；`src/apps/key/` 现有「密码」占位应用（id `key` / order 1 / icon `key` / dir 全部·分组·回收站）。源应用 `C:\Repository\password-management`（pwm-app，Tauri 2 Rust + `pwm-core` 纯 Rust 密码学库 + 静态测试页）。
- **来源**: 用户请求「开始做密码应用，后端已有实现可复用 `C:\Repository\password-management`，前端按项目 UI 规范制作」，经头脑风暴逐项澄清确认。用户选定：password-management 已停止维护，本项目继续完善（后端源码复制进 EvolveOS）。
- **目标**: ① 复用 `pwm-core` 密码学后端（Argon2id KDF + AES-256-GCM、Vault CRUD/搜索/标签、密码生成器、明文 JSON 导入导出） ② 前端全部走 EvolveOS UI 组件与令牌，升级 `key` 占位为真实密码管理器 ③ 桌面优先，浏览器优雅降级。
- **仓库**: `C:\Repository\EvolveOS`（dev 为开发分支，main 发版合并点）

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 后端复用 | **复制 `pwm-core` 源码进 `src-tauri/src/pwm/`**（password-management 已停止维护，EvolveOS 继续完善；保留全部单测）。前端经 `window.__TAURI__.core.invoke` 调 13 命令 |
| 保险库路径 | **预填应用数据目录默认路径**：新增 `default_vault_path` 命令返回 `app_data_dir()/vault.json`，创建/解锁表单预填可编辑；另 localStorage 记上次路径（**绝不存主密码**） |
| v1 功能 | 核心（解锁/创建/锁定、条目增删改查 + 搜索 + 标签筛选、编辑器内嵌密码生成、复制/显示密码）+ 导出 / 导入 / 记住上次路径 |
| 右窗目录 | **全部（box）/ 数据管理（folder）/ 设置（settings）** 三个**功能独立**目录；搜索/标签筛选/排序全部并入「全部」内部（不设筛选型目录） |
| 密码生成 | **编辑器内嵌生成**，不做独立生成器面板 |
| 挂载机制 | 复用现有 `mod.mount` 钩子（token-tool 已加），**零框架改动**（不碰 app-main.js） |
| app 结构 | 升级现有 `key` 占位：`id: 'key'`、`name: '密码'`、`icon: 'key'`、`order: 1`；`dir` 改为三功能目录 |
| 浏览器模式 | **桌面优先**；浏览器（无 `__TAURI__`）渲染 `renderEmptyState`「需桌面端使用」，不做 JS 兜底 |
| git 分支 | **两条并行**：`chore/pwm-backend`（src-tauri 移植）+ `app/key/password-manager`（前端+测试+文档），各自 `check:boundary` 后 `--no-ff` 合并 dev |

## 2. 总体架构

```
src-tauri/src/              ← 后端移植（chore/pwm-backend 分支）
  pwm/                      ← 复制 pwm-core 源码（lib/models/crypto/vault/generator/error）
  pwm_state.rs              ← PwmState { session: Mutex<Option<PwmSession>> } + PwmSession { vault_path, vault, key }
  pwm_commands.rs           ← 13 命令（含 default_vault_path / current_vault_path）
  lib.rs                    ← mod pwm / pwm_state / pwm_commands + manage(PwmState) + 注册 13 命令
src/apps/key/               ← 前端应用（app/key/password-manager 分支）
  index.js                  ← module { id:'key', name:'密码', icon:'key', order:1, dir: 全部/数据管理/设置, render, mount }
  key.js                    ← 页面渲染 + 交互（锁定屏 / 三目录页 / 条目编辑器对话框）
  key-utils.js              ← 纯函数（过滤/分组/相对时间/转义/默认路径记忆）
  key.css                   ← 局部样式（key__* 类名，令牌驱动）
tests/unit/key.test.js      ← 单测（纯函数 + 页面渲染 + module 契约）
tests/e2e/key-password.spec.js  ← e2e（浏览器空态 + mock __TAURI__ 全链路）
tests/e2e/app-shell.spec.js     ← 更新 key 占位断言（功能开发中 → 需桌面端使用；目录 全部/分组/回收站 → 全部/数据管理/设置）
docs/                       ← 本规格 + 实施计划 + 执行留痕账本
```

**数据流**：密码学全在 Rust（Argon2id KDF + AES-256-GCM，主密码只经命令参数，派生密钥 `zeroize` 清零，会话存内存）。前端只 invoke 13 命令，不碰加密细节；浏览器态零密码数据。

## 3. 后端移植（Rust，chore/pwm-backend 分支）

### 3.1 pwm 模块（复制 pwm-core）

| 源文件（`C:\Repository\password-management\core\src\`） | 处理 |
|---|---|
| `lib.rs` | 改写为 EvolveOS 子模块声明 + re-export（`Entry/EntryInput/Vault/SessionKey/Result/Error`），内部 `crate::` 引用改 `crate::pwm::` |
| `models.rs` | 原样（Entry/Vault/EntryInput/DiskFile/DiskKdf/DiskCipher + serde 单测） |
| `crypto.rs` | 原样（argon2id KDF + AES-256-GCM + `random_salt` + 磁盘加解密 + 单测） |
| `vault.rs` | 原样（`create_vault_file` 用 `create_new(true)` **拒绝覆盖** / `open_vault_file` 区分 Io·IncorrectPassword·InvalidVaultFile / CRUD / `list_entries(query,tags)` / 导入导出 + `SessionKey` zeroize + 单测） |
| `generator.rs` | 原样（`GeneratorOptions` 默认 16 位全字符集 + `generate_password` + 单测） |
| `error.rs` | 原样（thiserror `Error` + `Result`） |

内部引用改写：`use crate::crypto::…` → `use crate::pwm::crypto::…`（`mod.rs` 用 `pub mod crypto;` 等子模块）。

### 3.2 命令层（pwm_commands.rs）

12 命令（参数 Rust snake_case，Tauri 2 自动转 camelCase 供 JS invoke）：

| 命令 | 参数（JS 侧 camelCase） | 返回 |
|---|---|---|
| `create_vault` | `path, masterPassword` | `()`；文件已存在 → 报错提示去解锁 |
| `unlock_vault` | `path, masterPassword` | `()`；错误区分 密码错/文件不存在/非法文件 |
| `lock_vault` | — | `()`，清会话 |
| `list_entries` | `query?, tags?` | `Vec<Entry>` |
| `get_entry` | `id` | `Entry` |
| `create_entry` | `name, url?, username, password, notes?, tags?` | `Entry`（入参非空校验 + 落盘） |
| `update_entry` | `id, name, url?, username, password, notes?, tags?` | `Entry`（落盘） |
| `delete_entry` | `id` | `()`（落盘） |
| `generate_password` | `length?, useLower?, useUpper?, useDigits?, useSymbols?, excludeAmbiguous?` | `String` |
| `export_vault` | `path` | `()`（明文 JSON 数组） |
| `import_vault` | `path` | `usize`（合并条数，原子校验空名） |
| `default_vault_path` | — | `String`（`app.path().app_data_dir()/vault.json`，`use tauri::Manager`） |
| `current_vault_path` | — | `String`（当前会话保险库路径；锁定时报「vault locked」） |

- 会话：`PwmState` 独立 `.manage()`，**不动** token-tool 的 `AppState`；`with_session` 守卫「vault locked」错误 → 前端据此显示锁定屏。
- 每次写操作（create/update/delete/import）后 `save_vault_file` 落盘（沿用 pwm-core 既有命令层逻辑）。
- 自定义命令无需能力授权（与 token-tool 一致）。
- Cargo.toml 新增：`argon2 0.5`、`aes-gcm 0.10`、`rand 0.8`、`zeroize 1`、`thiserror 2`、`base64 0.22`（`uuid`/`serde`/`serde_json` 已有）。

## 4. 前端应用（src/apps/key/，app/key/password-manager 分支）

### 4.1 module 契约

```js
export const module = {
  id: 'key', name: '密码', icon: 'key', order: 1,
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'data', name: '数据管理', icon: 'folder' },
    { id: 'settings', name: '设置', icon: 'settings' },
  ],
  render: (ctx) => keyPage(ctx),
  mount: (pageEl, ctx) => mountKey(pageEl, ctx),
};
```

### 4.2 状态机（mount 闭包，WeakMap dispose + 逐次重挂，仿 token-tool）

- **浏览器**（无 `__TAURI__`）→ `renderEmptyState`「需桌面端使用」。
- **桌面 + 锁定**（会话无 / `list_entries` 抛「vault locked」）→ 锁定屏：
  - 路径输入（预填顺序：localStorage `pwm.vaultPath` → `invoke('default_vault_path')` 结果）
  - 主密码输入（type password）
  - 模式切换：「解锁现有 | 创建新保险库」（radio/switch）
  - 提交：解锁 `invoke('unlock_vault',{path,masterPassword})` / 创建 `invoke('create_vault',…)`；错误 → `toast` danger（创建遇文件已存在 → 明确提示去解锁）；成功 → 记路径 localStorage → 重渲染为已解锁当前目录页
- **桌面 + 已解锁** → 按 `ctx.dirId` 渲染三目录页：
  - **全部**：工具栏（`search-bar` 搜索 + 标签 chips 筛选 + 「添加」primary + 「锁定」secondary）+ 条目列表。
  - **数据管理**：导出卡片（路径输入 + 「导出备份」）、导入卡片（路径输入 + 「导入恢复」）、保险库信息卡（路径 / 条目数）。
  - **设置**：记住上次路径开关（`switch`）、「清除记住的路径」按钮、应用说明（密码管理器仅桌面可用、安全说明）。
- **锁定屏对三目录**：锁定态任何目录都渲染锁定屏（解锁后回到当前目录页）。

### 4.3 关键交互（全部目录页）

- **条目列表行**：名称 / 用户名 / URL + 标签 badge；hover 操作：复制用户名 / 复制密码 / 显示切换（eye，默认掩码 `••••`）/ 编辑 / 删除（danger，确认后 `invoke('delete_entry')`）。
- **搜索 + 标签筛选**：客户端过滤（解锁时 `list_entries` 取全量一次，搜索/标签/排序在内存做，即时响应；后端 `list_entries(query,tags)` 仍可用但 UI 走客户端）。
- **条目编辑器对话框**：仿 token-tool 自接线 `renderDialog`（确认时收集表单值）：名称 / URL / 用户名 / 密码（内嵌「生成」按钮 `invoke('generate_password')` + 显示切换）/ 备注 / 标签（逗号分隔输入拆分）。生成器用默认参数（长度 16、小写+大写+数字+符号、不含排除易混），另附长度下拉（8–32）与「排除易混字符」勾选，不复刻独立面板。
- **复制**：`navigator.clipboard.writeText` + `toast`「已复制用户名/密码」。
- **导出/导入**：路径输入对话框（预填默认路径），导入成功后刷新列表 + `toast`「导入 N 条」。
- **锁定**：`invoke('lock_vault')` → 重渲染锁定屏（主密码输入框清空）。

### 4.4 安全

- 主密码只存表单输入 + invoke 传参，成功后即清空；**绝不落 localStorage**（localStorage 只存路径）。
- 动态内容（name/url/username/notes/tags/错误信息）全部 `escapeHtml` 后插值或 `textContent`，禁止 innerHTML 直接插用户数据。
- 浏览器态零密码数据；密码默认掩码，逐行显式显示。
- 导出为明文 JSON（含密码），UI 需明确提示「导出文件含明文密码，请妥善保管」。

### 4.5 样式

- `key.css` 局部类名 `key__*`（避全页计数断言），全走令牌（`--glass-bg`/`--glass-border`/`--space-*`/`--radius-*`（必配 `--radius-scale`）/`--text-*`/`--accent-*`/`--danger-*`），禁硬编码值。
- 动画只 transform/opacity，模糊永不动画；paint-only 豁免照 `src/AGENTS.md`。

## 5. 测试与验证

| 层 | 内容 |
|---|---|
| Rust | pwm 模块既有单测原样保留（crypto/vault/generator/models/error）；`cargo test` + `cargo check` |
| 单测（Vitest） | `key.test.js`：key-utils 纯函数（搜索/标签过滤/排序/分组/转义）、页面渲染（浏览器空态 / 锁定屏 / 三目录页）、module 契约（id/name/icon/order/dir/render/mount） |
| e2e（Playwright） | 新增 `key-password.spec.js`：浏览器空态；mock `__TAURI__` 全链路（锁定屏 → 解锁 → 列表 → 添加 → 编辑 → 删除 → 锁定）验证 invoke 调用形态与参数；更新 `app-shell.spec.js`（key 占位断言 → 需桌面端使用；目录上下文 → 全部/数据管理/设置），`mobile-nav.spec.js` 如有 key 目录引用一并更新 |
| 提交前 | JS：`npm run build`；Rust：`cargo check` + `cargo test` |

Tauri 特有路径（真实 IPC / Argon2id 派生 / 磁盘加解密）按 `src-tauri/AGENTS.md`：mock e2e 只验证 JS 调用形态，桌面可用性由用户桌面真机验证（`npm run tauri:dev`）。

## 6. 治理与分支

- **两条并行 worktree**（自 dev 检出，互不依赖）：
  - `evolveos-pwm-backend` → 分支 `chore/pwm-backend`：只改 `src-tauri/**` + `Cargo.lock`。
  - `evolveos-key-app` → 分支 `app/key/password-manager`：`src/apps/key/**` + `tests/**` + `docs/**`。
- 各自 `npm run check:boundary` 后 `--no-ff` 合并 dev；dev 阶段只跑改动影响面定向测试 + build + 壳冒烟（**不全量回归**，全量仅在 dev→main）。
- 合并顺序：前后无关（app e2e mock 不依赖真 Rust；chore 由 cargo test 验证），先后均可。
- 本规格 + 实施计划 + 执行留痕账本先提交 dev，两分支按 verbatim 执行、不重复提交（避免合并冲突，仿 token-tool `66b9cfc`/`59c9152` 做法）。

## 7. 范围外（YAGNI）

- 独立密码生成器面板（v1 编辑器内嵌即可）。
- 回收站/软删除（后端硬删，需后端改动，超范围）。
- 自动锁定时钟 / 剪贴板自动清除（无后端支持，超范围）。
- 主密码修改（需后端新命令，超范围）。
- 浏览器端密码管理兜底（不安全，桌面优先）。
- 条目拖拽排序 / 收藏星标（后端无对应字段）。
