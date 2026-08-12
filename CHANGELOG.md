## [0.1.2] - 2026-08-12

### Added

### Changed

### Fixed

- merge: 0.1.2 应用壳发布（应用清单重整 + 设置内置 + 关于远端 + 入口排序/隐藏 + e2e/基线连带 + 修复波）
- fix: 导航轮监听器重挂不累积 + 空导航冷启动不崩 + 导航分区排序/隐藏 e2e
- fix: e2e 连带（分区索引 +1 + 视觉 SHOTS 偏移 + 新入口用例）+ app-main 基线重生成 + 接入指南补丁
- fix: 导航分区全隐藏 crash 兜底（ensureActiveModule 回退 settings + 各路径空页守卫）+ 评审 Minor 修复
- feat: 设置「导航」分区（入口排序/隐藏管理）+ 概览管理入口 + e2e 11 分区计数
- feat: 入口导航配置链路（nav {order,hidden} + resolveNav 纯函数 + 壳 rebuildNav 响应式）
- feat: 关于分区接真实远端仓库（地址行 + 开源按钮打开仓库）
- fix: 手机 dock 点「设置」触发设置模式（等同标题栏 ⚙，已在设置页弹回）
- feat: 设置内置模块（左窗点选=触发设置模式，等同标题栏 ⚙）
- fix: token-tool 契约测试 order 断言同步（order 7→2，Task 1 归位）
- feat: 应用清单重整（去剪贴板/记账×2/搜索/帮助/关于，增 6 占位 + key/token-tool order 归位）
- docs: 0.1.2 应用壳发布实施计划
- merge: 0.1.2 应用壳发布设计规格
- docs: 0.1.2 应用壳发布设计规格（应用清单重整 + 关于页远端信息 + 入口排序/隐藏）
- merge: docs/ 结构优化（integration/handoffs 文件夹收纳）
- docs: docs/ 结构优化（integration/handoffs 文件夹收纳散落文档，根只留 AGENTS/CLAUDE）+ 活跃引用更新
- merge: 记忆文件单源化重构
- docs: 记忆文件单源化重构（AGENTS.md 单源 + CLAUDE.md @AGENTS.md 壳，四层；去 B 编号/历史引用/跨文件重复）
- chore: 视觉基线 app-main 重生成（ledger 应用入壳，8→9 模块）+ 迁移执行留痕账本
- merge: 记账演示应用（并行治理验收：新增应用碰零共享 + worktree 生命周期闭环）
- feat: 记账演示应用（并行治理验收：新增应用碰零共享）
- merge: 并行分支治理迁移（边界门禁 + 图标自持 + e2e 动态化 + 治理文档）
- docs: 治理口径同步（worktree 并行 + 分支前缀/生命周期/回归单点化 + 图标自持），AGENTS.md 双文件同步
- fix: e2e 模块计数动态化 + 位置断言改 data-id（新增应用不破 spec）
- feat: icon() 第四参应用级自持图标（a1，查找顺序 应用级→全局→monitor，配单测）
- feat: 边界门禁前缀全集（docs/chore/hotfix/base）+ 未知分支名 fail（配单测）
- docs: 并行分支治理迁移实施计划
- merge: 并行分支治理设计规格
- docs: 并行分支治理设计规格（worktree 并行 + 分支规范全集 + 回归单点化 + 入口抗变化）

# Changelog

## [0.1.1] - 2026-08-11

### Added
- 发版流程与版本治理：`npm run set-version`（同步 package.json / Cargo.toml / tauri.conf.json）、`npm run release`（半自动发版：bump + CHANGELOG + 门禁 + 提交）
- CHANGELOG.md（Keep a Changelog 风格）
- 设置「关于」页版本号动态读 package.json（Vite `define.__APP_VERSION__`，不再漂移）

### Changed
- 固化分支策略：feature（`ui/*`、`app/<id>/*`）→ dev → main（`--no-ff`）；main 只收 dev 合入 + hotfix；docs 也走 dev
- 里程碑 tag 约定 `ui/vX.Y.Z` → `vX.Y.Z`；首次基线 `v0.1.0`

### Fixed
- （无）

## [0.1.0] - 2026-08-11

### Added
- tokenTool 应用：DeepSeek 官方余额 / OpenCode Go 三窗口用量监测（复用 Tauri Rust 后端 + EvolveOS 组件，桌面优先/浏览器优雅降级）
- 应用壳 `mod.mount` 挂载钩子（应用交互接线契约）
- 发版流程与版本治理（`set-version` / `release` 脚本 + 本文件）

### Changed
- 应用壳模块计数 7→8（tokenTool 接入）
- 设计语言措辞「克制的玻璃质感」→「亚克力质感」
- 编辑器对话框材质改实底不透明（与主页面一致）

### Fixed
- tokenTool 新增账户选 OpenCode 不带出 workspace/cookie 字段
- tokenTool 编辑对话框表单值转义（防属性突破自 XSS）
- tokenTool 空状态「添加账户」CTA 失灵
