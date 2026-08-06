# Task B2-2 报告：浏览器装饰背景层（模糊对象）

- 分支：`feature/b2-visual`
- 状态：DONE
- 提交：见文末「提交」

## 实现说明

### 背景层（app-main.css）

- `.app-main__backdrop`：`position: fixed; inset: 0; z-index: -1; pointer-events: none; background: var(--backdrop-bg)`。
  `.app-main` 无 transform（不建立 fixed 子元素 containing block），`overflow: hidden` 不裁剪背景层；`z-index: -1` 使背景层画在 canvas（body 半透明 `--glass-bg`）之上、壳内容之下——玻璃表面（backdrop-filter 磨砂）模糊到它，即浏览器侧模糊对象。
- 三预设按 brief 字面：`.app-main[data-backdrop="gradient|geo|grid"] { --backdrop-bg: ... }`（`--accent-200/300/100` + `--surface-solid`）。
- Tauri：`.app-main[data-tauri="1"] .app-main__backdrop { opacity: 0 }`（模糊真实壁纸）。

### 预设 UI（app-main.js 挂载注入 + partitions.css 样式）

- 模板 `.app-main` 设默认 `data-backdrop="gradient"`，`.app-main__backdrop` 为首个子元素。
- `mountAppMode` 挂载时：`typeof window.__TAURI__ !== 'undefined'` → `.app-main` 写 `data-tauri="1"`；外观分区页（`.csettings__page[data-page="appearance"]`）在 `.csettings__cust` 前注入「背景装饰」小节（`.app-main__backdrop-sel` + 3 个 `.app-main__backdrop-opt[data-bd]`，激活态 `.app-main__backdrop-opt--active` + `aria-pressed`）。
- 点击更新 `.app-main` 的 `data-backdrop`（纯会话内 UI 态，不进 store、不触发配置链路，与右窗状态同类）；`.cust-group` count 6 不受影响（注入为 `.csettings__cust` 前独立小节，非分组）。
- 样式落 `src/app/partitions.css`：分段按钮组仿 `.csettings__modes/.csettings__mode` 视觉（胶囊 + paint-only 过渡，无入场/离场动效主体；预设切换本身为静态 `--backdrop-bg` 变化，不动画——红线合规）。

### 与 brief 的一处必要偏差

- brief 的 `grid` 预设把 `background-size: 40px 40px` 写在 `.app-main[data-backdrop="grid"]` 上，但承载 background 的是子元素 `.app-main__backdrop`，`background-size` 不继承 → 该行实际不生效（网格会以默认尺寸画单条线）。**保留 brief 行字面 + 补一行** `.app-main[data-backdrop="grid"] .app-main__backdrop { background-size: 40px 40px; }` 令网格真实平铺（注释说明原因）。

## 测试证据

| 步骤 | 命令 | 结果 |
|---|---|---|
| 红 | `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"` | 1 FAIL（`.app-main__backdrop` 不存在） |
| 绿 | `npx playwright test tests/e2e/app-shell.spec.js` | 21/21 PASS（含新「背景层」用例） |
| 单测全量 | `npm test` | 56/56 PASS（9 文件） |
| e2e 全量 | `npm run test:e2e` | 84/84 PASS（第二轮起；首轮 smoke 冷启动超时偶发，见下） |
| 视觉基线重生成 | `mv 旧快照 归档；npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` | 18/18 PASS（强制重生成，见下） |
| 视觉 | `npm run test:visual` | 18/18 PASS |
| e2e 全量（重生成后） | `npm run test:e2e` | 84/84 PASS |
| 构建 | `npm run build` | PASS |

### 背景层渲染确认（解码比对）

- 同屏 with/without 差分（`.app-main` 元素截图，`data-tauri="1"` 隐背景层 vs 默认）：91700/921600 像素（9.95%）变化，max per-channel diff 25——背景层确已渲染，为**克制的软光晕**（各通道差 ≤25，远低于 Playwright 默认 0.2=51/255 阈值，故旧基线仍能通过）。
- 快照目录 `--update-snapshots` 首次未改写任何文件（18 张均在阈值内匹配，Playwright 仅写差异超出阈值的图）→ **归档旧快照后强制重生成**，捕获含背景层的新渲染。
- 新旧基线逐张解码差分（18/18）：全部为低通道差的颜色偏移（app-main max 4~61/通道，分区 max 2~52/通道），无结构性位移（无硬边/元素错位）。diff 分布与背景层 glow 几何吻合 → **差异确由背景层引起**，非布局破坏。
- 说明：app-main 亮色受影响 12~26% 像素、暗色 62~69% 像素（暗色 `--accent-200/300` 为浅色档，在近黑 `--surface-solid` 上光晕更广，max 通道差 ≤52）；分区图受影响较小（内容卡遮挡大部分）。均为 brief 字面 CSS 的必然结果，观感交 B2 整体评审确认。

## 遇到的问题与判断

1. **smoke.spec.js 首轮冷启动超时（与本次改动无关）**：全量 e2e 首轮 smoke「app shell renders」在 5s 超时边界失败，但 error-context 页面快照已完整渲染 `.app-main`（说明元素恰在超时边界出现，Vite 冷启动延迟）。隔离复跑 1/1 PASS；第二轮、第三轮全量均 84/84 PASS。本改动不新增动态 import 链，非因果。
2. **`--update-snapshots` 不强制改写**：视觉基线在默认阈值内匹配时 Playwright 不落盘，需先归档旧快照再重生成（否则 18 张仍是旧基线）。已按此流程完成。
3. **暗色下背景层光晕较广（app-main 像素 diff 62~69%）**：`--accent-200/300` 为浅档，暗色 `--surface-solid` 近黑 → 光晕覆盖大半背景。max 通道差 ≤52，仍属克制观感；按 brief 字面落地，交 B2 整体评审确认暗色审美（与 B2-1 deferred I-1 同题）。
4. **手机形态无预设选择 UI**：brief 落点决策限定「mount 时注入外观分区页」（桌面路径）；手机页面栈每次重建设置页（`renderSettingsPages`），未注入选择器——背景层（默认 gradient）在手机同样渲染，但无切换入口。brief 未要求，留待后续/最终评审定边界。
5. **Tauri 下预设选择器仍可见**：`[data-tauri="1"]` 仅使背景层透明，未隐藏「背景装饰」小节；brief 未要求隐藏，未加（Tauri 桌面不做 e2e 验证）。
6. **`background-size` 不继承**：见「与 brief 的一处必要偏差」，网格预设补 `.app-main__backdrop` 上的平铺尺寸。

## 提交

- 改动文件：`src/app/app-main.css`、`src/app/app-main.js`、`src/app/partitions.css`、`tests/e2e/app-shell.spec.js`、`tests/e2e/visual-regression.spec.js-snapshots/`（18 张重生成）、`docs/superpowers/sdd/task-B2-2-brief.md`（纳入留痕）、`docs/superpowers/sdd/task-B2-2-report.md`、`docs/superpowers/sdd/progress-b2.md`。
- 未纳入：`src-tauri/Cargo.toml`（工作树既有行尾噪声，非本任务改动，见 ledger base 注记）。
