# 应用壳 B5 实施计划（设计语言统一：字体替换 + Slider 统一 + iOS 风格组件 + 自适应布局）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ① 阿里普惠体全局替换字体 ② 三区（外观/动效/组件）滑杆统一到胶囊形 Slider ③ 徽标/按钮/悬浮球 iOS 风格化 ④ 内容区自适应布局（表单限宽居中 + 展示撑满）。

**Architecture:** 字体经 `@font-face`（WOFF2，55/85 两档）落地 `src/assets/fonts/`，`--font-sans` 令牌加前缀；Slider 三处实现统一到一个 `.c-slider` 胶囊组件（track 用 `--fill` 变量驱动 accent 填充）；iOS 化走「材质/层次/透明度」而非色彩浓度——三个组件改 CSS 令牌引用（玻璃/内高光/半透明混色）；布局改 `data-layout`（center 限宽居中 / fluid 撑满）分区差异化，字号间距恒定不动。

**Tech Stack:** Vite + 原生 JS + Vitest + Playwright + Tauri 2.11（现有；零运行时依赖）。

## Global Constraints

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 src/CLAUDE.md 风格。
- 禁止升级核心依赖。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/progress-b5.md`。
- **每任务结束时 `npm test` + `npm run test:e2e` + `npm run build` 全绿**。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**；B5 字体替换 + 组件改版 → 预期内大量重生成。
- **e2e 截图前必须等待字体加载完成**（`document.fonts.ready`）防基线抖动。
- 规格：docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md（唯一需求源）。
- 字体文件来源（用户已提供，官方包带 WOFF2）：`C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-55-Regular\AlibabaPuHuiTi-3-55-Regular.woff2`（5.2MB）、`C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-85-Bold\AlibabaPuHuiTi-3-85-Bold.woff2`（5.5MB）。复制到 `src/assets/fonts/` 随代码提交。
- **环境注意（本会话遗留）**：共享 checkout 可能有陈旧 Vite dev server（端口 5173）serve 旧代码，Playwright 默认 `reuseExistingServer:true` 会误连 → e2e 测到旧代码失真。**e2e 必须用 worktree 配置**（端口 5174 新鲜 server，`reuseExistingServer:false`）或先停旧进程。模板见下：

```js
// playwright.config.worktree.js（放 worktree 根，不提交）
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:5174', launchOptions: { args: ['--use-angle=swiftshader'] } },
  webServer: { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```
> 每个任务 e2e 命令统一：`npx playwright test --config=playwright.config.worktree.js`（单文件时追加路径）。

---

### Task B5-1: 字体全局替换（阿里普惠体 55/85）

**Files:**
- Create: `src/assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2`、`src/assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2`（从用户 Downloads 复制）
- Create: `src/styles/fonts.css`（@font-face 两档）
- Modify: `src/styles/base.css`（顶部引入 fonts.css）
- Modify: `src/styles/tokens.css:23`（`--font-sans` 加普惠体前缀）
- Modify: `tests/e2e/tokens.spec.js`（加 `--font-sans` 断言）
- Modify: `tests/e2e/visual-regression.spec.js`（截图前等 `document.fonts.ready`）
- Test: `tests/unit/font-assets.test.js`（新建，字体文件存在性 + tokens 引用守卫）

**Interfaces:**
- Produces: `@font-face 'Alibaba PuHuiTi'`（400/700）+ `--font-sans` 含 `"Alibaba PuHuiTi"` 前缀 —— B5-2/3/5 的滑杆/组件/控件文字自动继承（font-family 继承）
- `--font-mono` 不变（JetBrains Mono/Cascadia，B5 全程不碰）

- [ ] **Step 1: 复制字体文件到 src/assets/fonts/**

```bash
mkdir -p src/assets/fonts
cp "C:/Users/PomDetom/Downloads/AlibabaPuHuiTi-3-55-Regular/AlibabaPuHuiTi-3-55-Regular.woff2" src/assets/fonts/
cp "C:/Users/PomDetom/Downloads/AlibabaPuHuiTi-3-85-Bold/AlibabaPuHuiTi-3-85-Bold.woff2" src/assets/fonts/
```

- [ ] **Step 2: 写失败单测**（tests/unit/font-assets.test.js，新建）

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('阿里普惠体字体（B5-1：全局字体替换）', () => {
  // Vitest 3.2 + Vite 会将 `new URL(path, import.meta.url)` 字面量按 dev asset URL 解析，
  // 先取到变量再作 base，命中磁盘上真实的文件（同 window-capabilities.test.js 模式）。
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('55/85 两个 WOFF2 文件存在', () => {
    // 仅存在性守卫，不读内容（二进制大文件）
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2'))).toBeTruthy();
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2'))).toBeTruthy();
  });

  it('fonts.css 定义 55 Regular + 85 Bold 两档 @font-face', () => {
    const css = readFileSync(base('styles/fonts.css'), 'utf8');
    expect(css).toContain("font-family: 'Alibaba PuHuiTi'");
    expect(css).toContain('AlibabaPuHuiTi-3-55-Regular.woff2');
    expect(css).toContain('AlibabaPuHuiTi-3-85-Bold.woff2');
    expect(css).toContain('font-weight: 400');
    expect(css).toContain('font-weight: 700');
    expect(css).toContain('font-display: swap');
  });

  it('tokens.css --font-sans 含 Alibaba PuHuiTi 前缀', () => {
    const css = readFileSync(base('styles/tokens.css'), 'utf8');
    expect(css).toMatch(/--font-sans:\s*"Alibaba PuHuiTi",/);
  });

  it('base.css 引入 fonts.css', () => {
    const css = readFileSync(base('styles/base.css'), 'utf8');
    expect(css).toMatch(/@import.*fonts\.css/);
  });
});
```

- [ ] **Step 3: 运行确认红**

Run: `npx vitest run tests/unit/font-assets.test.js`
Expected: FAIL（fonts.css 不存在 / tokens.css 无前缀 / base.css 无 @import）

- [ ] **Step 4: 实现 fonts.css**（src/styles/fonts.css，新建）

```css
/* 阿里普惠体（B5-1）：55 Regular 正文 + 85 Bold 标题，WOFF2 官方包。拉丁缺字形回退系统字体栈
   （--font-sans 后续已含 -apple-system/Segoe UI）。font-display: swap → 首屏系统字体占位、加载后替换。 */
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2') format('woff2');
  font-weight: 700; font-display: swap;
}
```

- [ ] **Step 5: 改 tokens.css 的 --font-sans**

`src/styles/tokens.css:23` 改为：

```css
  --font-sans: "Alibaba PuHuiTi", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
```

> 普惠体排最前（中文/标点走普惠体）；拉丁（英文/数字）在普惠体缺字形时回退 Segoe UI。`--font-size-*`/`--font-weight-*` 不动（B4-2 已 real 生效，字重 400/700 直接映射普惠体 Regular/Bold）。

- [ ] **Step 6: base.css 引入 fonts.css**

`src/styles/base.css` 顶部（第一行 `*, *::before` 之前）加：

```css
@import './fonts.css';
```

> 必须置于 CSS 首行（@import 规则须先于其他规则）。base.css 由 main.js:4 引入，Tauri/浏览器共用。

- [ ] **Step 7: 单测确认绿**

Run: `npx vitest run tests/unit/font-assets.test.js`
Expected: PASS

- [ ] **Step 8: e2e 加 --font-sans 断言**（tests/e2e/tokens.spec.js 追加）

```js
test('B5-1：--font-sans 全局指向阿里普惠体', async ({ page }) => {
  await page.goto('/?mode=app');
  // 等字体加载完成（CJK 字体大，font-display:swap 会先渲染系统字体占位）
  await page.evaluate(() => document.fonts.ready);
  const fam = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily);
  expect(fam).toContain('Alibaba PuHuiTi');
  // 普惠体已加载（55 Regular）
  const loaded = await page.evaluate(() =>
    document.fonts.check('14px "Alibaba PuHuiTi"'));
  expect(loaded).toBe(true);
});
```

- [ ] **Step 9: 视觉回归加字体等待**（tests/e2e/visual-regression.spec.js）

在 `await locator.scrollIntoViewIfNeeded();` 之前（约 SETTLE_MS 那行前）加：

```js
        await page.evaluate(() => document.fonts.ready); // B5-1：CJK 字体大，截图前必须等加载完成防抖动
```

- [ ] **Step 10: 视觉基线重生成（预期内全量）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 24 张重生成（字体替换 → 全量文字渲染变化）。**先解码比对**：随机抽 2-3 张新旧图确认差异仅文字字形（非布局/颜色意外变化），再提交基线。

- [ ] **Step 11: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿（新增 font-assets 单测 + tokens e2e + 24 视觉重生成）

```bash
git add src/assets/fonts/ src/styles/fonts.css src/styles/base.css src/styles/tokens.css tests/unit/font-assets.test.js tests/e2e/tokens.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 阿里普惠体全局替换（--font-sans 前缀 + 55/85 WOFF2，B5-1）"
```

> 桌面验证（用户目检）：`npm run tauri:dev` 后中文/英文整体换普惠体观感；标题 85、正文 55。

---

### Task B5-2: 统一 Slider 组件（胶囊形，三处接入）

**Files:**
- Modify: `src/components/slider/slider.css`（整体替换为胶囊自绘）
- Modify: `src/demo/customizer-panel.js`（`.cust-range` → `.c-slider` 三处：renderSlider/syncUI/closest）
- Modify: `src/demo/motion-lab.js`（`.ml-slider` → `.c-slider` 四处：controls 模板 2 处 + JS 引用 2 处）
- Modify: `src/styles/customizer.css`（删 `.cust-range` 独立规则）
- Modify: `src/styles/motion-lab.css`（删 `.ml-slider` 独立规则 + `.ml-control` 布局适配）
- Modify: `tests/e2e/customizer.spec.js`（`.cust-range` → `.c-slider` 选择器）
- Modify: `tests/e2e/motion-lab.spec.js`（`.ml-slider` → `.c-slider` 选择器）
- Modify: `tests/unit/motion-lab.test.js`（`.ml-slider` → `.c-slider` 选择器）
- Test: `tests/unit/slider.test.js`（新建，renderSlider 签名 + 输出类名）

**Interfaces:**
- Consumes: Task B5-1 的 `--font-sans`（滑杆标签文字继承新字体）
- Produces: `.c-slider` 胶囊滑杆组件（track 用 `--fill` 变量驱动 accent 填充，thumb 20px 胶囊圆角）；`renderSlider({min,max,step,value,disabled,label})` 签名不变 —— B5-5 控件收尾沿用

- [ ] **Step 1: 写失败单测**（tests/unit/slider.test.js，新建）

```js
import { describe, it, expect } from 'vitest';
import { renderSlider } from '../../src/components/slider/slider.js';

describe('Slider 组件（B5-2：三区统一胶囊形）', () => {
  it('renderSlider 输出 .c-slider 且保留全部 props', () => {
    const html = renderSlider({ min: 0, max: 10, step: 0.5, value: 5, disabled: true, label: '测试' });
    expect(html).toContain('class="c-slider"');
    expect(html).toContain('min="0" max="10" step="0.5" value="5"');
    expect(html).toContain('disabled');
    expect(html).toContain('aria-label="测试"');
  });
  it('renderSlider 默认值', () => {
    const html = renderSlider({});
    expect(html).toContain('min="0" max="100" step="1" value="50"');
    expect(html).not.toContain('disabled');
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/slider.test.js`
Expected: FAIL（`slider.js` 现输出 `class="c-slider"` 但断言部分通过——需确认至少 1 个红，如 disabled/默认值断言；若现实现已符合，则改造为断言「组件/动效/外观三处不再有独立滑杆类名」的契约守卫，见 Step 3 注）

> 注：slider.js 现实现 `class="c-slider"`，类名断言可能已绿。真实 RED 信号放在 **Step 4 的集成断言**（e2e/单测查 `.cust-range`/`.ml-slider` 归零）。若 slider.test.js 全绿，接受（它是签名契约守卫），RED 以集成层为准。

- [ ] **Step 3: slider.js 保持签名，slider.css 整体替换为胶囊**

`src/components/slider/slider.js` 不改（renderSlider 已输出 `.c-slider`）。`src/components/slider/slider.css` 整体替换为：

```css
/* 统一 Slider（B5-2）：三区（组件/动效/外观）共用胶囊形。
   轨道 accent 填充经 --fill 变量（0-100%），customizer syncUI 已按值设置；
   动画红线：thumb hover/active 只动 transform（scale），track 填充是背景渐变（paint-only，不动画）。 */
.c-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 24px; background: transparent;
}
.c-slider::-webkit-slider-runnable-track {
  height: 8px; border-radius: 999px;
  background: linear-gradient(var(--accent), var(--accent)) 0 / var(--fill, 50%) 100% no-repeat,
    var(--surface-hover);
}
.c-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px; margin-top: -6px;
  border-radius: 8px;  /* 胶囊圆角拇指 */
  background: var(--surface-2); border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform var(--dur-fast) var(--ease-spring);
}
.c-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
.c-slider::-webkit-slider-thumb:active { transform: scale(1.05); }
.c-slider::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 8px;
  background: var(--surface-2); border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
.c-slider::-moz-range-track { height: 8px; border-radius: 999px; background: var(--surface-hover); }
.c-slider:disabled { opacity: 0.45; }
.c-slider:disabled::-webkit-slider-thumb { transform: none; }
```

- [ ] **Step 4: 三处接入改造（删独立规则）**

**① 组件分区**：`.c-slider` 已由 slider.css 全局定义，slider.js 输出不变 → 组件分区零改动（自动换胶囊）。`src/main.js:14` 已 import slider.css。

**② 外观定制器**（customizer-panel.js 三处 + customizer.css 删规则）：
- `customizer-panel.js:114`：`class="cust-range"` → `class="c-slider"`（renderSlider 内）
- `customizer-panel.js:205`：`querySelectorAll('.cust-range')` → `querySelectorAll('.c-slider')`（syncUI）
- `customizer-panel.js:346`：`e.target.closest('.cust-range')` → `e.target.closest('.c-slider')`（input 委托）
- `customizer.css`：删除 `.cust-range`/`.cust-range::-webkit-slider-thumb`/`.cust-range:disabled` 等全部 `.cust-range` 规则（约 145-168 行），`.cust-row` 结构保留
- **注意**：customizer syncUI 的 `--fill` 设置（`:210` `input.style.setProperty('--fill', ...)`）保留——胶囊 track 消费同一变量，机制天然兼容

**③ 动效分区**（motion-lab.js 四处 + motion-lab.css 删规则）：
- `motion-lab.js:84`：`class="ml-slider"` → `class="c-slider ml-slider"`（弹性滑杆；保留 `ml-slider` 类供 JS 语义定位，CSS 由 `.c-slider` 提供胶囊视觉）
- `motion-lab.js:90`：`class="ml-slider"` → `class="c-slider ml-slider"`（位移滑杆）
- `motion-lab.js:156,177,178`：JS `querySelector('.ml-slider')` **不改**（类仍存在，定位语义不变）
- `motion-lab.css`：删除 `.ml-slider` 独立规则（约 129 行 `accent-color: var(--accent)`），保留 `.ml-control` 布局（flex 行）；`.ml-control` 内滑杆弹性由 `.c-slider` 的 `width:100%` + `.ml-control { display:flex }` 自然撑开，无需额外规则

> **为什么保留 `ml-slider` 类**：motion-lab.js 用 `.ml-slider` 做语义定位（156/177/178 三处），删类需改 JS。保留双类（`.c-slider` 提供视觉、`.ml-slider` 保留定位）是最小改动。评审关注：`.c-slider` 的 `width:100%` 在 `.ml-control` flex 行内是否撑开——`.ml-control` 是 `display:flex; align-items:center`，子项默认 `flex:0 1 auto`，`width:100%` 会参与 flex 收缩到可用空间，`min-width:0` 由 flex 默认 `min-width:auto` 可能撑破——若视觉异常，给 `.ml-control .c-slider { min-width: 0; }` 兜底（实施时按实际观感决定，此注记入报告）。

- [ ] **Step 5: e2e/单测选择器更新**

- `tests/e2e/customizer.spec.js`：所有 `.cust-range` → `.c-slider`（约 6 处：21-23 的三个 `toHaveCount(0)`、52 的 `noise`、91 的 `radiusScale`、108 的 `scale`、112 的 `baseSize`）
- `tests/e2e/motion-lab.spec.js:14`：`.ml-slider` → `.c-slider`
- `tests/unit/motion-lab.test.js:28,30`：`.ml-slider` → `.c-slider`

- [ ] **Step 6: 运行确认红（集成层）**

Run: `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js` → 若 slider.test 已绿，motion-lab.test 应红（`.c-slider` 尚未替换）
Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "滑杆"` → 红（`.c-slider` 选择器找不到）

- [ ] **Step 7: 运行确认绿**

Run: `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js` + `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js tests/e2e/motion-lab.spec.js tests/e2e/form-controls.spec.js` → 全绿
Expected: 三处滑杆均为 `.c-slider` 胶囊；customizer syncUI `--fill` 继续驱动填充

- [ ] **Step 8: 视觉基线重生成（三处滑杆变化）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: appearance/components/motion 分区 6 张（各 3 accent × 2 theme 中涉及滑杆的）重生成；app-main 2 张零变化（无滑杆）。**先解码比对**确认差异仅为滑杆形态。

- [ ] **Step 9: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/components/slider/slider.css src/demo/customizer-panel.js src/demo/motion-lab.js src/styles/customizer.css src/styles/motion-lab.css tests/unit/slider.test.js tests/unit/motion-lab.test.js tests/e2e/customizer.spec.js tests/e2e/motion-lab.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 统一胶囊形 Slider 组件（组件/动效/外观三区共用 .c-slider，B5-2）"
```

---

### Task B5-3: iOS 风格组件（徽标 / 按钮 / 悬浮球）

**Files:**
- Modify: `src/components/badge/badge.css`（浅 tint 底 + 细描边）
- Modify: `src/components/button/button.css`（primary 内高光 + 柔和彩影 / secondary 玻璃底）
- Modify: `src/components/float-ball/float-ball.css`（玻璃悬浮球，去渐变浓底）
- Test: `tests/e2e/components-basic.spec.js`（加 iOS 风格样式断言）

**Interfaces:**
- Consumes: Task B5-1 的 `--font-sans`（徽标文字继承）；既有 `--glass-*`/`--accent-*`/`--surface-*` 令牌
- Produces: `.c-badge`（tint 底）/ `.c-btn`（层次）/ `.c-float-ball`（玻璃）iOS 观感 —— 独立交付，无下游依赖

- [ ] **Step 1: 写失败 e2e**（tests/e2e/components-basic.spec.js 追加）

```js
test('B5-3：徽标/按钮/悬浮球 iOS 风格（层次而非浓色）', async ({ page }) => {
  await page.goto('/?mode=app');
  const comp = page.locator('.app-main__settings [data-page="components"]');
  // 进入组件分区
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  // 徽标：tint 底半透明混色（非实色语义底）+ 细描边
  const badgeBg = await comp.locator('.c-badge--accent').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(badgeBg).toContain('color(srgb'); // color-mix 混色计算值
  // 按钮 primary：内高光（box-shadow 含 inset）
  const btnShadow = await comp.locator('.c-btn--primary').first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(btnShadow).toContain('inset');
  // 悬浮球：玻璃底（backdrop-filter 生效）
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="home"]').click(); // 回概览（悬浮球在壳）
  const ballFilter = await page.locator('.app-main__float-ball .c-float-ball').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(ballFilter).toContain('blur');
});
```

> 注：badge 混色计算值在 Chromium 为 `color(srgb r g b / a)` 格式（B2-R3 同类断言先例）。若实现用 `color-mix(in srgb, var(--accent) 12%, transparent)`，计算值确为该格式。

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "iOS 风格"`
Expected: FAIL（现有 badge 是实色 `--accent-100`、btn 无 inset shadow、float-ball 是渐变底无 backdrop-filter）

- [ ] **Step 3: badge.css iOS 化**

`src/components/badge/badge.css` 整体替换为：

```css
/* iOS 风格徽标（B5-3）：浅 tint 底（accent/semantic 12% 透明混色）+ 细描边 + 语义色文字。
   半透明混色让徽标「坐」在玻璃表面上而非实色「贴」上去；细描边 1px 界定轮廓。 */
.c-badge { display: inline-flex; align-items: center; padding: 2px 9px; font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium); border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent) 12%, transparent); }
.c-badge--accent { color: var(--accent-700); }
.c-badge--success { color: var(--success-600);
  background: color-mix(in srgb, var(--success-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--success-500) 22%, transparent); }
