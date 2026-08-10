# 应用接入指南（App Shell Integration）

> 面向在应用壳中接入新应用/新模块的开发者。本文给出**可直接复制的模块契约、组件清单、设计令牌与页面规范**：
> 如何接入、复用哪些组件、页面风格如何设计才能贴合现有 UI。配套完整示例见 `src/scenes/`（设置页 / 剪贴板悬浮窗）
> 与应用壳 `src/app/app-main.js`（壳 + 7 个占位模块）。

---

## 0. 接入模型

**应用壳 = 容器，接入 = 注册一个「模块」**。壳已提供：

- **一体式标题栏**（`TitleBar`：应用名 › 页面名上下文、⚙ 设置、主题快捷按钮、窗口控制）
- **级联双滑动导航**（左窗 = 应用列表 / 右窗 = 当前应用目录，均 NavigationWheel 纯图标，38.2% 锚点）
- **内容区**（唯一 active 页；`data-layout` 控制限宽居中 / 撑满）
- **设置模式**（10 分区，含外观定制器 / 组件 / 动效展示）
- **玻璃材质体系**（深/浅双主题 × 12 套强调色 × 动效开关，正交组合）+ 背景装饰 8 预设
- **悬浮条 FloatStrip / 悬浮球 FloatBall**（桌面悬浮窗形态）

你只需在 `src/apps/<id>/index.js` 放一个导出 `module` 的文件，壳经 `import.meta.glob` 自动发现，完成左窗图标、右窗目录、内容区页面、标题栏上下文、级联联动。**零抽象封装、零运行时依赖**——页面就是返回 HTML 字符串的纯函数。

---

## 1. 最快接入：注册一个应用

**应用 = `src/apps/<id>/` 一个目录**，壳用 `import.meta.glob('../apps/*/index.js')` 自动发现（Task G1），**新增应用 = 建目录放文件，壳零改动**。

`src/apps/notes/index.js`：

```js
import { renderButton } from '../../components/button/button.js';
export const module = {
  id: 'notes', name: '便签', icon: 'pin',
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: notesPage,
};
```

> **边界红线**：应用只允许修改 `src/apps/<id>/` 自己目录（+ 该应用测试 + docs），**禁止触碰框架目录**（`src/components|styles|config|app|scenes|demo|motion|assets`、`vite.config`、`package.json`）。合并前跑 `npm run check:boundary`；违反即失败。框架需修改 → 单独 `ui/` 分支。

---

## 2. 模块契约详解

### 2.1 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 模块唯一标识（data-page、右键目录、上下文 data-module 用） |
| `name` | string | 左窗 aria-label / 标题栏上下文 / 概览快捷入口名 |
| `icon` | string | `icon.js` 的 `PATHS` 键（Lucide 风格 24×24 stroke 1.8） |
| `dir` | array | 右窗目录项 `[{ id, name, icon }]`；空数组 = 无目录单页（点击直接进首屏） |
| `render` | fn | `render(ctx) => string`，页面 HTML |

### 2.2 render(ctx) 上下文

```js
ctx = {
  module,   // 本模块 MODULES 项
  dirId,    // 当前选中目录项 id（未选目录时为首项 id 或 null）
  dirName,  // 当前目录项 name（标题栏子上下文用）
}
```

- 每次左窗/右窗切换都会重新调用 `render`，**页面为无状态纯渲染**。
- 需要交互的页面：HTML 返回后由壳或你自己的 `mount` 接线（见 §3.2）。
- 目录项切换（右键选中）会重渲染内容区——页面里显示 `ctx.dirName` 即可天然联动。

### 2.3 壳自动做的事（你不需要碰）

左窗图标渲染 / 右窗目录轮 / 内容区唯一 active 页 / 标题栏「应用名 › 页面名」/ 概览页快捷入口卡片 /
应用切换时右键重载目录 / 设置模式与右键状态机。壳代码在 `src/app/app-main.js`，**扩展新应用只改 `src/apps/` 目录**。

---

## 3. 复用组件（34 个，`src/components/`）

### 3.1 组件清单

