# AGENTS.md

EvolveOS 项目的 agent 指令入口。内容与仓库根 `CLAUDE.md` 保持一致（**CLAUDE.md 为唯一事实源**，修改时两者同步）。

## 项目定位

以统一**应用壳**承载多个桌面应用（剪贴板、密码管理、记账等）：应用 = `src/apps/<id>/` 自己的页面（壳零侵入，glob 自动发现），壳提供一体式标题栏 + 级联双滑动窗口 + 黄金比例锚点 + 悬浮条 + 统一设置；设计系统（令牌 / 34 组件 / 定制器）为共享基础设施；框架与应用双轨开发治理（`ui/*` / `app/<id>/*`，边界门禁 `npm run check:boundary`）。纯原生 Web（Vite + HTML/CSS/JS），**零框架、零运行时依赖**。设计语言：亚克力质感、深/浅双主题、12 套主题色、滑动选择导航（NavigationWheel）。

## 常用命令

```bash
npm install        # 安装依赖（要求 Node ^20.19.0 || >=22.12.0）
npm run dev        # 开发服务器 (localhost:5173) → 浏览器应用壳
npm test           # Vitest 单测
npm run test:e2e   # Playwright 交互测试（e2e 须用 worktree 配置）
npm run build      # 生产构建（每次提交前必跑）
npm run tauri:dev  # 桌面窗口运行（应用壳模式）
```

## 核心铁律

- 零运行时依赖，组件无抽象封装，遵循现有代码风格。
- 动画只用 transform/opacity，模糊永不动画；时长/曲线经 CSS 变量。
- 界面参数修改必须经配置层完整链路（defaults → store → apply），不绕过直接写 CSS 变量。
- 滑动导航选中锚点为**黄金比例点 0.382**（非居中）；滑动窗口**纯图标**，名称由标题栏上下文承担。
- 任务直接在共享 checkout（主工作目录）执行，不使用 git worktree 隔离。
- 测试与验证仅在 Web 环境执行（单测 + Playwright 浏览器测试），不做 webview 真机验证。
- 禁止升级核心依赖、禁止删除用户已有改动。
- **开发模式与边界**：UI 框架（`src/components|styles|config|app|scenes|demo|motion|assets`、`vite.config`、`package.json`）如需修改走 `ui/` 分支（全量回归 + 框架 owner 评审）；应用（`src/apps/<id>/`）只能制作自己的页面，**禁止修改框架目录**，合并前必跑 `npm run check:boundary`。git 走 main + dev 双分支（`ui/*`、`app/<id>/*` 从 dev 检出）。
- 合并 feature 分支进 main 后须先全量回归（`npm test` + `npm run test:e2e` + `npm run build`）通过再删分支收尾。

## 细则位置

- `CLAUDE.md` — 项目定位 / 模式与入口 / 核心铁律 / 常用命令（唯一事实源）
- `src/CLAUDE.md` — 编码规范细则：组件契约、样式令牌、动画红线、验证要求、常见坑
- `src-tauri/CLAUDE.md` — Tauri 桌面壳坑（窗口/悬浮窗/权限，仅做 src-tauri 时加载）
- `docs/CLAUDE.md` — 文档与任务执行规范细则：文档体系、执行留痕、SDD 流程
- `docs/app-integration.md` — 应用接入指南（模块契约 / 组件 / 令牌 / 页面规范）
