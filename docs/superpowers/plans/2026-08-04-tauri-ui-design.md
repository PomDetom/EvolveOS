# Tauri 统一 UI 设计系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个零框架依赖的 Tauri 统一 UI 设计系统展示页：完整设计令牌 + 32 个原生组件 + 可配置主题定制器 + 3 个场景模板（剪贴板悬浮窗 / 主窗口 / 设置页），以「滑动选择」为核心设计语言。

**Architecture:** 纯原生 Web（Vite + HTML/CSS/JS，无框架、无依赖）。设计令牌存于 CSS 自定义属性（tokens.css 默认值 + themes.css 深浅映射 + data-accent 主题色覆盖）；可配置层（config/）将用户配置写入 CSS 变量覆盖层实现实时预览；组件为「结构化 HTML + CSS 类 + 渐进增强 JS」，统一 `render()`/`mount()` 接口；NavigationWheel 用 JS 驱动滚动与 focal 变形（GPU 合成，只动 transform/opacity）。

**Tech Stack:** Vite（dev/build）、原生 ES Modules、CSS 自定义属性、Vitest（jsdom 环境，单元测试）、Playwright（交互 + 视觉回归）。

## Global Constraints

- **零依赖**：package.json 运行时 dependencies 为空。仅 devDependencies：vite、vitest、jsdom、@playwright/test。
- **组件契约**：每个组件目录 `src/components/<name>/` 含 `<name>.css` 与 `<name>.js`；JS 导出 `render(): string`（HTML 字符串）与可选 `mount(root: HTMLElement): void`（交互挂载，在 render 结果已注入 DOM 后调用）。展示区统一调用。
- **类名**：BEM 风格，前缀 `c-`：`c-btn`, `c-btn__icon`, `c-btn--primary`。
- **图标**：全部内联 SVG，24×24 viewBox，stroke-width 1.8，圆润线性风格（Lucide 风格）。禁止外链图片。
- **动画红线**：只用 `transform` + `opacity`（GPU 合成）；禁止动画 layout 属性（width/height/top/left/margin）；**模糊值永不动画**；超过 6 项同时动画必须 stagger；所有时长/曲线经 CSS 变量（`--dur-*`, `--ease-*`）引用，禁止硬编码时长。
- **可访问性**：所有动效尊重 `prefers-reduced-motion`（降级 0ms 瞬切）；键盘可操作（Tab 导航、方向键切换 NavigationWheel）。
- **主题约定**：`data-theme="light|dark"` 挂在 `<html>`；`data-accent="indigo|teal|sky|amber|violet|emerald"` 与 data-theme 正交组合。
- **文案**：展示页与组件内全部中文文案。
- **配置持久化**：localStorage key `ui-design-config`；损坏 JSON 兜底深合并默认值，不崩溃。
- **文件编码**：UTF-8。行尾符：仓库使用 LF（git 已配置 autocrlf 警告可忽略）。

---

### Task 1: 项目脚手架（Vite + Vitest + Playwright）

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Create: `playwright.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `.gitignore`

**Interfaces:**
- Produces: `npm run dev`（开发服务器）、`npm test`（vitest run）、`npm run test:e2e`（playwright test）、`npm run build`（vite build）；`index.html` 含 `<div id="app">`；`src/main.js` 为 ES module 入口。

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "ui-design",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.0.0",
    "jsdom": "^26.0.0",
    "@playwright/test": "^1.50.0"
  }
}
```

- [ ] **Step 2: 写 vite / vitest / playwright 配置**

`vite.config.js`:
```js
import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5173, strictPort: true },
});
```

`vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
});
```

`playwright.config.js`:
```js
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

- [ ] **Step 3: 写 index.html 骨架与 .gitignore**

`index.html`（占位骨架，Task 3 会填真内容）:
```html
<!doctype html>
<html lang="zh-CN" data-theme="light" data-accent="indigo">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UI Design System</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

`.gitignore`:
```
node_modules/
dist/
test-results/
playwright-report/
```

`src/main.js`（临时占位，后续任务逐步填充）:
```js
console.log('ui-design boot');
```

- [ ] **Step 4: 安装依赖并验证**

Run: `npm install`
Run: `npx playwright install chromium`
Run: `npm run dev` 后台启动，`curl http://localhost:5173` — Expected: HTML 200
Run: `npm test` — Expected: 无测试，exit 0
Run: `npm run test:e2e` — Expected: 无测试，exit 0

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: 项目脚手架（vite/vitest/playwright）"
```

---

### Task 2: 设计令牌层（tokens.css / themes.css / motion.css / base.css）

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/themes.css`
- Create: `src/styles/motion.css`
- Create: `src/styles/base.css`

**Interfaces:**
- Produces: CSS 变量命名契约（后续所有组件必须引用，禁止硬编码值）：
  - 中性色：`--neutral-50` … `--neutral-950`（50/100/200/300/400/500/600/700/800/900/950，共 11 级，定义于 tokens.css）
  - 强调色：`--accent-50`…`--accent-950`、`--accent`、`--accent-hover`、`--accent-active`、`--accent-contrast`（文本色），定义于 themes.css 的 `[data-accent=…]` 块
  - 语义色：`--success-*`/`--warning-*`/`--danger-*`/`--info-*`（各 50/500/600 三档）
  - 玻璃：`--glass-bg`、`--glass-blur`、`--glass-highlight`、`--glass-shadow`、`--glass-border`（由 themes.css 按主题定义；blur/highlight 可被 config 覆盖）
  - 字体：`--font-sans`、`--font-mono`、`--font-size-*`（xs/sm/base/lg/xl/2xl/3xl）、`--font-weight-*`（regular/medium/semibold/bold）
  - 间距：`--space-1`(4px) … `--space-6`(48px)（1=4 2=8 3=12 4=16 5=24 6=32 7=48）
  - 圆角：`--radius-xs`(6px) `--radius-sm`(8px) `--radius-md`(12px) `--radius-lg`(16px) `--radius-xl`(20px) `--radius-full`(999px)；`--radius-scale`(默认 1，config 覆盖)
  - 阴影：`--shadow-sm`/`--shadow-md`/`--shadow-lg`、`--shadow-inset-highlight`
  - 层级：`--z-base`(1)/`--z-float`(10)/`--z-overlay`(20)/`--z-modal`(30)/`--z-toast`(40)
  - 文本：`--text-1`（主）/`--text-2`（次）/`--text-3`（弱）
  - 表面：`--surface-1`/`--surface-2`（卡片层）/`--surface-hover`
  - 动效（motion.css）：`--dur-fast`(120ms)/`--dur-base`(200ms)/`--dur-slow`(300ms)、`--ease-out`、`--ease-spring`、`--spring-strength`(0.6)

- [ ] **Step 1: 写 tokens.css — 中性色 / 字体 / 间距 / 圆角 / 阴影 / 层级**

```css
:root {
  /* 中性色阶（冷调灰，供 themes.css 映射使用 —— 注意：本文件只放「数值」，主题映射放 themes.css） */
  --neutral-50: #f7f8fa;  --neutral-100: #eef0f4;  --neutral-200: #e2e5eb;
  --neutral-300: #cdd2db;  --neutral-400: #aab1bd;  --neutral-500: #8a92a1;
  --neutral-600: #6b7280;  --neutral-700: #525a66;  --neutral-800: #3a4049;
  --neutral-900: #262a31;  --neutral-950: #1a1d23;

  /* 强调色占位：默认靛蓝（themes.css 的 data-accent 块覆盖） */
  --accent-50: #eef0ff;  --accent-100: #dfe3ff;  --accent-200: #c3caff;
  --accent-300: #a0a9f9;  --accent-400: #828cf6;  --accent-500: #6e7bf2;
  --accent-600: #5a63e0;  --accent-700: #4a50b8;  --accent-800: #3c4192;
  --accent-900: #31356e;  --accent-950: #23254d;
  --accent: var(--accent-500);
  --accent-hover: var(--accent-400);
  --accent-active: var(--accent-600);
  --accent-contrast: #ffffff;

  /* 字体 */
  --font-sans: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  --font-size-xs: 10px;  --font-size-sm: 12px;  --font-size-base: 14px;
  --font-size-lg: 16px;  --font-size-xl: 20px;  --font-size-2xl: 24px;  --font-size-3xl: 28px;
  --font-weight-regular: 400;  --font-weight-medium: 500;
  --font-weight-semibold: 600;  --font-weight-bold: 700;
  --line-height-tight: 1.4;  --line-height-base: 1.6;

  /* 间距（4px 基准） */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
  --space-5: 24px;  --space-6: 32px;  --space-7: 48px;

  /* 圆角 */
  --radius-xs: 6px;  --radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 16px;
  --radius-xl: 20px;  --radius-full: 999px;
  --radius-scale: 1; /* 定制器覆盖：实际使用 calc(var(--radius-md) * var(--radius-scale)) */

  /* 层级 */
  --z-base: 1;  --z-float: 10;  --z-overlay: 20;  --z-modal: 30;  --z-toast: 40;
}
```

- [ ] **Step 2: 写 themes.css — 深浅主题 + 6 套主题色**

```css
/* 亮色主题 */
:root[data-theme="light"] {
  --text-1: var(--neutral-900);  --text-2: var(--neutral-600);  --text-3: var(--neutral-400);
  --surface-1: rgba(255,255,255,0.72);  --surface-2: rgba(255,255,255,0.85);
  --surface-hover: rgba(0,0,0,0.045);
  --glass-bg: rgba(248,249,251,0.72);  --glass-blur: 20px;
  --glass-highlight: rgba(255,255,255,0.5);  --glass-border: rgba(255,255,255,0.6);
  --glass-shadow: 0 8px 32px rgba(20,24,40,0.14), 0 2px 8px rgba(20,24,40,0.08);
  --shadow-sm: 0 1px 3px rgba(20,24,40,0.10);
  --shadow-md: 0 4px 16px rgba(20,24,40,0.12);
  --shadow-lg: 0 12px 40px rgba(20,24,40,0.18);
  --shadow-inset-highlight: inset 0 1px 0 rgba(255,255,255,0.55);
  --scrollbar-track: transparent;  --scrollbar-thumb: rgba(0,0,0,0.18);
}

/* 暗色主题 */
:root[data-theme="dark"] {
  --text-1: var(--neutral-100);  --text-2: var(--neutral-400);  --text-3: var(--neutral-600);
  --surface-1: rgba(26,29,35,0.62);  --surface-2: rgba(32,36,44,0.78);
  --surface-hover: rgba(255,255,255,0.06);
  --glass-bg: rgba(24,26,32,0.62);  --glass-blur: 28px;
  --glass-highlight: rgba(255,255,255,0.08);  --glass-border: rgba(255,255,255,0.08);
  --glass-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.35);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.42);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.55);
  --shadow-inset-highlight: inset 0 1px 0 rgba(255,255,255,0.06);
  --scrollbar-track: transparent;  --scrollbar-thumb: rgba(255,255,255,0.16);
}

/* 6 套主题色：仅覆盖强调色系（靛蓝已在 tokens.css 中，其余 5 套在这里定义） */
:root[data-accent="teal"] {
  --accent-50: #e8fbf5;  --accent-100: #ccf6ea;  --accent-200: #9bead7;
  --accent-300: #5fdcc0;  --accent-400: #2dd4bf;  --accent-500: #14b8a6;
  --accent-600: #0d9488;  --accent-700: #0f766e;  --accent-800: #115e59;
  --accent-900: #134e4a;  --accent-950: #042f2e;
  --accent: var(--accent-400);  --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500);  --accent-contrast: #042f2e;
}
:root[data-accent="sky"] {
  --accent-50: #f0f9ff;  --accent-100: #e0f2fe;  --accent-200: #bae6fd;
  --accent-300: #7dd3fc;  --accent-400: #38bdf8;  --accent-500: #0ea5e9;
  --accent-600: #0284c7;  --accent-700: #0369a1;  --accent-800: #075985;
  --accent-900: #0c4a6e;  --accent-950: #082f49;
  --accent: var(--accent-400);  --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500);  --accent-contrast: #082f49;
}
:root[data-accent="amber"] {
  --accent-50: #fffbeb;  --accent-100: #fef3c7;  --accent-200: #fde68a;
  --accent-300: #fcd34d;  --accent-400: #fbbf24;  --accent-500: #f59e0b;
  --accent-600: #d97706;  --accent-700: #b45309;  --accent-800: #92400e;
  --accent-900: #78350f;  --accent-950: #451a03;
  --accent: var(--accent-400);  --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500);  --accent-contrast: #451a03;
}
:root[data-accent="violet"] {
  --accent-50: #f5f3ff;  --accent-100: #ede9fe;  --accent-200: #ddd6fe;
  --accent-300: #c4b5fd;  --accent-400: #a78bfa;  --accent-500: #8b5cf6;
  --accent-600: #7c3aed;  --accent-700: #6d28d9;  --accent-800: #5b21b6;
  --accent-900: #4c1d95;  --accent-950: #2e1065;
  --accent: var(--accent-400);  --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500);  --accent-contrast: #2e1065;
}
:root[data-accent="emerald"] {
  --accent-50: #ecfdf5;  --accent-100: #d1fae5;  --accent-200: #a7f3d0;
  --accent-300: #6ee7b7;  --accent-400: #34d399;  --accent-500: #10b981;
  --accent-600: #059669;  --accent-700: #047857;  --accent-800: #065f46;
  --accent-900: #064e3b;  --accent-950: #022c22;
  --accent: var(--accent-400);  --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500);  --accent-contrast: #022c22;
}

/* 语义色（两种主题通用基准；深色下自动使用浅档） */
:root {
  --success-50: #ecfdf5;  --success-500: #10b981;  --success-600: #059669;
  --warning-50: #fffbeb;  --warning-500: #f59e0b;  --warning-600: #d97706;
  --danger-50: #fef2f2;  --danger-500: #ef4444;  --danger-600: #dc2626;
  --info-50: #eff6ff;  --info-500: #3b82f6;  --info-600: #2563eb;
}
:root[data-theme="dark"] {
  --success-500: #34d399;  --success-600: #10b981;
  --warning-500: #fbbf24;  --warning-600: #f59e0b;
  --danger-500: #f87171;  --danger-600: #ef4444;
  --info-500: #60a5fa;  --info-600: #3b82f6;
}
```

- [ ] **Step 3: 写 motion.css — 动效令牌 + reduced-motion 降级**

```css
:root {
  --dur-fast: 120ms;  --dur-base: 200ms;  --dur-slow: 300ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 默认弹性 0.6，config 覆盖 */
  --spring-strength: 0.6;
}
@media (prefers-reduced-motion: reduce) {
  :root, :root[data-motion="off"] {
    --dur-fast: 0ms;  --dur-base: 0ms;  --dur-slow: 0ms;
  }
}
```

- [ ] **Step 4: 写 base.css — 重置 + 字体 + 滚动条 + 玻璃工具类**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-sans);  font-size: var(--font-size-base);
  line-height: var(--line-height-base);  color: var(--text-1);
  background: var(--glass-bg);  -webkit-font-smoothing: antialiased;
  overflow: hidden; /* 展示页为应用式布局，滚动在内容容器内 */
}
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
input, textarea, select { font: inherit; color: inherit; }
::selection { background: var(--accent-200); }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 999px; }

/* 玻璃面板工具类：外壳级材质 */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--shadow-inset-highlight);
}

/* 焦点环（所有可聚焦元素） */
:focus-visible { outline: 2px solid var(--accent-500); outline-offset: 2px; }
```

- [ ] **Step 5: 在 main.js 中引入样式并验证**

修改 `src/main.js`:
```js
import './styles/tokens.css';
import './styles/themes.css';
import './styles/motion.css';
import './styles/base.css';
```

- [ ] **Step 6: 写 Playwright 验证测试**

Create `tests/e2e/tokens.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('设计令牌已挂载', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveAttribute('data-accent', 'indigo');
  const bg = await root.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(bg).toBe('#6e7bf2');
});

test('切换 data-accent 后强调色变化', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.documentElement.dataset.accent = 'teal');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(bg).toBe('#2dd4bf');
});
```

- [ ] **Step 7: 运行测试**

Run: `npm test`（无单测，exit 0）
Run: `npm run test:e2e` — Expected: 2 PASS

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 设计令牌层（tokens/themes/motion/base + 6 套主题色）"
```