| 类别 | 组件（目录名） |
|---|---|
| 导航 | `navigation-wheel`、`title-bar`、`sidebar-item`、`breadcrumb`、`tab` |
| 表单 | `button`、`input`、`textarea`、`select`、`checkbox`、`radio`、`switch`、`slider`、`search-bar` |
| 展示 | `card`、`list`、`tag`、`badge`、`avatar`、`kbd`、`progress`、`skeleton`、`empty-state`、`icon` |
| 浮层 | `dialog`、`popover`、`context-menu`、`toast`、`floating-window`、`float-ball`、`float-strip` |
| 高级 | `hotkey-hint`、`hotkey-recorder` |

### 3.2 组件契约（`src/CLAUDE.md`）

- 每组件 `<name>.css` + `<name>.js`；JS 导出 **`render(opts) → string`**（HTML 字符串）+ 可选 **`mount(root)`**（交互挂载）。
- 类名 BEM 风格、**`c-` 前缀**（`.c-btn--primary`、`.c-input`）。
- 图标统一经 **`icon(name, size = 18, stroke = 1.8)`**（`src/components/icon/icon.js`，内联 SVG、currentColor、aria-hidden）。
- 组件 CSS 通常已由壳/场景入口引入；独立页面直接 `import '<name>.css'`。

```js
import { renderButton } from '../components/button/button.js';
import { renderInput, mountInput } from '../components/input/input.js';

// render 返回 HTML 字符串
`<div class="app-main__card">${renderButton({ label: '确定', variant: 'primary' })}</div>`;

// 需要交互：渲染后 mount（返回 root 或其子项）
mountInput(pageEl.querySelector('.c-input'));
```

### 3.3 与既有设计语言对齐

组件已内置「玻璃/浅色材质」观感（如按钮 = accent-100 浅 tint + 描边 + 上浮 hover；开关 = 胶囊滑杆）。
**优先复用组件而非自绘**，风格天然统一。展示区/场景新增实例用**局部类名**（避免打破全页严格计数断言，见 §5.6）。

---

## 4. 设计令牌（风格统一的根基）

令牌在 `src/styles/tokens.css`（数值）+ `themes.css`（主题映射）。**禁止硬编码值**——颜色/间距/圆角/时长/缓动全部引用变量。

### 4.1 常用令牌

| 域 | 令牌 |
|---|---|
| 中性色 | `--neutral-50..950`（冷调灰） |
| 强调色 | `--accent-50..950` + `--accent`/`--accent-hover`/`--accent-active`/`--accent-contrast`（随 `data-accent` 12 套） |
| 语义色 | `--success-*` / `--warning-*` / `--danger-*` / `--info-*`（随主题固定，不随 accent 派生） |
| 文字 | `--text-1`（主）/ `--text-2`（次）/ `--text-3`（弱） |
| 表面 | `--surface-1` / `--surface-hover` / `--surface-solid` |
| 玻璃 | `--glass-bg`（rgba 半透明）/ `--glass-blur` / `--glass-border` / `--acrylic-noise` |
| 阴影 | `--shadow-sm` / `--shadow-md` / `--shadow-lg`（随 shadow-intensity 缩放） |
| 字体 | `--font-sans`（阿里普惠体）/ `--font-mono`；`--font-size-xs..3xl`；`--font-weight-regular..bold` |
| 间距 | `--space-1..7`（4/8/12/16/24/32/48px） |
| 圆角 | `--radius-xs/sm/md/lg/xl/full`；**使用必配缩放**：`calc(var(--radius-md) * var(--radius-scale, 1))` |
| 动效 | `--dur-fast` / `--dur-base` / `--dur-push`；`--ease-out` / `--ease-spring` |
| 层级 | `--z-base/float/overlay/modal/toast` |

### 4.2 主题正交组合

`data-theme`（浅/深/跟随系统）、`data-accent`（12 套强调色）、`data-motion`（动效开关）挂在 `<html>`，正交组合。
页面只消费令牌，主题切换自动生效——**不要读 `data-theme` 手写分支**（除动画红线豁免的 hover 明暗等既定模式）。

