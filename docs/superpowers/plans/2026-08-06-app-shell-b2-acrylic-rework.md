# B2 返工：玻璃 → Windows 11 亚克力材质体系 + 图标去光晕 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 B2 已交付的「玻璃质感」材质体系重制为「Windows 11 亚克力」（着色模糊 + 细边框 + 噪点 + 去高光反光），并移除导航图标选中态光晕、改为衬底展示。

**Architecture:** 复用既有 `--glass-*` 变量体系与 `data-glass` 开关（不重构命名）；在 themes.css 集中定义亚克力配方变量（`--acrylic-saturate/brightness/noise`、`--noise-opacity`）；表面 `backdrop-filter` 消费配方变量；噪点用单层 `.app-main::after` 固定覆盖（pointer-events:none，随 `--noise-opacity` 控制）；配置链路 `glass.highlight` → `glass.noise`（defaults→store→apply）；图标删除 `.c-navwheel__glow` 光晕层、保留衬底。

**Tech Stack:** Vite + 原生 JS + Vitest + Playwright（现有，零运行时依赖；噪点为 SVG data-URI，无外部资源）。

## Global Constraints

- 测试仅在 Web 环境执行（不跑 tauri dev）；动画红线（只动 transform/opacity，**blur 永不动画**，时长/曲线经 CSS 变量）。
- 配置链路：界面参数修改必须经 defaults→store→apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 src/CLAUDE.md 风格。
- **命名保留**：`--glass-*` 变量名 / `data-glass="on|off"` / `--glass-enabled` / `data-glass-switch` 一律不改名（B2-1 单测/e2e 断言零破坏）；只换材质值与 UI 措辞。
- 视觉基线会变：材质 + 图标变化必然改变全部 18 张基线 → 每任务确认差异由本次改动引起后 `--update-snapshots`。
- `.cust-group` count 6 不得破坏（app-shell.spec.js:148）；无测试断言图标宽度/分组标题文案/光晕（预检已确认）。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/`。
- **每任务结束时 `npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿**。
- **用户视觉验收 gate**：全部任务完成后，暗色/亮色亚克力观感（尤其暗色不发闷、表面有层次、噪点不脏）须经用户目检确认，再进入最终整体评审 + 合并 main。数值可在「克制的亚克力质感」语言内微调。
- 分支：`feature/b2-visual`（B2-1/B2-2/B2-3 已评审通过，HEAD 为规格提交 `4942ea3`；返工在此分支上叠加）。
- 规格：docs/superpowers/specs/2026-08-06-app-shell-b2-acrylic-rework-design.md（唯一需求源）。

---

### Task B2-R1: 亚克力材质令牌 + 噪点配置链路

**Files:**
- Modify: `src/styles/themes.css`（亚克力配方变量 + 噪点 token + 边框/暗色微调）
- Modify: `src/config/defaults.js`（`glass.highlight` → `glass.noise`，RANGES）
- Modify: `src/config/apply.js`（写 `--noise-opacity` 替代 `--glass-highlight-opacity`）
- Modify: `src/demo/customizer-css.js`（导出 `--noise-opacity` 替代 `--glass-highlight-opacity`）
- Test: `tests/unit/apply.test.js`

**Interfaces:**
- Consumes: `applyConfig(cfg, root)`（apply.js，现有 `--glass-*` 写入区）；`DEFAULTS`/`RANGES`（defaults.js）
- Produces: CSS 变量 `--acrylic-saturate: 1.8`、`--acrylic-brightness`（light 1.1 / dark 0.92）、`--acrylic-noise`（SVG data-URI）、`--noise-opacity`（default 0.04）；配置 `cfg.glass.noise`（number，RANGES `[0, 0.12, 0.01]`）；`applyConfig` 写 `--noise-opacity`（不再写 `--glass-highlight-opacity`）

- [ ] **Step 1: 写失败单测**（apply.test.js，追加到既有文件，沿用真实 `document.documentElement` 风格）

