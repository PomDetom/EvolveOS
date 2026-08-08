# Task B4F-5 简报 — strip 悬浮窗「恢复主窗」按钮（后台模式出路）

- **计划**：docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md（唯一实施需求源）
- **规格**：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源，§4.2 恢复主窗按钮）
- **Branch**：worktree-b4-close-sizing
- **任务定位**：B4 收尾修复第五个任务（最后一个）。`background` 模式（主窗隐藏、应用常驻）下，strip 悬浮窗靠「恢复主窗」按钮唤回主窗（`getAllWindows().find(label==='main') → show()+setFocus()`）。仅 Tauri 分支渲染，浏览器 strip 演示零冲击。

## 背景

B4F-3/4 已把主窗关闭行为做成可配置（`background` → 主窗隐藏、应用常驻）。本任务给 strip 悬浮窗加「恢复主窗」按钮作为后台模式出路。`renderFloatStrip` 支持可选 `showRestore` 选项，Tauri 分支渲染恢复按钮 + 接线。

## Files

- Modify: `src/components/float-strip/float-strip.js`（`renderFloatStrip` 加 `showRestore` 选项 → 控制条最前渲染恢复主窗按钮）
- Modify: `src/app/strip-main.js`（Tauri 分支渲染 `showRestore: true` + 接线恢复按钮 → main show+setFocus）
- Test: `tests/e2e/floatstrip.spec.js`（新用例）

## Interfaces

- Consumes: Task B4F-2 的 `closeBehavior: 'background'`（后台模式下用户靠此按钮唤回主窗）；`getAllWindows()`（既有）
- Produces: `.c-strip__restore` 按钮（`showRestore` 为真才渲染，浏览器演示零冲击）—— 独立交付

## Step 1: 写失败 e2e（floatstrip.spec.js 追加）

```js
test('strip 窗口：恢复主窗按钮 → main show+setFocus', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    window.__TAURI__ = { window: {
      LogicalSize: class { constructor(width, height) { this.width = width; this.height = height; } },
      getCurrentWindow: () => ({
        setSize: () => Promise.resolve(), setPosition: () => Promise.resolve(),
        onMoved: () => Promise.resolve(() => {}), hide: () => Promise.resolve(),
      }),
      getAllWindows: () => Promise.resolve([{
        label: 'main',
        show: () => { calls.push('main.show'); return Promise.resolve(); },
        setFocus: () => { calls.push('main.setFocus'); return Promise.resolve(); },
      }]),
    } };
    window.__restoreCalls__ = calls;
  });
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip__restore')).toBeVisible();
  await page.locator('.c-strip').hover();
  await page.waitForTimeout(300);
  await page.locator('.c-strip__restore').click();
  const calls = await page.evaluate(() => window.__restoreCalls__);
  expect(calls).toContain('main.show');
  expect(calls).toContain('main.setFocus');
});
```

> **⚠️ 控制器裁定（用户批准，必须包含）**：mock 的 `window.__TAURI__.window` 必须加 `LogicalSize` 类（B4F-1 起 `fit()` 用 `const { LogicalSize } = window.__TAURI__.window` + `new LogicalSize(...)`，`?mode=strip` Tauri 分支挂载即调 `fit()`）——计划原文 mock 缺 LogicalSize 会 `new undefined(...)` TypeError。此为该 mock 的必补项。

## Step 2: 运行确认红

`npx playwright test --config=playwright.config.worktree.js tests/e2e/floatstrip.spec.js -g "恢复主窗"`
Expected: FAIL（`.c-strip__restore` 不存在）

## Step 3: renderFloatStrip 加 showRestore 选项

`renderFloatStrip`（float-strip.js）签名改 `{ content = '', showRestore = false }`，控制条 ctrl 内（rotate 按钮前）加：

```js
      ${showRestore ? `<button class="c-strip__restore" type="button" title="恢复主窗" aria-label="恢复主窗">${icon('layout', 14)}</button>` : ''}
```

## Step 4: strip-main.js 渲染 + 接线

`mountStripMode` 改为先探测 win 再渲染（Tauri 分支传 `showRestore: true`）：

```js
export function mountStripMode() {
  applyConfig(getConfig()); // 独立 strip 窗口跟随保存的主题/强调色（Fix 3）
  const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: renderTokenMonitor({
      value: '97.2%',
      status: 'ok',
      trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
    }),
    showRestore: !!win, // 仅 Tauri 独立窗口渲染「恢复主窗」按钮
  });
  document.body.appendChild(root);
  // ...既有 win 探测分支不变（root/win 已提前）；恢复按钮接线：
  const restoreBtn = root.querySelector('.c-strip__restore');
  restoreBtn?.addEventListener('click', () => {
    window.__TAURI__.window.getAllWindows()
      .then((wins) => {
        const main = wins.find((w) => w.label === 'main');
        if (main) { main.show().catch(() => {}); main.setFocus().catch(() => {}); }
      })
      .catch(() => {});
  });
```

> 注：`const win = ...` 提前到渲染前（原在渲染后），`if (win)` 分支逻辑不变（位置恢复/fit/onShow/onMoved/mountFloatStrip 全保留）；浏览器 `?mode=strip`（无 `__TAURI__`）`win` 为 null → `showRestore:false` → 无恢复按钮，既有 floatstrip 浏览器用例零冲击。当前 strip-main.js 中 win 探测在 render 后（`document.body.appendChild(root); const win = ...`）——把 `const win` 提到 `applyConfig` 之后、render 之前即可，其余不动。

## Step 5: e2e 红→绿

`npx playwright test --config=playwright.config.worktree.js tests/e2e/floatstrip.spec.js -g "恢复主窗"` → 绿；再跑全文件零回归

## Step 6: 全量回归 + 提交

Run: `npm test` + `npx playwright test --config=playwright.config.worktree.js` + `npm run build`
Expected: 全绿（视觉 24 零漂移——浏览器路径无恢复按钮）

```bash
git add src/components/float-strip/float-strip.js src/app/strip-main.js tests/e2e/floatstrip.spec.js
git commit -m "feat: strip 悬浮窗恢复主窗按钮（后台模式下唤回主窗，B4 收尾）"
```

> 桌面验证（用户目检）：`background` 模式点主窗关闭 → 主窗隐藏、strip 常驻 → 点 strip 恢复按钮 → 主窗 show+setFocus。

## 全局约束（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线、配置链路、零运行时依赖、禁止升级核心依赖。
- 视觉基线零漂移（浏览器路径无恢复按钮；若漂移先解码比对再 update-snapshots）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交；提交前 `git status`/`git diff --stat` 核对。
- **e2e 用 workaround 配置**（本会话环境告警：共享 checkout 陈旧 5173 server 会污染默认 `npm run test:e2e`）——`npx playwright test --config=playwright.config.worktree.js`。
