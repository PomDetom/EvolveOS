# AGENTS.md

EvolveOS 项目的 agent 指令入口。内容与仓库根 `CLAUDE.md` 保持一致（**CLAUDE.md 为唯一事实源**，修改时两者同步）。

## 项目定位

统一**应用壳**承载多个桌面应用（剪贴板、密码、记账等）：应用 = `src/apps/<id>/` 自己的页面（壳零侵入，glob 自动发现），壳提供一体式标题栏 + 级联双滑动窗口 + 黄金比例锚点 + 悬浮条 + 统一设置；设计系统（令牌/34 组件/定制器）为共享基础设施；框架与应用双轨开发治理。纯原生 Web（Vite + HTML/CSS/JS），**零框架、零运行时依赖**。设计语言：亚克力质感、深/浅双主题、12 套主题色、滑动选择导航（NavigationWheel）。

## 模式与入口

- 浏览器 `/` → **应用壳**（默认，与 Tauri 一致）
- Tauri 桌面（无 query）→ **应用壳模式**（探测 `window.__TAURI__`）
- `?mode=app` / `?mode=strip` 显式覆盖；非法/无参数一律回落应用壳
- 桌面：级联双滑动窗口（左=应用列表，右=应用目录/设置目录，纯图标栏）；手机（≤900px）：底部横滑 + 页面栈

## 常用命令

```bash
npm install        # 安装依赖（要求 Node ^20.19.0 || >=22.12.0）
npm run dev        # 开发服务器 (localhost:5173) → 浏览器应用壳
npm test           # Vitest 单测
npm run test:e2e   # Playwright 交互测试（e2e 须用 worktree 配置）
npm run build      # 生产构建（每次提交前必跑）
npm run tauri:dev  # 桌面窗口运行（应用壳模式）
npm run set-version -- 1.2.3  # 同步版本到 package.json / Cargo.toml / tauri.conf.json
npm run release -- patch      # 半自动发版（bump + CHANGELOG + 门禁 + 提交）
```

## 核心铁律

- 零运行时依赖，组件无抽象封装，遵循现有代码风格。
- **任务直接在共享 checkout（主工作目录）执行，不用 git worktree 隔离**（worktree 引发沙箱隔离 + 同步/合并复杂化）。
- **测试与验证仅在 Web 环境执行**（单测 + Playwright 浏览器测试），不做 webview 真机验证。
- 禁止升级核心依赖、禁止删除用户已有改动。
- **框架 vs 应用边界**：UI 框架（`src/components|styles|config|app|scenes|demo|motion|assets`、`vite.config`、`package.json`）修改走 `ui/` 分支（全量回归 + 框架 owner 评审）；应用（`src/apps/<id>/`）只做自己的页面，**禁止修改框架目录**，合并前跑 `npm run check:boundary`。
- 开发遵循子代理驱动流程（TDD、独立评审、修复循环），每步计划/工作内容/提交留痕入 `docs/`（详见 `docs/CLAUDE.md`）。

## 发版与版本治理

- **分支**：feature（`ui/*`、`app/<id>/*`）从 dev 检出、**只合入 dev**；dev 稳定后 `--no-ff` 合入 main（=一次发版）；**main 只接受 dev 合入 + `hotfix/*` 直合**（随后回 dev）；docs 也走 dev。feature 分支合并进 main 前须全量回归（`npm test` + `npm run test:e2e` + `npm run build`），通过后删分支。
- **版本**：package.json 为唯一版本源；`npm run set-version -- X.Y.Z` 同步 3 个 manifest；设置「关于」页版本号动态读 package.json。
- **发版**：`npm run release -- [patch|minor|major]`（bump → CHANGELOG → npm test+build 门禁 → 提交 → 打印后续）；dev→main 前全量回归（npm test + test:e2e + build + cargo test）；合并后打 tag `vX.Y.Z`。

## 细则位置

- `CLAUDE.md` — 项目定位 / 模式与入口 / 核心铁律 / 发版与版本治理（唯一事实源）
- `src/CLAUDE.md` — 编码规范细则：组件契约、样式令牌、动画红线、验证要求、常见坑
- `src-tauri/CLAUDE.md` — Tauri 桌面壳坑（窗口/悬浮窗/权限）
- `docs/CLAUDE.md` — 文档与任务执行规范细则：文档体系、执行留痕、SDD 流程
- `docs/app-integration.md` — 应用接入指南（模块契约 / 组件 / 令牌 / 页面规范）
