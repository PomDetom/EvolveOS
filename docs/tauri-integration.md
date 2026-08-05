# Tauri 2 接入指南

> 面向基于本设计系统的 Rust Tauri 桌面应用。本文给出**可直接复制的完整配置与代码**：
> 透明无边框窗口、拖拽、窗口控制、macOS traffic lights、主题跟随系统、主题定制器嵌入、
> 悬浮窗独立窗口。配套示例见 `src/scenes/`（主窗口 / 设置页 / 剪贴板悬浮窗三个场景模板）。

---

## 1. 透明无边框窗口

### 1.1 tauri.conf.json

在 `app.windows` 中声明窗口。主窗口对应本系统的「一体式标题栏」形态（`decorations: false` + 自绘标题栏）：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "我的应用",
  "version": "1.0.0",
  "identifier": "com.example.myapp",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "我的应用",
        "width": 880,
        "height": 560,
        "minWidth": 720,
        "minHeight": 480,
        "decorations": false,
        "transparent": true,
        "shadow": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all"
  }
}
```

要点：

- `"decorations": false` 去掉系统边框与标题栏，页面自绘（本项目 `TitleBar` 组件即为此形态）。
- `"transparent": true` 窗口背景透明，页面 CSS 负责玻璃质感（`--glass-bg-rgb` 的 rgba 层）。
- `"shadow": true`（Windows / macOS）保留系统投影，透明窗口不丢失层次感。

### 1.2 Windows 注意事项

1. **调整尺寸闪烁**：透明 + 无边框窗口在 Windows 上由 WebView2 渲染，拖拽调整大小时
   偶发黑边/闪烁。规避手段：
   - 非必要不做实时 resize，或 JS 侧把连续 `setSize` 调用经 `requestAnimationFrame` 合并；
   - 用 `minWidth`/`minHeight` 限制合理尺寸区间，避免极端纵横比触发重合成。
2. **置顶全屏限制**：透明窗口在 Windows 全屏/最大化时 DWM 合成行为异常
   （透明可能失效或闪烁）。**悬浮窗类小窗不要提供最大化/全屏入口**；主窗口如需要
   全屏，建议在进入全屏前临时关闭透明（或接受非透明全屏）。
3. **backdrop-filter 只模糊页面内元素**：`backdrop-filter: blur()` 采样的是元素后面的
   **页面内容**，不能模糊透明窗口背后的桌面/其他窗口。真实窗口中玻璃效果退化为
   「半透明 tint + 高光描边」（本系统 rgba 层叠本身已成立），如需系统级背景模糊：
   - macOS：`window-vibrancy` 插件（`apply_vibrancy`，配合透明窗口）；
   - Windows 11：`window-vibrancy` 的 `apply_mica`/`apply_acrylic`。
   本设计系统的模糊令牌（`--glass-blur`）在整窗接入时仍作用于窗口内部元素层叠。
4. **macOS 透明窗口**需要启用私有 API：

```json
{
  "bundle": {
    "macOS": { "privateApi": true }
  }
}
```

并在 `src-tauri/Cargo.toml` 中开启：

```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
```

## 2. 拖拽：data-tauri-drag-region

Tauri 2 核心原生支持 `data-tauri-drag-region` 属性：**带该属性的元素（含子树）按下左键即可拖动窗口**，无需任何 JS。

本系统的 `TitleBar` 与 `FloatingWindow` 组件已标注：

- `src/components/title-bar/title-bar.js` → `.c-titlebar`（整条可拖）与 `.c-titlebar__drag`（最小安全拖区）；
- `src/components/floating-window/floating-window.js` → `.c-fwin__titlebar`。

```html
<div class="c-titlebar" data-tauri-drag-region>
  <div class="c-titlebar__drag" data-tauri-drag-region>
    <svg>…</svg><span class="c-titlebar__title">我的应用</span>
  </div>
  <div class="c-titlebar__controls">
    <button class="c-titlebar__control c-titlebar__control--min" aria-label="最小化">…</button>
    <button class="c-titlebar__control c-titlebar__control--max" aria-label="最大化">…</button>
    <button class="c-titlebar__control c-titlebar__control--close" aria-label="关闭">…</button>
  </div>