---

### Task 3: 展示页静态骨架（顶部栏 + 滑动导航容器 + 内容区）

**Files:**
- Create: `src/demo/theme-switcher.js`（占位导出，Task 5 填充）
- Modify: `index.html`
- Modify: `src/main.js`

**Interfaces:**
- Produces: DOM 结构（后续任务挂载点）：
  - `#app` 内：`header.topbar`（含 `.topbar__brand`、`.topbar__nav`（快捷跳转）、`.topbar__theme`、`.topbar__customizer` 按钮）、`aside.navwheel`（NavigationWheel 容器，Task 11 挂载）、`main.content`（内含 `<section id="tokens">`/`<section id="components">`/`<section id="motion">`/`<section id="scenes">`）
  - `aside.navwheel` 内含 `nav.navwheel__list` 与 `button.navwheel__settings`（左下角设置入口，Task 12 完善）

- [ ] **Step 1: 写 index.html 骨架**

```html
<!doctype html>
<html lang="zh-CN" data-theme="light" data-accent="indigo">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UI Design System</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写 main.js — 渲染应用骨架**

```js
import './styles/tokens.css';
import './styles/themes.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/layout.css';

const NAV_CORE = [
  { id: 'tokens',    name: '设计令牌', icon: 'palette' },
  { id: 'components', name: '组件',    icon: 'box' },
  { id: 'motion',    name: '动效',    icon: 'sparkles' },
  { id: 'scenes',    name: '场景模板', icon: 'layout' },
];
// 导航项 ×3 重复 —— 4 个真实模块 + 演示重复项，保证列表高度超过导航容器，
// 「上下滑动选择 + 居中吸附」真实生效（用户确认的演示方案）
const NAV_ITEMS = [...NAV_CORE, ...NAV_CORE, ...NAV_CORE];

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__brand">UI Design System</div>
      <nav class="topbar__nav">${NAV_ITEMS.map(i => `<a href="#${i.id}">${i.name}</a>`).join('')}</nav>
      <div class="topbar__actions">
        <div class="topbar__theme" data-mount="theme-switcher"></div>
        <button class="topbar__customizer" data-mount="customizer-open">定制</button>
      </div>
    </header>
    <aside class="navwheel">
      <nav class="navwheel__list" data-mount="nav-wheel"></nav>
      <button class="navwheel__settings" data-mount="settings-entry">设置</button>
    </aside>
    <main class="content">
      <section id="tokens" class="content__section"></section>
      <section id="components" class="content__section"></section>
      <section id="motion" class="content__section"></section>
      <section id="scenes" class="content__section"></section>
    </main>
  </div>
`;
```

- [ ] **Step 3: 写 layout.css — 应用式布局**

Create `src/styles/layout.css`:
```css
.app-shell { display: grid; grid-template-columns: 176px 1fr; grid-template-rows: 40px 1fr;
  height: 100vh; }
.topbar { grid-column: 1 / -1; display: flex; align-items: center; gap: var(--space-4);
  padding: 0 var(--space-4); background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)); border-bottom: 1px solid var(--glass-border); }
.topbar__brand { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); }
.topbar__nav { display: flex; gap: var(--space-3); }
.topbar__nav a { font-size: var(--font-size-sm); color: var(--text-2); text-decoration: none;
  padding: 4px 8px; border-radius: var(--radius-sm); }
.topbar__nav a:hover { color: var(--text-1); background: var(--surface-hover); }
.topbar__actions { margin-left: auto; display: flex; gap: var(--space-2); align-items: center; }
.navwheel { position: relative; border-right: 1px solid var(--glass-border); overflow: hidden; }
.navwheel__list { position: absolute; inset: 0 0 56px 0; overflow-y: auto; }
.navwheel__settings { position: absolute; bottom: 0; left: 0; right: 0; height: 56px;
  display: flex; align-items: center; justify-content: center; gap: var(--space-2);
  border-top: 1px solid var(--glass-border); background: var(--glass-bg);
  color: var(--text-2); font-size: var(--font-size-sm); }
.navwheel__settings:hover { color: var(--text-1); }
.content { overflow-y: auto; padding: var(--space-6); }
.content__section { max-width: 1200px; margin: 0 auto var(--space-7);
  padding-top: var(--space-2); }
.content__section h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-5); }
```

- [ ] **Step 4: 写 Playwright 骨架测试**

Create `tests/e2e/layout.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('应用骨架结构完整', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.navwheel__list')).toBeVisible();
  await expect(page.locator('.navwheel__settings')).toContainText('设置');
  await expect(page.locator('.content__section')).toHaveCount(4);
  for (const id of ['tokens', 'components', 'motion', 'scenes']) {
    await expect(page.locator(`section#${id}`)).toBeVisible();
  }
});
```

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 3 PASS（tokens 2 + layout 1）

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 展示页应用骨架（顶部栏/导航容器/内容区）"
```

---

### Task 4: 可配置层（defaults.js / store.js / apply.js）

**Files:**
- Create: `src/config/defaults.js`
- Create: `src/config/store.js`
- Create: `src/config/apply.js`
- Create: `src/motion/spring.js`
- Test: `tests/unit/store.test.js`
- Test: `tests/unit/apply.test.js`
- Test: `tests/unit/spring.test.js`

**Interfaces:**
- `defaults.js` 导出：
  - `DEFAULTS`（对象，结构见下）
  - `RANGES`（`{ opacity: [0.4, 0.95, 0.01], blur: [8, 48, 1], highlight: [0, 1, 0.05], baseSize: [12, 16, 0.5], scale: [0.9, 1.15, 0.01], radiusScale: [0.7, 1.6, 0.05], durationScale: [0.5, 2, 0.05], springStrength: [0, 1, 0.05], shadowIntensity: [0, 1, 0.05], saturation: [60, 120, 1], temperature: [-1, 1, 0.05] }`）
  - `ACCENTS`（6 套元数据：`[{ id: 'indigo', name: '靛蓝', color: '#6e7bf2', desc: '冷静、专业' }, …]`）
  - `THEME_MODES = ['system', 'light', 'dark']`
- `store.js` 导出：`getConfig()`、`saveConfig(patch)`（深合并后写 localStorage + 通知订阅者）、`subscribe(fn)`、`deepMerge(base, override)`
- `apply.js` 导出：`applyConfig(cfg, root = document.documentElement)`、`prefersDark()`
- `motion/spring.js` 导出：`springCurve(strength)`、`scaledDurations(cfg)`、`springCurveAt(strength)`（返回 CSS 字符串）

**DEFAULTS 结构**（全局契约，后续任务全部引用）:
```js
{
  theme: 'system',           // system | light | dark
  accent: 'indigo',          // indigo | teal | sky | amber | violet | emerald
  glass: { opacity: 0.62, blur: 24, highlight: 0.5 },  // opacity 0-1；blur px；highlight 0-1
  type: { baseSize: 14, scale: 1, weight: 400 },
  radiusScale: 1,
  motion: { enabled: true, durationScale: 1, springStrength: 0.6 },
  shadow: 0.5,               // 0-1 阴影强度
  color: { saturation: 100, temperature: 0 },  // 中性色温：-1 冷 → 1 暖
}
```

- [ ] **Step 1: 写失败的单测 — store 深合并与兜底**

Create `tests/unit/store.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { deepMerge, getConfig, saveConfig } from '../../src/config/store.js';
import { DEFAULTS } from '../../src/config/defaults.js';

describe('deepMerge', () => {
  it('嵌套对象深合并，补全缺失键', () => {
    const r = deepMerge({ a: { x: 1, y: 2 }, b: 3 }, { a: { y: 9 } });
    expect(r).toEqual({ a: { x: 1, y: 9 }, b: 3 });
  });
  it('覆盖数组与标量', () => {
    const r = deepMerge({ list: [1, 2] }, { list: [3] });
    expect(r.list).toEqual([3]);
  });
});

describe('getConfig', () => {
  beforeEach(() => localStorage.clear());
  it('无存储时返回默认配置', () => {
    expect(getConfig()).toEqual(DEFAULTS);
  });
  it('损坏 JSON 兜底为默认值', () => {
    localStorage.setItem('ui-design-config', '{broken!!');
    expect(getConfig()).toEqual(DEFAULTS);
  });
  it('部分配置深合并默认值', () => {
    localStorage.setItem('ui-design-config', JSON.stringify({ accent: 'teal' }));
    const c = getConfig();
    expect(c.accent).toBe('teal');
    expect(c.glass.blur).toBe(DEFAULTS.glass.blur);
  });
});

describe('saveConfig', () => {
  it('写入并持久化', () => {
    saveConfig({ accent: 'sky' });
    expect(JSON.parse(localStorage.getItem('ui-design-config')).accent).toBe('sky');
    expect(getConfig().accent).toBe('sky');
  });
});
```

- [ ] **Step 2: 运行单测确认失败**

Run: `npx vitest run tests/unit/store.test.js` — Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 defaults.js 与 store.js**

Create `src/config/defaults.js`:
```js
export const DEFAULTS = {
  theme: 'system',
  accent: 'indigo',
  glass: { opacity: 0.62, blur: 24, highlight: 0.5 },
  type: { baseSize: 14, scale: 1, weight: 400 },
  radiusScale: 1,
  motion: { enabled: true, durationScale: 1, springStrength: 0.6 },
  shadow: 0.5,
  color: { saturation: 100, temperature: 0 },
};

export const RANGES = {
  opacity: [0.4, 0.95, 0.01],
  blur: [8, 48, 1],
  highlight: [0, 1, 0.05],
  baseSize: [12, 16, 0.5],
  scale: [0.9, 1.15, 0.01],
  radiusScale: [0.7, 1.6, 0.05],
  durationScale: [0.5, 2, 0.05],
  springStrength: [0, 1, 0.05],
  shadowIntensity: [0, 1, 0.05],
  saturation: [60, 120, 1],
  temperature: [-1, 1, 0.05],
};

export const ACCENTS = [
  { id: 'indigo', name: '靛蓝', color: '#6e7bf2', desc: '冷静、专业' },
  { id: 'teal', name: '青绿', color: '#2dd4bf', desc: '清爽、科技' },
  { id: 'sky', name: '天蓝', color: '#38bdf8', desc: '明朗、开放' },
  { id: 'amber', name: '琥珀', color: '#f59e0b', desc: '活力、温暖' },
  { id: 'violet', name: '紫罗兰', color: '#a78bfa', desc: '优雅、个性' },
  { id: 'emerald', name: '翡翠', color: '#34d399', desc: '自然、治愈' },
];

export const THEME_MODES = ['system', 'light', 'dark'];
```

Create `src/config/store.js`:
```js
import { DEFAULTS } from './defaults.js';

const KEY = 'ui-design-config';
const listeners = new Set();

export function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function getConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return deepMerge(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveConfig(patch) {
  const next = deepMerge(getConfig(), patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* 隐私模式：仅内存生效 */ }
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

- [ ] **Step 4: 运行单测确认通过**

Run: `npx vitest run tests/unit/store.test.js` — Expected: 6 PASS

- [ ] **Step 5: 写失败单测 — spring 曲线与 apply 映射**

Create `tests/unit/spring.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { springCurve, scaledDurations } from '../../src/motion/spring.js';

describe('springCurve', () => {
  it('强度 0 时退化为标准 ease-out', () => {
    expect(springCurve(0)).toBe('cubic-bezier(0.34, 1, 0.64, 1)');
  });
  it('强度 1 时达到最大回弹', () => {
    expect(springCurve(1)).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });
  it('中间强度线性插值', () => {
    expect(springCurve(0.5)).toBe('cubic-bezier(0.34, 1.28, 0.64, 1)');
  });
});

describe('scaledDurations', () => {
  it('按缩放因子缩放三个时长', () => {
    expect(scaledDurations(1.5)).toEqual({ fast: 180, base: 300, slow: 450 });
  });
  it('关闭动效时全部为 0', () => {
    expect(scaledDurations(1.5, false)).toEqual({ fast: 0, base: 0, slow: 0 });
  });
});
```

Create `tests/unit/apply.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { applyConfig } from '../../src/config/apply.js';
import { DEFAULTS } from '../../src/config/defaults.js';

describe('applyConfig', () => {
  let root;
  beforeEach(() => {
    root = document.documentElement;
    root.removeAttribute('data-theme');
    root.removeAttribute('data-accent');
    root.removeAttribute('style');
  });

  it('写入 data-theme 与 data-accent', () => {
    applyConfig({ ...DEFAULTS, theme: 'light', accent: 'teal' }, root);
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.accent).toBe('teal');
  });
  it('system 主题解析为系统偏好', () => {
    applyConfig(DEFAULTS, root);
    expect(root.dataset.theme).toMatch(/^(light|dark)$/);
  });
  it('玻璃与动效参数写入 CSS 变量覆盖层', () => {
    applyConfig({ ...DEFAULTS, glass: { opacity: 0.8, blur: 30, highlight: 0.2 },
      motion: { enabled: true, durationScale: 1, springStrength: 0.6 } }, root);
    const s = root.style;
    expect(s.getPropertyValue('--glass-bg-opacity')).toBe('0.8');
    expect(s.getPropertyValue('--glass-blur')).toBe('30px');
    expect(s.getPropertyValue('--dur-fast')).toBe('120ms');
    expect(s.getPropertyValue('--ease-spring')).toBe('cubic-bezier(0.34, 1.336, 0.64, 1)');
  });
  it('动效关闭时时长全部为 0', () => {
    applyConfig({ ...DEFAULTS, motion: { enabled: false, durationScale: 1, springStrength: 0.6 } }, root);
    expect(root.style.getPropertyValue('--dur-fast')).toBe('0ms');
  });
});
```

注意：`--glass-bg-opacity` 需在 themes.css 中把 `--glass-bg` 改为 `rgba(…, var(--glass-bg-opacity))` 形式（glass 层基于各主题基准色）。`applyConfig` 对 opacity 的映射规则：`--glass-bg-opacity: calc(0.62 * var(--glass-opacity-scale))` — 简化：直接写 `cfg.glass.opacity`，并在 themes.css 中用 `rgb(from …)` 或预置三色变量。为保持简单：themes.css 里定义 `--glass-bg-rgb: 248 249 251`（亮）/ `24 26 32`（暗），apply 写入 `--glass-bg-opacity`，base.css 的 `.glass` 改为 `background: rgba(var(--glass-bg-rgb) / var(--glass-bg-opacity, 0.72));`。

- [ ] **Step 6: 运行单测确认失败**

Run: `npx vitest run tests/unit/spring.test.js tests/unit/apply.test.js` — Expected: FAIL

- [ ] **Step 7: 实现 spring.js 与 apply.js**

Create `src/motion/spring.js`:
```js
export function springCurve(strength) {
  const s = Math.max(0, Math.min(1, strength));
  const overshoot = 1 + 0.56 * s; // s=0 → 1.0（无回弹）；s=1 → 1.56（最大回弹）
  return `cubic-bezier(0.34, ${overshoot.toFixed(3)}, 0.64, 1)`;
}

export function scaledDurations(durationScale, enabled = true) {
  if (!enabled) return { fast: 0, base: 0, slow: 0 };
  return {
    fast: Math.round(120 * durationScale),
    base: Math.round(200 * durationScale),
    slow: Math.round(300 * durationScale),
  };
}
```

Create `src/config/apply.js`:
```js
import { springCurve, scaledDurations } from '../motion/spring.js';

