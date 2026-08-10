# EvolveOS — 多应用综合管理系统

## 项目定位

以统一**应用壳**承载多个桌面应用（剪贴板、密码管理、记账等）：应用 = `src/apps/<id>/` 自己的页面（壳零侵入，glob 自动发现），壳提供一体式标题栏 + 级联双滑动窗口 + 黄金比例锚点 + 悬浮条 + 统一设置；设计系统（令牌/34 组件/定制器）为共享基础设施；框架与应用双轨开发治理（`ui/*` / `app/<id>/*`，边界门禁 `npm run check:boundary`）。纯原生 Web（Vite + HTML/CSS/JS），**零框架、零运行时依赖**。设计语言：克制的玻璃质感、深/浅双主题、12 套主题色、滑动选择导航（NavigationWheel）。

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
- 合并 feature 分支进 main 后须先全量回归（`npm test` + `npm run test:e2e` + `npm run build`）通过再删分支收尾。

## Tauri 桌面壳（坑）

- **窗口变更权限**：minimize/toggleMaximize/close/start-dragging 须在 `src-tauri/capabilities/default.json` 显式授权；仅 `core:default` 会被静默拒绝（JS `.catch` 吞错表现"完全没反应"）。
- **WebviewWindow 创建静默失败**：构造器不抛错，失败只发 `tauri://error` 事件；创建代码须监听 `tauri://created`/`tauri://error` + try/catch toast 做面诊（mock e2e 覆盖不到）。
- **mock e2e 局限**：注入 `__TAURI__` 只验证 JS 调用形态，不验证真实窗口创建/权限/URL 解析——Tauri 特有路径改动须加面诊日志或标注需桌面真机验证，仅 mock 通过不能作为桌面可用性证据。
- **透明窗口 body 清背景**：透明窗（strip）`body` 须显式 `background: transparent`（全局 `body { background: var(--glass-bg) }` 是半透明玻璃，透明窗里会整窗变遮罩）；新建透明窗口必做。
- **程序化 setSize 与 resizable**：悬浮窗保持 `resizable:false` 防 Windows 贴边 Aero Snap 缩放；程序化 `setSize`（SetWindowPos）对非缩放窗口同样生效——勿为贴合尺寸去掉它。隐藏→show 后须再贴合一次（此时布局才完成）。
- **悬浮窗注册方式**：在 `tauri.conf.json` 预注册（label + transparent:true + visible:false）后运行时 show/hide，禁止 `new WebviewWindow()`（全局构造器缺失/静默失败）。
- **透明窗禁用 backdrop-filter**：WebView2 会把透明窗内 backdrop-filter 渲染成未裁剪方形图层（圆角被裁成方角）且透明窗内模糊无意义——窗口模式按 mode 禁用。
- **竖排 strip `width:max-content`**：窗口模式下 `width:auto` 填满窗口宽 → 控制条/关闭按钮被裁、底部圆角异常。
- **多窗口生命周期**：悬浮窗设 `skipTaskbar:true`；主窗关闭须连带关闭悬浮窗（否则任务栏独立图标、关主窗后进程不退出）。
- **关闭联动移 Rust**：多窗口关闭联动用 Rust `on_window_event`（`exit(0)` 全退 / `prevent_close`+`hide` 保后台），勿用 JS `onCloseRequested` 异步 `getAllWindows→close()`（关闭序列中不可靠会卡死主窗）。
- **setSize 用 LogicalSize**：`win.setSize` 传普通 `{width,height}` 时 Logical/Physical 语义不明确；`getBoundingClientRect()` 返回 CSS 逻辑像素，Windows 非 100% DPI 下窗口小于内容被裁——贴合内容尺寸须显式 `new LogicalSize(Math.ceil(w), Math.ceil(h))`。
- **无 onShow/onHide**：Tauri 2 JS 的 WebviewWindow 无 `onShow`/`onHide` 事件方法（仅 onCloseRequested/onMoved/onResized 等）；`win.onShow?.(() => fit())` 是静默死代码——显示后回调需移 Rust window event。
- **屏蔽浏览器右键菜单**：桌面壳（主窗+悬浮窗）须 document 级 `contextmenu` preventDefault，否则右键弹出浏览器菜单观感突兀。
- **Windows 环境怪癖**：python 读含中文 UTF-8 文件报 gbk 解码错误是环境怪癖非文件损坏（`encoding='utf-8'` 重验）。

## 常用命令

`npm install` / `npm run dev` / `npm test` / `npm run test:e2e` / `npm run build`（不用 pnpm/yarn）。

## 细则位置

- `src/CLAUDE.md` — 编码规范细则：组件契约、样式令牌、动画红线、验证要求、常见坑
- `docs/CLAUDE.md` — 文档与任务执行规范细则：文档体系、执行留痕、SDD 流程
