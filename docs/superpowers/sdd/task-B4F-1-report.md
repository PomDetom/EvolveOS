# Task B4F-1 实施报告 — 悬浮窗尺寸贴合（LogicalSize + computeFitSize + 诊断）

- **任务**：B4 收尾修复 Task B4F-1（`docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md` / 简报 `task-B4F-1-brief.md`）
- **Branch**：worktree-b4-close-sizing（基于 fix/b4-strip-open HEAD 1d35504）
- **状态**：DONE
- **提交哈希**：`347b628423b6367cc10b0698c6ad6dd67181120b`（评审修正：原报告 66d22ec 为 amend 前哈希，控制器并入 brief 后为 347b628）
- **提交信息**：`fix: 悬浮窗尺寸用显式 LogicalSize 贴合内容（DPI 下底部不再被裁）+ computeFitSize 单测（B4 收尾）`（含 brief，项目惯例）

## 实现内容

修复桌面真机「竖排悬浮窗底部被窗口裁掉」根因：`fit()` 原先用 `win.setSize({ width, height })` 普通对象，非 100% DPI（125%/150%）下 Logical/Physical 语义不明确，被当物理像素 → 窗口小于 CSS 内容 → 底部被裁。

1. **`src/app/strip-main.js`**
   - 模块顶部（`mountStripMode` 之前）新增导出纯函数 `computeFitSize(rect)`：CSS 像素 → `{ width, height }`（`Math.max(1, Math.ceil(...))`，ceil + 至少 1px）。可单测。
   - `fit()` 改用显式 `LogicalSize`（`const { LogicalSize } = window.__TAURI__.window;` → `win.setSize(new LogicalSize(size.width, size.height))`），CSS px = 逻辑 px，任何 DPI 下窗口 = 内容尺寸。
   - `fit()` 追加诊断 log：`win.outerSize?.().then` + `win.scaleFactor?.().then` → `console.log('[strip] fit', size, outer, scaleFactor)`，供桌面目检确认 outer≈strip box 与 DPI 缩放（`?.` 短路整个链，方法缺失时安全返回 undefined，不抛错）。
   - 浏览器路径（无 `__TAURI__` 的 `?mode=strip`）渲染零变化——`computeFitSize` 仅被 `fit()` 消费，`fit()` 只在 `if (win)` 分支内调用。

2. **`tests/unit/strip-sizing.test.js`**（新建）— `computeFitSize` 纯函数单测（ceil/至少 1px/整数值三个断言，简报 verbatim）。

3. **`tests/e2e/floatstrip.spec.js`** — strip 窗口用例 mock 的 `window.__TAURI__.window` 追加 `LogicalSize` 类，使 `new LogicalSize(...)` 可构造。现有断言按 setSize 调用次数计数，不受对象类型影响（已验证全绿）。

## TDD 红 → 绿证据

### 红（Step 2，实现前）

`npx vitest run tests/unit/strip-sizing.test.js`：

```
❯ tests/unit/strip-sizing.test.js (1 test | 1 failed)
× computeFitSize（B4 收尾：悬浮窗尺寸贴合） > ceil 到整数 + 至少 1px
  → (0 , computeFitSize) is not a function
TypeError: (0 , computeFitSize) is not a function
   ❯ tests/unit/strip-sizing.test.js:6:26
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

（`computeFitSize` 未导出，符合简报预期 FAIL 信号。）

### 绿（Step 5，实现后）

`npx vitest run tests/unit/strip-sizing.test.js`：

```
✓ tests/unit/strip-sizing.test.js (1 test) 3ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

## 全量回归（Step 7）

| 命令 | 结果 |
|---|---|
| `npx playwright test tests/e2e/floatstrip.spec.js` | **7 passed**（含 strip 窗口用例，走新 `fit()` 路径） |
| `npm test` | **58 passed / 12 files** |
| `npm run test:e2e` | **103 passed**（含 24 视觉回归截图零漂移） |
| `npm run build` | **成功**（vite build，99 modules，无报错） |

视觉基线零漂移：浏览器路径渲染不变（`computeFitSize` 只被 Tauri 分支 `fit()` 消费，浏览器 `?mode=strip` 无 `__TAURI__` 走原 `else` 分支；视觉回归 24 张全过，未跑 `--update-snapshots`）。

## 自评

- **越界改动**：无。仅 3 个文件（`src/app/strip-main.js`、`tests/unit/strip-sizing.test.js`、`tests/e2e/floatstrip.spec.js`），diff 与简报 verbatim 完全一致；未触碰 `src-tauri/Cargo.toml`、未跑 tauri dev、未动配置链路/动画红线/依赖。
- **遗漏**：无。TDD 五步齐（红→实现→绿→e2e mock→全量回归→提交）。
- **提交卫生**：提交前 `git status` / `git diff --stat` 核对——仅预期 3 文件入提交；`src-tauri/Cargo.toml` 无任何改动（无行尾噪声）；`dist/` 被 gitignore 不追踪。未提交的 `docs/superpowers/sdd/progress-b4-fix.md` 与 `docs/superpowers/sdd/task-B4F-1-brief.md` 为工作流产物，交由控制器统一管理。
- **桌面验证说明**：按全局约束本任务不做 webview 真机验证；`npm run tauri:dev` 后 log 应显示 `outer≈strip box`、`scaleFactor` 与系统一致、竖排底部不再被裁——由用户目检。