export function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyConfig(cfg, root = document.documentElement) {
  root.dataset.theme = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme;
  root.dataset.accent = cfg.accent;
  root.dataset.motion = cfg.motion.enabled ? 'on' : 'off';

  const s = root.style;
  s.setProperty('--glass-bg-opacity', String(cfg.glass.opacity));
  s.setProperty('--glass-blur', `${cfg.glass.blur}px`);
  s.setProperty('--glass-highlight-opacity', String(cfg.glass.highlight));
  s.setProperty('--font-size-base', `${cfg.type.baseSize}px`);
  s.setProperty('--radius-scale', String(cfg.radiusScale));
  s.setProperty('--shadow-intensity', String(cfg.shadow));
  s.setProperty('--spring-strength', String(cfg.motion.springStrength));
  const d = scaledDurations(cfg.motion.durationScale, cfg.motion.enabled);
  s.setProperty('--dur-fast', `${d.fast}ms`);
  s.setProperty('--dur-base', `${d.base}ms`);
  s.setProperty('--dur-slow', `${d.slow}ms`);
  s.setProperty('--ease-spring', springCurve(cfg.motion.springStrength));
}
```

- [ ] **Step 8: 更新 themes.css 与 base.css 支持可覆盖参数**

themes.css 追加：
```css
:root[data-theme="light"] { --glass-bg-rgb: 248 249 251; --glass-highlight-rgb: 255 255 255; }
:root[data-theme="dark"] { --glass-bg-rgb: 24 26 32; --glass-highlight-rgb: 255 255 255; }
```

base.css 的 `.glass` 改为：
```css
.glass {
  background: rgba(var(--glass-bg-rgb) / var(--glass-bg-opacity, 0.72));
  backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  border: 1px solid rgba(255 255 255 / var(--glass-border-opacity, 0.08));
  box-shadow: var(--glass-shadow), var(--shadow-inset-highlight);
}
```

（`--glass-border-opacity`：亮色 0.6、暗色 0.08，由 themes.css 定义；`--glass-highlight` 改为 `rgba(var(--glass-highlight-rgb) / var(--glass-highlight-opacity, 0.5))`。radius 使用处统一写 `calc(var(--radius-md) * var(--radius-scale, 1))`。阴影强度映射 — themes.css 中把三层阴影的第二/三层透明度乘以 `var(--shadow-intensity, 0.5)`，只合成透明度不触发布局：

```css
:root[data-theme="light"] {
  --glass-shadow: 0 8px 32px rgba(20,24,40,calc(0.14 * var(--shadow-intensity, 0.5))),
                  0 2px 8px rgba(20,24,40,calc(0.08 * var(--shadow-intensity, 0.5)));
}
:root[data-theme="dark"] {
  --glass-shadow: 0 8px 32px rgba(0,0,0,calc(0.5 * var(--shadow-intensity, 0.5))),
                  0 2px 8px rgba(0,0,0,calc(0.3 * var(--shadow-intensity, 0.5)));
}
```

同样方式处理 `--shadow-sm/md/lg`。）

- [ ] **Step 9: 运行全部单测**

Run: `npm test` — Expected: 全部 PASS（store 6 + spring 5 + apply 4 = 15）

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat: 可配置层（defaults/store/apply + spring 曲线）"
```

---

### Task 5: 主题切换器（深/浅/跟随 + 6 套主题色）

**Files:**
- Create: `src/demo/theme-switcher.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `demo/theme-switcher.js` 导出 `mountThemeSwitcher(root)`：在 `.topbar__theme` 内渲染三态按钮（☀ 浅 / ☾ 深 / 显示器图标 跟随系统）与 6 色圆点选择器；点击写入 store 并 `applyConfig`；`matchMedia` 监听 system 模式变化；DOM 契约 `.tsw__mode`（3 个按钮，`.tsw__mode--active` 标记当前）与 `.tsw__accent`（6 个圆点，`.tsw__accent--active` 标记当前）

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/theme-switcher.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('切换深色主题生效并持久化', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tsw__mode').filter({ hasText: '深' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('切换主题色风格生效并持久化', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tsw__accent').filter({ hasText: '青绿' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/theme-switcher.spec.js` — Expected: FAIL（.tsw__mode 不存在）

- [ ] **Step 3: 实现 theme-switcher.js 并接入 main.js**

Create `src/demo/theme-switcher.js`:
```js
import { getConfig, saveConfig } from '../config/store.js';
import { applyConfig } from '../config/apply.js';
import { ACCENTS } from '../config/defaults.js';
import { icon } from '../components/icon/icon.js';

const MODES = [
  { id: 'light', label: '浅' }, { id: 'dark', label: '深' }, { id: 'system', label: '跟随' },
];

export function mountThemeSwitcher(root) {
  root.innerHTML = `
    <div class="tsw">
      <div class="tsw__modes">
        ${MODES.map(m => `<button class="tsw__mode" data-mode="${m.id}" title="${m.label}">${icon(m.id === 'light' ? 'sun' : m.id === 'dark' ? 'moon' : 'monitor')}</button>`).join('')}
      </div>
      <div class="tsw__accents">
        ${ACCENTS.map(a => `<button class="tsw__accent" data-accent="${a.id}" title="${a.name}（${a.desc}）" style="--swatch: ${a.color}"></button>`).join('')}
      </div>
    </div>`;
  const cfg = getConfig();
  syncUI(cfg);
  root.querySelector('.tsw__modes').addEventListener('click', (e) => {
    const btn = e.target.closest('.tsw__mode'); if (!btn) return;
    const next = saveConfig({ theme: btn.dataset.mode });
    applyConfig(next); syncUI(next);
  });
  root.querySelector('.tsw__accents').addEventListener('click', (e) => {
    const btn = e.target.closest('.tsw__accent'); if (!btn) return;
    const next = saveConfig({ accent: btn.dataset.accent });
    applyConfig(next); syncUI(next);
  });
  if (getConfig().theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      applyConfig(getConfig());
    });
  }
  function syncUI(c) {
    root.querySelectorAll('.tsw__mode').forEach(b =>
      b.classList.toggle('tsw__mode--active', b.dataset.mode === c.theme));
    root.querySelectorAll('.tsw__accent').forEach(b =>
      b.classList.toggle('tsw__accent--active', b.dataset.accent === c.accent));
  }
}
```

追加到 `src/styles/layout.css`（或新建 `src/styles/theme-switcher.css`）:
```css
.tsw { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
.tsw__modes { display: flex; gap: 4px; }
.tsw__mode { width: 28px; height: 28px; border-radius: var(--radius-sm); display: grid;
  place-items: center; color: var(--text-2); }
.tsw__mode:hover { color: var(--text-1); background: var(--surface-hover); }
.tsw__mode--active { color: var(--accent); background: var(--accent-50); }
.tsw__accents { display: flex; gap: 6px; }
.tsw__accent { width: 16px; height: 16px; border-radius: 50%;
  background: var(--swatch); opacity: 0.5; }
.tsw__accent:hover { opacity: 0.85; }
.tsw__accent--active { opacity: 1; box-shadow: 0 0 0 2px var(--glass-bg), 0 0 0 3px var(--swatch); }
```

`src/main.js` 中挂载（main.js 全部用 `data-mount` 挂载点，Task 5 先只挂主题切换器）:
```js
import { mountThemeSwitcher } from './demo/theme-switcher.js';
import { getConfig } from './config/store.js';
import { applyConfig } from './config/apply.js';

applyConfig(getConfig());
mountThemeSwitcher(document.querySelector('[data-mount="theme-switcher"]'));
```

（注意：`icon()` 来自 Task 6 — 本任务先在 `src/components/icon/icon.js` 中放最小实现，只含本任务用到的 4 个图标：sun/moon/monitor/（palette 等 Task 6 补全）。为避免任务间耦合，Task 6 会扩展同一文件。）

最小 icon.js（Task 6 扩展）:
```js
const PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
};
export function icon(name, size = 18) {
  return `<svg class="c-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${PATHS[name] ?? PATHS.monitor}</svg>`;
}
```

- [ ] **Step 4: 运行测试**

Run: `npm run test:e2e` — Expected: 5 PASS（tokens 2 + layout 1 + theme-switcher 2）

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 主题切换器（三态 + 6 套主题色 + 持久化）"
```

---

### Task 6: Icon 图标集 + Button 按钮

**Files:**
- Create: `src/components/icon/icon.css`
- Modify: `src/components/icon/icon.js`（扩展到 24 个图标）
- Create: `src/components/button/button.css`
- Create: `src/components/button/button.js`
- Create: `src/demo/component-showcase.js`（通用展示渲染器，后续所有组件任务复用）
- Modify: `src/main.js`

**Interfaces:**
- `icon.js` 导出 `icon(name, size)`（Task 5 已有）；新增图标名契约（后续任务引用）：`palette, box, sparkles, layout, settings, search, copy, pin, trash, close, minus, maximize, restore, check, plus, chevron-down, chevron-left, chevron-right, chevron-up, home, clipboard, key, wallet, bell, info, alert, shield, star, folder, image, music, flame, bolt, heart, globe, download, upload, refresh, edit, eye, lock, log-out, arrow-left, arrow-right, command, mouse-pointer, drag`
- `button.js` 导出 `renderButton({ label, variant, size, icon, disabled })` → HTML 字符串
- `component-showcase.js` 导出 `showcase(title, items)`（items: `{ label, html }` 数组）→ 注入 `.showcase` DOM；CSS 类：`.showcase`, `.showcase__item`, `.showcase__label`

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/components-basic.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('图标渲染为内联 SVG', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const div = document.createElement('div');
    div.innerHTML = window.__renderIcon('home');
    document.querySelector('.content').append(div);
  });
  await expect(page.locator('svg.c-icon')).toHaveCount(1);
});

test('按钮四变体渲染', async ({ page }) => {
  await page.goto('/');
  await page.locator('#components .showcase:has-text("按钮")').first().waitFor();
  await expect(page.locator('#components .c-btn--primary')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--secondary')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--ghost')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--danger')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--disabled')).toBeDisabled();
});
```

（`window.__renderIcon` 由 main.js 临时暴露用于测试，Task 14 组件展示区上线后此测试改用真实展示区断言 — 见 Task 14 说明。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/components-basic.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 icon 图标集与 icon.css**

`icon.js` 扩展 `PATHS`（Lucide 风格 path 数据，24×24）— 至少包含 Interfaces 列出的 44 个图标；本任务先实现 Task 6-13 需要的：`palette box sparkles layout settings search copy pin trash close minus maximize restore check plus chevron-down left right up home clipboard key wallet bell info alert star folder image edit refresh eye lock command`，其余在用到时补充。所有图标统一 `<svg class="c-icon" width height viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">`。

Create `src/components/icon/icon.css`:
```css
.c-icon { flex-shrink: 0; }
```

- [ ] **Step 4: 实现 button 组件**

Create `src/components/button/button.css`:
```css
.c-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  padding: 0 var(--space-4); height: 32px; border-radius: calc(var(--radius-sm) * var(--radius-scale, 1));
  transition: transform var(--dur-fast) var(--ease-spring), background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
  user-select: none; white-space: nowrap;
}
.c-btn:active { transform: scale(0.97); }
.c-btn--primary { background: var(--accent); color: var(--accent-contrast); }
.c-btn--primary:hover { background: var(--accent-hover); box-shadow: 0 4px 12px rgba(0,0,0,0.18); }
.c-btn--primary:active { background: var(--accent-active); }
.c-btn--secondary { background: var(--surface-2); color: var(--text-1);
  border: 1px solid var(--glass-border); }
.c-btn--secondary:hover { background: var(--surface-hover); }
.c-btn--ghost { color: var(--text-2); }
.c-btn--ghost:hover { background: var(--surface-hover); color: var(--text-1); }
.c-btn--danger { background: var(--danger-500); color: #fff; }
.c-btn--danger:hover { filter: brightness(1.08); }
.c-btn--sm { height: 26px; padding: 0 var(--space-3); font-size: var(--font-size-xs); }
.c-btn--lg { height: 40px; padding: 0 var(--space-5); font-size: var(--font-size-base); }
.c-btn:disabled { opacity: 0.45; pointer-events: none; }
```

Create `src/components/button/button.js`:
```js
import { icon } from '../icon/icon.js';

export function renderButton({ label, variant = 'primary', size = 'md', iconName = null, disabled = false, title = '' } = {}) {
  const cls = ['c-btn', `c-btn--${variant}`];
  if (size !== 'md') cls.push(`c-btn--${size}`);
  if (disabled) cls.push('c-btn--disabled');
  return `<button class="${cls.join(' ')}"${disabled ? ' disabled' : ''}${title ? ` title="${title}"` : ''}>
    ${iconName ? icon(iconName) : ''}${label}</button>`;
}
```

- [ ] **Step 5: 实现 component-showcase.js 通用渲染器**

Create `src/demo/component-showcase.js`:
```js
export function showcase(title, items) {
  const wrap = document.createElement('div');
  wrap.className = 'showcase';
  wrap.innerHTML = `
    <h3 class="showcase__title">${title}</h3>
    <div class="showcase__grid">
      ${items.map(it => `<div class="showcase__item">
        <div class="showcase__stage">${it.html}</div>
        <div class="showcase__label">${it.label}</div>
      </div>`).join('')}
    </div>`;
  return wrap;
}
```

追加展示样式（`src/styles/layout.css`）:
```css
.showcase { margin-bottom: var(--space-6); }
.showcase__title { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-3); }
.showcase__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-4); }
.showcase__item { padding: var(--space-4); border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  background: var(--surface-1); border: 1px solid var(--glass-border);
  display: flex; flex-direction: column; gap: var(--space-3); }
.showcase__stage { display: flex; align-items: center; justify-content: center;
  gap: var(--space-2); min-height: 48px; }
.showcase__label { font-size: var(--font-size-xs); color: var(--text-3); text-align: center; }
```

- [ ] **Step 6: main.js 接入 — 组件展示区初始渲染**

修改 `src/main.js`（在骨架渲染后追加）:
```js
import { showcase } from './demo/component-showcase.js';
import { renderButton } from './components/button/button.js';

const componentsSection = document.querySelector('#components');
componentsSection.innerHTML = '<h2>组件</h2>';
componentsSection.appendChild(showcase('按钮 Button', [
  { label: '主按钮', html: renderButton({ label: '确定', variant: 'primary' }) },
  { label: '次按钮', html: renderButton({ label: '取消', variant: 'secondary' }) },
  { label: '幽灵按钮', html: renderButton({ label: '更多', variant: 'ghost', iconName: 'chevron-down' }) },
  { label: '危险按钮', html: renderButton({ label: '删除', variant: 'danger' }) },
  { label: '小尺寸', html: renderButton({ label: '小按钮', size: 'sm' }) },
  { label: '大尺寸', html: renderButton({ label: '大按钮', size: 'lg', iconName: 'plus' }) },
  { label: '禁用', html: renderButton({ label: '禁用', disabled: true }) },
]));
```

（`window.__renderIcon` 暴露：`window.__renderIcon = icon;` 加到 main.js。）

- [ ] **Step 7: 运行测试**

