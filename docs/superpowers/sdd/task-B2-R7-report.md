# Task B2-R7 执行留痕报告：Tauri 背景修复（桌面显示背景层）+ 关闭背景选项

- 分支：`feature/b2-visual`
- 日期：2026-08-07
- 状态：**DONE**
- 需求源：`docs/superpowers/sdd/task-B2-R7-brief.md`（数值/代码按字面使用）

---

## 一、TDD 顺序（红 → 绿）

| 步 | 动作 | 结果 |
|---|---|---|
| Step 1 | `tests/e2e/app-shell.spec.js`「背景层」用例在切 geo 后追加「关闭背景」断言（none 按钮点击 + `data-backdrop=none` + backgroundImage 无渐变） | — |
| Step 2 | `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"` | **红**：`等待 .app-main__backdrop-opt[data-bd="none"]` 超时（按钮不存在）；另一条「预设柔和」用例通过 |
| Step 3 | `app-main.js` `BD_LABELS` 加 `none: '关闭'`（按钮 3→4 由 `Object.keys` 自动生效，点击逻辑复用无改动） | — |
| Step 4 | `app-main.css` 删 `[data-tauri="1"] .app-main__backdrop { opacity: 0 }` + 过时注释；grid 预设后加 `.app-main[data-backdrop="none"] { --backdrop-bg: var(--surface-solid); }` | — |
| Step 5 | `tauri.conf.json` 窗口 `transparent: true → false` | — |
| Step 6 | 重跑「背景层」用例 → **绿**（2 passed）；全量回归 + 基线处理（见下） | 全绿 |
| Step 7 | 提交 | 见「六、提交」 |

## 二、改动内容

1. `src/app/app-main.js` — `BD_LABELS = { gradient, geo, grid, none: '关闭' }`（按钮 3→4 自动生效）；同步更新块注释（三预设→四预设、Tauri 不再隐藏背景层）。
2. `src/app/app-main.css` —
   - **删除** `.app-main[data-tauri="1"] .app-main__backdrop { opacity: 0; }` 及第 47 行过时注释「Tauri：背景层透明，模糊真实壁纸」（`data-tauri` 探测写入保留，为无消费者标志，无害）；
   - **新增** `.app-main[data-backdrop="none"] { --backdrop-bg: var(--surface-solid); }`（grid 预设后）。
3. `src-tauri/tauri.conf.json` — 窗口 `transparent: true → false`（背景层为不透明 `--surface-solid` 实底，桌面壁纸本就不透出，透明已无意义且是 WebView2 渲染怪癖来源）。
4. `tests/e2e/app-shell.spec.js` —「背景层」用例扩展 none 预设断言（按 brief Step 1 字面追加）；同步更新用例头注释（三预设→四预设、Tauri 同显背景层）。

命名保留：`data-backdrop` 结构不变（新增 `none` 值）；`.app-main__backdrop` 元素与类名未动；配置链路逻辑未动（预设仍为会话内纯 UI 态，不进 store）。

## 三、验证结果（全绿）

| 项 | 命令 | 结果 |
|---|---|---|
| 单测 | `npm test` | **60 passed**（10 files） |
| 交互 e2e | `npm run test:e2e`（首轮） | **89 passed** + 6 failed（视觉外观分区 6 张，基线待重生成，符合预期） |
| 视觉基线重生成 | `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots` | **6 passed**（6 张重生成，非 no-op） |
| 视觉回归 | `npm run test:visual` | **24 passed**（其余 18 张零漂移） |
| 完整 e2e（终轮） | `npm run test:e2e` | **95 passed**（71 交互 + 24 视觉） |
| 构建 | `npm run build` | **通过**（421ms） |

## 四、基线解码比对（重生成非 no-op，与 R2/R6 不同）

brief 预期「外观分区 6 张重生成（背景装饰按钮 3→4）」。实测：6 张 appearance-partition 快照经 `--update-snapshots` **成功重生成**（非 no-op），其余 18 张（app-main / components-partition / motion-partition）`git status` 零变更——与 brief 预测完全一致。

**差异确认由本次改动引起**（比对方法：Playwright chromium + swiftshader 将 git HEAD 旧基线 vs 重生成新基线解码到 canvas 逐像素比对，阈值 sum(3通道 abs)>30 计 changed）：

| 对比对 | 差异像素 | 包围盒 | maxDelta | meanCh |
|---|---|---|---|---|
| light-indigo | 110（0.010%） | x168-187 × y96-105（20×10） | 388 | 234.2 |
| dark-emerald | 250（0.023%） | x143-187 × y85-116（45×32） | 388 | 135.8 |

- 差异为**硬边局部新增**（maxDelta≈388 近满通道差、bbox 20×10~45×32 且位于分区顶部按钮行区域）——即新增第 4 枚「关闭」按钮字形；无广域 wash、无布局位移（720×1493 尺寸不变）。
- **为何本次能重生成而 R2/R6 是 no-op**：R2/R6 差异为逐像素低幅色偏（meanCh 2–4，低于 pixelmatch 每像素阈值 → 判定匹配 → 不重写）；本次差异为**结构性新增元素**（一枚按钮），逐像素差异远超阈值 → pixelmatch 判定不同 → `--update-snapshots` 如实重写。Playwright 首轮错误上下文报 101 pixels / ratio 0.01，与解码比对同量级。
- 结论：6 张基线更新 = 新增「关闭」按钮的必然结果，其余 18 张零漂移由 git 变更集证实。

## 五、铁律符合性

- 配置链路：背景预设仍是会话内纯 UI 态（不进 store、不触发配置链路），逻辑未动，仅 CSS/标签值。
- 动画红线：背景层静态；改动仅静态 `--backdrop-bg` 值，blur 未动、无新增动画。
- 命名保留：`data-backdrop` 结构不变（新增 `none` 值）；`.app-main__backdrop` 元素与类名未动；`data-tauri` 探测写入保留（删 CSS 规则后为无消费者标志）。
- 测试仅在 Web 环境执行；无 webview 真机验证。

## 六、提交

| commit | 内容 |
|---|---|
| （feat） | `feat: Tauri 桌面显示背景层（关窗口透明）+ 背景装饰「关闭背景」预设` — `src/app/app-main.css`、`src/app/app-main.js`、`src-tauri/tauri.conf.json`、`tests/e2e/app-shell.spec.js`、`tests/e2e/visual-regression.spec.js-snapshots/`（6 张） |

（本报告 + brief 另作 docs 提交，与 R1-R6 执行留痕一致；`tests/e2e/visual-regression.spec.js` 本次未改动，git add 为空操作。）

## 七、Concerns

1. **`src-tauri/Cargo.toml` 存在既有的 LF→CRLF 行尾规范化改动**（任务开始前已存在，`git diff` 内容为空仅报换行警告），与本次任务无关，未纳入提交。
2. 桌面端实际观感（WebView2 不透明窗口 + 背景层实底）无法在 Web 环境验证，由用户 Tauri 目检确认（测试与验证铁律限定 Web 环境）。