.c-badge--warning { color: var(--warning-600);
  background: color-mix(in srgb, var(--warning-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--warning-500) 22%, transparent); }
.c-badge--danger { color: var(--danger-600);
  background: color-mix(in srgb, var(--danger-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--danger-500) 22%, transparent); }
.c-badge--info { color: var(--info-600);
  background: color-mix(in srgb, var(--info-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--info-500) 22%, transparent); }
.c-badge--default { color: var(--neutral-600);
  background: color-mix(in srgb, var(--neutral-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--neutral-500) 22%, transparent); }
```

> 暗色主题下语义色 `--success-600` 等已由 themes.css 自动切浅档（dark 覆盖 500/600），颜色对比保持。

- [ ] **Step 4: button.css iOS 化**

`src/components/button/button.css` 修改（保留结构，改 primary/secondary 视觉 + 内高光）：

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
/* iOS 层次按钮（B5-3）：primary 顶部内高光 + 柔和彩影（有厚度不扁平）；secondary 玻璃底呼应壳材质 */
.c-btn--primary {
  background: linear-gradient(180deg, var(--accent-hover), var(--accent));
  color: var(--accent-contrast);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 8px color-mix(in srgb, var(--accent-400) 30%, transparent);
}
.c-btn--primary:hover { filter: brightness(1.05); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 14px color-mix(in srgb, var(--accent-400) 40%, transparent); }
.c-btn--primary:active { filter: brightness(0.96); }
.c-btn--secondary {
  background: var(--glass-bg);
  color: var(--text-1);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.c-btn--secondary:hover { background: var(--surface-hover); }
.c-btn--ghost { color: var(--text-2); }
.c-btn--ghost:hover { background: var(--surface-hover); color: var(--text-1); }
.c-btn--danger { background: var(--danger-500); color: #fff; }
.c-btn--danger:hover { filter: brightness(1.08); }
.c-btn--sm { height: 26px; padding: 0 var(--space-3); font-size: var(--font-size-xs); }
.c-btn--lg { height: 40px; padding: 0 var(--space-5); font-size: var(--font-size-base); }
.c-btn:disabled { opacity: 0.45; pointer-events: none; }
```