```js
it('噪点强度写入 --noise-opacity 覆盖', () => {
  applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, noise: 0.06 } }, root);
  expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.06');
});
it('默认噪点强度 0.04 写入', () => {
  applyConfig(DEFAULTS, root);
  expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.04');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npm test -- apply.test.js`
Expected: FAIL（`--noise-opacity` 未写入）

- [ ] **Step 3: defaults.js 换键**

```js
glass: { opacity: 0.62, blur: 24, noise: 0.04, blurEnabled: true },
```
RANGES 把 `highlight: [0, 1, 0.05]` 改为 `noise: [0, 0.12, 0.01]`（`blurEnabled` 不进 RANGES，B2-1 既定）。

- [ ] **Step 4: apply.js 换写变量**

在 `applyConfig` 玻璃区（现约 66-68 行，B2-1 已写 `--glass-enabled`/`data-glass`）把：
```js
s.setProperty('--glass-highlight-opacity', String(cfg.glass.highlight));
```
改为：
```js
s.setProperty('--noise-opacity', String(cfg.glass.noise));
```
`--glass-enabled` 与 `root.dataset.glass` 的 B2-1 逻辑逐字不动。

- [ ] **Step 5: customizer-css.js 换导出**

`exportCss` 模板里 `--glass-highlight-opacity: ${glass.highlight};` 改为 `--noise-opacity: ${glass.noise};`。

- [ ] **Step 6: themes.css 加亚克力配方变量**

```css
:root {
  --acrylic-saturate: 1.8;
  --acrylic-brightness: 1.1; /* light 基准 */
  --acrylic-noise: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --noise-opacity: 0.04; /* 兜底；apply.js 从 glass.noise 覆盖 */
}
:root[data-theme="dark"] { --acrylic-brightness: 0.92; }
```
同时微调（保持「克制的亚克力」语义）：light `--glass-border-opacity: 0.6` → `0.45`；dark `0.08` → `0.07`；dark `--surface-solid: #14161c` → `#16181f`（提亮避免发闷）。`--glass-highlight` 定义保留（不再被表面使用，Task R2 移除消费）。

- [ ] **Step 7: 运行绿**

Run: `npm test -- apply.test.js`
Expected: PASS（2 新用例 + 既有全绿；既有用例无 highlight 断言，不受换键影响）。再跑全量 `npm test`（确认 store/customizer 单测不因 defaults 换键破坏）。

- [ ] **Step 8: 提交**

```bash
git add src/styles/themes.css src/config/defaults.js src/config/apply.js src/demo/customizer-css.js tests/unit/apply.test.js
git commit -m "feat: 亚克力材质令牌与噪点配置链路（--acrylic-* 配方 + glass.noise → --noise-opacity）"
```

---

### Task B2-R2: 表面应用亚克力 + 去高光 + 噪点层 + 闭环 M-1

**Files:**
- Modify: `src/app/app-main.css`（全部表面消费亚克力配方 + `.app-main::after` 噪点层 + `data-glass=off` 扩到标题栏/遮罩）
- Modify: `src/styles/base.css`（`.glass` 类去 inset-highlight 反光、用亚克力配方）
- Modify: `src/components/title-bar/title-bar.css`（亚克力 + `data-glass=off` 降级）
- Modify: `src/components/navigation-wheel/nav-wheel.css`（遮罩渐变用亚克力底色）
- Modify: `src/components/card/card.css`、`src/components/dialog/dialog.css`、`src/components/floating-window/floating-window.css`（去 `--shadow-inset-highlight` 反光、用亚克力配方）
- Test: `tests/e2e/app-shell.spec.js`（新「亚克力材质」用例）、视觉基线重生成

**Interfaces:**
- Consumes: `--acrylic-saturate/--acrylic-brightness/--acrylic-noise/--noise-opacity`（Task R1）；`data-glass`（B2-1）
- Produces: 全部表面 `backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness))`；`.app-main::after` 噪点覆盖层；`[data-glass="off"]` 覆盖 `.c-titlebar` 与遮罩渐变（闭环 B2-1 M-1）

