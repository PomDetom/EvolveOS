# Task B6-1: 背景装饰多样化（强化网格 + 新增 4 预设 + 迷你预览卡）

> 源：docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md（Task B6-1）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md（§3 背景装饰多样化，唯一需求源）

## 任务目标

① 强化「网格」预设（更粗更密 + 交点圆点 + 更高 accent 浓度）② 新增 4 预设（dots 圆点 / diagonal 斜线 / waves 波纹 / aurora 极光）→ 共 8 预设 ③ 外观分区背景选择器从 4 文字胶囊 → 8 迷你图案预览卡。全部纯 CSS + 少量 DOM，沿用既有 `data-backdrop` + `--backdrop-bg` 多背景层机制。零运行时依赖、零架构改动。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，文件已在仓库根，不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（显式 `document.fonts.load`，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active（预览卡激活态描边用 paint-only 过渡）。
- 配置链路：界面参数修改必须经 defaults → store → apply。**背景预设为会话内纯 UI 态（`data-backdrop` 直接设），不进 store（B2 决策延续）**。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动。
- 提交前 `npm run build`；每任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。

## Files

- Modify: `src/app/app-main.css`（`data-backdrop` 各预设 `--backdrop-bg` + 对应 `.app-main__backdrop` background-size）
- Modify: `src/app/app-main.js`（BD_LABELS 扩至 8 预设 + 背景选择器改迷你预览卡渲染）
- Modify: `src/app/partitions.css`（预览卡样式 `.app-main__backdrop-card*`）
- Modify: `tests/e2e/app-shell.spec.js`（背景预设切换断言）
- Test: `tests/unit/backdrop.test.js`（新建，BD_LABELS 8 预设键 + preview 卡 HTML 守卫）

## Interfaces

- Consumes: 既有 `data-backdrop` 机制（app-main.js BD_LABELS + app-main.css `--backdrop-bg`）
- Produces: `data-backdrop` 支持 `gradient/geo/grid/dots/diagonal/waves/aurora/none` 8 值；外观分区 8 迷你预览卡 —— B6-2/3 不依赖

## 已知注意（交接沉淀）

- 背景预设视觉是「衬底更鲜明但克制」的平衡——若某预设过浓/过淡，微调浓度/间距并解码比对（勿大改玻璃材质）。
- 预览卡 swatch 是 mini 图案（独立于 `--backdrop-bg`），注意 background-size 对齐。
- Chromium 151 起 `getComputedStyle` 对 `::-webkit-slider-*` 伪元素样式反射失效（与 B6-1 无关但若断言涉伪元素须像素验证）；`filter({hasText})` 只匹配可见文本（预览卡 label 是可见文本，可用）。
- Vitest 会重写测试内 `import.meta.url` 字面量：经它定位文件路径属环境怪癖，评审勿判为缺陷。

---

## 实施步骤（TDD）

### Step 1: 写失败单测（tests/unit/backdrop.test.js，新建）

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

### Step 2: 运行确认红

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: FAIL（`[data-backdrop="dots"]` 等不存在）

### Step 3: 实现 app-main.css 新预设 + 强化网格

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

### Step 4: 单测确认绿

Run: `npx vitest run tests/unit/backdrop.test.js`
Expected: PASS

### Step 5: 扩展背景选择器 UI 为 8 迷你预览卡（app-main.js + partitions.css）

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

### Step 6: e2e 断言（tests/e2e/app-shell.spec.js 追加）

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

### Step 7: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-1"` → 红 → 绿；再跑 app-shell 全文件零回归

### Step 8: 视觉基线重生成（背景图案变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: app-main 分区（含背景）重生成；其他分区零变化或按实测。**先解码比对**确认差异仅为背景图案（网格/新预设），非字体/布局/组件。

### Step 9: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/app/app-main.css src/app/app-main.js src/app/partitions.css tests/unit/backdrop.test.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 背景装饰多样式（网格强化 + 圆点/斜线/波纹/极光 + 8 预览卡，B6-1）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本）。`playwright.config.worktree.js` 不得提交。
