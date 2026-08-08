# 应用壳 B4（桌面真实化）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 四项桌面真实化 —— ① 窗口控制权限修复（Tauri 2 capability）② 独立置顶悬浮窗（真实独立窗口）③ 颜色方案（删色相/饱和度/色温微调组 + 强调色预设扩至 12 套）④ 文字排版真实生效（baseSize/scale 全局缩放整套字号）。

**Architecture:** ① 纯 Tauri capability 配置（权限缺失是根因，JS 接线已正确）；② 主窗 FloatBall 用 Tauri JS `WebviewWindow` 按需创建独立透明置顶小窗加载 `?mode=strip`，`mountFloatStrip` 加 `windowMode` 选项（窗口模式：拖动走系统拖拽、无窗口内磁吸），strip-main 处理位置持久化/尺寸贴合；③ 删除色彩微调链（defaults/RANGES/applyColorTint/customizer 滑杆），强调色=手写全阶色板直出，ACCENTS 6→12；④ 字号令牌全部派生自 `--font-size-base`（= baseSize × scale），两滑杆共同驱动。

**Tech Stack:** Vite + 原生 JS + Vitest + Playwright + Tauri 2.11（现有；零运行时依赖）。

## Global Constraints

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 src/CLAUDE.md 风格。
- 禁止升级核心依赖（Tauri 2.11 已满足本迭代需求）。
- 视觉基线变化必须先解码比对确认差异由本次改动引起，再 `--update-snapshots`。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/`。
- **每任务结束时 `npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿**。
- 规格：docs/superpowers/specs/2026-08-08-app-shell-b4-desktop-realism-design.md（唯一需求源）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

---

### Task B4-1: 窗口控制权限修复

**Files:**
- Modify: `src-tauri/capabilities/default.json`（追加窗口变更权限）
- Test: `tests/unit/window-capabilities.test.js`（新建）

**Interfaces:**
- Consumes: 无（配置直改）
- Produces: `src-tauri/capabilities/default.json` 的 `permissions` 含 7 项 `core:window:allow-*` 变更权限 —— Task B4-2/3 复用同一 capability 文件并追加