Run: `npm run test:e2e` — Expected: 7 PASS

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: Icon 图标集 + Button 四变体 + 组件展示渲染器"
```

---

### Task 7: 表单组件组（Input/Textarea/Select/Checkbox/Radio/Switch/Slider/Kbd）

**Files:**
- Create: `src/components/input/input.css`, `src/components/input/input.js`
- Create: `src/components/select/select.css`, `src/components/select/select.js`
- Create: `src/components/switch/switch.css`, `src/components/switch/switch.js`
- Create: `src/components/checkbox/checkbox.css`, `src/components/checkbox/checkbox.js`
- Create: `src/components/radio/radio.css`, `src/components/radio/radio.js`
- Create: `src/components/slider/slider.css`, `src/components/slider/slider.js`
- Create: `src/components/textarea/textarea.css`, `src/components/textarea/textarea.js`
- Create: `src/components/kbd/kbd.css`, `src/components/kbd/kbd.js`
- Modify: `src/main.js`

**Interfaces:**
- 统一导出 `renderXxx(opts)` 返回 HTML 字符串；类名前缀 `c-input`/`c-select`/`c-switch`/`c-checkbox`/`c-radio`/`c-slider`/`c-textarea`/`c-kbd`
- `c-switch`：`<button role="switch" aria-checked="false" class="c-switch"><span class="c-switch__thumb"></span></button>`，`mountSwitch(root)` 处理点击切换 + aria 更新
- `c-slider`：原生 `<input type="range">` 复用（`accent-color: var(--accent)` 即可获得主题色滑杆）
- `c-kbd`：`<kbd class="c-kbd">Ctrl</kbd>` — 键帽样式（边框 + 底部阴影模拟物理键）

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/form-controls.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('开关切换 aria-checked 并带动画类', async ({ page }) => {
  await page.goto('/');
  const sw = page.locator('.c-switch').first();
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
});

test('滑杆使用主题强调色', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('.c-slider').first();
  const color = await slider.evaluate(el => getComputedStyle(el).accentColor);
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(color).toBe(accent);
});

test('表单组件结构完整', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#components .c-input')).toHaveCount(1);
  await expect(page.locator('#components .c-textarea')).toHaveCount(1);
  await expect(page.locator('#components .c-select')).toHaveCount(1);
  await expect(page.locator('#components .c-checkbox')).toHaveCount(1);
  await expect(page.locator('#components .c-radio')).toHaveCount(1);
  await expect(page.locator('#components .c-kbd')).toHaveCount(1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/form-controls.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 8 个表单组件**

每个组件的 CSS 关键规则（统一风格：surface-1 背景、glass-border 边框、focus-visible 用 --accent、radius 乘 --radius-scale）:

`input.css`:
```css
.c-input { width: 100%; height: 32px; padding: 0 var(--space-3); font-size: var(--font-size-sm);
  color: var(--text-1); background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-sm) * var(--radius-scale, 1));
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out); }
.c-input::placeholder { color: var(--text-3); }
.c-input:focus { outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-100); }
```

`textarea.css` 同 input（min-height 80px、padding 8px 12px）；`select.css` 同 input（加 `appearance: none` + 右侧 chevron 背景 SVG data-URI）；`checkbox.css` / `radio.css`：
```css
.c-checkbox, .c-radio { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
```
`switch.css`:
```css
.c-switch { position: relative; width: 36px; height: 20px; border-radius: 999px;
  background: var(--neutral-300); transition: background var(--dur-base) var(--ease-spring);
  cursor: pointer; }
.c-switch[aria-checked="true"] { background: var(--accent); }
.c-switch__thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform var(--dur-base) var(--ease-spring); }
.c-switch[aria-checked="true"] .c-switch__thumb { transform: translateX(16px); }
```
`slider.css`:
```css
.c-slider { width: 100%; accent-color: var(--accent); }
```
`kbd.css`:
```css
.c-kbd { display: inline-block; padding: 2px 6px; font-family: var(--font-mono);
  font-size: var(--font-size-xs); color: var(--text-2); background: var(--surface-2);
  border: 1px solid var(--glass-border); border-bottom-width: 2px;
  border-radius: 6px; }
```

JS（每个组件 render 返回结构；switch 额外导出 mountSwitch）:
```js
// switch.js
export function renderSwitch({ checked = false, label = '' } = {}) {
  return `<button role="switch" aria-checked="${checked}" class="c-switch" aria-label="${label}">
    <span class="c-switch__thumb"></span></button>`;
}
export function mountSwitch(root) {
  root.querySelectorAll('.c-switch').forEach((el) => {
    el.addEventListener('click', () => {
      const next = el.getAttribute('aria-checked') === 'true' ? 'false' : 'true';
      el.setAttribute('aria-checked', next);
    });
  });
}
```

- [ ] **Step 4: main.js 接入展示区**

在 `#components` 追加 8 个 showcase（每种至少 2 个变体：默认/禁用、选中/未选中；switch 调用 `mountSwitch`）。示例：
```js
import { renderSwitch, mountSwitch } from './components/switch/switch.js';
import { renderKbd } from './components/kbd/kbd.js';
// …
const switchBox = showcase('开关 Switch', [
  { label: '关闭', html: renderSwitch({ label: '开关' }) },
  { label: '开启', html: renderSwitch({ checked: true, label: '开关' }) },
]);
componentsSection.appendChild(switchBox);
mountSwitch(switchBox);
const kbdBox = showcase('快捷键键帽 Kbd', [
  { label: '组合键', html: `${renderKbd('Ctrl')} + ${renderKbd('K')}` },
  { label: '单个键', html: renderKbd('⌘') },
]);
componentsSection.appendChild(kbdBox);
```

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 10 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 表单组件组（输入/选择/开关/复选/单选/滑杆/文本域/键帽）"
```

---

### Task 8: 数据展示组件组（Card/List/Badge/Tag/Progress/Avatar/Skeleton/EmptyState）

**Files:**
- Create: `src/components/card/`, `src/components/list/`, `src/components/badge/`, `src/components/tag/`, `src/components/progress/`, `src/components/avatar/`, `src/components/skeleton/`, `src/components/empty-state/`（每目录 .css + .js）
- Modify: `src/main.js`

**Interfaces:**
- `renderCard({ title, content, footer, glass })` — glass 为 true 时用 `.glass` 材质
- `renderList({ items })` — items: `{ title, desc, meta, iconName, selected }`；结构 `.c-list > .c-list__item(.c-list__item--selected)`；导出 `mountList(root)`：点击选中项切换样式
- `renderBadge({ label, variant: 'default|accent|success|warning|danger|info' })`
- `renderTag({ label, closable })`；`mountTag(root)`：点 × 移除
- `renderProgress({ value, variant })` — 0-100，过渡动画 `transform: scaleX`（用 `--ease-out` 400ms）
- `renderAvatar({ name, size })` — 首字 + 主题色背景
- `renderSkeleton({ lines })` — shimmer 动画（`@keyframes` 只动 `background-position`）
- `renderEmptyState({ iconName, title, desc, action })`

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/data-display.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('列表点击选中切换样式', async ({ page }) => {
  await page.goto('/');
  const item = page.locator('.c-list__item').first();
  await item.click();
  await expect(item).toHaveClass(/c-list__item--selected/);
});

test('徽标与标签渲染', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.c-badge--danger')).toContainText('危险');
  await expect(page.locator('.c-tag')).toHaveCount(2);
});

test('进度条达到目标值', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.c-progress__fill').first();
  await expect(bar).toHaveCSS('transform', /scaleX/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/data-display.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 8 个组件**

关键 CSS 规格（值均引用 tokens，radius 乘 `--radius-scale`）:

`card.css`：
```css
.c-card { padding: var(--space-4); border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  background: var(--surface-1); border: 1px solid var(--glass-border); }
.c-card--glass { background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--glass-shadow), var(--shadow-inset-highlight); }
.c-card__title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-base);
  margin-bottom: var(--space-2); }
.c-card__body { color: var(--text-2); font-size: var(--font-size-sm); }
.c-card__footer { margin-top: var(--space-3); }
```

`list.css`：
```css
.c-list { display: flex; flex-direction: column; gap: 2px; }
.c-list__item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3);
  border-radius: calc(var(--radius-sm) * var(--radius-scale, 1)); cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out); }
.c-list__item:hover { background: var(--surface-hover); }
.c-list__item--selected { background: var(--accent-50); color: var(--accent-700); }
.c-list__item--selected .c-list__meta { color: var(--accent-600); }
.c-list__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.c-list__desc { font-size: var(--font-size-xs); color: var(--text-3); }
.c-list__meta { margin-left: auto; font-size: var(--font-size-xs); color: var(--text-3); }
```
（`mountList` 事件委托：点击 `.c-list__item` → 清兄弟 selected 类 → 自身加 selected。）

`badge.css`：
```css
.c-badge { display: inline-flex; align-items: center; padding: 1px 8px; font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium); border-radius: 999px; }
.c-badge--accent { background: var(--accent-100); color: var(--accent-700); }
.c-badge--success { background: var(--success-50); color: var(--success-600); }
.c-badge--warning { background: var(--warning-50); color: var(--warning-600); }
.c-badge--danger { background: var(--danger-50); color: var(--danger-600); }
.c-badge--info { background: var(--info-50); color: var(--info-600); }
.c-badge--default { background: var(--neutral-100); color: var(--neutral-600); }
```

`tag.css`：pill 形 + 可关闭 ×（`--danger-500` hover）；`progress.css`：
```css
.c-progress { height: 6px; border-radius: 999px; background: var(--neutral-100); overflow: hidden; }
.c-progress__fill { height: 100%; border-radius: 999px; background: var(--accent);
  transform-origin: left center; transform: scaleX(var(--progress, 0));
  transition: transform var(--dur-slow) var(--ease-out); }
```
（render 时 `style="--progress: 0.6"`；`--progress` 用 0-1 的小数。）

`avatar.css`：24/32/40 三档圆角 `--radius-full`，背景 `var(--accent-200)`，文字 `var(--accent-800)`；`skeleton.css`：
```css
.c-skeleton { background: linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-2) 50%, var(--surface-hover) 75%);
  background-size: 200% 100%; border-radius: 6px;
  animation: shimmer 1.4s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
```
`empty-state.css`：居中布局，icon 用 `--text-3`，标题 `--text-2`，描述 `--text-3`，action 用 renderButton。

- [ ] **Step 4: main.js 接入展示区**

追加 8 个 showcase（每组件 2-3 变体；list 调 `mountList`；tag 调 `mountTag`）。

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 13 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 数据展示组件组（卡片/列表/徽标/标签/进度/头像/骨架/空态）"
```

---

### Task 9: 浮层反馈组（Toast/Dialog/Popover/ContextMenu）+ 导航辅助组（Tab/Breadcrumb）

**Files:**
- Create: `src/components/toast/`, `src/components/dialog/`, `src/components/popover/`, `src/components/context-menu/`, `src/components/tab/`, `src/components/breadcrumb/`（每目录 .css + .js）
- Modify: `src/main.js`

**Interfaces:**
- `toast.js` 导出 `toast(message, { variant: 'default|success|warning|danger|info', duration = 2500 })` — 在 `body` 创建 `.c-toast`（`.glass` 材质），自动消失，`:enter` 用 `--ease-spring` 从底部滑入；`toast` 容器 `.c-toast-wrap` 固定 `--z-toast` 层级
- `dialog.js` 导出 `renderDialog({ title, content, confirmLabel, danger, cancelLabel })` 与 `openDialog(opts)` — 返回 Promise<boolean>；遮罩 `.c-dialog__mask`（`--z-modal`）；打开动画 scale+fade；Esc 关闭；焦点圈定
- `popover.js` 导出 `renderPopover({ trigger, content, placement: 'bottom|right' })` 与 `mountPopover(root)`
- `context-menu.js` 导出 `mountContextMenu(root, items)` — items: `{ label, iconName, danger, action }`；右键在 (x,y) 弹出 `.c-context-menu`
- `tab.js` 导出 `renderTabs({ tabs, active })` 与 `mountTabs(root)` — `.c-tab--active` 带底部指示条（transform 平移动画）
- `breadcrumb.js` 导出 `renderBreadcrumb({ items })` — `.c-breadcrumb` 分隔符 `›`

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/overlays.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('Toast 出现并自动消失', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.__toast('测试消息', { variant: 'success' }));
  await expect(page.locator('.c-toast')).toContainText('测试消息');
  await expect(page.locator('.c-toast')).toHaveCount(0, { timeout: 4000 });
});

test('Dialog 打开与确认', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.__openDialog({ title: '确认删除', content: '确定吗？', confirmLabel: '删除', danger: true }));
  await expect(page.locator('.c-dialog')).toContainText('确认删除');
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(page.locator('.c-dialog')).toHaveCount(0);
});

test('Tab 切换指示条跟随', async ({ page }) => {
  await page.goto('/');
  const tab = page.locator('.c-tab').nth(1);
  await tab.click();
  await expect(tab).toHaveClass(/c-tab--active/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/overlays.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现浮层组件**

`toast.css`：
```css
.c-toast-wrap { position: fixed; bottom: var(--space-5); right: var(--space-5);
  display: flex; flex-direction: column; gap: var(--space-2); z-index: var(--z-toast); }
.c-toast { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm); border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  box-shadow: var(--shadow-md); animation: toast-in var(--dur-base) var(--ease-spring); }
@keyframes toast-in { from { transform: translateY(12px); opacity: 0; } }
.c-toast--success { background: var(--success-50); color: var(--success-600); }
.c-toast--danger { background: var(--danger-50); color: var(--danger-600); }
```

`toast.js`：
```js
import { icon } from '../icon/icon.js';
let wrap;
export function toast(message, { variant = 'default', duration = 2500 } = {}) {
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'c-toast-wrap';
    document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = `c-toast c-toast--${variant}`;
  el.innerHTML = `${icon('info', 16)}<span>${message}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity var(--dur-base) var(--ease-out)';
    setTimeout(() => el.remove(), 220); }, duration);
  return el;
}
```

`dialog.js`（含遮罩、焦点圈定、Esc）：
```js
import { renderButton } from '../button/button.js';
import { icon } from '../icon/icon.js';

export function renderDialog({ title, content, confirmLabel = '确定', cancelLabel = '取消', danger = false } = {}) {
  return `
  <div class="c-dialog__mask">
    <div class="c-dialog" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="c-dialog__header"><h3>${title}</h3>
        <button class="c-dialog__close" data-action="cancel" aria-label="关闭">${icon('close', 16)}</button></div>
      <div class="c-dialog__body">${content}</div>
      <div class="c-dialog__footer">
        ${renderButton({ label: cancelLabel, variant: 'ghost', iconName: null })}
        ${renderButton({ label: confirmLabel, variant: danger ? 'danger' : 'primary' })}
      </div>
    </div>
  </div>`;
}

export function openDialog(opts) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    mask.innerHTML = renderDialog(opts);
    const dialog = mask.querySelector('.c-dialog');
    const done = (ok) => { mask.remove(); resolve(ok); };
    mask.querySelectorAll('[data-action="cancel"]').forEach(b => b.addEventListener('click', () => done(false)));
    mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', () => done(false));
    mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', () => done(true));
    mask.addEventListener('click', (e) => { if (e.target === mask) done(false); });
    const onKey = (e) => { if (e.key === 'Escape') { done(false); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    dialog.querySelector('.c-dialog__close').focus();
  });
}
```

`dialog.css`：
```css
.c-dialog__mask { position: fixed; inset: 0; z-index: var(--z-modal);
  background: rgba(0,0,0,0.35); backdrop-filter: blur(4px);
  display: grid; place-items: center; animation: mask-in var(--dur-base) var(--ease-out); }
.c-dialog { width: 360px; max-width: 90vw; padding: var(--space-5);
  border-radius: calc(var(--radius-lg) * var(--radius-scale, 1));
  background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--shadow-inset-highlight);
  animation: dialog-in var(--dur-base) var(--ease-spring); }
@keyframes mask-in { from { opacity: 0; } }
@keyframes dialog-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } }
.c-dialog__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
.c-dialog__header h3 { font-size: var(--font-size-base); }
.c-dialog__body { font-size: var(--font-size-sm); color: var(--text-2); margin-bottom: var(--space-5); }
.c-dialog__footer { display: flex; justify-content: flex-end; gap: var(--space-2); }
.c-dialog__close { color: var(--text-3); border-radius: var(--radius-sm); padding: 4px; }
.c-dialog__close:hover { color: var(--text-1); background: var(--surface-hover); }
```

`popover.css` / `context-menu.css`（`.glass` 材质 + `--z-overlay` + scale/fade 进入动画）:
```css
.c-popover { position: absolute; z-index: var(--z-overlay); min-width: 160px; padding: var(--space-2);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1)); font-size: var(--font-size-sm);
  animation: pop-in var(--dur-fast) var(--ease-spring); }
@keyframes pop-in { from { transform: scale(0.95); opacity: 0; } }
.c-context-menu { position: fixed; z-index: var(--z-overlay); min-width: 180px; padding: var(--space-2);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1)); font-size: var(--font-size-sm);
  animation: pop-in var(--dur-fast) var(--ease-spring); }
.c-context-menu__item { display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: 6px var(--space-3); border-radius: var(--radius-sm); color: var(--text-2); text-align: left; }
.c-context-menu__item:hover { background: var(--surface-hover); color: var(--text-1); }
.c-context-menu__item--danger { color: var(--danger-500); }
```

`tab.css`：
```css
.c-tabs { display: flex; gap: var(--space-2); border-bottom: 1px solid var(--glass-border); }
.c-tab { position: relative; padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm);
  color: var(--text-2); transition: color var(--dur-fast) var(--ease-out); }
.c-tab:hover { color: var(--text-1); }
.c-tab--active { color: var(--accent); }
.c-tab--active::after { content: ''; position: absolute; left: var(--space-3); right: var(--space-3);
  bottom: -1px; height: 2px; border-radius: 2px; background: var(--accent); }
