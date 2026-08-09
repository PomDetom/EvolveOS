# 应用壳 B6 页面样式刷新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ① 背景装饰多样化（强化网格 + 新增 4 预设 + 迷你预览卡 UI）② 悬浮球去光晕保上浮 ③ 按钮扁平实心（去渐变彩影 + theme-aware hover）。

**Architecture:** 全部纯 CSS + 少量 DOM——背景沿用既有 `data-backdrop` + `--backdrop-bg` 多背景层机制扩展预设；浮球删光晕元素改中性投影；按钮 primary 实色 + `color-mix` theme-aware hover。零运行时依赖、零架构改动、零新增令牌以外的配置链路改动。

**Tech Stack:** Vite + 原生 CSS + Vitest + Playwright（现有）。

**规格:** docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md（唯一需求源）

## Global Constraints

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；桌面观感由用户目检。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。共享 checkout 若残留陈旧 5173 server（serve 旧代码），须规避。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（显式 `document.fonts.load`，B5-1/F1 模式：`'14px "Alibaba PuHuiTi"'` + `'500 14px ...'` + `'700 14px ...'`，已在 visual-regression.spec.js 的 Promise.all）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。背景预设为会话内纯 UI 态（`data-backdrop` 直接设），不进 store（B2 决策延续）。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动。
- 提交前 `npm run build`；每任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**（B5 确立，已入 CLAUDE.md）。

---

### Task B6-1: 背景装饰多样化（强化网格 + 新增 4 预设 + 迷你预览卡）

**Files:**
- Modify: `src/app/app-main.css`（`data-backdrop` 各预设 `--backdrop-bg` + 对应 `.app-main__backdrop` background-size）
- Modify: `src/app/app-main.js`（BD_LABELS 扩至 8 预设 + 背景选择器改迷你预览卡渲染）
- Modify: `src/app/partitions.css`（预览卡样式 `.app-main__backdrop-card*`）
- Modify: `tests/e2e/app-shell.spec.js`（背景预设切换断言）
- Test: `tests/unit/backdrop.test.js`（新建，BD_LABELS 8 预设键 + preview 卡 HTML 守卫）

**Interfaces:**
- Consumes: 既有 `data-backdrop` 机制（app-main.js BD_LABELS + app-main.css `--backdrop-bg`）
- Produces: `data-backdrop` 支持 `gradient/geo/grid/dots/diagonal/waves/aurora/none` 8 值；外观分区 8 迷你预览卡 —— B6-2/3 不依赖