> primary 用 `linear-gradient(180deg, hover, accent)`（轻渐变表达层次，非浓色平涂）+ inset 顶部内高光 + 柔和彩影。红线段：gradient 背景静态，hover 用 `filter`（paint-only）不改布局。

- [ ] **Step 5: float-ball.css iOS 化**

`src/components/float-ball/float-ball.css` 整体替换为：

```css
/* iOS 玻璃悬浮球（B5-3）：去 accent 渐变浓底 → 玻璃底 + 亚克力模糊（与壳材质一致）+ accent 图标。
   层次靠 material 背景 + 投影 + 内高光，而非色彩浓度。 */
.c-float-ball { position: relative; width: 44px; height: 44px; flex: none;
  display: grid; place-items: center; color: var(--accent); cursor: pointer;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness));
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: transform var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out); }
.c-float-ball svg { position: relative; }
/* hover：上浮 2px + 光晕增强（只动 transform/box-shadow/opacity） */
.c-float-ball:hover { transform: translateY(-2px);
  box-shadow: 0 8px 22px var(--accent-300), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
.c-float-ball__glow { position: absolute; inset: -8px; pointer-events: none;
  border-radius: var(--radius-full); opacity: 0;
  background: radial-gradient(circle, var(--accent-200) 0%, transparent 65%);
  transition: opacity var(--dur-base) var(--ease-out); }
.c-float-ball:hover .c-float-ball__glow { opacity: 1; }
```