```
`breadcrumb.css`：`.c-breadcrumb` 用 `--text-3`、分隔 `›`、末尾项 `--text-1` 加粗。

`tab.js` / `popover.js` / `context-menu.js` 的 mount 逻辑：事件委托 + 打开时在 `document` 上监听一次 click 关闭浮层。

- [ ] **Step 4: main.js 接入**

- 追加 showcase：Tabs（3 个 tab + mountTabs）、Breadcrumb、Popover（trigger 按钮 + 内容）、Dialog（trigger 按钮调用 `openDialog`）、ContextMenu 说明区（右键舞台区域）、Toast 按钮组（4 语义色按钮调用 `toast()`）
- 暴露 `window.__toast = toast; window.__openDialog = openDialog;`

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 16 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 浮层反馈组（Toast/Dialog/Popover/右键菜单）+ 导航辅助（Tab/面包屑）"
```

---

### Task 10: TitleBar 一体式标题栏

**Files:**
- Create: `src/components/title-bar/title-bar.css`
- Create: `src/components/title-bar/title-bar.js`
- Modify: `src/main.js`

**Interfaces:**
- `title-bar.js` 导出 `renderTitleBar({ title, iconName })` 与 `mountTitleBar(root)` — DOM：`.c-titlebar`（`.c-titlebar__drag` 拖拽区 / `.c-titlebar__title` / `.c-titlebar__controls` 内三个按钮 `.c-titlebar__control--min|max|close`）
- `mountTitleBar`：min/max 按钮切换 maximize/restore 图标；close 按钮 hover 变红；`drag` 区提供 `data-tauri-drag-region` 属性（注释说明 Tauri 场景下由系统接管，页面内模拟不做真实拖动）
- CSS 关键点：高 40px、与内容共享 `--glass-bg`、无底部边框（上下无割裂）、控制按钮 hover `--surface-hover`、close hover `--danger-500` 背景白字

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/title-bar.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('标题栏结构与窗口控制', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.c-titlebar');
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveAttribute('data-tauri-drag-region', '');
  await page.locator('.c-titlebar__control--max').click();
  await expect(page.locator('.c-titlebar__control--max svg')).toBeVisible();
  await page.locator('.c-titlebar__control--close').hover();
  await expect(page.locator('.c-titlebar__control--close')).toHaveCSS('background-color', 'rgb(239, 68, 68)');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/title-bar.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 title-bar 组件**

`title-bar.css`:
```css
.c-titlebar { height: 40px; display: flex; align-items: center;
  background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  user-select: none; }
.c-titlebar__drag { flex: 1; height: 100%; display: flex; align-items: center;
  gap: var(--space-2); padding: 0 var(--space-4); }
.c-titlebar__title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  color: var(--text-2); }
.c-titlebar__controls { display: flex; height: 100%; }
.c-titlebar__control { width: 44px; height: 100%; display: grid; place-items: center;
  color: var(--text-2); transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out); }
.c-titlebar__control:hover { background: var(--surface-hover); color: var(--text-1); }
.c-titlebar__control--close:hover { background: var(--danger-500); color: #fff; }
```

`title-bar.js`:
```js
import { icon } from '../icon/icon.js';

export function renderTitleBar({ title = 'UI Design System', iconName = 'palette' } = {}) {
  return `
  <div class="c-titlebar">
    <div class="c-titlebar__drag" data-tauri-drag-region>
      ${icon(iconName, 16)}<span class="c-titlebar__title">${title}</span>
    </div>
    <div class="c-titlebar__controls">
      <button class="c-titlebar__control c-titlebar__control--min" aria-label="最小化">${icon('minus', 14)}</button>
      <button class="c-titlebar__control c-titlebar__control--max" aria-label="最大化">${icon('maximize', 12)}</button>
      <button class="c-titlebar__control c-titlebar__control--close" aria-label="关闭">${icon('close', 14)}</button>
    </div>
  </div>`;
}

export function mountTitleBar(root) {
  const maxBtn = root.querySelector('.c-titlebar__control--max');
  maxBtn.addEventListener('click', () => {
    maxBtn.innerHTML = maxBtn.dataset.maxed
      ? icon('maximize', 12) : icon('restore', 12);
    maxBtn.dataset.maxed = maxBtn.dataset.maxed ? '' : '1';
  });
}
```

（`restore` 图标：`<rect x="4" y="8" width="12" height="12" rx="2"/><path d="M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3"/>`）

- [ ] **Step 4: 在骨架的 topbar 上方挂载演示**

`main.js` 中：在 `.app-shell` 前注入一个独立展示区（`#titlebar-demo`，位于 body 顶部，独立于 app-shell，尺寸与场景模板一致便于评审）:
```js
import { renderTitleBar, mountTitleBar } from './components/title-bar/title-bar.js';
const demo = document.createElement('div');
demo.id = 'titlebar-demo';
demo.style.width = '360px'; demo.style.borderRadius = 'var(--radius-xl)'; demo.style.overflow = 'hidden';
demo.style.border = '1px solid var(--glass-border)'; demo.style.boxShadow = 'var(--glass-shadow)';
demo.style.margin = '0 auto'; demo.style.marginTop = 'var(--space-5)';
demo.innerHTML = renderTitleBar({ title: '剪贴板', iconName: 'clipboard' }) + '<div style="height:120px" class="glass"></div>';
document.body.prepend(demo);
mountTitleBar(demo);
```

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 17 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: TitleBar 一体式标题栏"
```

---

### Task 11: NavigationWheel A — 几何算法 + 滚动 + 点击居中吸附

**Files:**
- Create: `src/components/navigation-wheel/nav-wheel-geometry.js`
- Create: `src/components/navigation-wheel/nav-wheel.css`
- Create: `src/components/navigation-wheel/nav-wheel.js`
- Modify: `src/main.js`
- Test: `tests/unit/geometry.test.js`

**Interfaces:**
- `nav-wheel-geometry.js` 导出（纯函数，全部单测覆盖）：
  - `itemCenterY(index, itemHeight, gap)` → `index * (itemHeight + gap) + itemHeight / 2`
  - `scrollTopForCenter(index, itemHeight, gap, viewportHeight)` → `itemCenterY(...) - viewportHeight / 2`
  - `findNearestIndex(scrollTop, count, itemHeight, gap, viewportHeight)` → 中心最靠近视口中心的项 index（两端 clamp）
  - `focalScale(offset, viewportHeight, maxScale = 1.15, falloff = 1.4)` → 0-1 归一化距离的二次衰减缩放
  - `focalOpacity(offset, viewportHeight, falloff = 1.4)` → 0-1
- `nav-wheel.js` 导出 `mountNavWheel(root, { items, onChange })` — items: `{ id, name, icon }`；DOM：`.c-navwheel__item`（含 `__icon` / `__name` / `__glow` 光晕元素）；导出 `setActive(id)`
- 视口规格：每项高 52px（itemHeight）、间距 12px（gap）；`--navwheel-item-h`/`--navwheel-gap` CSS 变量定义
- 滚动规格：容器 `.c-navwheel__list` 原生 `overflow-y: auto`；`scroll` 事件 + rAF 驱动每项 `transform: scale/translateY` 与 `opacity`（只动 transform/opacity）；点击项 → 自定义 rAF 滚动动画到 `scrollTopForCenter`（时长 `--dur-base`，曲线 `--ease-spring`）；松手后（scroll 停止 150ms）执行居中吸附

- [ ] **Step 1: 写失败的几何算法单测**

Create `tests/unit/geometry.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { itemCenterY, scrollTopForCenter, findNearestIndex, focalScale, focalOpacity } from
  '../../src/components/navigation-wheel/nav-wheel-geometry.js';

const ITEM_H = 52, GAP = 12, VIEW_H = 400;

describe('itemCenterY / scrollTopForCenter', () => {
  it('第 0 项中心在 itemHeight/2', () => {
    expect(itemCenterY(0, ITEM_H, GAP)).toBe(26);
  });
  it('第 2 项中心 = 2*64 + 26', () => {
    expect(itemCenterY(2, ITEM_H, GAP)).toBe(154);
  });
  it('滚动到第 2 项居中的 scrollTop', () => {
    expect(scrollTopForCenter(2, ITEM_H, GAP, VIEW_H)).toBe(154 - 200);
  });
});

describe('findNearestIndex', () => {
  it('初始位置选中第 0 项', () => {
    expect(findNearestIndex(0, 5, ITEM_H, GAP, VIEW_H)).toBe(0);
  });
  it('中心在视口中间时选中对应项', () => {
    // scrollTop 使第 2 项中心正好在 200（视口中心）
    const st = scrollTopForCenter(2, ITEM_H, GAP, VIEW_H);
    expect(findNearestIndex(st, 5, ITEM_H, GAP, VIEW_H)).toBe(2);
  });
  it('两端 clamp 不越界', () => {
    expect(findNearestIndex(99999, 5, ITEM_H, GAP, VIEW_H)).toBe(4);
  });
});

describe('focalScale / focalOpacity', () => {
  it('中心处 scale 最大', () => {
    expect(focalScale(0, VIEW_H)).toBe(1.15);
  });
  it('远离中心衰减，不越过 1', () => {
    expect(focalScale(VIEW_H / 2, VIEW_H)).toBeLessThan(1.01);
    expect(focalScale(VIEW_H * 2, VIEW_H)).toBeGreaterThanOrEqual(1);
  });
  it('中心处 opacity 1，远处衰减', () => {
    expect(focalOpacity(0, VIEW_H)).toBe(1);
    expect(focalOpacity(VIEW_H, VIEW_H)).toBeLessThan(0.4);
  });
});
```

- [ ] **Step 2: 运行单测确认失败**

Run: `npx vitest run tests/unit/geometry.test.js` — Expected: FAIL

- [ ] **Step 3: 实现几何算法**

Create `src/components/navigation-wheel/nav-wheel-geometry.js`:
```js
export function itemCenterY(index, itemHeight, gap) {
  return index * (itemHeight + gap) + itemHeight / 2;
}
export function scrollTopForCenter(index, itemHeight, gap, viewportHeight) {
  return itemCenterY(index, itemHeight, gap) - viewportHeight / 2;
}
export function findNearestIndex(scrollTop, count, itemHeight, gap, viewportHeight) {
  const viewCenter = scrollTop + viewportHeight / 2;
  const i = Math.round((viewCenter - itemHeight / 2) / (itemHeight + gap));
  return Math.max(0, Math.min(count - 1, i));
}
export function focalScale(offset, viewportHeight, maxScale = 1.15, falloff = 1.4) {
  const t = Math.min(1, Math.abs(offset) / (viewportHeight / 2 * falloff));
  return 1 + (maxScale - 1) * (1 - t) ** 2;
}
export function focalOpacity(offset, viewportHeight, falloff = 1.4) {
  const t = Math.min(1, Math.abs(offset) / (viewportHeight / 2 * falloff));
  return 1 - 0.65 * t;
}
```

- [ ] **Step 4: 运行单测确认通过**

Run: `npx vitest run tests/unit/geometry.test.js` — Expected: 10 PASS

- [ ] **Step 5: 写失败的 Playwright 测试**

Create `tests/e2e/nav-wheel.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('点击模块滑动到中央并选中', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('.c-navwheel__item');
  await expect(items).toHaveCount(12); // 4 真实模块 × 3 组演示重复
  await items.nth(3).click();
  await expect(items.nth(3)).toHaveClass(/c-navwheel__item--active/);
  // 选中项应位于导航视口中央附近
  const box = await items.nth(3).boundingBox();
  const listBox = await page.locator('.navwheel__list').boundingBox();
  const centerDelta = Math.abs((box.y + box.height / 2) - (listBox.y + listBox.height / 2));
  expect(centerDelta).toBeLessThan(4);
});
```

- [ ] **Step 6: 实现 nav-wheel.css**

```css
.c-navwheel { position: relative; height: 100%; }
.c-navwheel__list { position: absolute; inset: 0 0 56px 0; overflow-y: auto;
  scrollbar-width: none; padding: calc(50% - 26px) 0 50% 0; /* 首尾项可滚到中央 */
}
.c-navwheel__list::-webkit-scrollbar { display: none; }
.c-navwheel__item { position: relative; height: 52px; margin: 6px 12px;
  display: flex; align-items: center; gap: var(--space-3); padding: 0 var(--space-3);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  cursor: pointer; will-change: transform, opacity;
  transition: color var(--dur-fast) var(--ease-out); }
.c-navwheel__item:hover { color: var(--text-1); }
.c-navwheel__item--active { color: var(--accent); }
.c-navwheel__glow { position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(120% 120% at 50% 50%, var(--accent-100) 0%, transparent 70%);
  opacity: 0; pointer-events: none; }
.c-navwheel__item--active .c-navwheel__glow { opacity: 1; }
.c-navwheel__icon { display: grid; place-items: center; color: var(--text-3); }
.c-navwheel__item--active .c-navwheel__icon { color: var(--accent); }
.c-navwheel__name { font-size: var(--font-size-sm); white-space: nowrap;
  clip-path: inset(0 100% 0 0); opacity: 0; transition: clip-path var(--dur-base) var(--ease-spring),
    opacity var(--dur-fast) var(--ease-out); }
.c-navwheel__item--active .c-navwheel__name { clip-path: inset(0 0 0 0); opacity: 1; }
.c-navwheel__mask { position: absolute; left: 0; right: 0; height: 48px; pointer-events: none;
  background: linear-gradient(var(--glass-bg), transparent); }
.c-navwheel__mask--bottom { bottom: 56px; background: linear-gradient(transparent, var(--glass-bg)); }
```

（注意：`--navwheel-item-h` 用字面 52px/6px 亦可，但为与几何算法一致，定义 `--navwheel-item-h: 52px; --navwheel-gap: 12px;` 于 `:root`，算法传入值必须与 CSS 一致 — 由 `mountNavWheel` 从 `getComputedStyle` 读取一次。）

- [ ] **Step 7: 实现 nav-wheel.js（A 部分：滚动 + 点击 + 吸附）**

```js
import { icon } from '../icon/icon.js';
import { itemCenterY, scrollTopForCenter, findNearestIndex, focalScale, focalOpacity }
  from './nav-wheel-geometry.js';

const GAP = 12;

export function mountNavWheel(root, { items, onChange = () => {} } = {}) {
  const list = root.querySelector('.c-navwheel__list') ?? root;
  list.innerHTML = items.map((it, i) => `
    <div class="c-navwheel__item" data-id="${it.id}" data-index="${i}" role="button" tabindex="0">
      <div class="c-navwheel__glow"></div>
      <span class="c-navwheel__icon">${icon(it.icon, 22)}</span>
      <span class="c-navwheel__name">${it.name}</span>
    </div>`).join('');
  const itemEls = [...list.children];
  const itemH = parseFloat(getComputedStyle(itemEls[0]).height);
  const viewH = () => list.clientHeight;
  let active = 0, raf = 0;

  function setFocal() {
    const st = list.scrollTop;
    itemEls.forEach((el, i) => {
      const offset = itemCenterY(i, itemH, GAP) - st - viewH() / 2;
      el.style.transform = `translateY(${offset * 0.06}px) scale(${focalScale(offset, viewH())})`;
      el.style.opacity = String(focalOpacity(offset, viewH()));
    });
  }
  function onScroll() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(setFocal);
  }
  function select(i, animate = true) {
    active = i;
    itemEls.forEach((el, idx) => el.classList.toggle('c-navwheel__item--active', idx === i));
    onChange(items[i]);
    if (animate) animateScrollTo(scrollTopForCenter(i, itemH, GAP, viewH()));
  }
  function animateScrollTo(target) {
    const start = list.scrollTop, diff = target - start;
    const dur = parseFloat(getComputedStyle(root).getPropertyValue('--dur-base')) || 200;
    const curve = getComputedStyle(root).getPropertyValue('--ease-spring');
    const t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = curve.startsWith('cubic-bezier')
        ? cubicBezierY(curve, t) : t;
      list.scrollTop = start + diff * eased;
      setFocal();
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  list.addEventListener('scroll', onScroll);
  list.addEventListener('click', (e) => {
    const el = e.target.closest('.c-navwheel__item'); if (!el) return;
    select(Number(el.dataset.index));
  });
  itemEls.forEach((el) => el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { select(Math.min(items.length - 1, active + 1)); }
    if (e.key === 'ArrowUp') { select(Math.max(0, active - 1)); }
  }));
  setFocal();
  return { setActive: (id) => select(items.findIndex(it => it.id === id), false) };
}