</div>
```

注意事项：

- 拖拽属性会覆盖整条子树；若窗口控制按钮点击被拖动「劫持」（偶发），
  把属性**只保留在 `.c-titlebar__drag` 上**即可（组件两个位置均已标注，按需删一处）。
- 不要给 `<button>` 或需要 click 的元素单独挂该属性。

## 3. 窗口控制（替换 TitleBar 控制按钮 onClick）

页面内 `TitleBar` 的「最小化/最大化/关闭」按钮默认只做演示（`mountTitleBar`）。
接入 Tauri 后替换为真实窗口控制：

```js
import { getCurrentWindow } from '@tauri-apps/api/window';

const win = getCurrentWindow();

document.querySelector('.c-titlebar__control--min').addEventListener('click', () => {
  win.minimize();
});

document.querySelector('.c-titlebar__control--max').addEventListener('click', async () => {
  await win.toggleMaximize();
  const maxed = await win.isMaximized();
  // 同步图标（组件内 .c-titlebar__control--max 的 restore/maximize 切换）
  const btn = document.querySelector('.c-titlebar__control--max');
  btn.innerHTML = maxed ? '<svg>…restore 图标…</svg>' : '<svg>…maximize 图标…</svg>';
});

document.querySelector('.c-titlebar__control--close').addEventListener('click', () => {
  win.close();
});
```

若启用了 `"withGlobalTauri": true`，也可不引入 npm 包，用全局 `window.__TAURI__.window.getCurrentWindow()` 等价调用。

## 4. macOS：traffic lights 两种做法

### 做法 A：保留系统按钮（overlay 叠加）

`decorations` 保持 `true`，用 `titleBarStyle: "overlay"` 让红绿灯悬浮在自绘标题栏上：

```json
{
  "app": {
    "windows": [
      {
        "decorations": true,
        "titleBarStyle": "overlay"
      }
    ]
  }
}
```

CSS 侧给标题栏左侧留出红绿灯空间（约 76px，或按 `--titlebar-padding-left` 调整）：

```css
.c-titlebar { padding-left: 76px; }
```

### 做法 B：隐藏系统按钮（全自绘）

```json
{
  "app": {
    "windows": [
      {
        "decorations": false
      }
    ]
  }
}
```

无红绿灯，最小化/关闭由第 3 节的自绘按钮承担。窗口菜单（`minimize`/`close` 快捷键）
不受影响，`Cmd+W`/`Cmd+M` 仍可用。

### 全屏兜底：data-tauri-drag-region 失效时

macOS 进入全屏后 `data-tauri-drag-region` 不再响应（系统限制）。
兜底方案：**按住 Option（⌥）键拖动窗口**——macOS 原生允许在全屏空间内移动窗口。
给标题栏挂一个提示（或文档注明）：全屏下按住 Option 拖动。如需退出全屏，
用 `getCurrentWindow().setFullscreen(false)` 或 `Cmd+Ctrl+F`。

## 5. 主题跟随系统

本设计系统 `data-theme`/`data-accent` 挂在 `<html>`（`src/config/apply.js`），
`store` 的 `theme: 'system'` 模式已内置 `matchMedia('(prefers-color-scheme: dark)')` 跟随。

### 方案 A：什么都不做（推荐，零依赖）

在 WebView2 / WKWebView 中 `prefers-color-scheme` 跟随系统深浅色自动变化。
接入应用只需在启动时调用一次：

```js
import { getConfig, subscribe } from './config/store.js';
import { applyConfig } from './config/apply.js';

applyConfig(getConfig());            // 首次应用（含 system 解析）
subscribe((cfg) => applyConfig(cfg)); // 后续定制器/切换器变更实时生效
```

### 方案 B：@tauri-apps/plugin-theme（需要显式回调）

```bash
npm add @tauri-apps/plugin-theme
```

```js
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onThemeChanged } from '@tauri-apps/plugin-theme';

onThemeChanged(async ({ theme }) => {
  // theme: 'light' | 'dark' | null —— 结合 store 的 theme: 'system' 使用
  applyConfig({ theme: theme === 'dark' ? 'dark' : 'light' });
});
```

`src-tauri/src/lib.rs` 注册插件：

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_theme::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

（Cargo.toml：`tauri-plugin-theme = "2"`；并调用 `app_handle.theme().await` 读取初始值。）

## 6. 主题定制器嵌入

### 6.1 config/ 三文件复制路径

定制器（`src/demo/customizer-panel.js`）依赖可配置层，把以下文件复制到应用
（保持相对路径不变）：

```
src/config/defaults.js    ← 默认值 + RANGES + 6 套主题色（ACCENTS）
src/config/store.js       ← getConfig/saveConfig/subscribe（localStorage 持久化）
src/config/apply.js       ← applyConfig：写 data-theme/data-accent/data-motion + CSS 变量
src/motion/spring.js      ← apply.js 的依赖（springCurve/scaledDurations），必须一并复制
```

接入方式（示例）：

```js
// 应用启动
import { getConfig, subscribe } from './config/store.js';
import { applyConfig } from './config/apply.js';
import { mountCustomizer, toggleCustomizer } from './demo/customizer-panel.js';

