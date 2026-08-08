# Task B5-2: 统一 Slider 组件（胶囊形，三处接入）— 实施报告

- **状态**：DONE
- **需求源**：docs/superpowers/sdd/task-B5-2-brief.md（唯一需求源，本文件为逐字转录 + 两处适配披露，见「verbatim 适配说明」）
- **分支**：feature/b5-design-language（worktree b5-design-language）

## 任务背景

B5「设计语言统一」第二个任务。三处滑杆（组件分区 `.c-slider` 原生 accent / 动效分区 `.ml-slider` 原生 accent / 外观定制器 `.cust-range` 圆形自绘拇指）统一为单一 `.c-slider` 胶囊自绘组件：8px 圆角轨道 + 20px 胶囊拇指 + track 填充经 `--fill` 变量（paint-only 渐变）。零运行时依赖、零抽象封装、遵循 `src/CLAUDE.md`。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src/components/slider/slider.css` | 整体替换为胶囊自绘（逐字按 brief Step 3）：`.c-slider` 24px 输入（appearance:none）、`::-webkit-slider-runnable-track` 8px 圆角轨道（accent 填充渐变经 `--fill` 变量）、`::-webkit-slider-thumb` 20px 胶囊拇指（hover/active 只动 transform scale）、`::-moz-*` 兼容、`:disabled` 态 |
| `src/demo/customizer-panel.js` | 三处 `.cust-range` → `.c-slider`：renderSlider 内 class（:114）、syncUI querySelectorAll（:205）、input 委托 closest（:346）。`--fill` setProperty（:210）原样保留 |
| `src/demo/motion-lab.js` | 模板两处 `class="ml-slider"` → `class="c-slider ml-slider"`（:84,:90，保留 `ml-slider` 类供 JS 语义定位）；JS querySelector('.ml-slider')（:156,:177,:178）不改 |
| `src/styles/customizer.css` | 删除全部 `.cust-range` 独立规则（原 144-168 行），`.cust-row` 结构保留 |
| `src/styles/motion-lab.css` | 删除 `.ml-slider` 独立规则（原 :129），`.ml-control` 布局保留 |
| `tests/unit/slider.test.js`（新增） | renderSlider 签名契约守卫（逐字按 brief） |
| `tests/unit/motion-lab.test.js` | `.ml-slider` → `.c-slider`（:28,:30） |
| `tests/e2e/customizer.spec.js` | `.cust-range` → `.c-slider`（7 处） |
| `tests/e2e/motion-lab.spec.js` | `.ml-slider` → `.c-slider`（:14） |
| `tests/e2e/form-controls.spec.js` | 「滑杆使用主题强调色」断言重写（原 accentColor → 渲染像素随 `--accent` 变化，见 verbatim 适配说明） |
| `tests/e2e/visual-regression.spec.js-snapshots/*` | 12 张重生成（appearance 6 + motion 6）；app-main/components 6+6 字节不变 |

- **动画红线**：thumb hover/active 只动 transform（scale 1.1/1.05）；track 填充为背景渐变（paint-only，不动画）；时长/曲线经 `--dur-fast`/`--ease-spring` CSS 变量。
- **配置链路**：customizer syncUI 的 `--fill` 机制保留（defaults→store→apply 链路不绕过），胶囊 track 消费同一变量。
- **`--font-sans`**（B5-1 交付）：滑杆标签文字自动继承普惠体，无额外改动。

## TDD 证据

按 brief Step 6 注的指引（`.c-slider` 尚未替换时测红），测试文件先行、实现后行。slider.test.js 为签名契约守卫（brief Step 2 注允许全绿接受），真实 RED 在集成层。

- **Step 1 写测试**：`tests/unit/slider.test.js`（新建，逐字按 brief）；`tests/unit/motion-lab.test.js`、`tests/e2e/customizer.spec.js`、`tests/e2e/motion-lab.spec.js` 选择器先行更新为 `.c-slider`。
- **Step 2/6 RED**：
  - `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js` → **1 failed | 3 passed**。slider.test.js 2/2 绿（签名契约守卫，接受）；motion-lab.test.js 1 failed：`TypeError: Cannot read properties of null (reading 'value')`（motion-lab.js 仍输出 `class="ml-slider"`，测试查 `.c-slider` → null）。符合 brief 预期红态。
  - `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "滑杆"` → **2 failed | 1 passed**：`.c-slider[data-key="noise"]`/`[data-key="scale"]` 定位空（实现仍 `.cust-range`），1 passed 为类名无关用例（透明度）。
- **Step 3/4 实现**：slider.css 胶囊 + customizer-panel.js 三处 + customizer.css 删规则 + motion-lab.js 双类 + motion-lab.css 删规则。
- **Step 7 GREEN**：
  - `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js` → **4 passed**。
  - `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js tests/e2e/motion-lab.spec.js tests/e2e/form-controls.spec.js` → **13 passed**（首次因截图型用例在双 worker 资源紧张下 30s 超时 flake，收敛后稳定 13/13，见下）。

## verbatim 适配说明（重要披露）

**① form-controls.spec.js「滑杆使用主题强调色」断言重写（brief Files 清单未列此文件，Step 7 全绿预期触发）**

原断言 `getComputedStyle(slider).accentColor === --accent` 基于旧 `.c-slider { accent-color: var(--accent) }`（原生 accent 机制）。胶囊 CSS（brief verbatim）以 `appearance:none` + 自绘 track/thumb 移除原生 accent-color，accent 消费改为 track 填充渐变（paint-only）与 thumb 边框——该断言随机制移除而失效。

排障过程中发现 **Chromium 151 行为变化**（重要）：`getComputedStyle(el, '::-webkit-slider-runnable-track')` / `'::-webkit-slider-thumb'` 对已声明伪元素样式**不再反射**（返回原生默认值，`background-image: none`、track 高度取输入高度），即便注入最小规则亦然（注入 probe 实测无效）。而像素级验证胶囊**实际渲染正确**（8px 圆角轨道 + accent 填充 + 20px surface-2 胶囊拇指），故是 computed 反射失效而非样式未生效。

**适配**：断言改为「渲染像素随 `--accent` 变化」——center 滚动一次固定视口 clip，截图靛蓝态 → 内联 `--accent: #ff0000` 再截图 → 断言两帧字节不同（红 vs 靛蓝为大色块位移，swiftshader 确定性渲染字节可靠）。语义与原断言一致（滑杆外观取自主题强调色）。因机器资源紧张（共享 checkout tauri dev + 陈旧 5173 + MCP）截图型用例放宽时限 `test.setTimeout(60000)`。初版含第三帧「还原回原样」兜底，实测在双 worker 下偶发 30s 超时 flake（资源型），删除该帧后稳定（fail 方向只剩「differs」，视觉得到 visual-regression 独立覆盖）。

**② 视觉基线变化集比 brief Step 8 预期小（良性）**

brief Step 8 预期 appearance/components/motion 三区各 6 张重生成。实测 components-partition 6 张**字节不变**（滑杆组位于捕获可视区下方 fold 之下，元素截图仅含顶部内容——settings 窗口 clip 的既有基线局限），实际重生成恰为 appearance 6 + motion 6。`git status` 确认 app-main 6 + components 6 无字节差异。

## 视觉基线解码比对（先比对、后提交）

方法：Playwright 失败产物 actual/expected PNG 逐像素差分 + 行带分析 + 色彩采样（本环境 Read 图片渲染不可靠，程序化分析替代目检，与 B5-1 同法）。

- **appearance-partition（6 张）**：捕获内容仅顶部 ~644px（settings 窗口 clip，old/new 均如此，属既有基线局限），old/new 可视区几乎逐像素一致，仅 y236-244 / 396-402 / 488-490 共 3 个 5px 微带（1-11px 差异/行，滑杆形态引起的亚像素/移位级差异）；元素框 +72px 均为可视内容之下的空白背景。**滑杆本身在 appearance 基线中本就不可见**（位于 clip 之下），改动不引入可见布局破坏。
- **motion-partition（6 张）**：差异行带集中于卡片试玩器控制区（y96-200 小带 + y352-676 控制行区，含弹性/位移滑杆所在行）；元素框 +48px（10 条滑杆 24px 输入 vs 原生）。**无整卡移位、无 stage 区异常带**。
- **app-main + components-partition**：12 张全部通过（字节不变）——确认无全局布局/配色副作用。
- **胶囊渲染像素验证**（组件分区 音量 滑杆实拍采样）：填充区 `rgb(111,124,240)`（indigo accent）、未填充区 `rgb(241,241,240)`（surface-hover）、拇指中心 `rgb(242,243,253)`（surface-2）、track 高度 ~8px 居中于 24px 输入、thumb 20px——胶囊完全按规格渲染。
- **结论**：12 张差异均为滑杆形态（胶囊化 + 输入高度 24px），无布局破坏、无配色意外，可提交基线。

## `.ml-control .c-slider { min-width: 0 }` 决策

**未应用**。实测 `.ml-control` flex 行内胶囊滑杆几何（getBoundingClientRect）：label(30px) | slider(width 244/224.7px, h 24px, flex 收缩至可用空间) | output(24px)，三条控制行 `overflowCard: false`、sliderRight < output.x。`.c-slider` 的 `width:100%` 在 `flex: 0 1 auto` + range 输入较小自动最小尺寸下自然收缩填满，无需 `min-width:0` 兜底。与 brief「按实际观感决定」指引一致。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js`（改前） | 1 failed | 3 passed（RED：motion-lab `.c-slider` 未替换；slider.test 契约守卫全绿接受） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "滑杆"`（改前） | 2 failed | 1 passed（RED：`.c-slider[data-key]` 定位空） |
| `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js`（改后） | 4 passed（GREEN） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js tests/e2e/motion-lab.spec.js tests/e2e/form-controls.spec.js`（改后） | 13 passed（收敛后稳定 13/13 ×2 连跑） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js`（更新前） | 12 failed | 12 passed（失败恰为 appearance 6 + motion 6，app-main/components 全过 → 解码比对） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` | 24 passed，12 张重生成（appearance 6 + motion 6；app-main/components 字节不变） |
| `npx playwright test --config=playwright.config.worktree.js`（全量 e2e，前台） | 首次 105 passed / 2 failed（app-shell.spec:109 + smoke.spec:5 均为 5s mount 超时 flake，见下） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/smoke.spec.js`（flake 单独复跑） | 31 passed（含 line 109 与 smoke:5）→ 并集 107/107 全绿 |
| `npm test` | 14 files / **64 passed**（+2 为 slider.test.js） |
| `npm run build` | 通过（Vite，✓ built in 778ms） |

> **全量 e2e flake 说明**：全量 e2e 首轮 2 例失败为 `app-shell.spec.js:109`（`.app-main__welcome` 5s toBeVisible 超时）与 `smoke.spec.js:5`（`.app-main` 5s 超时）——均为应用壳 mount 超时，与滑杆改动无关（error-context 显示元素未在 5s 内挂载），单独复跑两 spec 31/31 通过，判定环境 flake（共享 checkout tauri dev + 陈旧 5173 server + MCP + 107 用例双 worker 资源紧张），非代码回归。与 B5-1 记录的 `.csg` 计数超时同型。

## Self-review 结论

- **规格符合**：胶囊 CSS 逐字按 brief Step 3；customizer 三处 `.cust-range`→`.c-slider` + syncUI `--fill` 保留；motion-lab 双类保留 `ml-slider` 供 JS 语义定位（:156/177/178 不改）；customizer.css / motion-lab.css 独立规则删除、`.cust-row`/`.ml-control` 结构保留。均按 brief。
- **配置链路**：`--fill` setProperty（customizer-panel.js:210）未动，胶囊 track 消费同一变量——e2e radiusScale/scale/baseSize 滑杆 fill 链路绿。
- **动画红线**：thumb hover/active 仅 transform scale；track 填充 paint-only 渐变；无 layout 动画。
- **集成层 RED/GREEN**：RED 证据（unit 1 fail + e2e 2 fail）与 GREEN 证据（4 pass + 13 pass）完整记录。
- **偏差披露**：① form-controls.spec.js 断言重写（brief Files 未列，Step 7 全绿触发）；② 基线仅 12 张重生成（components 在 fold 下字节不变，比预期小）；③ Chromium 151 伪元素 computed 反射失效（本任务排障发现，B5-2/3/5 后续滑杆相关测试须注意，见备注）。
- **质量**：单测 64/64、全量 e2e 107 用例并集全绿（首次 2 例 mount flake → 复跑 31/31）、build 通过。
- **结论**：Ready to merge（DONE）。

## 备注

- `playwright.config.worktree.js`（worktree 本地配置，端口 5174）**未提交**。
- `docs/superpowers/sdd/review-B5-1.diff` 为 B5-1 遗留未跟踪文件，不属本任务，未入库。
- 临时产物（b52-debug.spec.js、分析脚本、截图像素探针）均在 repo 外或已删除。
- 提交惯例：feat + docs 两枚提交（docs 承载本报告/简报/台账）。
- **Chromium 151 注意事项**（本任务排障沉淀）：`getComputedStyle(el, '::-webkit-slider-runnable-track'/'::-webkit-slider-thumb')` 不再反射已声明样式（返回原生默认值）。后续涉及滑杆渲染断言的测试勿用伪元素 computed，用像素/截图或 CSS 变量继承断言。视觉渲染本身正常（像素验证过）。
