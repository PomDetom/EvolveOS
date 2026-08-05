# Task A7 报告：基线收尾与合并指引

**状态**：完成 — 应用壳 6 张视觉基线新增（docs 36 张零变化）+ README 更新为已实现形态；全量回归四项全绿；未合并 main（控制器负责）。

## 一、做了什么

### 1. SHOTS mode 维度改造（`tests/e2e/visual-regression.spec.js`）

- SHOTS 由 `[name, selector]` 扩展为 `[name, selector, mode = '/']` 三元组，`page.goto(mode)` 走对应入口。
- docs 6 组（tokens / components / scenes / main-window / settings-window / clipboard）显式标 `'/'`，行为逐字节不变。
- 新增第 7 组 `['app-main', '.app-main', '/?mode=app']` → 应用壳全元素截图（`?mode=app` 进入，浏览器非 Tauri 也走 resolveMode 显式分支）。
- 稳定化沿用 docs 组既有口径：`data-motion=off`（时长归零）+ `toHaveScreenshot({ animations: 'disabled' })` + SETTLE_MS 600 等待。app-main 右窗默认收起（单窗口态概览页）、无入场相位，初始渲染即终态。

### 2. 视觉基线 +6 张（app-main × 深/浅 × 3 accent）

| 文件 | 尺寸 |
|---|---|
| `app-main-light-indigo-chromium-win32.png` | 1280×720 |
| `app-main-light-amber-chromium-win32.png` | 1280×720 |
| `app-main-light-emerald-chromium-win32.png` | 1280×720 |
| `app-main-dark-indigo-chromium-win32.png` | 1280×720 |
| `app-main-dark-amber-chromium-win32.png` | 1280×720 |
| `app-main-dark-emerald-chromium-win32.png` | 1280×720 |

- `.app-main` 为 100vw/100vh，全元素截图即整视口（1280×720）；右下 FloatBall（`position: fixed`、body 级、`.app-main` 子树外）落在视口内被截入基线 —— 确定性元素（无入场动画），作为应用壳真实外观的一部分入库。
- 6 张两两字节互异（sha256 前 12 位全部不同），确认主题 × accent 组合各自真实渲染差异。

### 3. README 更新（`README.md`）

- ① 形态表「两种形态」→「三种形态」，FloatStrip 行由「规划形态」改为已实现（`?mode=strip` 独立入口 + 应用壳右下 FloatBall 演示，与 docs/app 互斥渲染）；移除「规划形态」段落。
- ② 手机形态（≤900px 底部横滑应用轮 + 全屏页面栈）已实现 —— 并入应用壳行说明 + 特性列表。
- ③ 目录结构注释：`src/app/` 行补 `strip-main 入口 / FloatBall 演示`；`components/` 行补 `float-strip 悬浮条`。
- ④ 视觉基线数量：README 目录结构已提前标「42 张基线」（Task A2 后预置），本次实测 42 张与之吻合，无需改动。
- ⑤ 特性列表：新增 FloatStrip 悬浮条、手机形态两条已实现特性。
- ⑥ 命令表核对：dev/test/test:e2e/test:visual/build/tauri 均准确，无需改动。

## 二、基线变化范围确认

`git status` 列出的 png 变化**仅 6 张新增**（`?? tests/e2e/visual-regression.spec.js-snapshots/app-main-*.png`），**0 张既有基线被修改**（无 ` M` png）。既有 36 张（tokens/components/scenes/main-window/settings-window/clipboard）经 `--update-snapshots` 后字节级零变化。

## 三、测试结果

| 回归项 | 结果 |
|---|---|
| `npm test` | **45 passed**（6 文件） |
| `npm run test:visual` | **42 passed**（36 既有 + 6 新增对比全绿） |
| `npm run test:e2e` | **116 passed**（原 110 + 6 张 app-main 视觉测试；docs 模式零冲击） |
| `npm run build` | **通过**（105 modules，683ms） |

## 四、Files changed

- `tests/e2e/visual-regression.spec.js`（M）— SHOTS mode 维度 + app-main 组
- `tests/e2e/visual-regression.spec.js-snapshots/app-main-*.png` × 6（新增）
- `README.md`（M）— 形态表 / 特性 / 目录结构
- `docs/superpowers/sdd/task-A7-brief.md`（新增）— 任务简报入库
- `docs/superpowers/sdd/task-A7-report.md`（新增）— 本报告

未改动：`docs/superpowers/sdd/progress-app-shell.md`（账本，控制器维护）；未 merge main。

## 五、Self-review

- **规格符合**：SHOTS mode 维度、`['app-main', '.app-main', '/?mode=app']`、沿用 data-motion=off + animations disabled、README 六个更新点全部落地。
- **docs 模式零冲击**：36 张既有基线字节级零变化（git 0 修改 png）；docs 6 组 mode 显式 `'/'`，goto 入口不变。
- **质量**：全量四项回归全绿；6 张新基线两两互异；视觉比较（无 --update-snapshots）42 全过证明 app-main 渲染确定性成立。
- **纪律**：未改账本、未 merge、未做 webview 真机验证（Web 环境执行）。

## 六、Issues / concerns

1. **提交信息调整**：计划书 Step 5 建议 `docs: 应用壳收尾（基线/README/账本）`；因本任务**不修改账本**（控制器维护），提交信息改为 `docs: 应用壳收尾（基线 + README）` 以与内容一致（任务允许）。
2. **概览页主题状态文案**：app-main 概览页「当前主题/强调色」文案在 mount 时（默认 light/indigo）一次性渲染，截图设置 data-theme/data-accent 后 CSS 变色但文案保持默认 —— 既有 A3 行为，非本任务引入，且确定性成立（不影响基线稳定性）；仅作观察备注，未处理。
3. **app-main 基线含 FloatBall**：右下悬浮球（body 级 fixed）落入 .app-main 视口截图 —— 确定性元素，为应用壳真实外观组成部分，按现状入库。
4. **e2e 总数 110→116**：计划书写「110 + 基线零冲击」，110 为新增前基数，新增 6 张 app-main 视觉测试后为 116，属预期。
