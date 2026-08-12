# src-tauri/ Tauri 桌面壳规则

## 默认不同于常规

- **WebView2 透明窗内 backdrop-filter 渲染成未裁剪方形图层**（圆角被裁成方角）且透明窗内模糊无意义——窗口模式按 mode 禁用。
- Tauri 2 JS 的 WebviewWindow **无** `onShow`/`onHide` 事件方法（仅 onCloseRequested/onMoved/onResized 等）；`win.onShow?.(() => fit())` 是静默死代码——显示后回调须移 Rust window event。
- `win.setSize` 传普通 `{width,height}` 时 Logical/Physical 语义不明确；`getBoundingClientRect()` 返回 CSS 逻辑像素，Windows 非 100% DPI 下窗口小于内容被裁——贴合内容尺寸须显式 `new LogicalSize(Math.ceil(w), Math.ceil(h))`。
- 悬浮窗**预注册**（`tauri.conf.json` label + transparent:true + visible:false）后运行时 show/hide，禁止 `new WebviewWindow()`（全局构造器缺失/静默失败）。

## 工作流红线

- 窗口变更权限（minimize/toggleMaximize/close/start-dragging）须在 `src-tauri/capabilities/default.json` 显式授权；仅 `core:default` 会被静默拒绝（JS `.catch` 吞错表现为「完全没反应」）。
- WebviewWindow 创建静默失败（只发 `tauri://error`）：创建代码须监听 `tauri://created`/`tauri://error` + try/catch toast 面诊。
- mock e2e 只验证 JS 调用形态，不验证真实窗口创建/权限/URL 解析——Tauri 特有路径改动须加面诊日志或标注需桌面真机验证，仅 mock 通过不能作为桌面可用性证据。
- 透明窗（strip）`body` 须显式 `background: transparent`（全局 `body { background: var(--glass-bg) }` 是半透明玻璃，透明窗里会整窗变遮罩）。
- 悬浮窗保持 `resizable:false` 防 Windows 贴边 Aero Snap；程序化 `setSize` 对非缩放窗口同样生效，勿为贴合尺寸去掉它；隐藏→show 后须再贴合一次（此时布局才完成）。
- 竖排 strip `width:max-content`（窗口模式 `width:auto` 撑满窗宽 → 控制条/关闭按钮被裁、底部圆角异常）。
- 多窗口：悬浮窗设 `skipTaskbar:true`；关闭联动用 Rust `on_window_event`（`exit(0)` 全退 / `prevent_close`+`hide` 保后台），勿用 JS `onCloseRequested` 异步 `getAllWindows→close()`（关闭序列中不可靠会卡死主窗）。
- 桌面壳（主窗+悬浮窗）须 document 级 `contextmenu` preventDefault，屏蔽浏览器右键菜单。

## 常见坑

- 透明窗内 backdrop-filter 圆角被裁成方角（WebView2 方形图层）。
- 隐藏→show 后需再 setSize 贴合（此时布局才完成）。
- Windows 环境怪癖：python 读含中文 UTF-8 文件报 gbk 解码错误是环境怪癖非文件损坏（`encoding='utf-8'` 重验）。
