# Task B5-3: iOS 风格组件（徽标 / 按钮 / 悬浮球）

> 计划书章节：`docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md` 的 Task B5-3（本文件为提取全文，作为唯一实施需求）。规格：`docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md` §5。

## 绑定本任务的全局约束（必须遵守）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。三组件 hover/active 只动 transform/box-shadow/background（background/border-color/box-shadow/color 为 paint-only 豁免，仅限 hover/focus/active 短暂状态切换）。
- 配置链路：本任务不涉及界面参数新增（纯组件 CSS 视觉改，不动 defaults/store/apply）。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **材质体系不动**（themes.css 的 Windows 亚克力配方保持，不因 iOS 化而改）。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。共享 checkout 有陈旧 5173 server（PID 11964）serve 旧代码，勿用默认 `npm run test:e2e`。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（B5-1 已改显式 `document.fonts.load`，保留）。
- 提交前 `npm run build`；每任务结束全量回归绿（`npm test` + worktree e2e + build）。

## 前置接口（B5-1/2 已交付）

- `--font-sans` 含 `"Alibaba PuHuiTi"` 前缀（徽标/按钮文字继承）。
- `.c-slider` 胶囊组件（本任务不涉及）。

## Files

- Modify: `src/components/badge/badge.css`（浅 tint 底 + 细描边）
- Modify: `src/components/button/button.css`（primary 内高光 + 柔和彩影 / secondary 玻璃底）
- Modify: `src/components/float-ball/float-ball.css`（玻璃悬浮球，去渐变浓底）
- Test: `tests/e2e/components-basic.spec.js`（加 iOS 风格样式断言）

## Interfaces

- Consumes: Task B5-1 的 `--font-sans`（徽标文字继承）；既有 `--glass-*`/`--accent-*`/`--surface-*` 令牌
- Produces: `.c-badge`（tint 底）/ `.c-btn`（层次）/ `.c-float-ball`（玻璃）iOS 观感 —— 独立交付，无下游依赖

## 实现步骤

### Step 1: 写失败 e2e（tests/e2e/components-basic.spec.js 追加）

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

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "iOS 风格"`
Expected: FAIL（现有 badge 是实色 `--accent-100`、btn 无 inset shadow、float-ball 是渐变底无 backdrop-filter）

### Step 3: badge.css iOS 化

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

### Step 4: button.css iOS 化

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

### Step 5: float-ball.css iOS 化

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

### Step 6: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "iOS 风格"` → 红 → 绿；再跑 components-basic 全文件零回归（既有 `.c-btn` 计数断言 7/4/1/1/1 应不受视觉改影响——是存在性计数非样式）

### Step 7: 视觉基线重生成（三组件变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: components 分区 6 张（含按钮/徽标矩阵）+ app-main 2 张（含悬浮球）重生成；appearance/motion 零变化。**先解码比对**确认差异仅为组件视觉。

### Step 8: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/components/badge/badge.css src/components/button/button.css src/components/float-ball/float-ball.css tests/e2e/components-basic.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 徽标/按钮/悬浮球 iOS 化（tint 底 + 层次按钮 + 玻璃悬浮球，B5-3）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载本任务报告/账本）。`playwright.config.worktree.js` 不得提交。

> 桌面验证（用户目检）：徽标浅 tint、按钮层次感、悬浮球玻璃质感；深色主题下对比度不破。