// cubic-bezier 求值：解析 --ease-spring 曲线，对输入 t ∈ [0,1] 用二分求 x(u)=t 的 u，再返回 y(u)
function cubicBezierY(cssCurve, t) {
  const m = cssCurve.match(/cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  if (!m) return t;
  const [x1, y1, x2, y2] = [1, 2, 3, 4].map((i) => parseFloat(m[i]));
  const bez = (a, b, c, d, u) =>
    a * (1 - u) ** 3 + 3 * b * (1 - u) ** 2 * u + 3 * c * (1 - u) * u * u + d * u ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const u = (lo + hi) / 2;
    if (bez(0, x1, x2, 1, u) < t) lo = u; else hi = u;
  }
  return bez(0, y1, y2, 1, (lo + hi) / 2);
}
```

实现提示：`cubicBezierY` 用标准三次贝塞尔解析：系数 `x1=0.34, y1=1+0.56*s, x2=0.64, y2=1`；对给定 t ∈ [0,1]，先解 `x(t')=t`（二分 20 次迭代），再求 `y(t')`。曲线参数从 `--ease-spring` 字符串解析。

- [ ] **Step 8: main.js 挂载 NavigationWheel**

```js
import { mountNavWheel } from './components/navigation-wheel/nav-wheel.js';
const wheel = mountNavWheel(document.querySelector('.navwheel__list'), {
  items: NAV_ITEMS,
  onChange: (item) => {
    document.querySelector(`#${item.id}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
});
```

- [ ] **Step 9: 运行测试**

Run: `npm test` — Expected: 25 PASS（含 geometry 10）
Run: `npm run test:e2e` — Expected: 18 PASS

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat: NavigationWheel A（几何算法/滚动/点击居中吸附）"
```

---

### Task 12: NavigationWheel B — 拖拽惯性 + 跟手变形 + 设置入口

**Files:**
- Modify: `src/components/navigation-wheel/nav-wheel.js`
- Modify: `src/components/navigation-wheel/nav-wheel.css`
- Modify: `src/main.js`

**Interfaces:**
- 新增：`setActive(id)` 已由 Task 11 导出；本任务扩展 `mountNavWheel` 返回值加 `scrollToIndex(i)`（对外供场景模板用）
- 新增 DOM：`.c-navwheel__settings`（左下角设置入口按钮，Task 3 骨架已有占位）— 挂载后由 `mountNavWheel` 或 main.js 填充：设置 icon + 「设置」名称，点击触发 `onSettings` 回调（场景模板用）；当前展示页点击滚动到 `#scenes` 下的设置页模板
- 拖拽规格：pointerdown 在 list 上（排除可点击元素）→ `setPointerCapture`；pointermove 累积 `deltaY` 写 `list.scrollTop -= deltaY`；pointerup 时若速度 > 0.3px/ms 进入惯性：每帧 `scrollTop += velocity`、`velocity *= 0.95`，速度 < 0.05 停止；拖动距离 < 5px 视为点击不触发惯性
- 跟手变形已有（Task 11 setFocal）；本任务在惯性结束/滚动停止 150ms 后执行居中吸附（`animateScrollTo` 但无动画，直接 setFocal）

- [ ] **Step 1: 写失败的 Playwright 测试**

追加到 `tests/e2e/nav-wheel.spec.js`:
```js
test('鼠标拖拽滚动导航列表', async ({ page }) => {
  await page.goto('/');
  const list = page.locator('.c-navwheel__list');
  const start = await list.evaluate(el => el.scrollTop);
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 150, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const end = await list.evaluate(el => el.scrollTop);
  expect(end).toBeGreaterThan(start);
});

test('设置入口在左下角且可点击', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('.c-navwheel__settings');
  await expect(btn).toContainText('设置');
  await btn.click();
  // 当前实现：滚动到设置页场景模板（Task 19 前为占位：触发 data-mount=settings-entry 回调）
  await expect(btn).toBeVisible();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/nav-wheel.spec.js` — Expected: 拖拽测试 FAIL（无拖拽实现）

- [ ] **Step 3: 实现拖拽 + 惯性 + 吸附**

在 `nav-wheel.js` 的 `mountNavWheel` 内追加：

```js
// —— 拖拽 + 惯性 ——
let pointerId = null, lastY = 0, velocity = 0, lastT = 0, inertiaRaf = 0, moved = 0;
list.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.c-navwheel__item')) pointerId = null; // 允许点击选中
  pointerId = e.pointerId; lastY = e.clientY; lastT = performance.now(); moved = 0;
  list.setPointerCapture(e.pointerId);
});
list.addEventListener('pointermove', (e) => {
  if (e.pointerId !== pointerId) return;
  const dy = e.clientY - lastY;
  lastY = e.clientY;
  const now = performance.now();
  velocity = dy / Math.max(1, now - lastT); lastT = now;
  list.scrollTop -= dy; moved += Math.abs(dy);
  setFocal();
});
list.addEventListener('pointerup', (e) => {
  if (e.pointerId !== pointerId) return;
  pointerId = null;
  if (moved > 5 && Math.abs(velocity) > 0.3) startInertia();
  else scheduleSnap();
});
function startInertia() {
  cancelAnimationFrame(inertiaRaf);
  (function tick() {
    list.scrollTop += velocity * 16;
    velocity *= 0.95;
    setFocal();
    if (Math.abs(velocity) > 0.05) inertiaRaf = requestAnimationFrame(tick);
    else scheduleSnap();
  })();
}
let snapTimer = 0;
function scheduleSnap() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    const i = findNearestIndex(list.scrollTop, itemEls.length, itemH, GAP, viewH());
    select(i, false);
  }, 150);
}
```

CSS 追加（设置入口样式已在 layout.css 的 `.navwheel__settings`，此处为其套用组件类并加名称滑入）:
```css
.c-navwheel__settings { display: flex; align-items: center; gap: var(--space-2);
  padding: 0 var(--space-4); height: 56px; width: 100%; color: var(--text-2);
  font-size: var(--font-size-sm); }
.c-navwheel__settings:hover { color: var(--text-1); background: var(--surface-hover); }
```

- [ ] **Step 4: main.js 接线设置入口**

```js
document.querySelector('.navwheel__settings').innerHTML =
  `${icon('settings', 20)}<span>设置</span>`;
document.querySelector('.navwheel__settings').addEventListener('click', () => {
  document.querySelector('#scenes').scrollIntoView({ behavior: 'smooth' });
});
```

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 20 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: NavigationWheel B（拖拽惯性/居中吸附/设置入口）"
```

---

### Task 13: 悬浮窗专属组件组（FloatingWindow/SearchBar/HotkeyHint/FloatBall/HotkeyRecorder）

**Files:**
- Create: `src/components/floating-window/`, `src/components/search-bar/`, `src/components/hotkey-hint/`, `src/components/float-ball/`, `src/components/hotkey-recorder/`（每目录 .css + .js）
- Modify: `src/main.js`

**Interfaces:**
- `floating-window.js` 导出 `renderFloatingWindow({ title, children, resizable })` 与 `mountFloatingWindow(root)`：
  - DOM：`.c-fwin`（`.glass` 材质 + `--radius-xl` 圆角）> `.c-fwin__titlebar`（drag region `data-tauri-drag-region` + 标题 + 置顶按钮 `.c-fwin__pin` + 折叠按钮 `.c-fwin__fold` + 关闭）> `.c-fwin__body`
  - `mountFloatingWindow`：**页面内模拟拖动**（pointerdown 在 titlebar → 拖动整个 `.c-fwin` 的 left/top — 注意：演示用，仅对 demo 实例生效，用 `transform: translate` 实现避免 layout 动画）；pin 按钮切换 `.c-fwin--pinned`（置顶视觉：高光边框加亮）；fold 按钮切换 `.c-fwin--folded`（高度塌缩动画：`grid-template-rows` 或 max-height — 注意红线：优先 `scaleY` + `overflow hidden` 避免 layout）
- `search-bar.js` 导出 `renderSearchBar({ placeholder, hotkey })` 与 `mountSearchBar(root, { onQuery })`：输入框 + 右侧 HotkeyHint；`data-empty` 空态提示（`:placeholder-shown` 与结果空两种）
- `hotkey-hint.js` 导出 `renderHotkeyHint(keys)` — keys: `['Ctrl','K']` → `<span class="c-hotkey-hint"><kbd class="c-kbd">Ctrl</kbd>…`
- `float-ball.js` 导出 `renderFloatBall({ iconName, tooltip })` 与 `mountFloatBall(root, { onExpand })`：40px 圆形玻璃球（`--accent` 渐变 + 光晕），hover 上浮 2px + 光晕增强；点击触发 onExpand（场景模板接面板展开动画）
- `hotkey-recorder.js` 导出 `renderHotkeyRecorder({ value })` 与 `mountHotkeyRecorder(root, { onChange })`：`.c-hotkey-recorder` 点击后进入录制态（`.c-hotkey-recorder--recording` 红色脉冲边框），键盘捕获组合键 → 显示 + onChange

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/float-components.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('悬浮窗可拖拽移动', async ({ page }) => {
  await page.goto('/');
  const win = page.locator('.c-fwin').first();
  const bar = win.locator('.c-fwin__titlebar');
  const before = await win.boundingBox();
  const b = await bar.boundingBox();
  await page.mouse.move(b.x + 60, b.y + 12);
  await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + 12 + 80, { steps: 5 });
  await page.mouse.up();
  const after = await win.boundingBox();
  expect(after.y - before.y).toBeGreaterThan(40);
});

test('搜索框空态与输入', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('.c-search-bar input');
  await input.fill('测');
  await expect(input).toHaveValue('测');
});

test('快捷键录制器捕获组合键', async ({ page }) => {
  await page.goto('/');
  const rec = page.locator('.c-hotkey-recorder').first();
  await rec.click();
  await page.keyboard.press('Control+Shift+K');
  await expect(rec).toContainText('Ctrl');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/float-components.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 5 个组件**

`floating-window.css`：
```css
.c-fwin { position: fixed; z-index: var(--z-float); width: 360px; border-radius:
  calc(var(--radius-xl) * var(--radius-scale, 1)); overflow: hidden;
  box-shadow: var(--glass-shadow), var(--shadow-inset-highlight);
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  transition: box-shadow var(--dur-base) var(--ease-out); will-change: transform; }
.c-fwin--pinned { box-shadow: 0 0 0 1px var(--accent-300), var(--glass-shadow),
  var(--shadow-inset-highlight); }
.c-fwin__titlebar { display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3); cursor: grab; user-select: none;
  border-bottom: 1px solid var(--glass-border); }
.c-fwin__titlebar:active { cursor: grabbing; }
.c-fwin__title { flex: 1; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  color: var(--text-2); }
.c-fwin__btn { width: 24px; height: 24px; display: grid; place-items: center;
  border-radius: var(--radius-sm); color: var(--text-3); }
.c-fwin__btn:hover { background: var(--surface-hover); color: var(--text-1); }
.c-fwin--folded .c-fwin__body { transform: scaleY(0); opacity: 0; }
.c-fwin__body { transform-origin: top center; transition: transform var(--dur-base) var(--ease-spring),
  opacity var(--dur-base) var(--ease-out); }
```

`floating-window.js` 拖动实现（演示级，transform 平移）：
```js
import { icon } from '../icon/icon.js';

export function renderFloatingWindow({ title = '悬浮窗', body = '', } = {}) {
  return `
  <div class="c-fwin">
    <div class="c-fwin__titlebar" data-tauri-drag-region>
      <span class="c-fwin__title">${title}</span>
      <button class="c-fwin__btn c-fwin__pin" aria-label="置顶">${icon('pin', 14)}</button>
      <button class="c-fwin__btn c-fwin__fold" aria-label="折叠">${icon('chevron-down', 14)}</button>
      <button class="c-fwin__btn c-fwin__close" aria-label="关闭">${icon('close', 14)}</button>
    </div>
    <div class="c-fwin__body">${body}</div>
  </div>`;
}

export function mountFloatingWindow(root) {
  const win = root.classList.contains('c-fwin') ? root : root.querySelector('.c-fwin');
  const bar = win.querySelector('.c-fwin__titlebar');
  let dragging = null;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.c-fwin__btn')) return;
    dragging = { dx: e.clientX, dy: e.clientY, tx: 0, ty: 0 };
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragging.tx += e.clientX - dragging.dx; dragging.ty += e.clientY - dragging.dy;
    dragging.dx = e.clientX; dragging.dy = e.clientY;
    win.style.transform = `translate(${dragging.tx}px, ${dragging.ty}px)`;
  });
  bar.addEventListener('pointerup', () => { dragging = null; });
  win.querySelector('.c-fwin__pin').addEventListener('click', () =>
    win.classList.toggle('c-fwin--pinned'));
  win.querySelector('.c-fwin__fold').addEventListener('click', () => {
    win.classList.toggle('c-fwin--folded');
    win.querySelector('.c-fwin__fold').innerHTML =
      icon(win.classList.contains('c-fwin--folded') ? 'chevron-up' : 'chevron-down', 14);
  });
}
```

`search-bar.js`（含空态 + HotkeyHint 组合）:
```js
import { icon } from '../icon/icon.js';
import { renderHotkeyHint } from '../hotkey-hint/hotkey-hint.js';

export function renderSearchBar({ placeholder = '搜索…', hotkey = ['Ctrl', 'K'] } = {}) {
  return `<div class="c-search-bar">
    <span class="c-search-bar__icon">${icon('search', 16)}</span>
    <input class="c-search-bar__input" type="text" placeholder="${placeholder}" />
    <div class="c-search-bar__hint">${renderHotkeyHint(hotkey)}</div>
  </div>`;
}
export function mountSearchBar(root, { onQuery = () => {} } = {}) {
  const input = root.querySelector('input');
  input.addEventListener('input', () => {
    root.classList.toggle('c-search-bar--has-input', input.value.length > 0);
    onQuery(input.value);
  });
  if (root.__hotkeyBind) root.__hotkeyBind();
  else if (window.__bindHotkey) window.__bindHotkey(hotkeyFromHint(root), () => input.focus());
}
```
（`__bindHotkey` 全局热键注册由 main.js 提供最小实现：`document.addEventListener('keydown')` 匹配 Ctrl+KeyK → focus 第一个 `.c-search-bar input`。Ctrl+K 全局绑定到展示页搜索框。）

`search-bar.css`、`hotkey-hint.css`、`float-ball.css`、`hotkey-recorder.css` 按统一材质实现（surface/glass 组合、radius 乘 scale、只动 transform/opacity）。

`float-ball.js`：
```js
export function renderFloatBall({ iconName = 'clipboard', tooltip = '' } = {}) {
  return `<button class="c-float-ball" aria-label="${tooltip}" title="${tooltip}">
    <span class="c-float-ball__glow"></span>${icon(iconName, 20)}</button>`;
}
export function mountFloatBall(root, { onExpand = () => {} } = {}) {
  root.addEventListener('click', onExpand);
}
```

`hotkey-recorder.js`：点击进入录制（类名切换 + `--danger-500` 脉冲边框 `@keyframes` 只动 box-shadow/opacity），keydown 捕获非修饰键组合 → 渲染 `renderHotkeyHint` 格式 → 退出录制。

- [ ] **Step 4: main.js 接入展示区**

每个组件 1-2 个 showcase；search-bar 演示绑定 Ctrl+K（`window.__bindHotkey` 实现）；float-ball 点击触发 `toast('展开面板（场景模板演示）')`。

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 23 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 悬浮窗专属组件（FloatingWindow/SearchBar/HotkeyHint/FloatBall/HotkeyRecorder）"
```

---

### Task 14: 令牌展示区（设计令牌可视化）

**Files:**
- Create: `src/demo/token-showcase.js`
- Modify: `src/main.js`

**Interfaces:**
- `token-showcase.js` 导出 `mountTokenShowcase(root)` — 渲染到 `#tokens` section：
  - 色板卡：中性色 11 级 + 当前 accent 10 级 + 语义色 4 组；每色块 `data-copy="var(--xxx)"`，点击复制变量名（`navigator.clipboard` + 复制成功 toast）
  - 字体阶梯：7 级字号示例文本
  - 间距标尺：`--space-1`~`--space-7` 方块条
  - 圆角卡：5 档圆角矩形
  - 阴影卡：3 级阴影矩形
  - 玻璃卡：`.glass` 材质 + 说明（透明度/模糊/高光由定制器控制，链接到定制器）
  - DOM 契约：`.tk-card`, `.tk-swatch`, `.tk-swatch__label`, `.tk-row`, `.tk-block`

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/token-showcase.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('令牌展示区渲染六大类', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tokens .tk-card')).toHaveCount(6);
  await expect(page.locator('#tokens .tk-swatch')).toHaveCount(11 + 10 + 4);
});