### 4.3 常见用法

```css
.my-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  padding: var(--space-4);
  color: var(--text-2);
  box-shadow: var(--shadow-sm);
}
```

---

## 5. 页面设计规范（贴合现有 UI）

### 5.1 页面骨架（必须）

```html
<div class="app-main__page-head">
  <h2 class="app-main__page-title">应用名</h2>
  <span class="app-main__page-sub">› 目录项</span>   <!-- 有子上下文时 -->
</div>
<div class="app-main__page-body">
  <!-- 内容：卡片 / 表单 / 列表 / 空状态 -->
</div>
```

### 5.2 布局（`data-layout`）

壳为页面 `<section class="app-main__page" data-layout="...">` 设置布局：

- `data-layout="center"`（默认）：**表单/概览**限宽居中（max-width 1080px）。
- `data-layout="fluid"`：**组件/动效展示**撑满。

### 5.3 内容模式（对齐既有视觉）

- **卡片**：`.app-main__card`（玻璃底 + 描边 + 圆角），内部 `.app-main__card-title` + `.app-main__card-desc`。
- **表单**：`.csettings__field` + `.csettings__field-label` + `.csettings__field-desc` + 表单组件（见设置页）。
- **列表**：`List` 组件或 `.app-main__dir-item`（hover 高亮行）。
- **空状态**：`renderEmptyState({ iconName, title, desc })`（占位页惯例）。
- **主操作按钮**：`.c-btn--primary`（accent-100 浅 tint）；次操作 `.c-btn--secondary`；危险 `.c-btn--danger`。

### 5.4 交互红线（违反即失败）

- 布局/几何动画**只允许 `transform`/`opacity`**（合成器友好）；**禁止动画 layout 属性**（left/top/width/height/margin/padding）。
- **模糊（backdrop-filter）永不动画**。
- 时长/曲线一律经 CSS 变量（`--dur-*`/`--ease-*`）。
- **paint-only 豁免**：`background`/`border-color`/`box-shadow`/`color`/`filter` 允许用于 hover/focus/active 短暂过渡（不做入场/离场主体）。
- 超过 6 项同时动画必须 stagger；动效降级（reduced-motion/`data-motion=off`）时时长与 delay 一并归零。

### 5.5 图标

全部内联 SVG（Lucide 风格、currentColor、aria-hidden），统一 `icon(name, size, stroke)`。新图标先在 `icon.js` 的 `PATHS` 加路径（与既有 Lucide 风格一致：24×24 viewBox、stroke 1.8、round cap/join），**不要在页面里内联手写 SVG**。

### 5.6 类名约定

- 组件类 `c-` 前缀；壳局部类 `app-main__*`；场景/展示区新增实例用**局部类名**（如 `csg__*`、`cust-*`）——避免与全页严格计数断言（e2e）冲突。
- 设置分区复用 `.csettings__*`（`settings-pages.js`），外观定制器用 `.cust-*`。

### 5.7 参考实现

- 占位页：`app-main.js` 的 `placeholderPage`（骨架 + 空状态）。
- 概览页：`renderOverview`（欢迎卡 + 快捷入口网格 + 主题状态卡）。
- 设置页：`src/scenes/settings-window/settings-pages.js`（表单字段 / 主题三态 / 开关 / 保存 / 快捷键）。
- 完整独立应用：`src/scenes/clipboard-float/`（悬浮窗形态）。

---

## 6. 配置与状态

### 6.1 配置链路（新增可配置参数必须三件套齐）

界面参数修改**必须经完整链路**，不绕过直接写 CSS 变量：

1. `src/config/defaults.js` — `DEFAULTS` 加默认值 + `RANGES` 加范围（定制器滑杆用）。
2. `src/config/store.js` — `getConfig()`/`saveConfig()`（localStorage 持久化 + 订阅）。
3. `src/config/apply.js` — `applyConfig(cfg)` 写入 CSS 变量覆盖层 + `data-theme/accent/motion`。

示例（参考 `defaults.js` 既有项）：新增「列表密度」参数 → defaults 加 `{ density: 'comfortable' }`、RANGES 加滑杆、apply 写 `--list-density`。