> 尺寸 40→44px（iOS 触控目标更大，44×44 是 HIG 建议最小触控区）。图标色从 `#fff` 改 `var(--accent)`（玻璃上白字无层次）。

- [ ] **Step 6: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "iOS 风格"` → 红 → 绿；再跑 components-basic 全文件零回归（既有 `.c-btn` 计数断言 7/4/1/1/1 应不受视觉改影响——是存在性计数非样式）

- [ ] **Step 7: 视觉基线重生成（三组件变化）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: components 分区 6 张（含按钮/徽标矩阵）+ app-main 2 张（含悬浮球）重生成；appearance/motion 零变化。**先解码比对**确认差异仅为组件视觉。

- [ ] **Step 8: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/components/badge/badge.css src/components/button/button.css src/components/float-ball/float-ball.css tests/e2e/components-basic.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 徽标/按钮/悬浮球 iOS 化（tint 底 + 层次按钮 + 玻璃悬浮球，B5-3）"
```

---

### Task B5-4: 自适应布局（限宽居中 + 分区撑满）

**Files:**
- Modify: `src/app/app-main.css`（`.app-main__page` max-width 720→1080 居中 + `data-layout` 规则）
- Modify: `src/app/app-main.js`（渲染时给设置页/概览页设 `data-layout`；组件/动效分区容器加 fluid 标记）
- Modify: `tests/e2e/app-shell.spec.js`（加 data-layout 断言）

