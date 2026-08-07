# Task B3-2 实施报告：外观分区实时整体预览卡

- **任务**：B3 收尾任务 —— 外观分区顶部加 `.cust-overview` 实时整体预览卡（缩略展示当前主题/强调色/玻璃/圆角/图标层级），订阅 store 实时刷新
- **状态**：完成
- **提交**：`2514d41`
- **日期**：2026-08-08

## 改动说明

### src/demo/customizer-panel.js

1. **import 增补**：从 `../config/apply.js` 追加 `prefersDark`（解析 `system` 主题到 'light'|'dark'；jsdom 无 `matchMedia` 由该函数守卫兜底 false → light）。
2. **新增 `renderOverviewCard(cfg)`**：返回 `.cust-overview` 卡片 HTML，5 个缩略项（主题色块 / 强调色点 / 玻璃小面板 / 圆角示例块 / 图标层级两圆点），每项带 `.cust-overview__label` 小字标签，`aria-hidden` 装饰项。
3. **新增 `updateOverview(container, cfg)`**：在容器内 `querySelector('.cust-overview')`（**空值守卫** `if (!el) return`，jsdom 单测容器安全），把当前 config 写入该元素 inline 的 `--preview-*` 局部变量：
   - `--preview-theme` = cfg.theme 经 prefersDark 解析的 'light'|'dark'
   - `--preview-theme-bg` = 解析主题对应的 solid 面底色（'#f8f9fb' / '#16181f'，与 themes.css 的 `--surface-solid` 同值），使色块随 `--preview-theme` 变化
   - `--preview-accent` = `tintHsl(cfg)`（复用既有函数，与色相 swatch 同源，联动 accent + hue + saturation）
   - `--preview-glass-opacity` = String(cfg.glass.opacity)
   - `--preview-radius` = String(cfg.radiusScale)
   - **不调 applyConfig**（变更发起方已先 saveConfig + applyConfig；订阅只同步局部，与既有 renderCustomizerGroups 模式一致）
4. **`renderCustomizerGroups` 接线**：
   - 初始渲染 `container.innerHTML = renderOverviewCard(cfg) + GROUPS.map(...).join('')`
   - 订阅回调：`subscribe((next) => { syncUI(container, next); updateOverview(container, next); })`
   - 初始同步：`syncUI(container, cfg); updateOverview(container, cfg);`

### src/styles/customizer.css

新增 `.cust-overview` 卡片样式（置于 `.cust-group__desc` 之后、行样式之前）：
- 卡片底 `--surface-1`、边 `--glass-border`、圆角 `calc(var(--radius-md) * var(--radius-scale, 1))`、内边距 space-3/space-4、下边距 space-5
- 标题 `.cust-overview__title`（text-2 小字 semibold）+ `.cust-overview__items` flex 横排 5 项（`.cust-overview__item` 居中 flex 列，`flex: 1`）
- 主题色块：`background: var(--preview-theme-bg, var(--surface-solid, #f8f9fb))`，`--shadow-inset-highlight` 内高光
- 强调色点：`background: var(--preview-accent)` 圆点
- 玻璃小面板：`::before` = 背景三色渐变（preview-accent + teal + amber，供模糊呈现）；`::after` = 玻璃层 `rgba(var(--glass-bg-rgb) / var(--preview-glass-opacity, 0.48))` + `backdrop-filter: blur(4px) saturate/brightness` + 噪点层 `--acrylic-noise`（opacity 随 `--noise-opacity`）
- 圆角示例块：`border-radius: calc(var(--radius-md) * var(--preview-radius, 1))`，preview-accent 低透明度填充
- 图标层级：active 12px accent 圆点 + inactive 6px text-3 圆点（对应 B2-3 分级）
- **全部静态背景、无任何动画**；玻璃层 backdrop-filter 为静态声明（红线：模糊永不动画，本卡无动画即合规）；时长/曲线不经 CSS 变量即不涉及

### tests/e2e/customizer.spec.js

新增用例（计划书 Step 1 字面 + 补圆角联动断言）「外观分区顶部有实时整体预览卡（强调色/圆角实时联动）」：导航进外观分区 → `.cust-overview` 可见 → 点 teal 强调色卡，`--preview-accent` 变化（indigo hsl(234 83.5% 65%) → teal hsl(172 66% 65%) 必不同）→ radiusScale 滑杆 fill('1.5')，`--preview-radius` 由 '1' → '1.5'。

### docs/superpowers/sdd/task-B3-2-brief.md / progress-b3.md

brief 随任务入库；progress-b3.md 追加 B3-2 执行留痕条目。

## 验证命令与输出摘要

**TDD 红 → 绿**：
- 红：`npx playwright test tests/e2e/customizer.spec.js -g "实时整体预览"` → `expect(locator('.cust-overview')).toBeVisible()` 失败 `element(s) not found`（1 failed）✓
- 绿：同命令 → `1 passed` ✓

