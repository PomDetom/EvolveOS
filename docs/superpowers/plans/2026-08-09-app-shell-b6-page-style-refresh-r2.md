# 应用壳 B6-R2 页面样式修订 + 导航轮修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ① 背景装饰 8 预设改「大色块构图」（全部可见且互不相同、渐变/极光显著区分）② 按钮改「精致浅色半透明材质」（accent-100 浅 tint + 描边 + 上浮 hover）③ 修复导航轮 resize 后顶/底项无法选中、选中跳变的 bug。

**Architecture:** 背景沿用 `--backdrop-bg` 多层背景机制，细线图案 → 大尺寸渐变构图（blob/band，alpha 40-55%，材质不动）；按钮纯 CSS 令牌化重写（消费既有 accent-100/200/600、danger-50/500/600）；导航轮 `nav-wheel.js` 加 ResizeObserver 在容器尺寸变化时重算几何 padding。零运行时依赖、零架构改动。

**Tech Stack:** Vite + 原生 CSS + Vitest + Playwright（现有）。

**规格:** docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md（唯一需求源）

## Global Constraints

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；桌面观感由用户目检。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，本地不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（显式 `document.fonts.load` 三档，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。**背景预设为会话内纯 UI 态（`data-backdrop` 直接设），不进 store。**
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动；12 套强调色/语义色色板不动（只消费既有 `--accent-100/200/600`、`--danger-50/500/600`）。
- 提交前 `npm run build`；每任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。
- 已知环境怪癖：Vitest 会重写测试内 `import.meta.url` 字面量，经它定位文件路径属环境怪癖，勿判为缺陷；Chromium 151 将 `color-mix` 计算值序列化为 `oklab(...)`，断言须经 canvas 解析或与序列化格式解耦。

---

### Task B6-R2-1: 背景装饰大色块构图（8 预设可见且互不相同）

**Files:**
- Modify: `src/app/app-main.css`（8 预设 `--backdrop-bg` 全部改大尺寸渐变构图，删旧 background-size 规则）
- Modify: `src/app/partitions.css`（8 swatch mini 图案同步改大构图）
- Modify: `tests/unit/backdrop.test.js`（断言更新：可见 wash + gradient/aurora 区分）
- Modify: `tests/e2e/app-shell.spec.js`（B6-1 用例保留 + 新增「8 预设均可见」断言）
- Test: `tests/e2e/visual-regression.spec.js-snapshots`（app-main + appearance-partition 重生成）

**Interfaces:**
- Consumes: 既有 `data-backdrop` + `--backdrop-bg` 机制（app-main.js BD_LABELS 8 键不变，app-main.css 预设块替换）
- Produces: `--backdrop-bg` 每预设为「大色块/色带多层渐变」；预览卡 swatch 同步大构图 —— B6-R2-2/3 不依赖

- [ ] **Step 1: 更新失败单测**（tests/unit/backdrop.test.js 全文件替换）

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('背景装饰预设（B6-R2：大色块构图可见且互不相同）', () => {
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('app-main.css 定义 8 个 data-backdrop 预设', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none']
      .forEach((bd) => expect(css).toContain(`[data-backdrop="${bd}"]`));
  });

  it('每个非 none 预设的 --backdrop-bg 含渐变 wash（非纯实底），且无 24px 细线平铺', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora'].forEach((bd) => {
      const block = css.match(new RegExp(`\\[data-backdrop="${bd}"\\][^}]*`))[0];
      expect(block).toMatch(/gradient\(/); // radial/linear/repeating 任一层
      expect(block).not.toContain('24px'); // 旧细线平铺已弃
    });
  });

  it('gradient 与 aurora 结构区分（单 accent 团 vs 多色多团）', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    const grad = css.match(/\[data-backdrop="gradient"\][^}]*/)[0];
    const aur = css.match(/\[data-backdrop="aurora"\][^}]*/)[0];
    expect(grad).toContain('--accent-300');
    expect(grad).not.toContain('--neutral-400'); // gradient 单色
    expect(aur).toContain('--neutral-400'); // aurora 多色区分器
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: FAIL（grid 块含 `24px` / gradient 块含 `--neutral-400` 或结构不符）

- [ ] **Step 3: 实现 app-main.css 新预设**（替换既有 8 预设块，约 35-67 行；删 grid/dots 的 background-size 规则）

