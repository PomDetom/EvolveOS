# Task B6-3: 按钮扁平实心（primary 实色 + theme-aware hover + 删彩影令牌）

> 源：docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md（Task B6-3）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md（§5 按钮扁平实心，唯一需求源）

## 任务目标

按钮 primary 从「渐变底 + 顶部内高光 + `--shadow-glow` 彩影」改为「扁平实心」：`background: var(--accent)` 实色 + `color: var(--accent-contrast)` + 中性 `box-shadow: var(--shadow-sm)`；hover theme-aware 明暗（浅色主题混 black 暗一档、深色主题混 white 亮一档，经 `:root[data-theme]` 区分）；active `scale(0.97)` 下压；danger 同机制协调（hover 实色明暗 theme-aware，去 `filter: brightness`）；删 `--shadow-glow`/`--shadow-glow-hover` 令牌（B5-F1 引入，本次回收，grep 全清）。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，文件已在仓库根，不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（显式 `document.fonts.load`，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active（按钮 hover 背景变化属豁免）。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动。
- 提交前 `npm run build`；每任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。

## Files

- Modify: `src/components/button/button.css`（primary 实色 + theme-aware hover / danger 协调）
- Modify: `src/styles/themes.css`（删 `--shadow-glow` / `--shadow-glow-hover` 令牌）
- Modify: `tests/e2e/components-basic.spec.js`（更新 B5-3 按钮 hover 断言）
- Test: 视觉基线 components/app-main 相关分区重生成（解码比对）

## Interfaces

- Consumes: `--accent` / `--accent-contrast` / `--shadow-sm`（themes.css，已有）
- Produces: `.c-btn--primary` 实色扁平；`--shadow-glow*` 令牌移除（B5-F1 引入，本次回收）—— 独立交付

## 已知注意（交接沉淀）

- B6-3 删 `--shadow-glow` 令牌要 grep 全清（themes.css / button.css / 测试），避免残留引用。
- `secondary` 玻璃底保留（B5-3），仅 hover 背景微调（可保持现状）。`ghost` 不变。`.c-btn` 基类 transition 中 `box-shadow`/`filter` 保留（中性投影过渡 + danger 若保留 filter 则兼容）。
- 视觉基线：components 分区（含按钮矩阵）+ app-main 相关分区重生成（按钮在设置窗 fold 下则按实测，参考 B5-3 先例）。先解码比对确认差异仅为按钮视觉（渐变→实色 / 彩影→中性）。
- `--accent-300` 为纯 hex 非 color-mix（B6-2 已实证）；按钮旧彩影计算值为 `rgb(...)`，新断言须以 blur/尺寸特征值或色值判别中性。

---

## 实施步骤（TDD）

### Step 1: 写失败 e2e（tests/e2e/components-basic.spec.js 更新既有按钮断言）

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

### Step 2: 运行确认红

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-3"`
Expected: FAIL（primary 仍有 gradient 背景 + 彩影）

### Step 3: 实现 button.css + themes.css

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

### Step 4: 更新既有按钮断言（B5-3 的 hover 测试）

B5-3 遗留的「主按钮 hover 阴影 --shadow-md 令牌」测试（B5-3 已重写过一次）按新实色语义再同步：断言 hover 后 box-shadow 为中性（`--shadow-sm`/`--shadow-md` 计算值，非 color-mix 彩）。确保无残留引用 `--shadow-glow` 的断言。

### Step 5: e2e 红→绿

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-3"` → 绿；再跑 components-basic 全文件零回归 + `grep -r "shadow-glow" src/` 应零命中（themes.css + button.css + 测试全清）

### Step 6: 视觉基线重生成（按钮视觉变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: components 分区（含按钮矩阵）+ app-main 相关分区重生成（按钮在设置窗 fold 下则按实测，参考 B5-3 先例）。**先解码比对**确认差异仅为按钮视觉（渐变→实色 / 彩影→中性）。

### Step 7: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/components/button/button.css src/styles/themes.css tests/e2e/components-basic.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌，B6-3）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载报告/账本）。`playwright.config.worktree.js` 不得提交。
