# Task B5-3: iOS 风格组件（徽标 / 按钮 / 悬浮球）— 实施报告

- **状态**：DONE
- **需求源**：docs/superpowers/sdd/task-B5-3-brief.md（唯一需求源，CSS 逐字转录；三处适配披露见「verbatim 适配说明」）
- **分支**：feature/b5-design-language（worktree b5-design-language）

## 任务背景

B5「设计语言统一」第三个任务。三个交互组件 iOS 化，方向是**材质/层次/透明度**而非色彩浓度：
- **徽标 `.c-badge`**：语义 50 实色底 → accent/semantic 12% 透明混色（color-mix）+ 22% 细描边 + 语义色文字。
- **按钮 `.c-btn`**：primary 加顶部内高光 + 柔和彩影（`linear-gradient` 层次 + inset 高光 + accent 彩影）；secondary 白实底 → 玻璃底（呼应壳材质）；hover/active 改用 `filter: brightness()`（paint-only）。
- **悬浮球 `.c-float-ball`**：accent 渐变浓底 → 玻璃底 + 亚克力模糊（`blur/saturate/brightness`，与壳材质一致）+ accent 图标；40→44px（iOS HIG 最小触控区）。

**材质体系不动**：themes.css 零改动，仅消费既有 `--glass-*` / `--acrylic-*` / `--accent-*` / 语义色令牌。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src/components/badge/badge.css` | 整体替换为 brief Step 3 逐字 CSS（tint 底 color-mix 12% + 描边 22% + 语义色文字）；`.c-badge` 及 `--{accent,success,warning,danger,info,default}` 六变体全保留 |
| `src/components/button/button.css` | 按 brief Step 4 修改（保留结构）：`.c-btn` 基类/`:active`/`--sm`/`--lg`/`:disabled` 不动；primary（渐变+内高光+彩影）、secondary（玻璃底）、ghost/danger 视觉替换。原 `:hover background`/`--accent-active` 机制移除（改 `filter` paint-only） |
| `src/components/float-ball/float-ball.css` | 整体替换为 brief Step 5 逐字 CSS（玻璃底 + 亚克力模糊 + accent 图标 + 44px + 内高光 + glow）。HTML 结构（`.c-float-ball` > `.c-float-ball__glow` + svg）与 brief 假设一致，直接替换无结构出入 |
| `tests/e2e/components-basic.spec.js` | 追加 brief Step 1 的「B5-3：徽标/按钮/悬浮球 iOS 风格」断言 + 既有 `--shadow-md` hover 断言重写（见适配说明②） |
| `tests/e2e/visual-regression.spec.js-snapshots/*` | 6 张重生成（app-main × light/dark × indigo/amber/emerald，含悬浮球）；appearance/components/motion 18 张字节不变 |

- **动画红线**：三组件 hover/active 仅动 `transform`/`box-shadow`/`background`/`filter`（paint-only 豁免）；`backdrop-filter` 静态不动画；时长/曲线经 `--dur-*`/`--ease-*` CSS 变量（data-motion=off 归零）。
- **配置链路**：本任务不涉及界面参数新增（纯组件 CSS 视觉改，defaults/store/apply 未动）。
- **材质体系**：themes.css 未改（Windows 亚克力配方保持）。

## TDD 证据

- **Step 1 写失败 e2e**：`tests/e2e/components-basic.spec.js` 追加 brief 的 B5-3 测试（唯一适配：回概览 home 选择器 `.app-main__nav-l`，见适配说明①）。
- **Step 2 RED**：
  - `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "iOS 风格"` → **1 failed**：
    `expect(received).toContain(expected)` — Expected substring `"color(srgb"`，Received string `"rgb(223, 227, 255)"`。原因符合预期：既有 badge 为实色 `--accent-100`（`#dfe3ff`），非 `color-mix` 混色计算值。
- **Step 3/4/5 实现**：badge.css / button.css / float-ball.css 按 brief 逐字替换（见上表）。
- **Step 6 GREEN**：
  - `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js` → **4 passed (24.7s)**（图标 SVG / 按钮四变体计数 7/4/1/1/1 / 主按钮 hover 柔和彩影 / B5-3 iOS 风格）。

## verbatim 适配说明（重要披露）

**① brief 测试的「回概览」home 选择器 `.app-main__nav-r` → `.app-main__nav-l`**

brief 测试行：`await page.locator('.app-main__nav-r .c-navwheel__item[data-id="home"]').click();`（注释「回概览，悬浮球在壳」）。实测 `.app-main__nav-r`（右窗目录轮）在设置模式下渲染 APP_SECTIONS（general/appearance/interface/shortcuts/notify/data/advanced/about/components/motion，`settings-pages.js:37-41`）——**无 `home` 项**，该选择器会 30s 定位超时。`home` 是左窗应用目录轮（`.app-main__nav-l`，`app-main.js:33` MODULES）的项。浮球 `.app-main__float-ball` 恒在壳内（`app-main.js:702-705`，position:fixed），回概览点击本非浮球定位所需，但为忠实 brief 意图（退出设置态回概览）保留该点击并修正为 `.app-main__nav-l`（左窗 home 点击在设置态会 exitSettingsMode，语义正确）。

**② 既有测试「主按钮 hover 阴影使用 --shadow-md 令牌」重写（brief Files 清单未列此改动，Step 6 零回归预期触发）**

brief Step 4 的 primary hover 阴影为逐字 `inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px color-mix(accent-400 40%)` —— 该设计刻意移除 `--shadow-md`（blur 16 中性暗影，Task I3 4d 契约）。原测试断言 `toHaveCSS('box-shadow', /0px 4px 16px/)` 在新 CSS 下必然失败（新值 blur 14 + color-mix）。故按 brief 设计意图重写该断言为：hover 阴影含 `0px 4px 14px`（新 iOS 彩影 blur 14 特征值）+ `inset`（内高光）。语义变化（`--shadow-md` → 柔和彩影）即 B5-3 核心设计，非测试破坏。

**③ 视觉基线变化集比 brief Step 8 预期小（良性）**

brief 预期「components 6 张 + app-main 2 张重生成」。实测仅 **app-main 6 张**重生成（浮球在壳内恒定可见，且 light/dark × 3 accent 全变化——浮球从 accent 渐变实球 → 玻璃球，六组合全部不同）；**components 6 张字节不变**——徽标/按钮矩阵位于设置窗捕获 fold 之下（探针实测：badge 组 y=3453、button 组 y=1056，均 > 视口 720px；`.app-main__settings` 容器高 8626px 无内滚，元素截图仅含顶部 `核心导航` 组），与 B5-2 滑杆同型既有基线局限。appearance/motion 零变化（符合 brief 预期）。徽标/按钮视觉由 e2e 样式断言覆盖（color-mix/inset），截图基线不承载。

## 视觉基线解码比对（先比对、后提交）

方法：PIL 程序化差分（本环境 Read 图片渲染不可靠，与 B5-1/2 同法）。6 张 app-main 失败对逐一分析：

- **diff bbox 全部局部化于右下角**：`(1193-1196, 642-644) → (1280, 720)`，即浮球区域（right:16/bottom:16、44px 球 + 玻璃投影外扩）。
- **变化像素占比仅 0.56-0.60%**；逐 8px 行带分析：所有 diff 行集中于 y640-720（浮球所在带），**y640 以上零变化**——无整页/布局移位，无其他 UI 区变化。
- **旧（expected）vs 新（actual）采样**：球体区域新旧色差接近全强度（diff 行峰值 662-673，即渐变实球 vs 玻璃球），边角 AA 像素差异仅 ±1-3/channel（玻璃投影过渡）。
- **结论**：6 张差异**仅为浮球视觉**（accent 渐变浓底 → 玻璃底 + accent 图标，40→44px），无布局破坏、无配色意外，可提交基线。`--update-snapshots` 后恰 6 张 png 变更（app-main-{light,dark}-{indigo,amber,emerald}），appearance/components/motion 18 张未触碰。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "iOS 风格"`（改前） | **1 failed**（RED：badge bg `rgb(223,227,255)` 实色，非 color(srgb)） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js`（改后） | **4 passed**（GREEN） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js`（更新前） | 6 failed \| 18 passed（失败恰为 app-main 6 张，含浮球；解码比对后确认仅浮球差异） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` | **24 passed**，6 张重生成（app-main）；appearance/components/motion 字节不变 |
| `npx playwright test --config=playwright.config.worktree.js`（全量 e2e，前台） | 首次 106 passed / 2 failed（mount 超时 flake，见下）→ 单独复跑两 spec 38/38 → **并集 108/108 全绿** |
| `npm test` | 14 files / **64 passed** |
| `npm run build` | 通过（Vite，✓ built in 838ms） |

> **全量 e2e flake 说明**：全量首轮 2 例失败为 `app-shell.spec.js:109`（`.app-main__welcome` 5s toBeVisible 超时——**B5-2 记录过的同型 flake**）与 `mobile-nav.spec.js:106`（`.ml-card` 5s 计数超时，动效分区惰性挂载）——均为应用壳 mount/惰性挂载超时，与三组件 CSS 无关（badge/btn/float-ball 断言全绿，108 用例含全部相关 spec）。单独复跑 app-shell + mobile-nav 两 spec **38/38 通过**，判定环境 flake（共享 checkout tauri dev + 陈旧 5173 + MCP + 108 用例双 worker 资源紧张），非代码回归。

## Self-review 结论

- **规格符合**：badge.css / float-ball.css 逐字按 brief 整体替换；button.css 按 brief 替换视觉块、基类结构/尺寸（sm/lg/disabled）原样保留。六徽标变体、浮球 glow 结构、按钮四变体计数 7/4/1/1/1 全保留。
- **动画红线**：primary/secondary hover/active 仅 `filter`/`box-shadow`/`background`（paint-only）；浮球 hover 仅 transform/box-shadow；`backdrop-filter` 静态；时长/曲线全经 CSS 变量。
- **配置链路**：未新增参数；themes.css 未改（材质体系不动）；`--glass-*`/`--acrylic-*` 纯消费。
- **TDD 完整性**：RED（1 failed：badge 实色）→ GREEN（4 passed）证据完整记录。
- **偏差披露**：① 回概览 home 选择器修正 `.app-main__nav-r`→`.app-main__nav-l`；② `--shadow-md` hover 测试按新 iOS 彩影重写；③ 基线仅 app-main 6 张重生成（components 徽标/按钮在 fold 下字节不变，比 brief 预期小）。
- **质量**：单测 64/64、全量 e2e 108 用例并集全绿、build 通过。
- **结论**：Ready to merge（DONE）。

## 备注 / 关注点

- **primary hover 阴影不再消费 `--shadow-md`**：B5-3 设计以柔和彩影（`color-mix(accent-400 40%)` 硬编码 blur 14）替代中性令牌影，因此**不再随 shadow-intensity 定制器缩放**——brief verbatim CSS 的既定后果（与 B5-2 胶囊 track 静态 50% 同型），建议 B5-5/最终评审分诊是否需把彩影 blur 令牌化。
- **徽标/按钮视觉无截图基线覆盖**：两矩阵在设置窗捕获 fold 之下（既有局限，同 B5-2 滑杆），视觉改由 e2e 样式断言兜底。若后续需像素级锁定，需在视觉回归加 fold 外滚动捕获（超出本任务范围）。
- **浮球 44px（40→44）**：brief 有意为之（HIG 最小触控区），且 `--radius-full` 保持圆形；app-main 基线已重生成。
- `playwright.config.worktree.js`（worktree 本地配置，端口 5174）**未提交**。
- `docs/superpowers/sdd/review-B5-1.diff`、`review-B5-2.diff` 为前序任务遗留未跟踪文件，不属本任务，未入库。
- 临时产物（b53-analyze.py、b53-probe.spec.js）已删除。
- 提交惯例：feat + docs 两枚提交（docs 承载本报告/简报/台账）。