**Interfaces:**
- Consumes: 既有 `.app-main__page` 结构（app-main.css:108）+ `MODULES` 渲染（app-main.js:105-107）
- Produces: `.app-main__page[data-layout="center"]`（限宽居中）/ `[data-layout="fluid"]`（撑满）；组件/动效 `.app-partition` fluid —— 独立交付，无下游依赖

- [ ] **Step 1: 写失败 e2e**（tests/e2e/app-shell.spec.js 追加）

```js
test('B5-4：自适应布局 data-layout（表单限宽居中 + 展示撑满）', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 }); // 大窗口
  await page.goto('/?mode=app');
  // 概览页：center（限宽 1080 居中）
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview).toHaveAttribute('data-layout', 'center');
  const ow = await overview.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const pr = el.parentElement.getBoundingClientRect();
    return { w: r.width, parentW: pr.width, left: r.left, parentLeft: pr.left };
  });
  expect(ow.w).toBeLessThanOrEqual(1080);
  expect(Math.abs((ow.left - ow.parentLeft) * 2 + ow.w - ow.parentW)).toBeLessThan(4); // 水平居中
  // 组件分区：fluid 撑满
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const part = page.locator('.app-main__settings [data-page="components"]');
  const pw = await part.evaluate((el) => el.getBoundingClientRect().width);
  const pagesW = await page.locator('.app-main__pages').evaluate((el) => el.getBoundingClientRect().width);
  expect(pw).toBeGreaterThan(pagesW - 80); // 撑满内容区（留 padding 余量）
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"`
Expected: FAIL（`data-layout` 属性不存在）