```css
/* B6-R2：背景装饰「大色块构图」—— 细线图案被玻璃磨没，全部改大尺寸渐变构图
   （blob/band ≥ 容器 15-25%，alpha 40-55%），经 0.62-0.72 玻璃后可见约 25-40%
   （明显不刺眼）。8 预设靠结构区分（单团/单斜带/交叉带/散斑/平行斜带/横带/多色团），
   非颜色。材质不动。 */
.app-main[data-backdrop="gradient"] { --backdrop-bg:
  radial-gradient(140% 140% at 15% 8%, color-mix(in srgb, var(--accent-300) 55%, transparent) 0%, transparent 55%),
  var(--surface-solid); }
.app-main[data-backdrop="geo"] { --backdrop-bg:
  linear-gradient(135deg, transparent 0 30%, color-mix(in srgb, var(--accent-300) 45%, transparent) 30% 52%, transparent 52%),
  radial-gradient(80% 80% at 88% 18%, color-mix(in srgb, var(--accent-400) 30%, transparent) 0%, transparent 55%),
  var(--surface-solid); }
.app-main[data-backdrop="grid"] { --backdrop-bg:
  linear-gradient(180deg, transparent 0 42%, color-mix(in srgb, var(--accent-300) 40%, transparent) 42% 54%, transparent 54%),
  linear-gradient(90deg, transparent 0 64%, color-mix(in srgb, var(--accent-300) 40%, transparent) 64% 76%, transparent 76%),
  radial-gradient(40% 40% at 18% 82%, color-mix(in srgb, var(--accent-400) 35%, transparent) 0%, transparent 60%),
  var(--surface-solid); }
.app-main[data-backdrop="dots"] { --backdrop-bg:
  radial-gradient(38% 38% at 22% 26%, color-mix(in srgb, var(--accent-300) 50%, transparent) 0%, transparent 70%),
  radial-gradient(30% 30% at 78% 68%, color-mix(in srgb, var(--accent-400) 42%, transparent) 0%, transparent 70%),
  radial-gradient(22% 22% at 62% 16%, color-mix(in srgb, var(--neutral-400) 30%, transparent) 0%, transparent 70%),
  var(--surface-solid); }
.app-main[data-backdrop="diagonal"] { --backdrop-bg:
  repeating-linear-gradient(135deg, color-mix(in srgb, var(--accent-300) 42%, transparent) 0 90px, transparent 90px 210px),
  var(--surface-solid); }
.app-main[data-backdrop="waves"] { --backdrop-bg:
  repeating-linear-gradient(180deg, color-mix(in srgb, var(--accent-300) 36%, transparent) 0 60px, transparent 60px 150px),
  var(--surface-solid); }
.app-main[data-backdrop="aurora"] { --backdrop-bg:
  radial-gradient(60% 60% at 18% 22%, color-mix(in srgb, var(--accent-300) 45%, transparent) 0%, transparent 60%),
  radial-gradient(55% 55% at 82% 68%, color-mix(in srgb, var(--accent-400) 38%, transparent) 0%, transparent 60%),
  radial-gradient(45% 45% at 55% 42%, color-mix(in srgb, var(--neutral-400) 22%, transparent) 0%, transparent 60%),
  var(--surface-solid); }
.app-main[data-backdrop="none"] { --backdrop-bg: var(--surface-solid); }
```

> 渐变用 `%` 定位/尺寸 → 默认 background-size 拉伸铺满，无需 background-size 规则（删旧 grid/dots 的 `background-size: 24px 24px` 规则）。若某预设经解码比对观感不符「鲜明但克制」，按结构方向微调 alpha/位置，记入报告。

- [ ] **Step 4: 单测确认绿**

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: PASS

- [ ] **Step 5: 同步预览卡 swatch 大构图**（partitions.css，替换 53-75 行 swatch 图案块）