applyConfig(getConfig());
subscribe((cfg) => applyConfig(cfg));
mountCustomizer(document.body);            // 抽屉常驻挂载
document.querySelector('.topbar__customizer')
  .addEventListener('click', () => toggleCustomizer(true));
```

### 6.2 导出的 CSS 变量粘贴位置

定制器「导出 CSS 变量」把当前方案生成为一段纯 CSS。粘贴位置：

1. **整页覆盖层（推荐）**：把导出的 `:root { … }` 段粘贴到应用入口 `<style>` 或
   `index.html` 的 `<head>` 内（放在本系统 `tokens.css`/`themes.css` 之后），
   覆盖层优先级最高，无需改动 JS：

```html
<head>
  <style>
    /* ← 此处粘贴导出的 :root 覆盖段 */
  </style>
</head>
```

2. **独立 CSS 文件**：保存为 `custom-theme.css`，在入口 `import './custom-theme.css'`。

注意导出内容的两点契约：

- `--accent: var(--accent-500)` 是**指针值**——需同时具备 `themes.css` 的主题色板
  （`html[data-accent="…"]` 段）。整系统接入时直接复制整个 `themes.css`；
  只抄导出段会丢主题色阶。
- `html[data-theme="…"]`/`html[data-accent="…"]` 选择器要求应用仍然挂
  `data-theme`/`data-accent`（`applyConfig` 已自动挂）。

### 6.3 设置页整页形态

设置页「外观」分区整页嵌入定制器分组（场景模板 3 演示）：

```js
import { renderCustomizerGroups } from './demo/customizer-panel.js';

const container = document.querySelector('#appearance-section .csettings__cust');
renderCustomizerGroups(container); // 6 组滑杆 + store 双向同步，与抽屉面板共用同一份配置
```

## 7. 悬浮窗：独立窗口

悬浮窗（剪贴板小窗）建议做成**独立透明窗口**，与主窗口互不干扰：

```json
{
  "app": {
    "windows": [
      {
        "label": "floating",
        "title": "",
        "width": 360,
        "height": 480,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "visible": false,
        "shadow": true
      }
    ]
  }
}
```

- `alwaysOnTop: true` 全局置顶（悬浮窗本义）；`skipTaskbar: true` 不占任务栏。
- `visible: false` 初始隐藏，由主窗口/全局快捷键唤起：

```js
import { getCurrentWindow } from '@tauri-apps/api/window';

const floating = getCurrentWindow(); // 在悬浮窗页面内
floating.show();
floating.setFocus();
```

### FloatBall 与面板窗口组合建议

- **FloatBall 独立小窗**：约 48×48 的透明无边框窗口，`alwaysOnTop + skipTaskbar`。
  注意透明像素默认仍会拦截鼠标——用 `setIgnoreCursorEvents(true)` 让透明区域点击穿透，
  只保留球体可视区域响应：

```js
import { getCurrentWindow } from '@tauri-apps/api/window';

const ball = getCurrentWindow();
await ball.setIgnoreCursorEvents(true);      // 透明像素点击穿透
ball.onFocusChanged(({ payload: focused }) => {
  if (focused) ball.setIgnoreCursorEvents(false); // 悬停/交互时恢复响应
});
```

- **面板窗口**：球体点击时显示（第 7 节配置），关闭时隐藏（`floating.hide()`）而非销毁，
  保持打开状态与搜索记录；再次点击球体/全局热键再 show。
- 场景模板 1（`src/scenes/clipboard-float/`）演示了面板内的完整交互
  （搜索/固定/删除/清空），接入时把 `SearchBar` + 列表挂进独立窗口页面即可。

---

## 附录：安全边界

本设计系统为**纯前端演示项目**（零运行时依赖、无后端），组件内部不转义动态内容。
接入应用时：

- 任何外部数据（剪贴板内容、用户输入）进入 `renderXxx` 前自行 HTML 转义；
- 全局热键监听为最小实现，接入时改用 `tauri-plugin-global-shortcut`。