test('点击色块复制变量名', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {};
  });
  await page.locator('#tokens .tk-swatch').first().click();
  await expect(page.locator('.c-toast')).toContainText('已复制');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/token-showcase.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 token-showcase.js**

从 `getComputedStyle(document.documentElement)` 读取变量值渲染（保证与主题/主题色实时联动）；六大类卡片布局（`.tk-grid` 两列）；点击复制用 `navigator.clipboard.writeText(varName)` + `toast('已复制 var(--xxx)')`；渲染函数接受 `{ theme, accent }` 变化时由 main.js 订阅 store 重新渲染。

- [ ] **Step 4: main.js 接入**

```js
import { mountTokenShowcase } from './demo/token-showcase.js';
mountTokenShowcase(document.querySelector('#tokens'));
```

`#tokens` 内先写 `<h2>设计令牌</h2>` 再 append。订阅 store：`subscribe((cfg) => { applyConfig(cfg); mountTokenShowcase(section, true); })`（重渲染前先 `replaceChildren`）。

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 25 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 令牌展示区（色板/字体/间距/圆角/阴影/玻璃）"
```

---

### Task 15: 组件展示区（6 组全组件矩阵）

**Files:**
- Create: `src/demo/component-showcase-full.js`
- Modify: `src/main.js`
- Modify: `tests/e2e/components-basic.spec.js`（Task 6 的临时断言改用真实展示区）

**Interfaces:**
- `component-showcase-full.js` 导出 `mountComponentsShowcase(root)` — 渲染 6 组（核心导航/基础表单/数据展示/浮层反馈/导航辅助/悬浮窗专属）全部 32 组件的完整变体矩阵；每组内部调用 `showcase()`；浮层组件附「点击演示」触发按钮；悬浮窗组件在 `#components` 底部渲染一个可交互的 `FloatingWindow` 实例 + FloatBall + SearchBar 联动演示（Ctrl+K 聚焦、FloatBall 展开面板）
- 组件来源：复用 Task 6-13 已建组件；本任务只组装不新建组件

- [ ] **Step 1: 修改 components-basic.spec.js 为真实展示区断言**

```js
test('按钮四变体渲染', async ({ page }) => {
  await page.goto('/');
  const box = page.locator('.showcase:has(.showcase__label >> text="主按钮")');
  await expect(box.locator('.c-btn--primary')).toHaveCount(1);
  // 变体矩阵下：secondary/ghost/danger 各至少一个
  await expect(page.locator('#components .c-btn--secondary')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--ghost')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--danger')).toHaveCount(1);
});
```
（删除 Task 6 中依赖 `window.__renderIcon` 的测试，改断言 `#components svg.c-icon` 数量 ≥ 20。）

- [ ] **Step 2: 实现组件矩阵**

`component-showcase-full.js` 按 `src/components/` 目录已有组件的 render 函数组装（**组件清单 32 个**：NavigationWheel 容器、TitleBar、SidebarItem（新：`.c-sidebar-item` 简单样式，icon + 名称 + 选中态）、Button、Icon、Input、Textarea、Select、Checkbox、Radio、Switch、Slider、Kbd、Card、List、Badge、Tag、Progress、Avatar、Skeleton、EmptyState、Toast（演示按钮）、Dialog、Popover、ContextMenu、Tab、Breadcrumb、FloatingWindow、SearchBar、HotkeyHint、FloatBall、HotkeyRecorder）。SidebarItem 本任务内建（`renderSidebarItem({ label, iconName, active })`，样式仿 navwheel item 但为静态框形态）。

- [ ] **Step 3: main.js 替换临时渲染**

删除 Task 6/7/8/9/13 在 main.js 里的零散 showcase 追加代码，统一改调 `mountComponentsShowcase(document.querySelector('#components'))`（保留 `.c-fwin` 演示实例挂载与 Ctrl+K 热键绑定）。

- [ ] **Step 4: 运行测试**

Run: `npm run test:e2e` — Expected: 全部 PASS（组件矩阵相关 4 个 spec）

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 组件展示区（6 组 32 组件完整矩阵）"
```

---

### Task 16: 动效实验室（时长/弹性/位移试玩器）

**Files:**
- Create: `src/demo/motion-lab.js`
- Modify: `src/main.js`
- Create: `src/styles/motion-lab.css`

**Interfaces:**
- `motion-lab.js` 导出 `mountMotionLab(root)` — 渲染到 `#motion` section：
  - 5 个动效演示卡（每个含 demo 舞台 + 参数试玩器）：
    1. 面板呼出（scale+fade+translate，`--ease-spring`）
    2. hover 提升（translateY -1px + 高光）
    3. 列表 stagger（5 项，相邻 40ms 延迟）
    4. 开关（thumb transform + spring）
    5. 徽标弹出（scale 0 → 1 + spring）
  - 每个 demo 参数（试玩器写局部 CSS 变量到 demo 容器，不碰全局）：
    - 时长（0.5×/1×/2×，映射 `--dur-base` 局部覆盖）
    - 弹性强度 0-1（映射 `--ease-spring` 局部覆盖，用 `springCurve()`）
    - 位移距离 0-24px（`--lift` 局部变量）
  - 「重播」按钮：移除/重加 demo 元素触发动画
  - 卡片 DOM：`.ml-card`, `.ml-stage`, `.ml-controls`, `.ml-slider`, `.ml-replay`
- 联动：定制器全局参数（时长缩放/弹性）变化时，实验室 demo 跟随（读 store 初始值，展示页切换主题时 rAF 不中断）

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/motion-lab.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('动效实验室渲染 5 个演示', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ml-card')).toHaveCount(5);
});

test('弹性滑杆影响局部曲线', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('.ml-slider').first();
  await slider.fill('1'); // 触发 input
  await expect(page.locator('.ml-card').first())
    .toHaveCSS('--ease-spring', /cubic-bezier/);
});