```css
/* B6-R2：swatch mini 大构图 —— 与 .app-main__backdrop 的 --backdrop-bg 同结构缩放到 40×26 盒内
   （blob 用 % 自动缩放；repeating 周期缩到 mini 视口） */
.app-main__backdrop-card-swatch[data-bd-swatch="gradient"] { background-image:
  radial-gradient(140% 140% at 15% 8%, color-mix(in srgb, var(--accent-300) 55%, transparent) 0%, transparent 55%); }
.app-main__backdrop-card-swatch[data-bd-swatch="geo"] { background-image:
  linear-gradient(135deg, transparent 0 30%, color-mix(in srgb, var(--accent-300) 45%, transparent) 30% 52%, transparent 52%),
  radial-gradient(80% 80% at 88% 18%, color-mix(in srgb, var(--accent-400) 30%, transparent) 0%, transparent 55%); }
.app-main__backdrop-card-swatch[data-bd-swatch="grid"] { background-image:
  linear-gradient(180deg, transparent 0 42%, color-mix(in srgb, var(--accent-300) 40%, transparent) 42% 54%, transparent 54%),
  linear-gradient(90deg, transparent 0 64%, color-mix(in srgb, var(--accent-300) 40%, transparent) 64% 76%, transparent 76%),
  radial-gradient(40% 40% at 18% 82%, color-mix(in srgb, var(--accent-400) 35%, transparent) 0%, transparent 60%); }
.app-main__backdrop-card-swatch[data-bd-swatch="dots"] { background-image:
  radial-gradient(38% 38% at 22% 26%, color-mix(in srgb, var(--accent-300) 50%, transparent) 0%, transparent 70%),
  radial-gradient(30% 30% at 78% 68%, color-mix(in srgb, var(--accent-400) 42%, transparent) 0%, transparent 70%),
  radial-gradient(22% 22% at 62% 16%, color-mix(in srgb, var(--neutral-400) 30%, transparent) 0%, transparent 70%); }
.app-main__backdrop-card-swatch[data-bd-swatch="diagonal"] { background-image:
  repeating-linear-gradient(135deg, color-mix(in srgb, var(--accent-300) 42%, transparent) 0 14px, transparent 14px 32px); }
.app-main__backdrop-card-swatch[data-bd-swatch="waves"] { background-image:
  repeating-linear-gradient(180deg, color-mix(in srgb, var(--accent-300) 36%, transparent) 0 10px, transparent 10px 24px); }
.app-main__backdrop-card-swatch[data-bd-swatch="aurora"] { background-image:
  radial-gradient(60% 60% at 18% 22%, color-mix(in srgb, var(--accent-300) 45%, transparent) 0%, transparent 60%),
  radial-gradient(55% 55% at 82% 68%, color-mix(in srgb, var(--accent-400) 38%, transparent) 0%, transparent 60%),
  radial-gradient(45% 45% at 55% 42%, color-mix(in srgb, var(--neutral-400) 22%, transparent) 0%, transparent 60%); }
.app-main__backdrop-card-swatch[data-bd-swatch="none"] { background-image: none; }
```

> 注意：删除旧 grid/dots 的 `background-size: 24px 24px`（swatch 改纯大构图后无需平铺）。

- [ ] **Step 6: e2e 新增「8 预设均可见」断言**（tests/e2e/app-shell.spec.js，在既有 B6-1 用例后追加）

```js
test('B6-R2-1：8 背景预设切换均生效（非 none 预设 backdrop 含渐变 wash）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  await expect(page.locator('.app-main__backdrop-card')).toHaveCount(8);
  for (const bd of ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none']) {
    await page.locator(`.app-main__backdrop-card[data-bd="${bd}"]`).click();
    const img = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
    if (bd === 'none') expect(img).toBe('none');
    else expect(img).toContain('gradient'); // 大构图 wash 非纯实底
  }
});
```

- [ ] **Step 7: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-1"` → 绿；再跑 app-shell 全文件零回归（既有 B6-1/B2-2 用例应仍绿）。

- [ ] **Step 8: 视觉基线重生成（背景图案变化）**

先解码比对确认差异仅背景图案（app-main 默认 gradient 变单团、appearance swatch 变构图），非字体/布局/组件；再：
Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: `app-main` + `appearance-partition` 重生成；components/motion 零变化。

- [ ] **Step 9: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/app/app-main.css src/app/partitions.css tests/unit/backdrop.test.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分，B6-R2-1）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本，追加到 `docs/superpowers/sdd/progress-b6-r2.md`）。`playwright.config.worktree.js` 不得提交。

---

### Task B6-R2-2: 按钮精致浅色半透明材质