- [ ] **Step 3: app-main.css 改自适应**

`src/app/app-main.css:108` 附近改为：

```css
.app-main__page { display: none; max-width: 1080px; margin-inline: auto; }
.app-main__page--active { display: block; }
/* B5-4：展示分区撑满（组件/动效），表单/概览保持限宽居中（data-layout 由 app-main.js 设置） */
.app-main__page[data-layout="fluid"] { max-width: none; margin-inline: 0; }
```

- [ ] **Step 4: app-main.js 设 data-layout**

`src/app/app-main.js`：
- 概览页/占位页：渲染时已有 `data-page="${m.id}"`，默认 center（不显式设 `data-layout`，靠 CSS 默认 max-width 居中即可；**为 e2e 断言稳定，给概览页显式加 `data-layout="center"`**）
- 模板（约 105-107 行）改：`<section class="app-main__page" data-page="${m.id}" data-layout="center">`、`<section class="app-main__page" data-page="settings" data-layout="fluid">`
- **组件/动效分区 fluid**：设置页内 `.csettings__page[data-page="components"]` / `[data-page="motion"]` 是分区容器——给 settings-pages.js 的 `pageBody()` 组件/动效分支返回值加 `data-layout="fluid"` 标记？**否**——组件/动效分区已由设置页 `data-layout="fluid"` 撑满（设置页整页 fluid，分区自然铺满）；若需要分区内再加限宽，见 Step 5 注。

