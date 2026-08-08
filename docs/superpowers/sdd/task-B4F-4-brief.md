# Task B4F-4 简报 — JS 同步与清理（移除脆弱 onCloseRequested handler + set_close_behavior 同步）

- **计划**：docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md（唯一实施需求源）
- **规格**：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源，§4.2/§5）
- **Branch**：worktree-b4-close-sizing
- **任务定位**：B4 收尾修复第四个任务。移除 app-main.js 的 JS `onCloseRequested` 关 strip handler（主窗关不掉 bug 根源）+ 加 `syncCloseBehavior` 在挂载/配置变更时经 `core.invoke('set_close_behavior')` 同步 Rust（B4F-3 已就绪，顺序已保证）。更新 strip e2e 断言。

## 背景

B4F-3 已把主窗关闭逻辑移到 Rust `on_window_event`。本任务清理 JS 侧：
- 删除 `app-main.js` `mountAppMode` 末尾的 JS `onCloseRequested` handler（约 740 行处，`if (typeof window.__TAURI__ !== 'undefined')` 块内，异步 `getAllWindows→strip.close()`）—— 这是「主窗关不掉」的根源。
- 加 `syncCloseBehavior(cfg)`：Tauri 环境 `window.__TAURI__.core?.invoke?.('set_close_behavior', { behavior: cfg.closeBehavior ?? 'exit' })`；挂载时调一次 + `subscribe` 每次配置变更调一次。浏览器环境 no-op。

## Files

- Modify: `src/app/app-main.js`（移除 JS onCloseRequested handler；加 syncCloseBehavior 并在挂载/配置变更时调用）
- Modify: `tests/e2e/app-shell.spec.js`（更新 strip e2e：移除主窗关闭连带关 strip 断言，改断言 set_close_behavior 同步）

## Interfaces

- Consumes: Task B4F-3 的 Rust `set_close_behavior` command（经 `window.__TAURI__.core.invoke`）；Task B4F-2 的 `cfg.closeBehavior`
- Produces: 移除 app-main 的 JS `onCloseRequested` handler（当前「主窗关不掉」bug 根源）；`syncCloseBehavior(cfg)` 在挂载 + 每次配置变更时 invoke Rust —— 后续任务不依赖

## Step 1: 更新 e2e（app-shell.spec.js 的 `Tauri：FloatBall 展开显示/聚焦独立 strip 窗口` 用例）

现有用例（约 500-528 行）mock 有 `onCloseRequested` 存储 + `getAllWindows` strip 带 `close` + `__mainCloseFn__` 触发断言。整体替换为：

```js
test('Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；配置同步 set_close_behavior', async ({ page }) => {
  await page.addInitScript(() => {
    const shown = [];
    const invokes = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([{
          label: 'strip',
          show: () => { shown.push('show'); return Promise.resolve(); },
          setFocus: () => { shown.push('setFocus'); return Promise.resolve(); },
        }]),
      },
      core: { invoke: (cmd, args) => { invokes.push({ cmd, args }); return Promise.resolve(); } },
    };
    window.__stripShown__ = shown;
    window.__stripInvokes__ = invokes;
  });
  await page.goto('/?mode=app');
  await page.locator('.app-main__float-ball').click();
  const shown = await page.evaluate(() => window.__stripShown__);
  expect(shown).toContain('show');
  expect(shown).toContain('setFocus');
  // 配置同步到 Rust（默认 exit）
  const invokes = await page.evaluate(() => window.__stripInvokes__);
  expect(invokes).toContainEqual({ cmd: 'set_close_behavior', args: { behavior: 'exit' } });
});
```

> 注意：mock 里 `getCurrentWindow` 去掉 `onCloseRequested`、`getAllWindows` strip 去掉 `close`、加 `core.invoke` 记录、移除 `__mainCloseFn__` 触发断言。`bindWindowControls`（app-main 调用）用 `getCurrentWindow().minimize/toggleMaximize/isMaximized/close` —— mock 已含，不破坏浏览器降级。

## Step 2: 运行确认红

`npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "独立 strip"`
Expected: FAIL（现 JS 仍含 onCloseRequested，invoke 未调用 → `invokes` 空）

## Step 3: app-main.js 移除 onCloseRequested handler + 加 syncCloseBehavior

删除现有 `onCloseRequested` 块（`mountAppMode` 末尾，约 740 行）：

```js
  // 主窗关闭 → 连带关闭 strip 悬浮窗...（整块删除）
```

在 `mountAppMode` 末尾（FloatBall 之后）加：

```js
  // 主窗关闭行为同步到 Rust（B4 收尾）：exit/background 由 Rust on_window_event 消费；
  //   移除 JS onCloseRequested 异步关 strip 的脆弱逻辑（曾导致主窗关不掉）
  const syncCloseBehavior = (cfg) => {
    if (typeof window.__TAURI__ === 'undefined') return;
    window.__TAURI__.core?.invoke?.('set_close_behavior', { behavior: cfg.closeBehavior ?? 'exit' }).catch(() => {});
  };
  syncCloseBehavior(getConfig());
  subscribe((cfg) => { syncCloseBehavior(cfg); });
```

> 注：`subscribe((cfg) => syncCloseBehavior(cfg))` 每次配置变更同步；与既有主题 subscribe（约 159 行）并存（各自闭包，无冲突）。`getConfig`/`subscribe` 已 import。可选链 `?.` 保证 mock 缺 core 时不抛。

## Step 4: e2e 红→绿

`npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "独立 strip"` → 绿；再跑全文件零回归

## Step 5: 全量回归 + 提交

Run: `npm test` + `npx playwright test --config=playwright.config.worktree.js` + `npm run build`
Expected: 全绿（视觉 24 零漂移——浏览器路径无 `__TAURI__` 走 no-op）

```bash
git add src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "fix: 移除 JS onCloseRequested 异步关 strip（主窗关不掉根因），配置经 set_close_behavior 同步 Rust（B4 收尾）"
```

> 注：B4F-3 已先完成（Rust on_window_event 就绪），本任务移除 JS handler 不会造成「主窗关、strip 存活」残留。

## 全局约束（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线、配置链路、零运行时依赖、禁止升级核心依赖。
- 视觉基线零漂移（浏览器路径无 `__TAURI__` 时 syncCloseBehavior no-op；`?mode=app` 浏览器 demo 的 float-ball 展开不受影响）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交；提交前 `git status`/`git diff --stat` 核对。
- **e2e 用 workaround 配置**（本会话环境告警：共享 checkout 陈旧 5173 server 会污染默认 `npm run test:e2e`）——`npx playwright test --config=playwright.config.worktree.js`。
