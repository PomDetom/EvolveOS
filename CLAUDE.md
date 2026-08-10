# ui-design — 多应用壳 UI 设计系统

## 项目定位

为多个 Rust Tauri 桌面小应用（剪贴板、密码管理、记账等）提供统一界面的**应用壳**（真实应用界面为主体：一体式标题栏 + 级联双滑动窗口 + 黄金比例锚点 + 悬浮条），设计系统（令牌/32 组件/定制器）为基础设施；展示页降级为开发文档模式。纯原生 Web（Vite + HTML/CSS/JS），**零框架、零运行时依赖**。设计语言：克制的玻璃质感、深/浅双主题、6 套主题色、滑动选择导航（NavigationWheel）。

## 模式与入口

- 浏览器 `/` → **应用壳**（默认，与 Tauri 一致；docs 渲染已删除，设计系统展示收进设置「组件」「动效」分区）
- Tauri 桌面（无 query）→ **应用壳模式**（探测 `window.__TAURI__`）
- `?mode=app` / `?mode=strip` 显式覆盖；非法/无参数一律回落应用壳
- 桌面：级联双滑动窗口（左=应用列表，右=应用目录/设置目录，纯图标栏）；手机（≤900px）：底部横滑 + 页面栈

## 核心铁律

- 零运行时依赖，组件无抽象封装，遵循现有代码风格。
- 动画只用 transform/opacity，模糊永不动画；时长/曲线经 CSS 变量。
- 界面参数修改必须经配置层完整链路（defaults → store → apply），不绕过直接写 CSS 变量。
- 滑动导航选中锚点为**黄金比例点 0.382**（非居中）；滑动窗口**纯图标**，名称由标题栏上下文承担。
- 开发遵循子代理驱动流程（TDD、独立评审、修复循环），每步计划/工作内容/提交留痕入 `docs/`。
- **任务直接在共享 checkout（主工作目录）执行，不使用 git worktree 隔离**（B5 确立：worktree 引发沙箱隔离 + 共享 checkout 同步/合并复杂化）。
- **测试与验证仅在 Web 环境执行**（单测 + Playwright 浏览器测试），不在 webview 内做真机验证。
- 禁止升级核心依赖、禁止删除用户已有改动。
- **开发模式与边界（框架 vs 应用）**：UI 框架（`src/components|styles|config|app|scenes|demo|motion|assets`、`vite.config`、`package.json`）如需修改只能**单独修改**（`ui/` 分支，全量回归 + 框架 owner 评审）；应用（`src/apps/<id>/`）只能制作自己的页面，**禁止修改框架目录**，合并前必跑 `npm run check:boundary`。详规：`docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`；git 走 main + dev 双分支（`ui/*`、`app/<id>/*` 从 dev 检出）。

## 常用命令

`npm install` / `npm run dev` / `npm test` / `npm run test:e2e` / `npm run build`（不用 pnpm/yarn）。

## 细则位置

- `src/CLAUDE.md` — 编码规范细则：组件契约、样式令牌、动画红线、验证要求、常见坑
- `docs/CLAUDE.md` — 文档与任务执行规范细则：文档体系、执行留痕、SDD 流程