test('重播按钮重新触发动画', async ({ page }) => {
  await page.goto('/');
  const replay = page.locator('.ml-replay').first();
  await replay.click();
  await expect(page.locator('.ml-stage .ml-anim').first()).toHaveClass(/ml-anim--running/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/motion-lab.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 motion-lab.js**

每个 demo 的实现要点：
- 呼出：`.ml-anim` 加 `animation: pop var(--dur-base) var(--ease-spring)`，`@keyframes pop { from { transform: scale(0.96) translateY(var(--lift, 8px)); opacity: 0; } }`（只动 transform/opacity）
- stagger：子项 `animation-delay: calc(var(--i) * 40ms)`，`--i` 用 `style` 内联
- 试玩器 input 事件：`container.style.setProperty('--dur-base', `${200 * scale}ms`)`、`--ease-spring = springCurve(strength)`、`--lift = ${dist}px` — 全部局部作用域
- 重播：clone 节点替换

- [ ] **Step 4: main.js 接入**

```js
import { mountMotionLab } from './demo/motion-lab.js';
mountMotionLab(document.querySelector('#motion'));
```

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 28 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 动效实验室（5 演示 + 参数试玩器）"
```

---

### Task 17: 主题定制器面板（风格卡片/滑杆/预设/导出）

**Files:**
- Create: `src/demo/customizer-panel.js`
- Create: `src/styles/customizer.css`
- Modify: `src/main.js`
- Create: `src/demo/customizer-css.js`

**Interfaces:**
- `customizer-panel.js` 导出 `mountCustomizer(root)` 与 `toggleCustomizer(open)`：
  - DOM：`.cust-backdrop`（点击关闭）+ `.cust-panel`（右侧抽屉，`transform: translateX(100%)` → 0 进入动画，`--z-overlay`）+ `.cust-group`（6 组：色彩/玻璃材质/排版/圆角/动效/阴影）+ `.cust-row`（标签 + 控件）
  - 色彩组：`.cust-accent-card`（6 张风格卡片：色点 + 名称 + 气质，`--active` 态）+ 色相/饱和/明度滑杆（色相滑杆用 `hsl()` 预览色点）+ 色温滑杆（冷↔暖）+ 语义色预览条
  - 玻璃组：透明度 / 模糊 / 高光 3 滑杆 + 即时预览 `.cust-glass-preview`（glass 材质块）
  - 排版组：基准字号 / 缩放 / 字重 3 滑杆
  - 圆角组：1 滑杆（radiusScale）
  - 动效组：总开关 + 时长缩放 + 弹性强度滑杆
  - 阴影组：强度滑杆
  - 底部：`.cust-presets`（「默认深」「默认浅」按钮）、「保存我的方案」「导出 CSS 变量」「重置」按钮
  - 所有滑杆数据来自 `RANGES`（min/max/step），写 store → `applyConfig` → 实时生效
- `customizer-css.js` 导出 `exportCss(cfg)` — 生成完整 CSS 变量代码字符串（`:root { … }` + `[data-theme=…]` 段），复制到剪贴板
- 导出按钮行为：`navigator.clipboard.writeText(exportCss(getConfig()))` + `toast('CSS 变量已复制')`

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/customizer.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('定制器打开并调整玻璃透明度实时生效', async ({ page }) => {
  await page.goto('/');
  await page.locator('.topbar__customizer').click();
  await expect(page.locator('.cust-panel')).toBeVisible();
  const slider = page.locator('.cust-row:has-text("透明度") input[type="range"]');
  await slider.fill('0.8');
  const bgOpacity = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--glass-bg-opacity').trim());
  expect(bgOpacity).toBe('0.8');
});

test('导出按钮复制 CSS 变量', async ({ page }) => {
  await page.goto('/');
  let copied = '';
  await page.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });
  await page.locator('.topbar__customizer').click();
  await page.locator('.cust-export').click();
  copied = await page.evaluate(() => window.__copied);
  expect(copied).toContain('--accent');
  expect(copied).toContain(':root');
});

test('重置恢复默认配置', async ({ page }) => {
  await page.goto('/');
  await page.locator('.topbar__customizer').click();
  await page.locator('.cust-glass-preview').hover();
  await page.locator('.cust-reset').click();
  const cfg = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ui-design-config') ?? 'null'));
  expect(cfg).toBeNull(); // 重置 = 清除存储 + applyConfig(DEFAULTS)
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/customizer.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现 customizer-css.js 与 customizer-panel.js**

`customizer-css.js`（导出模板拼接，值全部来自 cfg 与 DEFAULTS 常量）:
```js
import { DEFAULTS } from '../config/defaults.js';
import { springCurve } from '../motion/spring.js';

export function exportCss(cfg) {
  const { glass, type, radiusScale, motion, shadow } = cfg;
  return `/* 由主题定制器导出 — ${new Date().toLocaleString('zh-CN')} */
:root {
  --glass-bg-opacity: ${glass.opacity};
  --glass-blur: ${glass.blur}px;
  --glass-highlight-opacity: ${glass.highlight};
  --font-size-base: ${type.baseSize}px;
  --radius-scale: ${radiusScale};
  --shadow-intensity: ${shadow};
  --dur-fast: ${120 * motion.durationScale}ms;
  --dur-base: ${200 * motion.durationScale}ms;
  --dur-slow: ${300 * motion.durationScale}ms;
  --ease-spring: ${springCurve(motion.springStrength)};
  --spring-strength: ${motion.springStrength};
}
html[data-theme="${cfg.theme === 'system' ? 'dark' : cfg.theme}"] { /* 主题映射见 themes.css */ }
html[data-accent="${cfg.accent}"] { /* 主题色板见 themes.css */ }`;
}
```
（注意：`new Date()` 在导出模板内使用 — 运行环境为浏览器，合法。）

`customizer-panel.js` 主体：渲染面板（静态 HTML 模板 + `RANGES` 生成滑杆），input 事件 → `saveConfig(patch)` → `applyConfig(getConfig())`；订阅 store 同步 UI 态；「默认深/浅」= `saveConfig({ theme: 'dark' })`；「重置」= `localStorage.removeItem(KEY)` + `applyConfig(DEFAULTS)`；导出如上。面板 CSS 用抽屉动画：`.cust-panel { transform: translateX(100%); transition: transform var(--dur-base) var(--ease-spring); } .cust-panel--open { transform: none; }`。

- [ ] **Step 4: main.js 接入**

顶部栏「定制」按钮 → `toggleCustomizer(true)`；`mountCustomizer(document.body)` 挂载 backdrop + panel。

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 31 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 主题定制器（风格卡片/滑杆组/预设/导出 CSS）"
```

---

### Task 18: 场景模板 1 — 剪贴板悬浮窗（模拟悬浮窗）

**Files:**
- Create: `src/scenes/clipboard-float/clipboard-float.js`
- Create: `src/scenes/clipboard-float/clipboard-float.css`
- Modify: `src/main.js`

**Interfaces:**
- `clipboard-float.js` 导出 `mountClipboardFloat(root)` — 渲染到 `#scenes` 内：
  - 标题「剪贴板悬浮窗」+ 说明（浏览器内模拟；Tauri 接入见 `docs/tauri-integration.md`）
  - 一个 `renderFloatingWindow` 实例（宽 360 高 480）：body 内 = SearchBar（过滤列表）+ 剪贴板列表（12 条固定模拟数据：文本/链接/图片占位 3 种类型，icon + 首行 + 时间 meta + 悬停操作按钮复制/固定/删除）+ 底部固定项分区 + 「清空全部」按钮
  - 交互：搜索过滤（`:has` 或 JS filter 隐藏不匹配项）、悬停行显示操作、复制按钮 → `toast('已复制到剪贴板')`、固定切换（`.c-list__item--pinned` 置顶 + 图钉变色）、删除（行移除 + 空态切换）、清空全部 → `openDialog` 危险确认 → 清空 + EmptyState
  - stagger 进入：列表项 `animation: item-in 200ms var(--ease-out)` + `animation-delay: calc(var(--i) * 30ms)`（只动 transform/opacity）
  - DOM：`.cfloat`, `.cfloat__list`, `.cfloat__item`, `.cfloat__ops`（悬停操作组）
  - 模拟数据写死在 `src/scenes/clipboard-float/data.js`（12 条，中文内容：网址/代码片段/文本）

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/scene-clipboard.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('剪贴板悬浮窗列表渲染与搜索过滤', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.cfloat');
  await expect(scene.locator('.cfloat__item')).toHaveCount(12);
  await scene.locator('.c-search-bar input').fill('github');
  const visible = await scene.locator('.cfloat__item:visible').count();
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(12);
});

test('删除与清空流程', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.cfloat');
  await scene.locator('.cfloat__item').first().hover();
  await scene.locator('.cfloat__item .cfloat__op--delete').first().click();
  await expect(scene.locator('.cfloat__item')).toHaveCount(11);
  await scene.locator('.cfloat__clear').click();
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(scene.locator('.cfloat__item')).toHaveCount(0);
  await expect(scene.locator('.c-empty-state')).toBeVisible();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/scene-clipboard.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现剪贴板场景**

`data.js`:
```js
export const CLIP_ITEMS = [
  { id: 1, type: 'link', title: 'https://github.com/…', meta: '刚刚', pinned: false },
  { id: 2, type: 'text', title: 'let result = items.map(i => i * 2);', meta: '2 分钟前', pinned: false },
  { id: 3, type: 'image', title: '截图_2026-08-04.png', meta: '5 分钟前', pinned: true },
  // … 共 12 条，覆盖 link/text/image 三种类型，其中至少 2 条含 "github"
];
```
（type → icon：link=globe、text=clipboard、image=image；pinned 项排列表头。）

场景 JS 要点：`state = { items }`；`renderList()` 用 `showcase` 无关的独立渲染（`.cfloat__item` 结构）；搜索 filter；hover 操作组 `opacity: 0 → 1`（`.cfloat__item:hover .cfloat__ops { opacity: 1 }`，transition 用 `--dur-fast`）；清空 Dialog。列表容器高 320px 内部滚动（`overflow-y: auto`）。

- [ ] **Step 4: main.js 接入**

```js
import { mountClipboardFloat } from './scenes/clipboard-float/clipboard-float.js';
const scenesSection = document.querySelector('#scenes');
scenesSection.innerHTML = '<h2>场景模板</h2>';
mountClipboardFloat(scenesSection);
```

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 33 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 场景模板 1 剪贴板悬浮窗（搜索/固定/删除/清空）"
```

---

### Task 19: 场景模板 2 — 主窗口（一体式 + 滑动导航）

**Files:**
- Create: `src/scenes/main-window/main-window.js`
- Create: `src/scenes/main-window/main-window.css`
- Modify: `src/main.js`

**Interfaces:**
- `main-window.js` 导出 `mountMainWindow(root)` — 渲染到 `#scenes`（独立于展示页骨架的完整小应用）：
  - 外层 `.cmain`（880×560 圆角玻璃窗口，`--radius-lg`，内部 `display: grid; grid-template-columns: 176px 1fr; grid-template-rows: 40px 1fr`）
  - 顶部：`renderTitleBar`（title「我的应用」，drag region 属性保留）
  - 左侧：独立 `mountNavWheel` 实例，**8 个模块**（仪表盘 home / 数据列表 list / 表单 settings / 图片库 image / 空状态 star / 帮助 help / 关于 info / 更多 folder — 8×64=512px > 视口 520px，可真实滑动；后续用户新增模块即沿用此扩展方式）— **注意：NavigationWheel 内部用 `.c-navwheel__list` 定位 inset 依赖父容器高度，场景内父容器是 `grid` cell，需确认高度约束生效（`min-height: 0`），如滚动失效则给 `.c-navwheel` 固定高度 560-40px**
  - 右侧内容区：8 个模块页（默认第 0 个；后 3 个模块页为占位形态，复用前 5 种内容形态或纯标题页）：
    - 仪表盘：3 张统计卡（`.c-card` 数字 + 趋势） + 进度条
    - 数据列表：`.c-list` 8 行 + 分页按钮
    - 表单页：Input/Select/Switch/Button 组合表单 + 提交 toast
    - 图片库：9 宫格占位（渐变块 + 悬停放大 `scale(1.05)` 只动 transform）
    - 空态：EmptyState + 按钮
  - 切换动画：内容区淡入（`.cmain__page` 进入 `opacity + translateY(4px)`，`--dur-base`）
  - 设置入口：`.c-navwheel__settings` 触发内容区切到表单页并 toast 提示（演示用）

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/scene-main-window.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('主窗口滑动导航切换模块内容', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.cmain');
  await expect(scene.locator('.c-navwheel__item')).toHaveCount(5);
  await expect(scene.locator('.cmain__page--active')).toContainText('统计');
  await scene.locator('.c-navwheel__item').nth(3).click();
  await expect(scene.locator('.cmain__page--active')).toContainText('图片');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/scene-main-window.spec.js` — Expected: FAIL

- [ ] **Step 3: 实现主窗口场景**

按 Interfaces 组装；NavigationWheel 复用（`onChange` 切 `.cmain__page` active 类）；页面切换动画用 `.cmain__page { animation: page-in var(--dur-base) var(--ease-out) }`，`@keyframes page-in { from { opacity: 0; transform: translateY(4px) } }`。

- [ ] **Step 4: main.js 接入**

`mountMainWindow(scenesSection)` 追加到剪贴板场景之后。

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 34 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 场景模板 2 主窗口（一体式标题栏 + 滑动导航 + 5 模块）"
```

---

### Task 20: 场景模板 3 — 设置页（滑动选择分区 + 定制器整页嵌入）

**Files:**
- Create: `src/scenes/settings-window/settings-window.js`
- Create: `src/scenes/settings-window/settings-window.css`
- Modify: `src/main.js`

**Interfaces:**
- `settings-window.js` 导出 `mountSettingsWindow(root)` — 渲染到 `#scenes`：
  - 外层 `.csettings`（820×520 玻璃窗口，`grid-template-columns: 220px 1fr` — **设置导航比主页更宽**，用户确认的变体规格）
  - 顶部 TitleBar（title「设置」）
  - 主体左右分栏：左侧**纵向 NavigationWheel 变体**（**8 分区**：通用 home / 外观 palette / 界面 layout / 快捷键 key / 通知 bell / 数据 folder / 高级 settings / 关于 info — 8×64=512px > 视口 480px 可真实滑动；界面类模块统一收纳于此）— 复用 `mountNavWheel`，容器高 480-40px
  - 右侧内容（8 分区，通用/外观/快捷键/关于为完整页，其余为占位页）：
    - 通用：主题三态（复用 `tsw` 结构或 Select）+ 动效开关（Switch）+ 启动行为（Select）+ 保存 toast
    - 外观：**定制器整页形态**（复用 `customizer-panel.js` 的分组渲染函数，抽出 `renderCustomizerGroups()` 供面板与整页共用 — 重构：`customizer-panel.js` 导出 `renderCustomizerGroups(container)`，面板与场景共用同一实现）
    - 快捷键：HotkeyRecorder 列表（4 行：呼出面板 Ctrl+Shift+V / 搜索 / 粘贴纯文本 / 清空）+ 说明
    - 界面：模块显隐开关列表（占位：Switch 列表 + 说明「界面类模块导航收拢于设置」）
    - 通知 / 数据 / 高级：占位页（EmptyState 或简单表单）
    - 关于：应用信息卡（logo 占位 + 名称 + 版本 + 开源链接占位）
  - 分区切换 = NavigationWheel onChange（与主窗口一致）

- [ ] **Step 1: 写失败的 Playwright 测试**

Create `tests/e2e/scene-settings.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('设置页滑动选择分区切换', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.csettings');
  await expect(scene.locator('.c-navwheel__item')).toHaveCount(4);
  await scene.locator('.c-navwheel__item').nth(1).click();
  await expect(scene.locator('.csettings__page--active')).toContainText('外观');
});

test('外观页嵌入定制器分组', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.csettings');
  await scene.locator('.c-navwheel__item').nth(1).click();
  await expect(scene.locator('.cust-group')).toHaveCount(6);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test tests/e2e/scene-settings.spec.js` — Expected: FAIL

- [ ] **Step 3: 重构定制器分组渲染 + 实现设置页**

`customizer-panel.js` 重构：抽出 `export function renderCustomizerGroups(container)`（6 组 HTML + 事件绑定，事件写到 store/apply）；面板 `mountCustomizer` 调用它；设置页外观分区也调用它（同一容器语义 — 两组滑杆操作同一份 store，双向实时）。

设置页快捷键页：4 行 HotkeyRecorder（每行 label + recorder），录制结果存 `sessionStorage`（演示级）。

- [ ] **Step 4: main.js 接入**

`mountSettingsWindow(scenesSection)` 追加。

- [ ] **Step 5: 运行测试**

Run: `npm run test:e2e` — Expected: 36 PASS

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 场景模板 3 设置页（滑动分区 + 定制器整页嵌入）"
```

---

### Task 21: Tauri 接入指南 + README + 视觉回归收尾

**Files:**
- Create: `docs/tauri-integration.md`
- Create: `README.md`
- Create: `tests/e2e/visual-regression.spec.js`
- Modify: `package.json`（加 `test:visual` script）

**Interfaces:**
- `docs/tauri-integration.md` 内容（完整实操，含代码）：
  - 透明无边框窗口：`tauri.conf.json` 的 `app.windows` 配置（`"decorations": false, "transparent": true`）+ Windows 上透明窗口注意事项（WebView2 调整尺寸闪烁规避、置顶全屏限制说明）
  - 拖拽：`data-tauri-drag-region` 属性说明（TitleBar/FloatingWindow 已标注）
  - 窗口控制：`getCurrentWindow().minimize()/toggleMaximize()/close()` 的 JS 示例（替换 TitleBar 控制按钮 onClick）
  - macOS：traffic lights 隐藏或保留的两种做法 + 全屏 `data-tauri-drag-region` 失效时的兜底（按住 Option 拖动）
  - 主题跟随系统：`@tauri-apps/plugin-theme` 或 `matchMedia` 方案
  - 主题定制器嵌入：`config/` 三文件复制路径 + 导出的 CSS 变量粘贴位置（`<style>` 或 `:root` 覆盖层）
  - 悬浮窗：独立窗口（alwaysOnTop / skipTaskbar）、FloatBall 与面板窗口组合建议
- `README.md`：项目简介、`npm run dev`、目录结构、规格/计划文档链接
- `visual-regression.spec.js`：`test('视觉回归 — 深/浅 × 3 accent', …)` 对 `#tokens`、`#components`、3 场景模板截图（`toHaveScreenshot()`）；首次运行 `npx playwright test --update-snapshots` 生成基线；后续 CI 对比
- package.json：`"test:visual": "playwright test tests/e2e/visual-regression.spec.js"`

- [ ] **Step 1: 写 tauri-integration.md 与 README.md**

按 Interfaces 完整撰写（含全部配置代码块与 JS 示例，不省略）。

- [ ] **Step 2: 写视觉回归测试**

```js
import { test } from '@playwright/test';

const SHOTS = [
  ['tokens', 'tokens'], ['components', 'components'], ['scenes', 'scenes'],
  ['main-window', '.cmain'], ['settings-window', '.csettings'], ['clipboard', '.cfloat'],
];

for (const [name, selector] of SHOTS) {
  test(`视觉回归 — ${name}`, async ({ page }) => {
    await page.goto('/');
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400); // 等动效稳定
    await expect(page.locator(selector).first()).toHaveScreenshot(`${name}.png`);
  });
}
```
（深/浅 × 3 accent 的组合由测试内循环 `page.evaluate` 设置 `data-theme`/`data-accent` 后对同一 selector 命名 `name-{theme}-{accent}.png`。）

- [ ] **Step 3: 生成基线并运行**

Run: `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` — Expected: 生成快照
Run: `npm run test:e2e` — Expected: 全部 PASS（含视觉回归对比）

- [ ] **Step 4: 性能自查（人工 + 脚本）**

在 `main.js` 加开发模式断言（可选）：无。人工验收项写入 README：动效流畅度、6 项以上动画 stagger 遵守、帧率感受（可打开 DevTools Performance 面板录制 NavigationWheel 拖动）。

- [ ] **Step 5: 最终构建验证**

Run: `npm run build` — Expected: dist 产出
Run: `npx vite preview` + 手动浏览器验收展示页全功能（主题切换、6 套主题色、定制器、3 场景、动效实验室、NavigationWheel 拖动）

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "docs: Tauri 接入指南 + README + 视觉回归基线"
```

---

## Self-Review 记录

- **规格覆盖核对**：§4 架构 ✓（Task 1-3）；§5 令牌 ✓（Task 2，6 套主题色 ✓）；§6 定制器 ✓（Task 17 + Task 20 整页嵌入）；§7 组件清单 ✓（Task 6-13 建组件 + Task 15 矩阵，SidebarItem 在 Task 15 内建补齐 32 个）；§8 NavigationWheel ✓（Task 11-12：滚轮/触摸板滚动、拖拽惯性、实时跟手变形、居中吸附、点击滑动到中间、名称 clip 滑入、光晕、设置入口、键盘）；§9 TitleBar ✓（Task 10）；§10 展示页 ✓（Task 3/14/15/16/17 组装）；§11 三场景 ✓（Task 18/19/20）；§12 数据流 ✓（Task 4/5）；§13 错误处理 ✓（Task 4 store 兜底 + Task 17 导出）；§14 测试 ✓（Task 4/11 单测 + 各任务 e2e + Task 21 视觉回归）；§15 非目标 ✓（无框架无后端无真实窗口）。
- **动效红线**：所有动画仅 transform/opacity（stagger、scale、translate、clip-path 动画仅用于名称滑入 — clip-path 为合成器友好属性，符合「不触发布局」约束）；模糊永不动画（Toast/Dialog/面板进入动画均只动 transform/opacity）；6 项以上 stagger（剪贴板列表、stagger demo）。
- **类型一致性**：`springCurve(strength)` / `scaledDurations(scale, enabled)`（Task 4 定义，Task 16/17 复用）；`findNearestIndex` 等几何函数签名（Task 11 定义，Task 12 复用）；`renderXxx` 全组件统一契约；`showcase(title, items)`（Task 6 定义，Task 15 复用）；`toast`/`openDialog` 全局暴露（Task 9 定义，Task 18 清空流程复用）。
- **已知延迟项**：`cubicBezierY`（Task 11 Step 7 标注实现提示）；`window.__renderIcon` 测试桥（Task 15 移除）；accent 深色对比色（`--accent-contrast` 浅色主题深字/深色主题浅字 — themes.css 已按套定义）。

## 实施修订记录（Task 1-4 已执行，2026-08-04）

以下为 Task 1-4 实际执行中的修正与评审发现，均已通过任务评审。后续任务以本文档为准。

### 已应用的实现修正

1. **Task 1**：vitest 无测试文件时 exit 1 → 配置 `passWithNoTests: true`；playwright 无等价选项 → 新增最小冒烟测试 `tests/e2e/smoke.spec.js`（同时验证 webServer+chromium 链路）。提交 66feb9b。
2. **Task 4 — spring.js 去尾随零**（简报原实现与测试断言冲突，测试为准）：`toFixed(3)` 产出 `'1.000'`/`'1.560'` 与断言 `'1'`/`'1.56'` 不符，改为 `+(1 + 0.56 * s).toFixed(3)` 保留 3 位精度、去掉尾随零。提交 6c1dc56。
3. **Task 4 — prefersDark 环境守卫**：jsdom 26 无 `window.matchMedia`，`typeof window.matchMedia === 'function'` 守卫，真实浏览器行为不变。
4. **Task 4 — themes.css 保留派生别名**：`--glass-bg`/`--glass-border` 仍被 base.css（body 背景）与 layout.css（topbar/navwheel）引用，保留别名并提供兜底值（亮 0.72/0.6/0.5、暗 0.62/0.08/0.08），未接入 applyConfig 时外观不变。

### 待办修复（收尾时统一处理，建议并入 Task 21）

| 修复项 | 位置 | 说明 |
|---|---|---|
| radius 包裹 calc | `src/styles/layout.css:9`（`.topbar__nav a`） | `border-radius: var(--radius-sm)` → `calc(var(--radius-sm) * var(--radius-scale, 1))`，否则定制器圆角滑杆不影响顶栏导航项 |
| 硬编码间距 | `src/styles/layout.css:7` | `.topbar__nav a { padding: 4px 8px }` → `var(--space-1) var(--space-2)` |
| 弹性默认值对齐 | `src/styles/motion.css:4` | `--ease-spring` 默认 `cubic-bezier(0.34, 1.56, 0.64, 1)`（= 强度 1.0）与 `--spring-strength: 0.6` 声明不一致 → 统一为 `cubic-bezier(0.34, 1.336, 0.64, 1)`（applyConfig 运行后会正确覆盖，此修复保证未运行 applyConfig 的场景一致） |
| focus-visible 跟随主题色 | `src/styles/base.css` | `:focus-visible` 用 `--accent-500` 固定档 → 改为 `var(--accent)`，切换 6 套主题色后焦点环跟随 |

### 待用户确认的设计点

- **阴影默认强度**：Task 4 的阴影合成公式 `calc(0.14 * var(--shadow-intensity, 0.5))` 下，DEFAULTS.shadow=0.5 使默认阴影视觉为原值一半（0.10→0.05 等）。可选：(a) 接受 — 半强度默认即设计意图；(b) DEFAULTS.shadow 改为 1（全强度默认）；(c) 公式基准改为 `calc(0.14 * (0.5 + var(--shadow-intensity, 0.5) * 0.5))`（0.5 基准 + 强度调节）。展示页可预览后决定，Task 21 前确认即可。

### 评审已确认无问题的观察项

- `base.css` 的 `.glass` 移除 `-webkit-backdrop-filter`（WebView2/Chromium 无影响，可接受）
- `deepMerge`/`saveConfig` 错误处理达标（损坏 JSON、隐私模式 setItem 抛错、null/标量存储值均安全）
