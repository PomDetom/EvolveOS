# Task B4F-4 执行报告 — JS 同步与清理（移除 JS onCloseRequested handler + set_close_behavior 同步）

- **任务**：B4F-4（B4 收尾修复第四个任务）
- **分支**：worktree-b4-close-sizing
- **提交哈希**：`1d4928073270cbc15649a5b4b5dafb9fa1d14141`（评审修正：原报告 22e27be 为 amend 前哈希，控制器并入 brief 后为 1d49280）
- **日期**：2026-08-08

## 实现内容

1. **移除 JS `onCloseRequested` handler**（`src/app/app-main.js` `mountAppMode` 末尾）：
   删除「主窗关闭 → 连带关闭 strip 悬浮窗」整块（`window.__TAURI__.window.getCurrentWindow().onCloseRequested?.(...)` 异步 `getAllWindows→close` 非 main 窗口逻辑）——「主窗关不掉」bug 根源。主窗关闭行为已由 B4F-3 Rust `on_window_event` 承接。

2. **新增 `syncCloseBehavior(cfg)`**（`mountAppMode` 末尾、FloatBall 之后）：
   - Tauri 环境经 `window.__TAURI__.core?.invoke?.('set_close_behavior', { behavior: cfg.closeBehavior ?? 'exit' })` 同步 Rust（`.catch(() => {})` 吞异常，可选链 `?.` 保证 mock 缺 core 时不抛）。
   - 浏览器环境 `typeof window.__TAURI__ === 'undefined'` → no-op（视觉基线零漂移）。
   - 挂载时调一次 `syncCloseBehavior(getConfig())` + `subscribe((cfg) => { syncCloseBehavior(cfg); })` 每次配置变更同步（与既有主题 subscribe 各自闭包并存，无冲突）。
   - 代码逐字使用简报 Step 3 的 verbatim 块。

3. **更新 strip e2e 用例**（`tests/e2e/app-shell.spec.js`）：
   「Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；主窗关闭连带关 strip」整体替换为「Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；配置同步 set_close_behavior」——mock 去掉 `onCloseRequested` 存储、strip 去掉 `close`、加 `core.invoke` 记录、移除 `__mainCloseFn__` 触发断言，改断言 `invokes` 含 `{ cmd: 'set_close_behavior', args: { behavior: 'exit' } }`。逐字使用简报 Step 1 的 verbatim 块（顶部注释同步更新为反映 B4F-4 断言）。

## TDD 红→绿证据

### 红（Step 2，实现前）

```
npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "独立 strip"

1) [chromium] › tests\e2e\app-shell.spec.js:500:1 › Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；配置同步 set_close_behavior
    Error: expect(received).toContainEqual(expected) // deep equality
    Expected value: {"args": {"behavior": "exit"}, "cmd": "set_close_behavior"}
    Received array: []

  > 525 |   expect(invokes).toContainEqual({ cmd: 'set_close_behavior', args: { behavior: 'exit' } });
  1 failed
```

红因：现 JS 仍含 `onCloseRequested`，未调用 `set_close_behavior` → `invokes` 为空数组。

### 绿（Step 4，实现后）

```
ok 1 [chromium] › tests\e2e\app-shell.spec.js:500:1 › Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；配置同步 set_close_behavior
1 passed (7.7s)
```

### 全文件零回归（app-shell.spec.js）

```
29 passed (56.0s)
```

## 全量回归摘要

| 命令 | 结果 |
|---|---|
| `npm test`（Vitest 单测） | 12 文件 / 58 用例全部通过 |
| `npx playwright test --config=playwright.config.worktree.js`（全量 e2e，含 24 视觉回归） | 104 通过（视觉基线零漂移） |
| `npm run build` | ✓ built in 386ms |

e2e 全程使用 workaround 配置 `--config=playwright.config.worktree.js`（5174 端口，避开共享 checkout 陈旧 5173 server 污染）。未跑 `--update-snapshots`。

## 提交

```
git add src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "fix: 移除 JS onCloseRequested 异步关 strip（主窗关不掉根因），配置经 set_close_behavior 同步 Rust（B4 收尾）"
```

提交哈希：`22e27beaab94305c2724d8678539386218bfb440`（`git rev-parse HEAD`）

## 自评

- **越界改动**：无。仅 `src/app/app-main.js`（移除 1 块 + 新增 1 块）+ `tests/e2e/app-shell.spec.js`（用例替换 + 顶部注释同步）。未触及 `src-tauri/Cargo.toml`（无行尾噪声，`git status --porcelain` 核对为空）；`docs/superpowers/sdd/task-B4F-4-brief.md` 与 `playwright.config.worktree.js` 保持未跟踪、未提交。
- **遗漏**：无。`getConfig`/`subscribe` 已 import（app-main.js 顶部确认），无需新增 import。Rust 侧 `set_close_behavior` command 已在（B4F-3），本任务消费路径完整。
- **约束符合**：测试仅 Web 环境（Vitest + Playwright，未跑 tauri dev）；配置链路不绕过；零运行时依赖；动画红线未涉；视觉基线零漂移（浏览器路径 `__TAURI__` 缺失走 no-op，`?mode=app` 浏览器 demo 的 float-ball 展开不受影响）。
- **注意事项**：Tauri 桌面实际关闭行为由用户目检（B4 全局口径：不做 webview 真机验证）。
