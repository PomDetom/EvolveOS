# Task B2-3 报告：导航图标四项增强

- 分支：`feature/b2-visual`
- 状态：DONE（1 处必要实现偏差已披露，见「与 brief 的偏差」）
- 提交：见文末「提交」

## 实现说明

### icon.js：第三参 stroke-width

- `export function icon(name, size = 18, stroke = 1.8)`，svg `stroke-width="${stroke}"`。
- 默认 1.8 向后兼容，既有 `icon(name, size)` 调用点零改动（全量回归零冲击佐证）。
- 头注释同步补充 stroke 参数契约。

### nav-wheel.js：active 项 24px/2.2 分级 + select 重渲染

- 模板按初始 active（索引 0）分级：item0 `icon(it.icon, 24, 2.2)` + `--active` 类；其余 `icon(it.icon, 20)`（默认 stroke 1.8）。初始渲染即带 `--active` 类（此前无任何 active 项，直到首次 select）—— brief Step 4 e2e 在初始加载即断言 active 项 svg 宽度，必须如此；且与宿主初始逻辑态一致（应用壳 `state.moduleId='home'` = MODULES[0]）。
- `select(i)` 内**捕获旧 active**（`const prev = active`，赋值前），class toggle 后调 `renderItemIcons(prev, i)` 对前后两项重渲染。
- `renderItemIcons(...indexes)`：据 `--active` 类将 `.c-navwheel__icon svg` 的 `width/height/stroke-width` 置为 24/24/2.2 或 20/20/1.8。
- **setFocal 逐字不动**：图标尺寸变化为静态重渲染（svg 属性），绝不触碰 item 上的 `style.transform/opacity`——动画红线合规。

### nav-wheel.css：衬底 / 提亮 / 光晕分层（brief Step 7 字面）

- `.c-navwheel__icon`：40px 圆角衬底（`width/height: 40px; border-radius: calc(var(--radius-md) * var(--radius-scale, 1))`）+ 颜色提亮 `--text-3`→`--text-2`；`transition` 仅 color/background（paint-only 豁免）。
- `.c-navwheel__item:hover .c-navwheel__icon`：`background: var(--surface-hover); color: var(--text-1)`（hover 显衬底）。
- `.c-navwheel__item--active .c-navwheel__icon`：`color: var(--accent); background: var(--accent-100)`（选中显衬底）。
- `.c-navwheel__glow`：`transform: scale(.8)` + `transition: transform var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-out)`；active 时 `opacity: 1; transform: scale(1)`（光晕分层，只动 transform/opacity，红线合规）。原有 `position/inset/background/pointer-events` 保留。
- `src/app/app-main.css` 无需改动（brief 列「如需」；衬底 40px 在 64px 栏宽内可容纳，既有纯图标栏规则直接生效）。

## 测试证据

| 步骤 | 命令 | 结果 |
|---|---|---|
| 红（单测） | `npx vitest run tests/unit/icon.test.js` | 1 FAIL（`stroke-width="2.2"` 缺失）+ 1 PASS |
| 红（e2e） | `npx playwright test tests/e2e/app-shell.spec.js:373` | FAIL（无 active 项，locator 超时） |
| 绿（单测） | `npx vitest run tests/unit/icon.test.js` | 2/2 PASS |
| 绿（e2e） | `npx playwright test tests/e2e/app-shell.spec.js:373` | 1/1 PASS |
| 单测全量 | `npm test` | 58/58 PASS（10 文件） |
| e2e 全量（终跑） | `npm run test:e2e` | 85/85 PASS |
| 视觉基线重生成 | `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` | 18/18 PASS（app-main 6 + components-partition 6 重写；motion 6 字节不变） |
| 视觉 | `npm run test:visual` | 18/18 PASS |
| 构建 | `npm run build` | PASS |

### 视觉基线差异解码比对（重生成前）

用自写 PNG 解码脚本（Python stdlib zlib）对 expected/actual 差分，确认差异**确由图标增强引起**：