- [ ] **Step 1: 写失败单测**（tests/unit/window-capabilities.test.js，断言权限缺失）

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Tauri 窗口能力（B4-1）', () => {
  const caps = JSON.parse(
    readFileSync(new URL('../../src-tauri/capabilities/default.json', import.meta.url), 'utf8'),
  );
  it('授权窗口变更操作（min/max/close/拖拽）', () => {
    const required = [
      'core:window:allow-minimize',
      'core:window:allow-maximize',
      'core:window:allow-unmaximize',
      'core:window:allow-toggle-maximize',
      'core:window:allow-close',
      'core:window:allow-is-maximized',
      'core:window:allow-start-dragging',
    ];
    for (const p of required) expect(caps.permissions).toContain(p);
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/window-capabilities.test.js`
Expected: FAIL（`permissions` 仅含 `core:default`，7 项均缺）

- [ ] **Step 3: capabilities/default.json 追加权限**

将 `permissions` 数组改为：

```json
  "permissions": [
    "core:default",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-close",
    "core:window:allow-is-maximized",
    "core:window:allow-start-dragging"
  ]
```

其余字段（`$schema`/`identifier`/`description`/`windows`）不动。

- [ ] **Step 4: 运行确认绿**

Run: `npx vitest run tests/unit/window-capabilities.test.js`
Expected: PASS

- [ ] **Step 5: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e`（含视觉 24，应零漂移——纯配置）+ `npm run build`
Expected: 全绿

```bash
git add src-tauri/capabilities/default.json tests/unit/window-capabilities.test.js
git commit -m "fix: Tauri 窗口控制权限（min/max/close/拖拽 capability 授权，闭环 B4-1）"
```

> 注：桌面真机由用户验证（需重新 build）。改动后窗口按钮 + 标题栏拖拽区生效。

---

### Task B4-2: 文字排版真实生效（baseSize/scale 全局缩放）

**Files:**
- Modify: `src/styles/tokens.css`（字号令牌派生自 `--font-size-base`）
- Modify: `src/config/apply.js`（`--font-size-base` = `calc(baseSize × scale)`）
- Modify: `src/demo/customizer-css.js`（导出对齐 `--font-size-base`）
- Modify: `tests/unit/apply.test.js`（新增 `--font-size-base` 断言）
- Test: `tests/e2e/customizer.spec.js`（新用例）

**Interfaces:**
- Consumes: `cfg.type.baseSize`（RANGES `[12,16,0.5]`）、`cfg.type.scale`（RANGES `[0.9,1.15,0.01]`），均已在 defaults.js/RANGES 存在
- Produces: `--font-size-base` = `calc(<baseSize>px * <scale>)` 写入 `:root` style；tokens.css 全部 `--font-size-*` 派生自此变量 —— Task B4-4/5 不依赖本任务变量

- [ ] **Step 1: 写失败单测**（apply.test.js，断言新公式）

在 apply.test.js 的 `applyConfig` describe 内追加：

```js
it('--font-size-base = calc(baseSize px * scale)（两滑杆共同驱动）', () => {
  applyConfig({ ...DEFAULTS, type: { baseSize: 14, scale: 1.15, weight: 400 } }, root);
  expect(root.style.getPropertyValue('--font-size-base')).toBe('calc(14px * 1.15)');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/apply.test.js`
Expected: 新用例 FAIL（现状写入 `14px`，非 `calc(14px * 1.15)`）

- [ ] **Step 3: apply.js 改公式**

applyConfig 内 `--font-size-base` 一行改为：

```js
s.setProperty('--font-size-base', `calc(${cfg.type.baseSize}px * ${cfg.type.scale})`);
```

- [ ] **Step 4: tokens.css 字号令牌派生**

把 `src/styles/tokens.css` 中静态字号令牌（现 `--font-size-xs: 10px` 等）改为派生自 `--font-size-base`：

```css
--font-size-xs: calc(var(--font-size-base) * 0.714);   /* 14→10 */
--font-size-sm: calc(var(--font-size-base) * 0.857);   /* 14→12 */
--font-size-base: 14px;                                 /* 默认；applyConfig 覆盖 */
--font-size-lg: calc(var(--font-size-base) * 1.143);   /* 14→16 */
--font-size-xl: calc(var(--font-size-base) * 1.429);   /* 14→20 */
--font-size-2xl: calc(var(--font-size-base) * 1.714);  /* 14→24 */
--font-size-3xl: calc(var(--font-size-base) * 2);      /* 14→28 */
```

- [ ] **Step 5: customizer-css.js 导出对齐**

`src/demo/customizer-css.js` 第 39 行改为：

```js
  --font-size-base: calc(${type.baseSize}px * ${type.scale});
```

- [ ] **Step 6: 单测确认绿**

Run: `npx vitest run tests/unit/apply.test.js`
Expected: 新用例 PASS（其余用例不受影响）

- [ ] **Step 7: 写失败 e2e**（customizer.spec.js，读真实元素解析字号，规避 calc 在自定义属性中的未解析序列化）

```js
test('文字排版：baseSize/scale 滑杆真实全局缩放字号', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const readFont = () => page.evaluate(() => {
    const body = parseFloat(getComputedStyle(document.body).fontSize);
    const sm = parseFloat(getComputedStyle(document.querySelector('.c-titlebar__title')).fontSize);
    return { body, sm };
  });
  const before = await readFont();
  expect(before.body).toBeCloseTo(14, 1); // 默认 baseSize=14, scale=1
  expect(before.sm).toBeCloseTo(12, 1);   // --font-size-sm = 14 × 0.857
  await appr.locator('.cust-row:has-text("缩放") input[type="range"]').fill('1.15');
  const scaled = await readFont();
  expect(scaled.body).toBeGreaterThan(before.body);
  expect(scaled.sm).toBeGreaterThan(before.sm);
  await appr.locator('.cust-row:has-text("基准字号") input[type="range"]').fill('12');
  const based = await readFont();
  expect(based.body).toBeLessThan(scaled.body);
  expect(based.sm).toBeLessThan(scaled.sm);
});
```

- [ ] **Step 8: 运行确认红**

Run: `npx playwright test tests/e2e/customizer.spec.js -g "缩放字号"`
Expected: FAIL（现状 scale 无效果 → `scaled.body === before.body`）

- [ ] **Step 9: 确认绿 + 视觉基线检查**

Run: `npx playwright test tests/e2e/customizer.spec.js -g "缩放字号"` → PASS
Run: `npm run test:visual`
Expected: 24/24 零漂移（默认 14×1 计算值不变；若漂移需解码比对后报告，勿擅自 update-snapshots）

- [ ] **Step 10: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿

```bash
git add src/styles/tokens.css src/config/apply.js src/demo/customizer-css.js tests/unit/apply.test.js tests/e2e/customizer.spec.js
git commit -m "feat: 文字排版真实生效（字号令牌派生自 --font-size-base，baseSize/scale 全局缩放，闭环 B4-4）"
```

---

### Task B4-3: 颜色方案 —— 删色彩微调组（整体色调 = 强调色选择）

**Files:**
- Modify: `src/config/defaults.js`（DEFAULTS 删 `color`；RANGES 删 hue/saturation/temperature）
- Modify: `src/config/apply.js`（删 `applyColorTint`/`temperatureToHue`/色温块；保留 `prefersDark`）
- Modify: `src/demo/customizer-panel.js`（删 整体色调 组三滑杆 + `tintHsl`/`hueSliderValue`/`tintSwatch` + 预览卡 `--preview-accent` 改取色板）
- Modify: `src/demo/customizer-css.js`（删 `tintHsl`/`temperatureToHue`/tint/temp 行）
- Modify: `tests/unit/apply.test.js`（删色彩微调用例；import 去掉 `temperatureToHue`）
- Modify: `tests/e2e/customizer.spec.js`（删色相/色温用例；新增微调滑杆消失断言）
- Modify: `tests/e2e/visual-regression.spec.js-snapshots/`（appearance-partition 6 张重生成）

**Interfaces:**
- Consumes: `cfg.accent`（现有 6 预设）、`ACCENTS`
- Produces: 删除 `color.{hue,saturation,temperature}` 全部消费点；`--preview-accent` = `ACCENTS.find(a=>a.id===cfg.accent).color`；`applyConfig` 不再写 `--accent`/`--neutral-hue` 覆盖 —— Task B4-4 在其上扩展 ACCENTS

- [ ] **Step 1: 写失败单测**（apply.test.js）

在 apply.test.js 顶部 import 改为 `import { applyConfig } from '../../src/config/apply.js';`（去掉 `temperatureToHue`）。将 describe 内全部色彩微调/色温用例（现状约 54-90 行：hue 覆盖、饱和度缩放、teal hue、temperatureToHue、--neutral-hue 相关）替换为一条保持性断言：

```js
it('不写 --accent/--neutral-hue 覆盖（强调色来自主题色板）', () => {
  applyConfig(DEFAULTS, root);
  expect(root.style.getPropertyValue('--accent')).toBe('');
  expect(root.style.getPropertyValue('--neutral-hue')).toBe('');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/apply.test.js`
Expected: FAIL（`temperatureToHue` 不存在 / 用例引用已删字段）

- [ ] **Step 3: defaults.js 删 color 微调**

`DEFAULTS` 删 `color: { hue: -1, saturation: 100, temperature: 0 }` 行（保留注释掉的 hue 语义说明？不——整行删除）；`RANGES` 删 `hue`/`saturation`/`temperature` 三行。

- [ ] **Step 4: apply.js 删色彩微调链**

删除：`applyColorTint` 函数、`temperatureToHue` 函数、`applyConfig` 内的 `applyColorTint(cfg, root)` 调用行、色温覆盖块（`--neutral-hue` 两行）、不再使用的 `import { ACCENTS }`（若仅 applyColorTint 用）与 `hexToHsl` 定义（**先 grep `hexToHsl` 确认无其它消费者**——customizer-panel.js 删 tintSwatch 后应无消费者，若无则一并删；若仍有则保留导出）。保留 `prefersDark`。

- [ ] **Step 5: customizer-panel.js 删微调**

- `CFG_PATH` 删 `hue`/`saturation`/`temperature` 三键
- GROUPS 中「整体色调」组（现 title `整体色调` + `pre: accentCards + semanticBar` + 三滑杆）改为只留 `pre: accentCards(cfg) + semanticBar()`、删 `sliders`；desc 更新为「预设主题色 / 语义色自动协调」
- 删 `hueSliderValue`/`tintSwatch`/`tintHsl` 函数（`hexToHsl` import 若无其它消费一并删）
- 预览卡 `updateOverview` 的 `--preview-accent` 由 `tintHsl(cfg)` 改为 `ACCENTS.find((a) => a.id === cfg.accent)?.color ?? ACCENTS[0].color`
- `fmtValue` 的 hue 分支（`if (key === 'hue') return cfg.color.hue === -1 ? '跟随' : ...`）删除，简化为 `return \`${readCfg(cfg, key)}${unit ?? ''}\``
- `syncUI` 内 hue 分支（`[data-out="hue"]` swatch 更新、`if (key === 'hue')`）删除
- `renderSlider` 内 `spec.key === 'hue'` 的 swatch/value 分支删除（`const swatch = ...`/`const value = ...` 改直接 `readCfg`）

- [ ] **Step 6: customizer-css.js 删 tint/temp**

删除 `tintHsl` 函数、`temperatureToHue` import、`tintLine`/`tempLine` 及其在模板中的插值（`:root` 段删 `--accent:` 覆盖行与 `--neutral-hue:` 行；`tintActive`/`tint` 相关逻辑）。`import { hexToHsl, temperatureToHue }` 改为仅 import 需要的（`springCurve`/`scaledDurations` 来自 motion）。

- [ ] **Step 7: 单测确认绿**

Run: `npx vitest run tests/unit/apply.test.js` → PASS；`npm test` → 全绿（customizer.test.js 只测订阅退订，应零影响）

- [ ] **Step 8: e2e 更新**（customizer.spec.js）

删除「色相滑杆实时覆盖 --accent 且数值区显示」与「色温滑杆映射 --neutral-hue 暖端」两个用例。新增：

```js
test('外观分区：色彩微调滑杆已移除，强调色预设保留', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  await expect(appr.locator('.cust-range[data-key="hue"]')).toHaveCount(0);
  await expect(appr.locator('.cust-range[data-key="saturation"]')).toHaveCount(0);
  await expect(appr.locator('.cust-range[data-key="temperature"]')).toHaveCount(0);
  await expect(appr.locator('.cust-accent-card')).toHaveCount(6);
  // 切强调色 → --accent 直接取色板（无微调覆盖）
  await appr.locator('.cust-accent-card[data-accent="teal"]').click();
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toBe('rgb(45, 212, 191)'); // teal-400 #2dd4bf
});
```

- [ ] **Step 9: e2e 红→绿**

Run: `npx playwright test tests/e2e/customizer.spec.js` → 先红（微调滑杆仍存在）→ 实现后绿

- [ ] **Step 10: 视觉基线重生成**（appearance-partition 6 张）

1. `npm run test:visual` 确认仅 `appearance-partition-*` 失败（微调组删行 + 预览卡强调色点色值微变 hsl65→hex69），其余 18 张零漂移
2. 解码比对失败快照：差异 = 整体色调组滑杆消失 + 预览卡强调色点色值（默认 indigo 由 hsl(236 83.5% 65%) 变 #6e7bf2）
3. 确认后 `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots`
4. 复跑 `npm run test:visual` 24/24 绿

- [ ] **Step 11: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿

```bash
git add src/config/defaults.js src/config/apply.js src/demo/customizer-panel.js src/demo/customizer-css.js tests/unit/apply.test.js tests/e2e/customizer.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 删色彩微调组（色相/饱和度/色温），强调色=预设色板直出（B4-3）"
```

---

### Task B4-4: 颜色方案 —— 强调色预设扩至 12 套

**Files:**
- Modify: `src/config/defaults.js`（`ACCENTS` 6 → 12）
- Modify: `src/styles/themes.css`（新增 6 个 `data-accent` 全阶色板）
- Modify: `tests/e2e/customizer.spec.js`（断言 12 预设 + 新预设切换）
- Modify: `tests/e2e/visual-regression.spec.js-snapshots/`（appearance-partition 6 张重生成）

**Interfaces:**
- Consumes: Task B4-3 已删微调组；`ACCENTS` 结构 `{id, name, color, desc}`
- Produces: `ACCENTS` 12 项；themes.css 6 个新 `data-accent` 块（`--accent-50…950` + `--accent`/`--accent-hover`/`--accent-active`/`--accent-contrast` 齐全）—— 无后续任务消费，独立交付

- [ ] **Step 1: 写失败 e2e**

```js
test('强调色预设扩至 12 套，新预设可切换', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  await expect(appr.locator('.cust-accent-card')).toHaveCount(12);
  await appr.locator('.cust-accent-card[data-accent="rose"]').click();
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toBe('rgb(244, 63, 94)'); // rose-400 #f43f5e
  // 预览卡强调色联动新预设
  const preview = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.cust-overview')).getPropertyValue('--preview-accent').trim());
  expect(preview).toBe('#f43f5e');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/customizer.spec.js -g "12 套"`
Expected: FAIL（现 6 卡，rose 不存在）

- [ ] **Step 3: defaults.js ACCENTS 扩至 12**

在现有 6 项后追加：

```js
  { id: 'rose', name: '玫红', color: '#f43f5e', desc: '热情、张力' },
  { id: 'orange', name: '橙', color: '#f97316', desc: '活力、明亮' },
  { id: 'lime', name: '青柠', color: '#84cc16', desc: '清新、能量' },
  { id: 'cyan', name: '青', color: '#06b6d4', desc: '通透、清爽' },
  { id: 'blue', name: '蓝', color: '#3b82f6', desc: '稳重、可靠' },
  { id: 'fuchsia', name: '品红', color: '#d946ef', desc: '时尚、鲜明' },
```

- [ ] **Step 4: themes.css 新增 6 个 data-accent 色板**

在每个既有 `:root[data-accent="..."]` 块之后、同结构追加 6 块（50–950 全阶 + `--accent: var(--accent-400)` / `--accent-hover: var(--accent-300)` / `--accent-active: var(--accent-500)` / `--accent-contrast: <950 值>`）。色板值（Tailwind 风格，与既有块同构）：

```css
:root[data-accent="rose"] {
  --accent-50: #fff1f2; --accent-100: #ffe4e6; --accent-200: #fecdd3;
  --accent-300: #fda4af; --accent-400: #fb7185; --accent-500: #f43f5e;
  --accent-600: #e11d48; --accent-700: #be123c; --accent-800: #9f1239;
  --accent-900: #881337; --accent-950: #4c0519;
  --accent: var(--accent-400); --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500); --accent-contrast: #4c0519;
}
```

其余 5 块色板值：
- orange: 50 #fff7ed 100 #ffedd5 200 #fed7aa 300 #fdba74 400 #fb923c 500 #f97316 600 #ea580c 700 #c2410c 800 #9a3412 900 #7c2d12 950 #431407；contrast #431407
- lime: 50 #f7fee7 100 #ecfccb 200 #d9f99d 300 #bef264 400 #a3e635 500 #84cc16 600 #65a30d 700 #4d7c0f 800 #3f6212 900 #365314 950 #1a2e05；contrast #1a2e05
- cyan: 50 #ecfeff 100 #cffafe 200 #a5f3fc 300 #67e8f9 400 #22d3ee 500 #06b6d4 600 #0891b2 700 #0e7490 800 #155e75 900 #164e63 950 #083344；contrast #083344
- blue: 50 #eff6ff 100 #dbeafe 200 #bfdbfe 300 #93c5fd 400 #60a5fa 500 #3b82f6 600 #2563eb 700 #1d4ed8 800 #1e40af 900 #1e3a8a 950 #172554；contrast #172554
- fuchsia: 50 #fdf4ff 100 #fae8ff 200 #f5d0fe 300 #f0abfc 400 #e879f9 500 #d946ef 600 #c026d3 700 #a21caf 800 #86198f 900 #701a75 950 #4a044e；contrast #4a044e

> 注：defaults.js 的 `color` 字段为 400 值（与既有 teal #2dd4bf = teal-400 一致）。`--preview-accent`/`--accent` 均取 400。

- [ ] **Step 5: e2e 红→绿**

Run: `npx playwright test tests/e2e/customizer.spec.js -g "12 套"` → 绿；再跑全文件确认零回归

- [ ] **Step 6: 视觉基线重生成**（appearance-partition 6 张）

1. `npm run test:visual` 确认仅 appearance-partition 失败（强调色卡网格 6→12，多两行）
2. 解码比对差异区域 = 色卡网格新增 6 卡
3. `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots`
4. 复跑 24/24 绿

- [ ] **Step 7: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿

```bash
git add src/config/defaults.js src/styles/themes.css tests/e2e/customizer.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 强调色预设扩至 12 套（玫红/橙/青柠/青/蓝/品红），B4-3"
```

---

### Task B4-5: 独立悬浮窗 —— 主窗创建 strip 窗口

**Files:**
- Modify: `src-tauri/capabilities/default.json`（`windows` 加 `"strip"`；追加 strip 窗口所需权限）
- Modify: `tests/unit/window-capabilities.test.js`（追加 strip 断言）
- Modify: `src/app/app-main.js`（FloatBall Tauri 分支 → 创建/聚焦 strip 窗口）
- Test: `tests/e2e/app-shell.spec.js`（mock `__TAURI__` 驱动）

**Interfaces:**
- Consumes: Task B4-1 的 capability 文件；`mountFloatBall` 的 `onExpand`（app-main.js 既有）
- Produces: `window.__TAURI__.window.WebviewWindow` 创建 label `'strip'` 的窗口（`url:'/?mode=strip'`, `transparent`, `decorations:false`, `alwaysOnTop`, `resizable:false`）—— Task B4-6 的 strip-main 消费同一窗口 label；`window.__TAURI__` 探测为 app-main 既有模式

- [ ] **Step 1: 追加 capability（strip 窗口）**

`windows` 改为 `["main", "strip"]`；`permissions` 追加：

```json
    "core:webview:allow-create-webview-window",
    "core:window:allow-set-position",
    "core:window:allow-outer-position",
    "core:window:allow-set-size"
```

- [ ] **Step 2: 追加单测**（window-capabilities.test.js 内新 it）

```js
it('授权 strip 悬浮窗（创建 + 自定位/自缩放）', () => {
  expect(caps.windows).toContain('strip');
  const required = [
    'core:webview:allow-create-webview-window',
    'core:window:allow-set-position',
    'core:window:allow-outer-position',
    'core:window:allow-set-size',
  ];
  for (const p of required) expect(caps.permissions).toContain(p);
});
```

Run: `npx vitest run tests/unit/window-capabilities.test.js` → 红 → Step 1 已实现 → 绿

- [ ] **Step 3: 写失败 e2e**（app-shell.spec.js 末尾追加；mock `__TAURI__` 注入 `WebviewWindow` 记录调用）

```js
test('Tauri：FloatBall 展开创建独立 strip 窗口（透明置顶）', async ({ page }) => {
  await page.addInitScript(() => {
    const created = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        WebviewWindow: class {
          constructor(label, opts) { created.push({ label, opts }); }
          setFocus() {} once() {}
        },
      },
    };
    window.__stripWinCalls__ = created;
  });
  await page.goto('/?mode=app');
  await page.locator('.app-main__float-ball').click();
  const calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toHaveLength(1);
  expect(calls[0].label).toBe('strip');
  expect(calls[0].opts.transparent).toBe(true);
  expect(calls[0].opts.decorations).toBe(false);
  expect(calls[0].opts.alwaysOnTop).toBe(true);
  expect(calls[0].opts.url).toContain('mode=strip');
});
```

- [ ] **Step 4: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip 窗口"`
Expected: FAIL（现 FloatBall 走窗口内 strip，`__stripWinCalls__` 为空数组）

- [ ] **Step 5: app-main.js FloatBall Tauri 分支**

在 `mountFloatBall(ballHost, { onExpand: ... })`（app-main.js 约 697-714 行）的 onExpand 顶部加 Tauri 分支：

```js
onExpand: () => {
  // Tauri：创建/聚焦独立 strip 窗口（B4-5）；浏览器：窗口内 strip 演示（既有）
  if (typeof window.__TAURI__ !== 'undefined') {
    const { WebviewWindow } = window.__TAURI__.window;
    if (stripWindow) { stripWindow.setFocus(); return; }
    stripWindow = new WebviewWindow('strip', {
      url: '/?mode=strip',
      width: 320,
      height: 64,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      resizable: false,
    });
    stripWindow.once('tauri://destroyed', () => { stripWindow = null; });
    return;
  }
  if (stripHost) return;
  // ...既有窗口内 strip 逻辑不变...
},
```

在 app-main.js `mountAppMode` 顶部（ballHost 声明附近）加模块变量：

```js
let stripWindow = null; // B4-5：Tauri 独立 strip 窗口句柄（销毁后置空，重开可再建）
```

- [ ] **Step 6: e2e 红→绿**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip 窗口"` → 绿
Run: `npx playwright test tests/e2e/floatstrip.spec.js`（浏览器分支回归：FloatBall 仍开窗口内 strip）→ 全绿

- [ ] **Step 7: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿（视觉 24 零漂移——本任务不改渲染）

```bash
git add src-tauri/capabilities/default.json tests/unit/window-capabilities.test.js src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "feat: 主窗 FloatBall 创建独立 strip 窗口（透明置顶，B4-5）"
```

---

### Task B4-6: 独立悬浮窗 —— strip 窗口行为（拖动/贴合/位置持久化/关闭）

**Files:**
- Modify: `src/components/float-strip/float-strip.js`（`mountFloatStrip` 加 `windowMode`/`onResize` 选项）
- Modify: `src/app/strip-main.js`（Tauri 分支：铺满/贴合/位置持久化/关闭）
- Modify: `src/components/float-strip/float-strip.css`（`.strip-root--window` 铺满规则）
- Test: `tests/e2e/floatstrip.spec.js`（mock `__TAURI__` 驱动 strip 模式行为）

**Interfaces:**
- Consumes: Task B4-5 创建的 label `'strip'` 窗口（strip-main 经 `getCurrentWindow()` 取自身窗口）；capability 已含 set-position/outer-position/set-size/start-dragging/close
- Produces: `mountFloatStrip` 新增可选参数 `windowMode: boolean`（默认 false，浏览器行为零变化）+ `onResize: () => void`；strip 窗口位置存 localStorage 键 `'ui-design-strip-pos'`

- [ ] **Step 1: 写失败 e2e**（floatstrip.spec.js 追加；mock `__TAURI__` 记录 strip 窗口调用）

```js
test('strip 窗口：拖动走系统拖拽、旋转贴合尺寸、位置持久化、X 关闭窗口', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    window.__TAURI__ = { window: { getCurrentWindow: () => ({
      startDragging: () => { calls.push('startDragging'); return Promise.resolve(); },
      setSize: (s) => { calls.push(['setSize', s]); return Promise.resolve(); },
      setPosition: (p) => { calls.push(['setPosition', p]); return Promise.resolve(); },
      outerPosition: () => { calls.push('outerPosition'); return Promise.resolve({ x: 300, y: 200 }); },
      onMoved: (fn) => { window.__stripMovedFn__ = fn; return Promise.resolve(() => {}); },
      close: () => { calls.push('close'); return Promise.resolve(); },
    }) } };
    window.__stripWinCalls__ = calls;
    localStorage.setItem('ui-design-strip-pos', JSON.stringify({ x: 120, y: 80 }));
  });
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip')).toBeVisible();
  // 位置恢复：setPosition 被调用且为存档值
  let calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContainEqual(['setPosition', { x: 120, y: 80 }]);
  // 位置保存：触发 onMoved → outerPosition → localStorage 更新为 300/200
  await page.evaluate(() => window.__stripMovedFn__());
  await page.waitForTimeout(350); // 去抖 200ms
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ui-design-strip-pos')));
  expect(saved).toEqual({ x: 300, y: 200 });
  // 拖动 → startDragging（不跟踪指针/不磁吸）
  await page.locator('.c-strip__drag').dispatchEvent('pointerdown', { button: 0, pointerId: 1 });
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('startDragging');
  // 旋转 → setSize 贴合
  const before = calls.filter((c) => c[0] === 'setSize').length;
  await page.locator('.c-strip__rotate').click();
  await page.waitForTimeout(300); // 交叉淡入淡出 240ms
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls.filter((c) => c[0] === 'setSize').length).toBeGreaterThan(before);
  // X 关闭 → close
  await page.locator('.c-strip__close').click();
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('close');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/floatstrip.spec.js -g "strip 窗口"`
Expected: FAIL（现状 strip 模式走窗口内行为，无 window 调用）

- [ ] **Step 3: mountFloatStrip 加 windowMode/onResize**

`mountFloatStrip(root, { onStateChange = () => {}, onClose, windowMode = false, onResize = () => {} } = {})`。改动两处：

`startDrag` 顶部加分支（窗口模式：系统拖拽，不跟踪/不磁吸）：

```js
function startDrag(e) {
  if (e.button !== 0) return;
  if (windowMode) {
    window.__TAURI__?.window?.getCurrentWindow?.()?.startDragging?.().catch?.(() => {});
    return;
  }
  // ...既有 transform 拖拽逻辑不变...
}
```

`toggleOrientation` 的 setTimeout 末尾（现 `setPos(x, y)` 之后）加窗口模式分支：

```js
if (windowMode) { onResize(); return; }
setPos(x, y);
```

（窗口模式跳过 `setPos`/`applySnapped`——窗口模型下无窗口内磁吸；`onStateChange` 照常回调 orientation。）

- [ ] **Step 4: strip-main.js 加 Tauri 分支**

`mountStripMode` 改为：

```js
export function mountStripMode() {
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: renderTokenMonitor({
      value: '97.2%',
      status: 'ok',
      trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
    }),
  });
  document.body.appendChild(root);
  const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
  if (win) {
    // —— Tauri 独立窗口（B4-6）：铺满窗口 + 系统拖拽 + 尺寸贴合 + 位置持久化 ——
    root.classList.add('strip-root--window');
    const strip = root.querySelector('.c-strip');
    const STORAGE_KEY = 'ui-design-strip-pos';
    // 位置恢复
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (Number.isFinite(x) && Number.isFinite(y)) win.setPosition({ x, y }).catch(() => {});
      }
    } catch { /* 损坏存档忽略 */ }
    // 尺寸贴合内容（初始 + 旋转）
    const fit = () => {
      const r = strip.getBoundingClientRect();
      win.setSize({ width: Math.max(1, Math.ceil(r.width)), height: Math.max(1, Math.ceil(r.height)) }).catch(() => {});
    };
    fit();
    // 位置持久化（去抖 200ms）
    let saveTimer = null;
    win.onMoved?.(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        win.outerPosition?.().then(({ x, y }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
        }).catch(() => {});
      }, 200);
    });
    mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.close().catch(() => {}) });
  } else {
    mountFloatStrip(root, { onClose: () => root.remove() });
  }
}
```

- [ ] **Step 5: float-strip.css 铺满规则**

追加：

```css
/* B4-6：独立窗口模式 —— strip 铺满窗口（窗口尺寸=内容），去掉底右 dock 定位 */
.strip-root--window .c-strip {
  position: static; right: auto; bottom: auto;
  max-width: none; max-height: none;
}
```

- [ ] **Step 6: e2e 红→绿**

Run: `npx playwright test tests/e2e/floatstrip.spec.js -g "strip 窗口"` → 绿
Run: `npx playwright test tests/e2e/floatstrip.spec.js`（浏览器 strip 模式全回归，`position: static` 只作用于 `.strip-root--window`，不触浏览器路径）→ 全绿

- [ ] **Step 7: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿（视觉 24 零漂移——strip 窗口不在视觉基线内；`mountFloatStrip` 浏览器路径行为不变）

```bash
git add src/components/float-strip/float-strip.js src/app/strip-main.js src/components/float-strip/float-strip.css tests/e2e/floatstrip.spec.js
git commit -m "feat: strip 窗口行为（系统拖拽/尺寸贴合/位置持久化/关闭，B4-6）"
```

---

## 执行交接指引（给实施会话）

1. **起点**：分支 `feature/b4-desktop-realism`（自 main 检出），规格 `docs/superpowers/specs/2026-08-08-app-shell-b4-desktop-realism-design.md`（唯一需求源），本计划书为唯一实施需求源。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报 → 派发（机械 haiku / 集成 sonnet / 审查 opus）→ 报告 → 审查包 → 评审 → 修复循环（≤5 轮）→ 账本 `docs/superpowers/sdd/progress-b4.md` 留痕（随代码提交）。
   - 注意：`task-brief` 脚本只匹配 `Task <数字>` 标题，本计划用 `Task B4-N` 需手动写 brief（与 B3 同款处理）。
3. **铁律**：禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审；测试仅在 Web 环境执行；**每任务结束全量回归绿**。
4. **已知风险/注意**：
   - B4-1 权限是根因修复，JS 不动；改配置后桌面需用户重 build 目检。
   - B4-2 `getComputedStyle` 读自定义属性会返回未解析的 `calc(...)` 字符串——e2e 断言必须读**真实元素**的解析 `fontSize`（body/`.c-titlebar__title`），不可 parseFloat 自定义属性值。
   - B4-3 删色彩微调链时，先 grep `hexToHsl`/`temperatureToHue` 消费点，确认无残留引用再删导出；存量 localStorage `color:{...}` 为死键，不清理。
   - B4-3/4 视觉基线：appearance-partition 各重生成一次（B4-3 删滑杆+预览卡强调色点色值微变；B4-4 网格 6→12），解码比对确认差异区域。
   - B4-5/6 e2e 用 `page.addInitScript` 注入 mock `__TAURI__`（窗口创建/行为记录）；浏览器路径（无 `__TAURI__`）必须零回归。
   - capability 的 `windows` 数组须含 `"strip"`（B4-5），否则 strip 窗口自身无权限（B4-6 的 setSize/setPosition/startDragging 会被拒）。
5. **完成后**：全量回归 + 最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归。