- [ ] **Step 1: 写失败 e2e**（app-shell.spec.js）

```js
test('亚克力材质：表面增饱和模糊 + 噪点层存在', async ({ page }) => {
  await page.goto('/?mode=app');
  const filter = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(filter).toContain('saturate(1.8)');
  expect(filter).toContain('brightness(');
  const noise = await page.locator('.app-main').evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
  expect(noise).toContain('data:image/svg+xml');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "亚克力材质"`
Expected: FAIL（现 saturate(1.4)、无噪点层）

- [ ] **Step 3: app-main.css 表面接亚克力配方**

把全部表面的 `backdrop-filter: blur(var(--glass-blur)) saturate(1.4)`（`.app-main__nav-l/.nav-r/.pages/.card` + 手机 `.app-main__stack/.stack-page/.dock`，B2-1 已接玻璃）改为：
```css
backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness));
```
背景保持 `background: var(--glass-bg)`（着色底）。`[data-glass="off"]` 降级块（现约 155-161、231-236 行）不变。

- [ ] **Step 4: 加噪点覆盖层**

`.app-main` 加伪元素噪点层（app-main.css 内，`.app-main` 已有 `position: relative`）：
```css
.app-main::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: var(--acrylic-noise); background-size: 120px 120px;
  opacity: var(--noise-opacity, 0.04);
  z-index: var(--z-float); /* 覆盖右窗轮（同为 --z-float，DOM 序靠后故在上）；pointer-events:none 不挡交互 */
}
:root[data-glass="off"] .app-main::after { opacity: 0; }
```

- [ ] **Step 5: base.css `.glass` 去反光**

`.glass`（base.css:17-21）去掉 `box-shadow: var(--glass-shadow), var(--shadow-inset-highlight)` 的 `--shadow-inset-highlight` 项（玻璃反光边缘），改 `backdrop-filter` 为亚克力配方（同 Step 3）。同步把 `card.css`、`dialog.css`、`floating-window.css` 里 `box-shadow: var(--glass-shadow), var(--shadow-inset-highlight)` 与 `background: var(--glass-highlight)` 的玻璃反光消费移除（亚克力无反光；保留玻璃阴影 `--glass-shadow`）。

- [ ] **Step 6: 标题栏 + 遮罩闭环 M-1**

`title-bar.css`：`.c-titlebar` 用亚克力配方背景 + backdrop-filter；补降级：`:root[data-glass="off"] .c-titlebar { background: var(--surface-solid); backdrop-filter: none; }`。`nav-wheel.css` 顶/底遮罩渐变（`.c-navwheel__mask` 用 `var(--glass-bg)`）在 `data-glass="off"` 时同样换 `var(--surface-solid)`。