### 6.2 会话内纯 UI 态（不进 store）

**不是用户持久偏好、只是当前界面状态**的值，直接设，不走配置链路：
- 背景装饰预设：`.app-main` 的 `data-backdrop` 直接设（外观分区预览卡切换，会话内）。
- 右窗状态（目录轮选中 / 设置分区）：纯 UI 态，进 `state` 对象不进 store。

---

## 7. 场景模板（完整参考，按需复制）

| 场景 | 位置 | 内容 |
|---|---|---|
| 应用壳 + 模块 | `src/app/app-main.js` | MODULES 契约、双窗级联、内容区、设置模式、悬浮演示 |
| 设置页 | `src/scenes/settings-window/` | 10 分区、表单组件、主题三态、保存/订阅、快捷键 |
| 剪贴板悬浮窗 | `src/scenes/clipboard-float/` | `FloatingWindow` 完整应用：拖拽/置顶/折叠/聚焦搜索 |
| 悬浮条 | `src/app/strip-main.js` + `float-strip` 组件 | FloatStrip 横竖形态、四边磁吸、旋转 |

---

## 8. Tauri 桌面壳

- 接入 Rust Tauri 的**窗口/透明/拖拽/悬浮窗**完整配置见 `docs/tauri-integration.md`。
- 模式入口：`src/app/mode.js` 的 `resolveMode` 只返回 `'app' | 'strip'`；`?mode=app`/`?mode=strip` 显式优先，无参数/非法值/`?mode=docs` → `'app'`。
- 应用壳在浏览器与 Tauri 渲染一致（`window.__TAURI__` 探测决定是否联动 Rust 窗口 API）。

---

## 9. 测试与验证

```bash
npm test                # Vitest 单测（逻辑/配置改动必跑）
npm run test:e2e        # Playwright 全量交互测试
npm run test:visual     # 视觉基线对比
npm run build           # 每次提交前必跑
```

- **e2e 用 worktree 配置**规避陈旧 server：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，该文件本地生成、不入库）。
- 视觉改动：检查基线是否需重生成（`--update-snapshots`），**基线变化必须先确认由本次改动引起**；截图前等字体加载（`document.fonts.load` 含 500 档）。
- 视觉基线平台耦合（chromium-win32），换平台/CI 需重生成。

---

## 10. 常见坑（实战沉淀）

- **Playwright `filter({hasText})` 只匹配可见文本**（不匹配 title——用 sr-only 方案）；`transform` 计算值恒为 `matrix(...)`；`evaluate` 勿返回永不 resolve 的 Promise；jsdom 无 `matchMedia` 需守卫。
- **Chromium 151 将 `color-mix` 计算值序列化为 `oklab(...)`**：断言颜色别硬匹配序列化格式，用 canvas 解析或归一化为 rgb。
- **`--accent-300` 等为纯 hex 非 color-mix**：判定"中性 vs 彩色"阴影须用 blur/尺寸特征值或解析令牌色，不能只判 `not color(`。
- **视觉基线**：按钮矩阵等在设置窗 fold 下（截图仅含顶部 ~816px）→ 需滚到 showcase 单独捕获（见 `visual-regression.spec.js` 的 `buttons` SHOT）。
- **e2e 冷启动 flake**：`page.goto` 后首断言 5s 超时多属环境时序（惰性元素未就绪 / 普惠体 5.3MB 加载），隔离重跑绿即接受，勿归因产品改动。
- **Tauri 透明窗**：`body` 需显式清背景透明；`backdrop-filter` 不模糊透明窗背后的桌面（真窗口玻璃退化为半透明 tint）。
- **全局 `box-sizing: border-box`**（base.css）：给组件加 `border` 不改其盒高，尺寸计算按此。
- **背景装饰预设为会话内 UI 态**：切换用 `data-backdrop` 直接设，不进 store（延续 B2 决策）。
- **`--radius-*` 必须配 `--radius-scale`**（定制器缩放）：`calc(var(--radius-md) * var(--radius-scale, 1))`。