- [ ] **Step 1: 写失败单测**（tests/unit/backdrop.test.js，新建）

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('背景装饰预设（B6-1：网格强化 + 多样式）', () => {
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('app-main.css 定义 8 个 data-backdrop 预设', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none']
      .forEach((bd) => expect(css).toContain(`[data-backdrop="${bd}"]`));
  });

  it('网格预设强化（2px 线 + 交点圆点 + 24px 格距）', () => {
    const css = readFileSync(base('app/app-main.css'), 'utf8');
    expect(css).toContain('24px 24px'); // 格距 24px
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: FAIL（`[data-backdrop="dots"]` 等不存在）

- [ ] **Step 3: 实现 app-main.css 新预设 + 强化网格**

在既有 `data-backdrop` 预设块（约 32-49 行）之后追加，并按下列替换 grid：

```css
/* B6-1：网格强化（2px 线 + 24px 格距 + 交点圆点 40% accent）+ 新增 4 预设（dots/diagonal/waves/aurora） */
.app-main[data-backdrop="grid"] { --backdrop-bg:
  radial-gradient(circle at 12px 12px, color-mix(in srgb, var(--accent-300) 50%, transparent) 1.5px, transparent 2px),
  linear-gradient(color-mix(in srgb, var(--accent-300) 40%, transparent) 2px, transparent 2px),
  linear-gradient(90deg, color-mix(in srgb, var(--accent-300) 40%, transparent) 2px, transparent 2px),
  var(--surface-solid); }
.app-main[data-backdrop="grid"] .app-main__backdrop { background-size: 24px 24px, 24px 24px, 24px 24px; }
.app-main[data-backdrop="dots"] { --backdrop-bg:
  radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent-300) 45%, transparent) 0 2px, transparent 2.5px),
  var(--surface-solid); }
.app-main[data-backdrop="dots"] .app-main__backdrop { background-size: 24px 24px; }
.app-main[data-backdrop="diagonal"] { --backdrop-bg:
  repeating-linear-gradient(45deg, color-mix(in srgb, var(--accent-300) 22%, transparent) 0 1px, transparent 1px 12px),
  var(--surface-solid); }
.app-main[data-backdrop="waves"] { --backdrop-bg:
  repeating-linear-gradient(180deg, color-mix(in srgb, var(--accent-300) 30%, transparent) 0 1px, transparent 1px 14px),
  repeating-linear-gradient(180deg, transparent 0 7px, color-mix(in srgb, var(--accent-300) 18%, transparent) 7px 8px),
  var(--surface-solid); }
.app-main[data-backdrop="aurora"] { --backdrop-bg:
  radial-gradient(100% 100% at 15% 20%, color-mix(in srgb, var(--accent-300) 45%, transparent) 0%, transparent 60%),
  radial-gradient(100% 100% at 85% 75%, color-mix(in srgb, var(--accent-400) 35%, transparent) 0%, transparent 55%),
  radial-gradient(80% 80% at 60% 40%, color-mix(in srgb, var(--neutral-400) 18%, transparent) 0%, transparent 50%),
  var(--surface-solid); }
```

> 若某预设叠加后观感不符「衬底更鲜明但克制」，实施者按规格方向微调（浓度/间距），记入报告。

- [ ] **Step 4: 单测确认绿**

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: PASS

- [ ] **Step 5: 扩展背景选择器 UI 为 8 迷你预览卡**（app-main.js + partitions.css）

`app-main.js` 的 `BD_LABELS` 扩至 8 键（顺序：gradient 渐变 / geo 几何 / grid 网格 / dots 圆点 / diagonal 斜线 / waves 波纹 / aurora 极光 / none 关闭），背景选择器渲染改为迷你预览卡：

```html
<button type="button" class="app-main__backdrop-card${active ? ' app-main__backdrop-card--active' : ''}"
  data-bd="${bd}" aria-pressed="${active}" aria-label="${label}">
  <span class="app-main__backdrop-card-swatch" data-bd-swatch="${bd}"></span>
  <span class="app-main__backdrop-card-label">${label}</span>
</button>
```

`partitions.css` 加（局部类，沿用 `app-main__backdrop-*` 前缀）：
- `.app-main__backdrop-card`：竖向卡片（swatch 在上、label 在下），约 56×44
- `.app-main__backdrop-card-swatch`：方形背景直接铺对应预设图案（每预设一个规则，如 `[data-bd-swatch="grid"] { background: <grid 同款多层 gradient> }`，可用简化版图案）；`background-size` 对应 24px 网格
- 激活态：accent 描边 + 背景 tint（paint-only 过渡）
- 移除旧 `.app-main__backdrop-opt` 胶囊样式（或保留无害，按实际清理）

> 注意：预览卡 swatch 背景是「该预设的 mini 图案」，与 `.app-main__backdrop` 的 `--backdrop-bg` 独立（swatch 用内联简化图案或独立规则）。激活切换仍走 `data-backdrop`（与现有逻辑一致）。

- [ ] **Step 6: e2e 断言**（tests/e2e/app-shell.spec.js 追加）

```js
test('B6-1：背景装饰 8 预设 + 切换生效', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const cards = page.locator('.app-main__backdrop-card');
  await expect(cards).toHaveCount(8);
  // 切到 dots → data-backdrop 生效 + 激活态切换
  await cards.filter({ hasText: '圆点' }).click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'dots');
  await expect(page.locator('.app-main__backdrop-card[data-bd="dots"]')).toHaveAttribute('aria-pressed', 'true');
  // 切回 grid → 生效
  await cards.filter({ hasText: '网格' }).click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'grid');
});
```

- [ ] **Step 7: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-1"` → 红 → 绿；再跑 app-shell 全文件零回归

- [ ] **Step 8: 视觉基线重生成（背景图案变化）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: app-main 分区（含背景）重生成；其他分区零变化或按实测。**先解码比对**确认差异仅为背景图案（网格/新预设），非字体/布局/组件。

- [ ] **Step 9: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/app/app-main.css src/app/app-main.js src/app/partitions.css tests/unit/backdrop.test.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 背景装饰多样式（网格强化 + 圆点/斜线/波纹/极光 + 8 预览卡，B6-1）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本）。`playwright.config.worktree.js` 不得提交。

---

### Task B6-2: 悬浮球去光晕保上浮

**Files:**
- Modify: `src/components/float-ball/float-ball.css`（删 glow 规则 + hover 阴影改中性）
- Modify: `src/components/float-ball/float-ball.js`（若渲染 `.c-float-ball__glow` 则删）
- Modify: `tests/e2e/components-basic.spec.js`（补 hover 中性阴影断言）
- Test: 视觉基线按实测（静止态无变化则零改动）

**Interfaces:**
- Consumes: 既有 `--shadow-md` 令牌（themes.css，随 shadow-intensity 缩放）
- Produces: `.c-float-ball` hover = 上浮 + 中性投影，无 `.c-float-ball__glow` —— 独立交付

- [ ] **Step 1: 写失败 e2e**（tests/e2e/components-basic.spec.js 追加）

```js
test('B6-2：悬浮球 hover 中性投影（无彩色光晕 + 无 glow 元素）', async ({ page }) => {
  await page.goto('/?mode=app');
  const ball = page.locator('.app-main__float-ball .c-float-ball');
  await expect(ball.locator('.c-float-ball__glow')).toHaveCount(0); // glow 环已删
  await ball.hover();
  const shadow = await ball.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toContain('color('); // 非 color-mix 彩色阴影
  expect(shadow).toContain('rgb'); // 中性投影（--shadow-md 计算值）
});
```

> 注：`--shadow-md` 计算值在 Chromium 为 `rgb(...)` 中性色；若 hover 后 box-shadow 含 `color-mix` 残余即断言失败。

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-2"`
Expected: FAIL（glow 元素存在 / hover 阴影含 accent 彩）

- [ ] **Step 3: 实现 float-ball.css 去光晕**

`src/components/float-ball/float-ball.css` 删除 `.c-float-ball__glow` 全部规则（约 16-20 行），hover 阴影改中性：

```css
.c-float-ball:hover { transform: translateY(-2px);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
```

保留：静止态 `--glass-shadow` + 内高光、`translateY(-2px)`、backdrop-filter 玻璃底。

若 `float-ball.js` 模板渲染 `.c-float-ball__glow`，一并删除。

- [ ] **Step 4: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-2"` → 绿；再跑 components-basic 全文件零回归

- [ ] **Step 5: 视觉基线核验**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js` → 若静止态基线零变化（glow 静止 opacity 0、box-shadow 静止态未改），不 update-snapshots；若变化，先解码比对再 update。

- [ ] **Step 6: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/components/float-ball/float-ball.css src/components/float-ball/float-ball.js tests/e2e/components-basic.spec.js
git commit -m "feat: 悬浮球 hover 去光晕（中性投影，删 glow 元素，B6-2）"
```

---

### Task B6-3: 按钮扁平实心（primary 实色 + theme-aware hover + 删彩影令牌）

**Files:**
- Modify: `src/components/button/button.css`（primary 实色 + theme-aware hover / danger 协调）
- Modify: `src/styles/themes.css`（删 `--shadow-glow` / `--shadow-glow-hover` 令牌）
- Modify: `tests/e2e/components-basic.spec.js`（更新 B5-3 按钮 hover 断言）
- Test: 视觉基线 components/app-main 相关分区重生成（解码比对）

**Interfaces:**
- Consumes: `--accent` / `--accent-contrast` / `--shadow-sm`（themes.css，已有）
- Produces: `.c-btn--primary` 实色扁平；`--shadow-glow*` 令牌移除（B5-F1 引入，本次回收）—— 独立交付

- [ ] **Step 1: 写失败 e2e**（tests/e2e/components-basic.spec.js 更新既有按钮断言）

更新「B5-3：徽标/按钮/悬浮球 iOS 风格」中的按钮部分，追加/改为：

```js
test('B6-3：按钮 primary 实色扁平（无渐变无彩影 + theme-aware hover）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const comp = page.locator('.app-main__settings [data-page="components"]');
  const btn = comp.locator('.c-btn--primary').first();
  // 实色：background 为纯色（非 gradient）
  const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toBe('none'); // 无 linear-gradient
  // 中性投影：box-shadow 非 color-mix 彩色
  const shadow = await btn.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toContain('color(');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-3"`
Expected: FAIL（primary 仍有 gradient 背景 + 彩影）

- [ ] **Step 3: 实现 button.css + themes.css**

`button.css` primary 改实色（去渐变、去 `--shadow-glow`）：

```css
.c-btn--primary {
  background: var(--accent);
  color: var(--accent-contrast);
  box-shadow: var(--shadow-sm);
}
:root[data-theme="light"] .c-btn--primary:hover { background: color-mix(in srgb, var(--accent) 88%, black); }
:root[data-theme="dark"] .c-btn--primary:hover { background: color-mix(in srgb, var(--accent) 88%, white); }
.c-btn--primary:active { transform: scale(0.97); }
```

`danger` 同理（hover 实色明暗 theme-aware，去 `filter: brightness`）：

```css
:root[data-theme="light"] .c-btn--danger:hover { background: color-mix(in srgb, var(--danger-500) 88%, black); }
:root[data-theme="dark"] .c-btn--danger:hover { background: color-mix(in srgb, var(--danger-500) 88%, white); }
```

`themes.css` 删除 `--shadow-glow` / `--shadow-glow-hover` 定义（B5-F1 新增，约 147-148 行），并确认 button.css 无残留引用（grep）。

> `secondary` 玻璃底保留（B5-3），仅 hover 背景微调（可保持现状）。`ghost` 不变。`.c-btn` 基类 transition 中 `box-shadow`/`filter` 保留（中性投影过渡 + danger 若保留 filter 则兼容）。

- [ ] **Step 4: 更新既有按钮断言**（B5-3 的 hover 测试）

B5-3 遗留的「主按钮 hover 阴影 --shadow-md 令牌」测试（B5-3 已重写过一次）按新实色语义再同步：断言 hover 后 box-shadow 为中性（`--shadow-sm`/`--shadow-md` 计算值，非 color-mix 彩）。确保无残留引用 `--shadow-glow` 的断言。

- [ ] **Step 5: e2e 红→绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-3"` → 绿；再跑 components-basic 全文件零回归 + `grep -r "shadow-glow" src/` 应零命中（themes.css + button.css + 测试全清）

- [ ] **Step 6: 视觉基线重生成（按钮视觉变化）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: components 分区（含按钮矩阵）+ app-main 相关分区重生成（按钮在设置窗 fold 下则按实测，参考 B5-3 先例）。**先解码比对**确认差异仅为按钮视觉（渐变→实色 / 彩影→中性）。

- [ ] **Step 7: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/components/button/button.css src/styles/themes.css tests/e2e/components-basic.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌，B6-3）"
```

---

## 执行交接指引（给实施会话）

1. **起点**：main（a5edb0a + 本计划/规格）检出 `feature/b6-page-style-refresh`，在共享 checkout 执行；任务标题 `Task B6-N`（task-brief 脚本只匹配 `Task <数字>`，手动写 brief，放 `docs/superpowers/sdd/task-B6-N-brief.md`）。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报 → 派发（B6-1 集成 sonnet / B6-2 机械 haiku / B6-3 集成 sonnet）→ 报告 → 审查包 → 评审 → 修复循环 → 账本 `docs/superpowers/sdd/progress-b6.md` 留痕。
3. **铁律**：任务间禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审；测试仅 Web 环境；每任务结束全量回归绿（e2e 用 worktree 配置）。
4. **已知注意**：
   - 背景预设视觉是「衬底更鲜明但克制」的平衡——若某预设过浓/过淡，微调浓度/间距并解码比对（勿大改玻璃材质）。
   - 预览卡 swatch 是 mini 图案（独立于 `--backdrop-bg`），注意 background-size 对齐。
   - B6-2 静止态基线大概率零变化（glow 静止 opacity 0），先验证再决定是否 update-snapshots。
   - B6-3 删 `--shadow-glow` 令牌要 grep 全清（themes.css / button.css / 测试），避免残留引用。
   - e2e 字体等待已含 500 档（B5-F1），视觉基线截图前确保生效。
5. **完成后**：全量回归 + 最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归；桌面真机由用户目检（① 背景多样可感知 ② 浮球 hover 克制 ③ 按钮扁平实心好看）。
