# src-tauri/ 桌面壳规范细则

> 本文件仅在 agent 工作路径进入 `src-tauri/` 时加载。做 Tauri 桌面壳/窗口/悬浮窗相关改动前先读。

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

## Windows 环境怪癖

- python 读含中文 UTF-8 文件报 gbk 解码错误是环境怪癖非文件损坏（`encoding='utf-8'` 重验）。