- **app-main**：diff 为左侧窄竖带（列 3~7/100），自上而下贯穿 7 个导航项 —— 左窗纯图标栏 22px→20px 常规 / item0 24px active + accent 高亮 + 衬底/光晕。亮色 125~250 px（0.01%），暗色 ~3300 px（accent-100 衬底在暗色下对比更高）。
- **components-partition**：diff 为顶部水平带 —— 组件分区「组 1 核心导航」的 NavigationWheel 8 项演示实例（item0 现为 active：24px 图标 + accent 衬底 + 光晕 + 名称 accent）。亮色 766~940 px，暗色 ~19k px（衬底/光晕暗色下高对比）。
- **motion-partition：0 diff**（全 6 张字节不变）—— 证明无全局渲染回归。
- 无结构性位移（无硬边/元素错位），全部为图标/衬底/光晕的局部颜色变化。

## 遇到的问题与判断

1. **（重要）brief 建议的 innerHTML 重渲染在 pointerup 中破坏宿主 click（必要偏差）**：brief Step 6 建议「重设 `.c-navwheel__icon` innerHTML」。初版照此实现后，全量 e2e 出现 5 个回归：mobile-nav「点击应用→目录页推入」「点击目录项→详情页」「返回回退」+ app-shell「收起通道二」「设置模式退出后右窗目录轮回归」。排查（临时 debug spec 捕获 document click）确认：**pointerup 内同步替换 innerHTML 会移除 mousedown 目标 svg → Chromium 抑制后续 click 派发**（`window.__clicks` 为空数组）。而应用壳 dock 推入 / 左窗 toggle 收起恰恰依赖 pointerup 后的 click 收尾。**修复**：`renderItemIcons` 改为**原地改 svg `width/height/stroke-width` 属性**（不替换 innerHTML）—— 分级结果与 e2e 断言（svg width 属性 24>20）完全一致，svg 保持 connected，click 正常派发。修复后 5 个回归全绿（debug spec 证实 click 事件 + stack-page 2 页均正常）。setFocal 逐字不受影响。
2. **初始 `--active` 类**：nav-wheel 现于挂载时即对 item0 加 `--active`（此前挂载无 active 项）。此为实现 brief Step 4 e2e（初始加载断言 active 项）与 Step 6（「按初始 active 决定尺寸」）的必要行为，且与宿主初始逻辑态一致。副作用：组件分区演示实例 item0 初始即 active（components-partition 基线随之重生成，brief 预期）。
3. **e2e 全量首轮偶发超时（非因果，既有）**：首轮全量曾出现 smoke/壳结构/data-display 等若干超时失败，均在同一运行内复跑通过；data-display「进度条达到目标值」隔离复跑 3/3 PASS、全量终跑 85/85 PASS。与 B2-2 留痕「首轮 smoke 冷启动超时偶发」同源（Vite 冷启动/全量负载下 5s 等待边界），本改动不新增动态 import 链，非因果。
4. **视觉基线重生成流程**：`--update-snapshots` 只在差异超阈值时改写，本任务 12 张（app-main/components-partition）超出即重写，motion 6 张阈值内匹配不动。

## 与 brief 的偏差

- **唯一偏差**：Step 6 建议的「重设 innerHTML」改为「原地改 svg 属性」。理由见「问题 1」——innerHTML 替换在 pointerup 内会抑制 Chromium click 派发，破坏应用壳 dock 推入/左窗 toggle 等依赖 click 的宿主行为（实测 5 个 e2e 回归）。原地属性变更实现相同分级视觉与相同 e2e 断言（svg width 属性 24 vs 20），零副作用。功能规格（active 24/2.2、非 active 20/1.8、select 重渲染、setFocal 不动）逐条满足。
- 其余（Step 1/3/4/5/7 测试代码与 CSS 片段）均按 brief 字面落地。

## 提交

- 改动文件：`src/components/icon/icon.js`、`src/components/navigation-wheel/nav-wheel.js`、`src/components/navigation-wheel/nav-wheel.css`、`tests/unit/icon.test.js`（新增）、`tests/e2e/app-shell.spec.js`、`tests/e2e/visual-regression.spec.js-snapshots/`（12 张重生成：app-main 6 + components-partition 6）、`docs/superpowers/sdd/task-B2-3-brief.md`（纳入留痕）、`docs/superpowers/sdd/task-B2-3-report.md`（本报告）、`docs/superpowers/sdd/progress-b2.md`（台账）。
- 未纳入：`src-tauri/Cargo.toml`（工作树既有行尾噪声，非本任务改动，见 ledger base 注记）；`src/app/app-main.css`（brief 列「如需」，实际无需改动）。