- [ ] **Step 7: 运行绿 + 基线重生成**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "亚克力材质|玻璃两档"`（新用例 + B2-1 两档回归）→ `npm run test:e2e`（全量，其余零冲击）+ `npm test` + `npm run build`；视觉基线 `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots`（18 张全重生成，先解码比对确认差异=材质/去反光，无布局位移）。
Expected: 全绿

- [ ] **Step 8: 提交**

```bash
git add src/app/app-main.css src/styles/base.css src/components/title-bar/title-bar.css src/components/navigation-wheel/nav-wheel.css src/components/card/card.css src/components/dialog/dialog.css src/components/floating-window/floating-window.css tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 表面应用亚克力材质（去高光反光 + 噪点层 + 标题栏/遮罩降级闭环）"
```

---

### Task B2-R3: 背景层预设重调（柔和补色）

**Files:**
- Modify: `src/app/app-main.css`（3 预设 `--backdrop-bg` 从浓艳改柔和）
- Test: `tests/e2e/app-shell.spec.js`（既有「背景层」用例回归）、视觉基线重生成

**Interfaces:**
- Consumes: `--acrylic-*` 配方（Task R1）；`data-backdrop="gradient|geo|grid"`（B2-2）
- Produces: 3 预设柔和化——降低 accent 档位 / 加大透明度，暗色避免大面积高亮光晕（闭环 B2-2 I-1）

- [ ] **Step 1: 写失败 e2e（观感守卫）**

光晕观感难用断言精确锁，用可测的强度守卫（暗色 gradient 预设的 accent 层 alpha 上限）：
```js
test('背景层预设柔和：accent 光晕层带透明度', async ({ page }) => {
  await page.goto('/?mode=app');
  const bd = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
  // gradient 预设含带 alpha 的 radial-gradient（非实色 accent 档直接铺底）
  expect(bd).toMatch(/radial-gradient\(/);
});
```
（该断言弱——本任务 gate 以视觉基线 + 用户验收为主，e2e 主要保「背景层 + 切换」回归不破。）

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`
Expected: FAIL（仅当实现有破坏时；否则直接进入实现）

- [ ] **Step 3: 重调 3 预设（app-main.css）**

把 `.app-main[data-backdrop="gradient|geo|grid"]` 的 `--backdrop-bg` 从「`--accent-200/300` 实色 radial + `--surface-solid` 直铺」改为柔和补色——accent 经 `color-mix` 加 alpha、范围收窄：
```css
.app-main[data-backdrop="gradient"] { --backdrop-bg:
  radial-gradient(120% 120% at 20% 10%, color-mix(in srgb, var(--accent-300) 26%, transparent) 0%, transparent 60%),
  radial-gradient(100% 100% at 85% 90%, color-mix(in srgb, var(--accent-300) 18%, transparent) 0%, transparent 55%),
  var(--surface-solid); }
.app-main[data-backdrop="geo"] { --backdrop-bg:
  radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent-300) 20%, transparent) 0%, transparent 32%),
  linear-gradient(135deg, transparent 30%, rgba(255,255,255,.03) 30% 32%, transparent 32%),
  var(--surface-solid); }
.app-main[data-backdrop="grid"] { --backdrop-bg:
  linear-gradient(color-mix(in srgb, var(--accent-300) 14%, transparent) 1px, transparent 1px),
  linear-gradient(90deg, color-mix(in srgb, var(--accent-300) 14%, transparent) 1px, transparent 1px),
  var(--surface-solid); }
```
> 现实现直接用 `--accent-200/300` 实色（浅档 hex），暗色下与近黑 `--surface-solid` 叠出大面积亮晕。改 `color-mix(in srgb, var(--accent-300) X%, transparent)` 令光晕带 alpha（Chromium 111+ 支持，Playwright chromium 满足）。**原则：暗色光晕范围收窄、alpha ≤ 0.3，与亚克力着色叠后干净。** 若某处 color-mix 渲染有疑，可改用主题 RGB 变量法（仿 `--glass-bg-rgb` 为各 accent 补 `--accent-rgb`），但首选 color-mix 零新增变量。

- [ ] **Step 4: 运行绿 + 基线重生成**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`（切换回归绿）+ `npm run test:e2e`（全量）+ `npm test` + `npm run build`；视觉基线重生成（暗色 app-main 光晕明显收窄）。
Expected: 全绿；暗色 app-main 基线光晕范围显著小于当前

- [ ] **Step 5: 提交**

```bash
git add src/app/app-main.css tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 背景层预设柔和补色（accent 光晕加 alpha 收窄，暗色不发腻）"
```

---

### Task B2-R4: 图标选中态去光晕

**Files:**
- Modify: `src/components/navigation-wheel/nav-wheel.js`（模板删 `.c-navwheel__glow`）
- Modify: `src/components/navigation-wheel/nav-wheel.css`（删 glow 规则/动画；补 `--active:hover` 优先）
- Test: `tests/e2e/app-shell.spec.js`（无光晕 + 选中衬底）、视觉基线重生成

**Interfaces:**
- Consumes: `.c-navwheel__icon` 衬底（B2-3 已加 40px 圆角底）
- Produces: 无 `.c-navwheel__glow` 元素/样式；选中态 = accent-100 衬底 + accent icon；`.c-navwheel__item--active:hover .c-navwheel__icon` 保持选中态（闭环 B2-3 M-3）

- [ ] **Step 1: 写失败 e2e**（app-shell.spec.js）

```js
test('图标选中态：无光晕层、衬底为选中底色', async ({ page }) => {
  await page.goto('/?mode=app');
  await expect(page.locator('.c-navwheel__glow')).toHaveCount(0);
  const bg = await page.locator('.app-main__nav-l .c-navwheel__item--active .c-navwheel__icon')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)'); // accent-100 衬底非透明
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "图标选中态"`
Expected: FAIL（glow count > 0）

- [ ] **Step 3: nav-wheel.js 删光晕元素**

模板（现第 31 行 `<div class="c-navwheel__glow"></div>`）删除该行。`renderItemIcons` 原地改 svg 属性逻辑（B2-3）逐字不动；setFocal 逐字不动。

- [ ] **Step 4: nav-wheel.css 删光晕样式 + 补 active:hover**

删除 `.c-navwheel__glow` 全部规则（现 39-42 行的 radial-gradient / opacity / `transform: scale(.8)` 分层 / transition）。保留 `.c-navwheel__icon` 40px 衬底（B2-3 Step 7 已定：hover `--surface-hover`、active `--accent-100`）。补：
```css
.c-navwheel__item--active:hover .c-navwheel__icon {
  background: var(--accent-100); color: var(--accent); /* 选中态 hover 不被浅灰覆盖（闭环 M-3） */
}
```

- [ ] **Step 5: 运行绿 + 基线重生成**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "图标选中态|图标分级"`（新用例 + B2-3 分级回归）→ `npm run test:e2e`（全量）+ `npm test` + `npm run build`；视觉基线重生成（app-main/components-partition 图标去光晕）。
Expected: 全绿

- [ ] **Step 6: 提交**

```bash
git add src/components/navigation-wheel/nav-wheel.js src/components/navigation-wheel/nav-wheel.css tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 图标选中态去光晕（只留衬底 + active:hover 优先）"
```

---

### Task B2-R5: 自定义器调整 + 措辞同步

**Files:**
- Modify: `src/demo/customizer-panel.js`（组名「表面质感」、开关「亚克力材质」、第三滑杆 highlight→noise、CFG_PATH、syncUI、glassPreview）
- Modify: `src/styles/customizer.css`（预览去高光、体现噪点）
- Modify: `src/scenes/settings-window/settings-pages.js`（关于页「克制的亚克力质感」）
- Modify: `src/demo/component-showcase-full.js`（卡片演示 label「亚克力材质」，注释同步）
- Modify: `tests/e2e/customizer.spec.js`、`tests/e2e/app-shell.spec.js`（措辞/测试名）、视觉基线重生成

**Interfaces:**
- Consumes: `cfg.glass.noise` + `--noise-opacity`（Task R1）；`data-glass-switch`（B2-1）
- Produces: 「表面质感」组（透明度/模糊/噪点强度 3 滑杆 + 亚克力材质开关）；`CFG_PATH.noise = ['glass','noise']`；预览改噪点视觉

- [ ] **Step 1: 写失败 e2e**（customizer.spec.js）

```js
test('外观分区：表面质感组标题 + 亚克力开关 + 噪点滑杆', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  await expect(page.locator('.cust-group').nth(1).locator('.cust-group__title')).toContainText('表面质感');
  await expect(page.locator('[data-glass-switch]')).toContainText('亚克力材质');
  await expect(page.locator('.cust-range[data-key="noise"]')).toBeVisible();
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/customizer.spec.js -g "表面质感"`
Expected: FAIL（组名/开关标签/噪点滑杆均未改）

- [ ] **Step 3: customizer-panel.js 调整**

- GROUPS 第 2 组 `title: '玻璃材质'` → `'表面质感'`；sliders 第三条 `{ key: 'highlight', label: '高光' }` → `{ key: 'noise', label: '噪点强度' }`。
- `glassSwitchRow` 的 label「玻璃磨砂」→「亚克力材质」（含 `renderSwitch` 的 aria-label）。
- `CFG_PATH` 删 `highlight: ['glass','highlight']`，加 `noise: ['glass','noise']`。
- `glassPreview()`（166-178 行）去高光视觉（现有 `.cust-glass-preview__glass` 背景 `var(--glass-highlight)`），改体现亚克力着色 + 噪点（如玻璃块背景加噪点 background-image + 低透明度）。
- `syncUI` 无需特判（滑杆经 `readCfg(cfg, 'noise')` 通用处理）；确认无 `highlight` 残留引用。

- [ ] **Step 4: customizer.css 预览同步**

`.cust-glass-preview__glass`（customizer.css:167-174）去掉 `background: var(--glass-highlight)` 高光消费，改亚克力着色底 + 噪点层（`background-image: var(--acrylic-noise)` + `--noise-opacity`），保留 box-shadow 柔和阴影。

- [ ] **Step 5: 措辞同步**

`settings-pages.js` about 行「克制的玻璃质感 · 深/浅双主题」→「克制的亚克力质感 · 深/浅双主题」。`component-showcase-full.js:165` 卡片 label「玻璃材质」→「亚克力材质」（该卡为 `renderCard({ glass: true })`，卡片组件本身不变）。注释/测试名「玻璃两档」→「亚克力两档」（app-shell.spec.js:328、apply.test.js:32/37 注释），`customizer.spec.js:10` 测试名「调整玻璃透明度实时生效」→「调整亚克力透明度实时生效」。

- [ ] **Step 6: 运行绿 + 基线重生成**

Run: `npx playwright test tests/e2e/customizer.spec.js` + `tests/e2e/app-shell.spec.js -g "亚克力两档"` → `npm run test:e2e`（全量）+ `npm test` + `npm run build`；视觉基线重生成（appearance 分区含表面质感组/噪点预览）。
Expected: 全绿

- [ ] **Step 7: 提交**

```bash
git add src/demo/customizer-panel.js src/styles/customizer.css src/scenes/settings-window/settings-pages.js src/demo/component-showcase-full.js tests/e2e/customizer.spec.js tests/e2e/app-shell.spec.js tests/unit/apply.test.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 自定义器表面质感组（亚克力开关 + 噪点强度滑杆）+ 措辞同步"
```

---

## 执行交接指引（给实施会话）

1. **起点**：分支 `feature/b2-visual`（B2-1/2/3 已评审通过，HEAD `4942ea3` 规格提交）；规格 `docs/superpowers/specs/2026-08-06-app-shell-b2-acrylic-rework-design.md` 为唯一需求源。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报 → 派发 → 报告 → 审查包 → 评审 → 修复循环（≤5 轮）→ 账本 `docs/superpowers/sdd/progress-b2.md` 追加返工段留痕（随代码提交）。
3. **铁律**：禁止并行派发实施子代理；控制器不改码；每任务必须有评审；测试仅在 Web 环境执行；**每任务结束全量回归绿**（基线重生成是预期，先解码比对差异区域再 update-snapshots）。
4. **已知风险**：① R1 换键 `glass.highlight`→`noise`：既有 localStorage 旧配置含 highlight 键，store deepMerge 自动补默认键（noise=0.04），无迁移问题；② R2 噪点层伪元素在滚动面板（`.app-main__pages`）上的定位——`.app-main::after` 挂在最外层容器，不随子面板滚动，规避 scroll 跟随问题；③ R3 `--accent-rgb` 若不存在需按主题补或用 `color-mix`，实现择简但须暗色光晕收窄；④ R4 删 glow 元素后组件分区演示实例同步无 glow（基线随之变，预期）；⑤ 每任务基线重生成前解码比对确认差异来源。
5. **完成后**：全部任务 + 用户视觉验收（亮/暗色亚克力观感）→ 最终整体评审（最强大模型 + review-package MERGE_BASE HEAD）→ 修复波 → merge main → 合并后全量回归。B3（设置完善）为后续独立计划。