**Files:**
- Modify: `src/components/button/button.css`（primary/danger 改浅色 tint + 描边 + 上浮 hover）
- Modify: `tests/e2e/components-basic.spec.js`（更新 B6-3 按钮断言为新材质语义）
- Modify: `tests/e2e/visual-regression.spec.js`（SHOTS 加 `buttons` 项，补按钮像素基线）
- Test: `tests/e2e/visual-regression.spec.js-snapshots`（新增 buttons 基线）

**Interfaces:**
- Consumes: `--accent-100`/`--accent-200`/`--accent-500`/`--accent-600`、`--danger-50`/`--danger-500`/`--danger-600`、`--shadow-sm`/`--shadow-md`（themes.css 已有）
- Produces: `.c-btn--primary`/`.c-btn--danger` 浅色材质三态 —— 独立交付

- [ ] **Step 1: 更新失败 e2e**（components-basic.spec.js，把「B6-3 按钮 primary 实色扁平」用例更新为新材质语义）

```js
test('B6-R2-2：按钮 primary 浅色材质（accent-100 底 + accent-600 字 + 描边 + 上浮 hover）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const comp = page.locator('.app-main__settings [data-page="components"]');
  const btn = comp.locator('.c-btn--primary').first();
  await expect(btn).toBeVisible();
  // 归一化任意 CSS 色为 [r,g,b]（hex 或 rgb()）
  const toRGB = (color) => {
    const c = color.trim();
    if (c.startsWith('#')) {
      const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    return m ? m[1].split(',').slice(0, 3).map(Number) : null;
  };
  const token = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  // 底 = --accent-100（浅 tint，非旧 var(--accent) 纯色）
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--accent-100')));
  // 字 = --accent-600
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).color)))
    .toEqual(toRGB(await token('--accent-600')));
  // 描边存在
  expect(await btn.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px');
  // hover：上浮 translateY(-1px) + 阴影加深（--shadow-md blur 16px）+ 底色 accent-200
  await btn.hover();
  await expect(btn).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, -1\)/);
  expect(await btn.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('16px');
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--accent-200')));
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-R2-2"`
Expected: FAIL（旧实现底为 `var(--accent)` 非 accent-100、无描边、hover 无上浮）

- [ ] **Step 3: 实现 button.css**（primary + danger 重写）

```css
.c-btn--primary {
  background: var(--accent-100);
  color: var(--accent-600);
  border: 1px solid color-mix(in srgb, var(--accent-500) 45%, transparent);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--primary:hover {
  transform: translateY(-1px);
  background: var(--accent-200);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--primary:active {
  transform: translateY(0) scale(0.97);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--danger {
  background: var(--danger-50);
  color: var(--danger-600);
  border: 1px solid color-mix(in srgb, var(--danger-500) 45%, transparent);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--danger:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--danger-50) 75%, var(--danger-500));
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.c-btn--danger:active {
  transform: translateY(0) scale(0.97);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

> 删除旧的 `:root[data-theme]` color-mix 明暗 hover 规则（B6-3，已被上浮+加深取代）。`.c-btn` 基类 transition 已有 transform/background/box-shadow（hover 过渡生效）。全局 `box-sizing: border-box` → 加 1px 描边不改 32px 高度。`secondary`/`ghost` 不动。

- [ ] **Step 4: e2e 红→绿 + 清理旧断言**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-R2-2"` → 绿；检查该文件其余按钮断言（B5-3「主按钮 hover」等）无引用已删的 color-mix 明暗语义，需同步则按新材质语义改。再跑 components-basic 全文件零回归 + `grep -rn "accent-300\|color-mix" tests/e2e/components-basic.spec.js` 确认无残留旧断言。

- [ ] **Step 5: 补按钮像素基线（修复 B6 最终评审 Important-1 跟进项）**

`tests/e2e/visual-regression.spec.js` 的 `SHOTS` 数组加一项（components 分区下滚到按钮 showcase 截图）：
```js
const SHOTS = [
  ['app-main', '.app-main', null],
  ['appearance-partition', '.app-main__settings [data-page="appearance"]', 1],
  ['components-partition', '.app-main__settings [data-page="components"]', 8],
  ['motion-partition', '.app-main__settings [data-page="motion"]', 9],
  ['buttons', '.app-main__settings [data-page="components"] .showcase:has-text("按钮")', 8],
];
```
Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 新增 6 张 `buttons-*` 基线（light/dark × indigo/amber/emerald）；既有 24 张零变化（按钮矩阵在 fold 下，components-partition 截图不含）。