**全量验证**：
| 命令 | 结果 |
|---|---|
| `npx playwright test tests/e2e/customizer.spec.js` | 6/6 passed |
| `npm test` | 10 文件 60/60 passed（含 customizer.test.js 订阅退订 2 例，updateOverview 加入订阅回调未破坏） |
| `npm run test:e2e` | 98 passed + 2 failed（见下方 flake 说明；与本任务相关用例全绿） |
| `npm run build` | ✓ built in 415ms（99 modules） |
| `npx playwright test tests/e2e/visual-regression.spec.js` | 24/24 passed |

首轮 `npm run test:e2e` 6 failed —— 全部为 `appearance-partition-*`（预览卡预期改变），其余 94 passed；基线重生成后复跑。

**复跑 flake 说明（与本任务无关，非本次改动引起）**：重生成后全量复跑 98 passed + 2 failed —— `app-shell.spec.js:124`（设置模式，`expect(settingsBtn).toHaveCount(1)` 超时）与 `floatstrip.spec.js:83`（右下 FloatBall，`expect(ball).toHaveCount(1)` 超时）。两例均为元素计数超时类 flake：首轮全量运行曾通过；隔离重跑 app-shell + floatstrip 两文件 **33/33 全绿**；均不涉及外观分区（.cust-overview 不参与该两测试路径）。判定为全量负载下既有时序 flake，与本次改动无关。

## 视觉基线重生成：解码比对说明

**流程**（先解码比对确认差异由本次改动引起，再重生成）：

1. **首跑确认范围**：`npm run test:e2e` 仅 `appearance-partition-*` 6 张失败（其余 18 张视觉 + 全部交互零漂移）。失败输出：`Expected an image 720px by 1613px, received 720px by 1737px` —— 元素增高 **+124px**（预览卡 100px + 外边距 24px）。
2. **解码比对**（Read 工具无法解码 PNG，改用两条证据链）：
   - **逐像素分析**（System.Drawing LockBits，PowerShell）：期望 vs 实际直接对比，差异集中于顶部 y52-719（dark）/ y142-719（light，新卡位于分区顶部 y142-242），y720-1559 零差异（该带两图为长分区截图既存空白底），y1560+ 为 +124px 底部延伸；下移对比（`expected(y) vs actual(y+124)`）在 y680-1612 逐像素 100% 匹配 → 下方内容为干净 124px 下移，无布局位移、无意外区域。
   - **当前代码复拍对照（决定性）**：以与视觉测试完全相同的流程（注入 dark/emerald → reload → 进外观 → 设 data-* / 清 style）复拍元素截图，与失败 actual **md5 逐字节一致**（`a99968bb…`）；同流程 `display:none` 隐藏 `.cust-overview` 后复拍，与基线 expected **md5 逐字节一致**（`e08c38b6…`）。即「基线 = 当前代码减去预览卡」—— 差异 100% 由本次改动引入，其余渲染（含空白底、AA 细节）与基线完全一致。
3. **重生成**：仅 6 张 appearance-partition（`-g "appearance-partition" --update-snapshots`），其余 18 张不触碰（git 确认 diff 只含 6 张）。
4. **复跑**：`npx playwright test tests/e2e/visual-regression.spec.js` 24/24 全绿。

## Self-Review

- **配置链路合规**：预览卡只**读** config（订阅回调只写容器局部 `--preview-*` 变量），不调 applyConfig —— 与 pre-flight 已裁定模式一致；变更发起方（滑杆 input / 强调色卡 / 亚克力开关）仍先 saveConfig + applyConfig。
- **动画红线**：`.cust-overview` 全部静态背景、无任何动画；玻璃层 backdrop-filter 为静态声明（无过渡）；无 layout 属性动画；不涉及时长/曲线变量。
- **零运行时依赖 / 无抽象封装**：纯原生 DOM + CSS 变量；组件直接 render 字符串；遵循既有函数式 helper 风格（readCfg/writePatch/tintHsl 同层）。
- **与 B3-1 无冲突**：未触碰 GROUPS 重命名与 `.cust-group__desc`；`.cust-overview` 非 `.cust-group`，6 组计数断言不受影响。
- **单测兼容**：`updateOverview` 空值守卫 + `prefersDark` jsdom 守卫，customizer.test.js 订阅退订断言未破坏（npm test 60/60）。
- **基线确定性**：复拍 md5 逐字节一致证明渲染确定，非 run-to-shot 抖动。
- **已知说明**：`--preview-theme` 为机器可读 'light'|'dark'（镜像 apply.js `--glass-enabled` 先例），色块实际底色经同源派生的 `--preview-theme-bg` 消费 —— CSS 无法对字符串变量分支，此为实现 `--preview-theme` 语义的最贴近做法。

## 提交

- `git add`：src/demo/customizer-panel.js、src/styles/customizer.css、tests/e2e/customizer.spec.js、tests/e2e/visual-regression.spec.js-snapshots/（6 张 appearance-partition）、docs/superpowers/sdd/task-B3-2-brief.md、docs/superpowers/sdd/task-B3-2-report.md、docs/superpowers/sdd/progress-b3.md
- **未 add**：`src-tauri/Cargo.toml`（既有行尾噪声，保持未暂存）
- message：`feat: 外观分区实时整体预览卡（主题/强调色/玻璃/圆角/图标实时联动）`
- hash：`2514d41`
