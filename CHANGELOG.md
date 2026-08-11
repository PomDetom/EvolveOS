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
