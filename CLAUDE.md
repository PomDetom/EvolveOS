# ui-design — Tauri 统一 UI 设计系统

## 项目定位

为多个 Rust Tauri 桌面应用（剪贴板、密码管理、记账等）建立统一设计语言的**设计系统展示页**。纯原生 Web（Vite + HTML/CSS/JS），**零框架、零运行时依赖**。设计语言：克制的玻璃质感、深/浅双主题、6 套主题色、滑动选择导航（NavigationWheel）、可配置主题定制器、3 个场景模板。

## 核心铁律

- 零运行时依赖，组件无抽象封装，遵循现有代码风格。
- 动画只用 transform/opacity，模糊永不动画；时长/曲线经 CSS 变量。
- 界面参数修改必须经配置层完整链路（defaults → store → apply），不绕过直接写 CSS 变量。
- 开发遵循子代理驱动流程（TDD、独立评审、修复循环），每步计划/工作内容/提交留痕入 `docs/`。
- 禁止升级核心依赖、禁止删除用户已有改动。

## 常用命令

`npm install` / `npm run dev` / `npm test` / `npm run test:e2e` / `npm run build`（不用 pnpm/yarn）。

## 细则位置

- `src/CLAUDE.md` — 编码规范细则：组件契约、样式令牌、动画红线、验证要求、常见坑
- `docs/CLAUDE.md` — 文档与任务执行规范细则：文档体系、执行留痕、SDD 流程
