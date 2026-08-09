# Task B6-R2-1: 背景装饰大色块构图（8 预设可见且互不相同）

> 源：docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh-r2.md（Task B6-R2-1）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md（§4 背景装饰，唯一需求源）

## 任务目标

B6 背景 8 预设的细线图案（网格/圆点/斜线/波纹）被玻璃（blur 20-28 + 0.62-0.72 不透明）磨没，且渐变/极光高度相似。本任务把全部非 none 预设改为**大色块构图**：每预设为大尺寸渐变构图（blob/band ≥ 容器 15-25%，alpha 40-55%），经玻璃后可见约 25-40%（明显不刺眼）。8 预设靠**结构**区分（单团/单斜带/交叉带/散斑/平行斜带/横带/多色团），非颜色。预览卡 swatch 同步改 mini 大构图。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，本地不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- e2e 截图前必须等待字体加载完成（`document.fonts.load` 三档，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active。
- 配置链路：界面参数修改必须经 defaults → store → apply。**背景预设为会话内纯 UI 态（`data-backdrop` 直接设），不进 store**。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动；12 套强调色/语义色色板不动（只消费既有 `--accent-300/400`、`--neutral-400`）。
- 提交前 `npm run build`；任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。
- 已知环境怪癖：Vitest 会重写测试内 `import.meta.url` 字面量，经它定位文件路径属环境怪癖，勿判为缺陷。

## Files

- Modify: `src/app/app-main.css`（8 预设 `--backdrop-bg` 全部改大尺寸渐变构图，删旧 background-size 规则）
- Modify: `src/app/partitions.css`（8 swatch mini 图案同步改大构图）
- Modify: `tests/unit/backdrop.test.js`（断言更新：可见 wash + gradient/aurora 区分）
- Modify: `tests/e2e/app-shell.spec.js`（B6-1 用例保留 + 新增「8 预设均可见」断言）
- Test: `tests/e2e/visual-regression.spec.js-snapshots`（app-main + appearance-partition 重生成）

## Interfaces

- Consumes: 既有 `data-backdrop` + `--backdrop-bg` 机制（app-main.js BD_LABELS 8 键不变，app-main.css 预设块替换）
- Produces: `--backdrop-bg` 每预设为「大色块/色带多层渐变」；预览卡 swatch 同步大构图 —— B6-R2-2/3 不依赖

---

## 实施步骤（TDD）

### Step 1: 更新失败单测（tests/unit/backdrop.test.js 全文件替换）

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

### Step 2: 运行确认红

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: FAIL（grid 块含 `24px` / gradient 块含 `--neutral-400` 或结构不符）

### Step 3: 实现 app-main.css 新预设（替换既有 8 预设块，约 35-67 行；删 grid/dots 的 background-size 规则）

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

### Step 4: 单测确认绿

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: PASS

### Step 5: 同步预览卡 swatch 大构图（partitions.css，替换 53-75 行 swatch 图案块）

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

### Step 6: e2e 新增「8 预设均可见」断言（tests/e2e/app-shell.spec.js，在既有 B6-1 用例后追加）

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

### Step 7: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-1"` → 绿；再跑 app-shell 全文件零回归（既有 B6-1/B2-2 用例应仍绿）。

### Step 8: 视觉基线重生成（背景图案变化）

先解码比对确认差异仅背景图案（app-main 默认 gradient 变单团、appearance swatch 变构图），非字体/布局/组件；再：
Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: `app-main` + `appearance-partition` 重生成；components/motion 零变化。

### Step 9: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/app/app-main.css src/app/partitions.css tests/unit/backdrop.test.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分，B6-R2-1）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本，追加到 `docs/superpowers/sdd/progress-b6-r2.md`）。`playwright.config.worktree.js` 不得提交。
