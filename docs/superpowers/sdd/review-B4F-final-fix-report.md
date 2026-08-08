# B4 最终整体评审修复波 — 报告

- **日期**：2026-08-08
- **分支/worktree**：`worktree-b4-close-sizing`（`.claude/worktrees/b4-close-sizing`）
- **提交**：`a13413d` `fix: 最终评审修复（删死 onShow re-fit + 补 closeBehavior 变更 invoke 测试锁，B4 收尾）`
- **评审裁决**：opus 最终整体评审 **With fixes**（2 Important + 2 Minor，一次修复全部，一个提交）
- **关联**：账本 `docs/superpowers/sdd/progress-b4-fix.md`

## 修复明细（4/4）

### Important 1 — 死代码 `win.onShow?.(() => fit())`（src/app/strip-main.js:69）

- **验证**：`node_modules/@tauri-apps/api` 在本项目（零运行时依赖）未安装；经 Tauri v2 官方 JS API 文档核对，`Window` 类**无 `onShow` 事件监听器**（仅 onMoved/onResized/onCloseRequested/onDragDropEvent/onFocusChanged/onScaleChanged/onThemeChanged + 通用 listen/once），`?.()` 使该行为静默 no-op —— 评审论断属实。
- **处理**：删除该行；原位置留一行诚实注释（不声称不存在的 API）：`fit(); // 首次显示尺寸由挂载时 fit() 确定，桌面目检通过 [strip] fit 诊断 log 确认`。挂载时 `fit()`（.c-strip 为 width:max-content，rect 内容驱动）对静态内容确定，首显尺寸不再依赖不存在的「显示后 re-fit」。

### Important 2 — 配置变更 → Rust invoke 路径无测试锁（tests/e2e/app-shell.spec.js）

- **新增用例**：`Tauri：切「保留后台」→ set_close_behavior invoke 同步 Rust；点主题模式不清 close-behavior 高亮`（app-shell.spec.js:555）。
- **mock 结构**（参照既有 FloatBall 用例）：注入 `window.__TAURI__` = `{ window: { getCurrentWindow, getAllWindows }, core: { invoke 记录 } }`；`getCurrentWindow` 含 `minimize/toggleMaximize/isMaximized/close`（`bindWindowControls` 用）；`getAllWindows` 返回空数组（与 FloatBall onExpand 探测路径同构，安全）。
- **断言链**：打开设置→通用分区 → ① 挂载同步已 invoke `{cmd:'set_close_behavior', args:{behavior:'exit'}}`；② 点 `[data-close-behavior="background"]` → saveConfig→subscribe→`invoke('set_close_behavior',{behavior:'background'})` 被记录（核心动态路径）。

### Minor 1 — `[data-mode]` 裁定无回归测试（并入上述用例）

- 上述新用例尾部追加：点主题模式 `[data-mode="dark"]` 后，断言 `[data-close-behavior="background"]` 仍保持 `.csettings__mode--active`、`[data-close-behavior="exit"]` 无 active —— 锁住「主题同步循环收敛 `.csettings__mode[data-mode]`（settings-pages.js:240 + app-main.js:153 控制器裁定）」不被误清 close-behavior 高亮。与 Important 2 合并，减少重复导航。

### Minor 2 — 浏览器 strip 无恢复按钮负断言（tests/e2e/floatstrip.spec.js）

- 浏览器 `?mode=strip` 渲染用例（约 12-20 行）在 `.c-strip` toHaveCount(1) **确认存在之后**追加 `await expect(page.locator('.c-strip__restore')).toHaveCount(0);`（避免空 DOM 上 toHaveCount(0) 真空通过）。

## 覆盖测试输出

- 新增用例（app-shell.spec.js:555）单独通过：`[chromium] › app-shell.spec.js:555:1 › Tauri：切「保留后台」…` **ok**（全量跑 106/106 中含该项）。
- 负断言（floatstrip.spec.js 渲染用例）在全量跑中通过，无回归。

## 全量回归摘要

| 项目 | 结果 |
|---|---|
| `npm test`（Vitest 单测） | **58/58 通过**（12 文件） |
| `npx playwright test --config=playwright.config.worktree.js`（e2e 全量，端口 5174 新鲜 server，workaround 配置） | **106/106 通过**（此前 105 → +1 新用例） |
| 视觉基线 | 零漂移（未跑 --update-snapshots，浏览器路径渲染无改动） |
| `npm run build`（Vite 生产构建） | **通过**（built in 400ms） |
| `src-tauri/Cargo.toml` | 未改动（行尾噪声不动不提交） |

## 提交核对

- `git status`（提交后）：仅剩两个**未跟踪**文件（`docs/superpowers/sdd/review-B4F-final.diff`、`playwright.config.worktree.js`），均非本波改动，未纳入提交。
- 提交仅含 3 个本波文件：`src/app/strip-main.js`（-1/+2）、`tests/e2e/app-shell.spec.js`（+39）、`tests/e2e/floatstrip.spec.js`（+3）。

## 自评

- 4 项修复全部完成，一次提交；每项均先经事实核对（onShow 经官方 API 文档确认不存在）再动手。
- 新增测试锁住的是评审点名的核心动态路径（subscribe→invoke 变更）+ 控制器裁定（[data-mode] 收敛），非装饰性断言。
- 视觉零漂移、单测/e2e/build 全绿；未动测试环境之外的产物。
- 遗留（评审明确免修/用户目检项）：桌面 rotate→close 的 re-hover 摩擦、`.csettings__modes--close` 死 CSS 钩（均记录于账本，不属本波）。
