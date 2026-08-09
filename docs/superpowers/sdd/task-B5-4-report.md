# Task B5-4: 自适应布局（限宽居中 + 分区撑满）— 实施报告

- **状态**：DONE
- **需求源**：docs/superpowers/sdd/task-B5-4-brief.md（唯一需求源，CSS/e2e 逐字转录）
- **分支**：feature/b5-design-language（worktree b5-design-language）

## 任务背景

B5「设计语言统一」第四个任务。内容区自适应窗口宽度：`.app-main__page` max-width 720 → 1080 限宽居中（`margin-inline: auto`），以 `data-layout` 区分两种模式：

- **`data-layout="center"`**（概览/应用页）：限宽 1080 居中 —— 表单/概览观感克制。
- **`data-layout="fluid"`**（设置页整体，含表单分区）：`max-width: none` 撑满内容区 —— 组件/动效展示分区自然铺满；表单分区靠既有 `.csettings__field` 420px 自限宽（settings-window.css:64）克制观感。

字号间距恒定：不引入窗口比例缩放，`--font-size-base` 保持配置驱动，与窗口尺寸解耦。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src/app/app-main.css` | `.app-main__page` `display:none; max-width:1080px; margin-inline:auto`（720→1080 + 居中，brief Step 3 逐字）；新增 `.app-main__page[data-layout="fluid"] { max-width:none; margin-inline:0 }` |
| `src/app/app-main.js` | MODULES 渲染 section 加 `data-layout="center"`（含 home 概览页）；settings section 加 `data-layout="fluid"`（brief Step 4 逐字） |
| `tests/e2e/app-shell.spec.js` | 追加 brief Step 1 的「B5-4：自适应布局 data-layout」e2e 测试（逐字） |
| `tests/e2e/visual-regression.spec.js-snapshots/*` | **24 张全量重生成**（app-main 6 + appearance 6 + components 6 + motion 6）——内容区 720→1080 栅格扩列/铺满，计划预期「大部分分区重生成」 |

- **动画红线**：纯布局改动，零动画（仅改 width/居中 + data-layout 类，不动画属性）。
- **配置链路**：本任务不涉及界面参数新增（纯布局/类名，defaults/store/apply 未动）。

## TDD 证据

- **Step 1 写失败 e2e**：`tests/e2e/app-shell.spec.js` 追加 brief Step 1 的 B5-4 测试（逐字，无适配）。
- **Step 2 RED**：
  `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"` → **1 failed**：
  `expect(locator).toHaveAttribute('data-layout', 'center') failed — Expected: "center" / Received: ""（Locator: .app-main__page[data-page="home"]）`。原因符合预期：`data-layout` 属性尚未渲染（app-main.js 未设），CSS 也无 fluid 规则。
- **Step 3/4 实现**：app-main.css 改自适应（720→1080 居中 + fluid 规则）；app-main.js MODULES/settings 设 `data-layout`（见上表）。
- **Step 6 GREEN**：
  `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"` → **1 passed (10.6s)**；随后全文件 → **31 passed**（零回归）。

## Step 5 决策：分区内限宽（不施加）

**决策：不加** `.app-main__settings .csettings__page { max-width:1080px; margin-inline:auto }` —— 遵循 brief 默认（「先按设置页整体 fluid 验证观感」）。

**视觉证据**（一次性 Playwright 截图，2560×1440 与 1400×900 视口，用后即删，未入库）：

- **`general-2560`**：设置「通用」表单分区整体撑满内容区，但各表单字段经 `.csettings__field` 420px 上限保持窄列、左对齐，右侧为留白——观感不松散（每字段自身窄 420px，行内空距克制成段，非拉宽成通栏），与 brief「420px 自限宽已约束，通常无碍」判定一致。
- **`components-2560`**：组件矩阵分区铺满，栅格随宽度扩列（组内卡片列数增多）——fluid 目标达成。
- **`overview-2560`**：概览页 max-width 1080 居中，左右对称留白，快捷入口卡栅格扩列——center 目标达成。

超大窗口（2560）下表单分区未出现「失控拉宽」观感，故不加分区内限宽；若后续 B5-5/最终评审在更大窗口（如 4K）判定松散，可按 brief Step 5 补加并调整基线。

## 视觉基线解码比对（先比对、后提交）

**方法**：本环境 Read 图片渲染不可靠（与 B5-1/2/3 同法），采用程序化像素比对（PowerShell System.Drawing）+ 尺寸分析。

**尺寸变化**（expected → actual，1280×720 视口）：

| 分区 | expected | actual | 解读 |
|---|---|---|---|
| app-main（概览整窗） | 1280×720 | 1280×720 | 同视口尺寸，内容扩列/居中 |
| components | 720×8626 | **1088×8160** | 变宽 + 变矮 = 栅格扩列（列数增、行数减） |
| appearance | 720×1814 | **1088×1814** | 仅变宽、等高 = 内容拉伸铺满（无栅格重排） |
| motion | 720×1221 | **1088×840** | 变宽 + 变矮 = 栅格扩列 |

内容区宽 720 → 1088（1280 视口内容区实际宽），与 `max-width:1080` 目标一致；仅 `components/motion` 高度下降（`repeat(auto-fill/minmax)` 栅格扩列）。

**像素级验证（appearance-partition，证明非字体/颜色变化）**：appearance 等高（1814），取 expected 全宽 720 与 actual 左 720px 逐像素差分——

- **diff 行带分布**：差异**全部局部化于顶部 rows 120-600**；**rows 720-1814 零差异（像素级一致）**。外观分区顶部为全宽定制器网格/滑杆（`cust-accent-grid repeat(3,1fr)` 卡片、`.cust-semantic` flex-wrap 条、`.cust-row .c-slider` 轨道）——容器 720→1088 时这些全宽组件**拉伸/重排**，产生局部位移；底部为 `.csettings__field` 420px 自限宽表单，布局不变、像素一致。
- **结论**：若为字体族/配色全局变化，diff 会均匀散布整页（所有文字/颜色重渲染）；实测差异集中于全宽组件行带、底部表单逐像素一致 → **差异仅为布局宽度（内容拉伸/栅格扩列），非字体/颜色意外变化**。CSS/JS diff 本身也纯为宽度/类名，无任何字体/颜色令牌变更。

`--update-snapshots` 后恰 24 张 png 重生成（4 分区 × light/dark × 3 accent），复跑视觉回归 **24 passed**。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"`（改前） | **1 failed**（RED：`data-layout` 属性 null） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "data-layout"`（改后） | **1 passed**（GREEN） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js` | **31 passed**（零回归） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js`（更新前） | 24 failed（解码比对确认纯布局宽度差异后提交） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` | **24 passed**，24 张重生成 |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js`（复跑） | **24 passed**（基线稳定） |
| `npx playwright test --config=playwright.config.worktree.js`（全量 e2e，前台） | 首次 108 passed / 1 failed（mount 超时 flake，见下）→ 单独复跑该用例 **1 passed** → 全量并集 109/109 绿 |
| `npm test` | 14 files / **64 passed** |
| `npm run build` | 通过（Vite，✓ built in 842ms） |

> **全量 e2e flake 说明**：全量首轮 1 例失败为 `app-shell.spec.js:195`「冷启动应用持久化配置」（`page.reload()` 后 `.app-main` 5s toBeVisible 超时）。该用例在先前完整 app-shell 运行中已通过，且失败为 reload 后 mount 等待超时（非崩溃/断言语义失败）。单独复跑该用例 **1 passed (4.6s)**，判定环境 flake（共享 checkout tauri dev + 陈旧 5173 + MCP + 109 用例双 worker 资源紧张），与 B5-1/2/3 记录的 mount/惰性挂载超时 flake 同型，非本任务代码回归。

## Self-review 结论

- **规格符合**：app-main.css 逐字按 brief Step 3；app-main.js 逐字按 brief Step 4；e2e 测试逐字按 brief Step 1。无 verbatim 适配。
- **动画红线**：零动画（纯布局/类名改动）。
- **配置链路**：未新增参数；defaults/store/apply 未动。
- **TDD 完整性**：RED（`data-layout` null）→ GREEN（1 passed）证据完整记录；app-shell 全文件 31 passed 零回归。
- **Step 5 决策**：不加分区内限宽（默认），2560×1440 视口截图证据确认表单 420px 自限宽观感克制（记录见上）。
- **视觉基线**：24 张重生成前已解码比对（尺寸 + 像素行带分析），确认仅布局宽度差异，无字体/颜色变化。
- **质量**：单测 64/64、全量 e2e 109 用例并集全绿、build 通过。
- **结论**：Ready to merge（DONE）。

## 备注 / 关注点

- **settings 分区（外观/通用等）随设置页整体 fluid**：表单类分区观感靠 `.csettings__field` 420px 自限宽（已约束，见 Step 5 证据）；外观分区内全宽组件（accent 卡栅格/滑杆/语义条）随宽度拉伸——为 brief 既定模型（「设置页整体 data-layout=fluid」）。
- **字号间距恒定确认**：未引入任何窗口比例缩放逻辑；`--font-size-base` 等令牌与窗口尺寸解耦（仅内容容器宽度变化）。
- **视觉基线全量重生成**（24 张）比 B5-1/2/3 大——因本任务改动内容区容器宽度（720→1080），栅格扩列是计划预期（「大部分分区重生成」）。
- `playwright.config.worktree.js`（worktree 本地配置，端口 5174）**未提交**。
- 临时产物（scratch-b54-shot.mjs、test-results/decode、test-results/b54-*.png）已删除；`docs/superpowers/sdd/review-B5-1/2/3.diff` 为前序任务评审遗留未跟踪文件，不属本任务，未入库（与 B5-3 报告同惯例）。
- 提交惯例：feat + docs 两枚提交（docs 承载本报告/简报/台账）。