- [ ] **Step 6: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/components/button/button.css tests/e2e/components-basic.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 按钮精致浅色材质（accent-100 浅 tint + 描边 + 上浮 hover，补按钮像素基线，B6-R2-2）"
```

> 提交惯例：feat + docs 两枚提交。

---

### Task B6-R2-3: 导航轮 resize 后选中修复

**Files:**
- Modify: `src/components/navigation-wheel/nav-wheel.js`（ResizeObserver 重算几何 + destroy()）
- Modify: `src/app/app-main.js`（右窗 renderRight 重挂前 destroy 旧轮）
- Modify: `tests/e2e/app-shell.spec.js`（新增 resize 回归用例）

**Interfaces:**
- Consumes: 既有 nav-wheel-geometry.js 纯函数（anchorY/scrollTopForAnchor/findNearestIndex/focalScale/focalOpacity）——不动
- Produces: `mountNavWheel` 返回值新增 `destroy()`；容器尺寸变化自动重算 pad/CONTENT_TOP —— 独立交付

- [ ] **Step 1: 写失败 e2e**（tests/e2e/app-shell.spec.js 追加）

```js
test('B6-R2-3：resize 后导航顶/底项可正常选中（手机加载→拉宽，无跳变）', async ({ page }) => {
  // 手机形态加载 → 左窗 display:none → mount 时 clientHeight=0 → pad=0（bug 前置）
  await page.setViewportSize({ width: 700, height: 800 });
  await page.goto('/?mode=app');
  // 拉宽到较矮桌面窗口（左窗内容 442px > 视口，可滚动，pad 陈旧时锚线断裂）
  await page.setViewportSize({ width: 1440, height: 400 });
  const L = '.app-main__nav-l .c-navwheel__list';
  await expect(page.locator(L).first()).toBeVisible();
  await page.waitForTimeout(300);
  // 底部项 → 应选中 6（修复前 snapNow 跳到 3-4）
  await page.locator(`${L} .c-navwheel__item`).nth(6).click();
  await expect(page.locator(`${L} .c-navwheel__item--active`)).toHaveAttribute('data-index', '6');
  // 顶部项 → 应选中 0（修复前从滚动位置跳回时 snapNow 跳到 1-2）
  await page.locator(`${L} .c-navwheel__item`).nth(0).click();
  await expect(page.locator(`${L} .c-navwheel__item--active`)).toHaveAttribute('data-index', '0');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-3"`
Expected: FAIL（修复前点击底项 active 变 3/4、顶项变 1/2 —— 已实测复现）

- [ ] **Step 3: 实现 nav-wheel.js**（替换 46-52 行：原 pad 计算 + `const CONTENT_TOP` + `let active` 整块替换为 recomputeGeometry + ResizeObserver；`CONTENT_TOP` 改 `let`）

```js
let CONTENT_TOP = itemEls[0][AXIS.offset];
let active = 0, raf = 0;

// B6-R2-3：容器尺寸变化（窗口 resize / 手机↔桌面 900px 跨越 / 任意尺寸变化）后
// 几何 padding 与 CONTENT_TOP 必须重算 —— 否则首/末项锚线失准，选中跳到相邻项。
// 根因：原实现只在 mount 算一次 pad；≤900px 手机形态加载时左窗 display:none →
// clientHeight=0 → pad=0，拉宽后 pad 陈旧 → 锚线数学断裂。
// ResizeObserver 观察 list（position:absolute; inset 铺满容器 → clientHeight=容器高；
// 改 padding 不改变自身 clientHeight，无观测循环；display:none→可见亦触发）。
function recomputeGeometry() {
  const vlen = viewLen();
  const pt = Math.max(0, vlen * anchorRatio - itemH / 2 - marginTop);
  const pb = Math.max(0, vlen * (1 - anchorRatio) - itemH / 2 - marginTop);
  list.style[AXIS.padBefore] = `${pt}px`;
  list.style[AXIS.padAfter] = `${pb}px`;
  CONTENT_TOP = itemEls[0][AXIS.offset];
  setFocal();
}
recomputeGeometry();
const ro = new ResizeObserver(recomputeGeometry);
ro.observe(list);
```

> 把原来的 `const padTop/padBottom` + 两行 style 赋值替换为 `recomputeGeometry()` 调用（重复计算由 RO 初始回调覆盖，幂等）。`setFocal` 为函数声明（提升），调用安全。**不在 resize 时主动重对齐滚动**（避免触发 snapNow 误改选中；下次交互自然纠正）。

返回对象加 `destroy`（断开 RO，防右窗重挂泄漏）：
```js
return {
  setActive: (id) => { /* 原逻辑 */ },
  scrollToIndex: (i) => select(Math.max(0, Math.min(items.length - 1, i))),
  destroy: () => ro.disconnect(),
};
```

- [ ] **Step 4: 实现 app-main.js 右窗重挂前 destroy**（renderRight 记持有轮）

在 `let dockMounted = false;` 附近加 `let rightWheel = null;`，renderRight 开头与替换 innerHTML 前销毁旧轮：
```js
function renderRight() {
  rightWheel?.destroy(); // 重挂前释放旧 ResizeObserver（防多次重挂泄漏）
  rightWheel = null;
  if (state.rightMode === 'settings') {
    navRBody.innerHTML = `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`;
    const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
      items: APP_SECTIONS.map((s) => ({ id: s.id, name: s.name, icon: s.icon })),
      onChange: (item) => setSettingsSection(item.id),
      anchorRatio: 0.382,
    });
    wheel.setActive(state.settingsId);
    rightWheel = wheel;
    return wheel;
  }
  const mod = MODULES.find((m) => m.id === state.moduleId);
  navRBody.innerHTML = mod.dir.length
    ? `<nav class="app-main__nav-r-wheel c-navwheel__list"></nav>`
    : `<div class="app-main__nav-r-empty">${icon('box', 18)}<span>无子目录</span></div>`;
  if (!mod.dir.length) return null;
  const wheel = mountNavWheel(navRBody.querySelector('.c-navwheel__list'), {
    items: mod.dir.map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
    onChange: (item) => setDir(item.id),
    anchorRatio: 0.382,
  });
  wheel.setActive(state.dirId);
  rightWheel = wheel;
  return wheel;
}
```

- [ ] **Step 5: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-3"` → 绿；再跑 app-shell 全文件零回归（既有导航/右键切换用例应仍绿）。

- [ ] **Step 6: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`（视觉基线零变化，不 update-snapshots）

```bash
git add src/components/navigation-wheel/nav-wheel.js src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "fix: 导航轮 resize 后顶/底项选中修复（ResizeObserver 重算几何 padding，B6-R2-3）"
```

> 提交惯例：feat/fix + docs 两枚提交。

---

## 执行交接指引（给实施会话）

1. **起点**：main（含 R2 规格）检出 `feature/b6-r2-page-style-refresh`，共享 checkout 执行；任务标题 `Task B6-R2-N`（task-brief 脚本只匹配 `Task <数字>`，手动写 brief 放 `docs/superpowers/sdd/task-B6-R2-N-brief.md`）。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报 → 派发（R2-1/2/3 均为 CSS/JS 集成，用 sonnet）→ 报告 → 审查包 → 评审 → 修复循环 → 账本 `docs/superpowers/sdd/progress-b6-r2.md` 留痕。
3. **铁律**：任务间禁止并行派发实施子代理；控制器不改码；每任务独立评审；测试仅 Web 环境；每任务结束全量回归绿（e2e 用 worktree 配置）。
4. **已知注意**：
   - R2-1 渐变用 `%` 定位 → 无需 background-size；swatch 的 repeating 周期须缩到 mini（14px/10px），否则 48px 盒内看不出纹理。
   - R2-2 删除 B6-3 的 `:root[data-theme]` color-mix hover 规则；e2e 断言用 toRGB 归一化（Chromium 151 序列化格式差异）；`--accent-100` 为不透明浅 tint（观感似半透明，与 nav 选中一致）。
   - R2-3 ResizeObserver 回调在初次 observe 与每次尺寸变化都触发（幂等）；**勿在 recomputeGeometry 内主动改 scrollTop**（防触发 snapNow 误改选中）；右窗 renderRight 重挂必须 destroy 旧轮防泄漏。
   - e2e 字体等待已含 500 档；视觉基线截图前确保生效。
5. **完成后**：全量回归 + 最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归；桌面真机由用户目检（① 8 背景预设可见且互不相同、渐变/极光区分 ② 按钮浅色柔和有层次、hover 上浮自然 ③ 拉宽/拉高窗口后导航顶/底项可正常选中）。
