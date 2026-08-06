# Task B1-2 执行留痕：窗口控制双通道（浏览器降级）

## What I implemented

### 1. `src/demo/window-controls.js` — 浏览器降级分支

`bindWindowControls(api)` 的 Tauri 探测/绑定逻辑**逐字节未动**（min→minimize、max→toggleMaximize+真实 isMaximized 同步图标、close→close、失败静默降级、返回 true）。仅在 `if (!win) return false;` 处改为 `if (!win) return bindBrowserFallback();`，新增浏览器 else 分支：

- 遍历 `.c-titlebar__control`，仅 min/max/close 三按钮绑定 `click → toast('此功能在桌面端生效', { variant: 'info' })`；**设置按钮（--settings）不劫持**（应用壳有真实功能）。
- 拖拽区 `.c-titlebar__drag` 全部加 `c-titlebar__drag--browser` 标记类，启用 CSS `:active` 轻量反馈。
- 返回 `'browser'` 标记降级态。

### 2. 返回值处理

- 原契约返回 `true`（Tauri 已绑）/ `false`（浏览器不绑）。改后：Tauri 仍返回 `true`，浏览器返回 `'browser'`。
- **调用方检查**：两个运行时调用点（`app-main.js:581`、`docs-mode.js:178`）均不读取返回值，无运行时依赖。唯一依赖是 `tests/e2e/title-bar.spec.js:48` 断言 `bound === false` —— 属旧契约断言，已同步更新为 `'browser'`（否则 docs e2e 全红，违反「docs 84 零冲击」硬门槛）。`src/app/app-main.js` 无需改动（返回值未被使用，降级行为自包含于 window-controls.js）。

### 3. `src/components/title-bar/title-bar.css` — 拖拽区反馈

```css
.c-titlebar__drag--browser { transition: transform var(--dur-fast) var(--ease-out),
  opacity var(--dur-fast) var(--ease-out); }
.c-titlebar__drag--browser:active { transform: scale(0.99); opacity: 0.75; }
```

- 只动 transform/opacity（红线），时长经 CSS 变量 `--dur-fast`/`--ease-out`。
- 标记类仅由浏览器分支 JS 添加，Tauri 环境不产生该 class → **Tauri 渲染零冲击**。
- 不 preventDefault / 不 setPointerCapture，浏览器内不干扰选择与滚动（`.c-titlebar` 本就 `user-select: none`）。

### 4. 幂等

模块级 `WeakSet<HTMLElement>` 按按钮元素去重：`bindWindowControls` 被多次调用（docs/app 各自入口 + title-bar.spec 测试直调 `bindWindowControls()`）时不重复绑 toast（否则双 toast）。拖拽区标记类 `classList.add` 天然幂等。

## TDD Evidence

### RED

```bash
npx playwright test tests/e2e/app-shell.spec.js -g "浏览器模式"
```

```
1 failed
  [chromium] › tests\e2e\app-shell.spec.js:288 › 浏览器模式下窗口控制按钮点击给出桌面端提示
Error: expect(locator).toHaveClass(expected) failed
  Locator: locator('.app-main .c-titlebar__drag')
  Expected pattern: /c-titlebar__drag--browser/
  Received string:  "c-titlebar__drag"
```

预期失败：浏览器降级尚未实现 → 拖拽区无标记类、三按钮点击无 toast，断言超时。

### GREEN

```bash
npx playwright test tests/e2e/app-shell.spec.js -g "浏览器模式"
```

```
✓  1 [chromium] › tests\e2e\app-shell.spec.js:288 › 浏览器模式下窗口控制按钮点击给出桌面端提示
1 passed (18.4s)
```

## Test results

| 验证 | 结果 |
|---|---|
| `npm run test:e2e`（全量 Playwright，含视觉回归） | **120 passed**（含新用例 1 + 既有全部，docs 零冲击） |
| `npm test`（Vitest 单测） | 51 passed (8 files) |
| `npm run build`（Vite） | ✓ built in 861ms，106 modules |

### 视觉回归 flake 排查（非本次引入）

本次改动不改变任何静止渲染（`.c-titlebar__drag--browser` 仅 transition + `:active`，截图无按压态），且 `#scenes` 内 titlebar 实例的标记类 at-rest 无视觉效果。全量并行跑时 `scenes · dark/amber` 曾偶发失败 —— 已在**干净树（stash 后）**复跑视觉套件证实同样 flake（`dark/amber` + `dark/emerald` 失败），即 **pre-existing 并行负载渲染 flake**（项目自述「Windows 文字抗锯齿跨实例抖动」类），与本次改动无关。最终全量跑 120 全绿。

## Files changed

- `src/demo/window-controls.js` — 浏览器降级分支 + toast import + WeakSet 幂等 + 注释
- `src/components/title-bar/title-bar.css` — 拖拽区 `--browser` 标记类 + `:active` 反馈
- `src/docs/docs-mode.js` — 仅注释更新（原「浏览器不绑定」描述已过期）
- `tests/e2e/app-shell.spec.js` — 新用例（浏览器模式窗口控制按钮 → toast + 标记类断言）
- `tests/e2e/title-bar.spec.js` — 返回值断言 `false` → `'browser'`（旧契约随双通道变更，docs e2e 不回归）

`src/app/app-main.js`：未改动（返回值未被使用，降级行为自包含，brief 中「若需区分降级态」不成立）。

## Self-review findings

- 规格符合：按钮保留（布局与 Tauri 一致）、点击 toast 文案/变体逐字符合、拖拽区只动 transform/opacity、时长经 CSS 变量、返回 `'browser'`。
- Tauri 路径零冲击：分支逐字未动；`tests/e2e/title-bar.spec.js` mock 注入测试 `toBe(true)` 仍绿。
- docs 零冲击：全量 e2e 120 绿；新增用例只测 `?mode=app`。
- 设置按钮不被劫持（仅 min/max/close 绑定），应用壳设置 toggle 无 toast 干扰。
- 幂等：title-bar.spec 测试在同一页面二次直调 `bindWindowControls()`（docs-mode 已绑一次）不产生双 toast。
- 零运行时依赖：仅 import 既有 `toast` 组件。
- 动画红线：拖拽反馈仅 transform/opacity，时长/曲线经 CSS 变量；toast 动画为既有组件行为。

## Issues / concerns

- `tests/e2e/title-bar.spec.js` 返回值断言更新是契约变更的必要连带（brief 明确「检查调用方是否依赖返回值」），属预期改动，非任务外蔓延。
- 视觉回归 `scenes` 组在**全量并行**下偶发 flake（干净树同样复现，已证实 pre-existing，见上），非本次引入；若 CI 受其困扰建议单独以低并行度跑视觉套件。