> **设计决策**：设置页整体 `data-layout="fluid"`（含表单分区）。表单分区内 `.csettings__field` 已有 `max-width:420px` 自限宽（settings-window.css:64），故表单观感仍克制；组件/动效分区铺满。这比「按分区细分 data-layout」更简单且不破坏表单。e2e 断言组件分区撑满即验证此模型。

- [ ] **Step 5: 分区内细调（按实际观感）**

若设置页整体 fluid 后表单分区在超大窗口下过于松散（`.csettings__field` 420px 上限已约束，通常无碍），可给 `.app-main__settings .csettings__page` 加 `max-width: 1080px; margin-inline: auto;`（仅表单类分区）——**默认不加**，先按设置页整体 fluid 验证观感；如需再加，实施者记录并调整视觉基线。

- [ ] **Step 6: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"` → 绿；再跑 app-shell 全文件零回归

- [ ] **Step 7: 视觉基线重生成（内容区宽度变化）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 视口 1280×720 下内容区从 720 → 至多 1080（1280 视口内容区约 1152 宽，实际铺满），概览卡/组件矩阵扩列 → **大部分分区重生成**。**先解码比对**确认差异仅为布局宽度（栅格扩列），非字体/颜色意外变化。

- [ ] **Step 8: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/app/app-main.css src/app/app-main.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 内容区自适应布局（表单限宽居中 + 组件/动效撑满，data-layout，B5-4）"
```

---

### Task B5-5: 控件语言收尾（外观页密度/对齐统一）

**Files:**
- Modify: `src/styles/customizer.css`（行对齐/间距统一：`.cust-row`、`.cust-group`、`.cust-accent-card` 对齐）
- Modify: `src/scenes/settings-window/settings-window.css`（字段/模式按钮对齐统一：`.csettings__field`、`.csettings__modes`）
- Test: `tests/e2e/customizer.spec.js`（加行对齐断言）

**Interfaces:**
- Consumes: Task B5-2 的 `.c-slider` 胶囊（外观页滑杆已统一）；既有 `.cust-row`/`.cust-group`/`.csettings__field` 结构
- Produces: 外观页行对齐/密度统一（标签基线对齐、行距一致、分组标题分隔线对齐）—— 独立交付

- [ ] **Step 1: 写失败 e2e**（tests/e2e/customizer.spec.js 追加）

```js
test('B5-5：外观页控件行对齐统一（标签基线 + 行距一致）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const appr = page.locator('.app-main__settings [data-page="appearance"]');
  // 各行 label 对齐：取前 3 行 .cust-row__label 的 top，应一致（同一行）
  const tops = await appr.locator('.cust-row__label').evaluateAll((els) => els.slice(0, 3).map((el) => el.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
  // 行距一致：相邻 .cust-row 间距差 < 2px
  const rows = await appr.locator('.cust-row').evaluateAll((els) => els.slice(0, 4).map((el) => el.getBoundingClientRect().top));
  const gaps = rows.slice(1).map((t, i) => t - rows[i]);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(4);
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "行对齐"`
Expected: FAIL（当前行 label top 不一致 / 间距不均 —— `.cust-row__head` 与 `.cust-row--switch` 结构差异导致）

- [ ] **Step 3: customizer.css 对齐统一**

`src/styles/customizer.css` 修改：
- `.cust-row__head`：确保 `align-items: baseline`（label/value 同基线）+ `min-height` 统一（switch 行与 slider 行头部等高）
- `.cust-row { margin-bottom: var(--space-3); }` 保持；`.cust-row--switch` 与 slider 行对齐（switch 行 `.cust-row__head` 与 slider 行 head 等高）
- `.cust-group__title` 分隔线 `::after` 对齐（已 flex，保持）；`.cust-group { margin-bottom: var(--space-5); }` 保持
- `.cust-accent-card` 网格：`align-items: stretch` 保证 3 列等高
- 具体改法（verbatim）：

```css
/* B5-5：行对齐统一 —— 标签基线一致、switch 行与 slider 行头部等高 */
.cust-row { margin-bottom: var(--space-3); }
.cust-row__head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px; min-height: 20px;
}
.cust-row--switch { display: flex; align-items: center; justify-content: space-between; min-height: 40px; }
.cust-row--switch .cust-row__head { margin-bottom: 0; min-height: auto; }
.cust-row--switch .c-switch { flex-shrink: 0; }
.cust-accent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2);
  margin-bottom: var(--space-3); align-items: stretch; }
```

> 若既有规则已满足（实际观感验收），实施者以「e2e 断言通过 + 观感一致」为准；`min-height`/`align-items` 为对齐兜底，不引入布局动画。

- [ ] **Step 4: settings-window.css 字段对齐**

`src/scenes/settings-window/settings-window.css` 修改：
- `.csettings__field` 与 `.cust-row` 的 label 字号/字重对齐（`.csettings__field-label` 已是 sm/medium，保持）
- `.csettings__modes` 与 `.csettings__field-label` 对齐（`align-self` 已 flex-start，保持）
- 若观感验收发现字段/模式组间距不均，统一 `margin-bottom: var(--space-5)`
- **默认改动最小**：本任务重点在 customizer.css（外观页主体），settings-window.css 仅在有明确观感偏差时微调（记入报告）

- [ ] **Step 5: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "行对齐"` → 绿；再跑 customizer.spec.js 全文件零回归

- [ ] **Step 6: 视觉基线重生成（外观页对齐变化）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: appearance 分区 6 张重生成（行对齐/间距微调）；其余零变化。**先解码比对**确认差异仅为对齐。

- [ ] **Step 7: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/styles/customizer.css src/scenes/settings-window/settings-window.css tests/e2e/customizer.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 外观页控件行对齐统一（标签基线/行距/分组，B5-5）"
```

---

## 执行交接指引（给实施会话）

1. **起点**：`main`（62ad138，含 B5 设计规格）检出 `feature/b5-*` 分支，按本计划逐任务 SDD 执行；任务标题 `Task B5-N`（`task-brief` 脚本只匹配 `Task <数字>`，需手动写 brief，放 `docs/superpowers/sdd/task-B5-N-brief.md`）。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报 → 派发（B5-1 机械 haiku / B5-2,3,5 集成 sonnet / B5-4 布局 sonnet）→ 报告 → 审查包 → 评审 → 修复循环 → 账本 `docs/superpowers/sdd/progress-b5.md` 留痕。
3. **铁律**：禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审；测试仅在 Web 环境执行；**每任务结束全量回归绿**（e2e 用 worktree 配置）。
4. **已知风险/注意**：
   - **字体基线抖动**：CJK 字体 5MB+，视觉截图必须等 `document.fonts.ready`（B5-1 Step 9 已加）。若某分区截图仍抖动，检查是否字体未加载完成。
   - **e2e 旧 server 污染**：共享 checkout 可能有陈旧 5173 dev server serve 旧代码——所有 e2e 用 `playwright.config.worktree.js`（5174 新鲜 server）。
   - **B5-2 的 `ml-slider` 双类**：动效滑杆保留 `ml-slider` 类供 JS 定位（motion-lab.js:156,177,178），CSS 视觉由 `.c-slider` 提供——删独立规则即可，勿删 JS 定位类。
   - **B5-2 `--fill` 兼容**：customizer syncUI 的 `--fill` 设置（customizer-panel.js:210）驱动胶囊填充，机制天然兼容，勿删。
   - **B5-3 badge 混色断言格式**：`color-mix` 计算值在 Chromium 为 `color(srgb ...)` 格式（B2-R3 先例）。
   - **B5-4 设置页整体 fluid**：表单分区靠 `.csettings__field` 420px 自限宽，组件/动效铺满；若观感松散再按 Step 5 加分区内限宽。
   - **B5-5 默认最小改动**：customizer.css 对齐为主，settings-window.css 仅观感偏差时微调。
5. **完成后**：全量回归 + 最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归；桌面真机由用户目检（① 字体观感 ② 三区滑杆一致 ③ 徽标/按钮/悬浮球 iOS 化 ④ 大窗口内容自适应）。
