# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md

分支：feature/b6-page-style-refresh（自 main 0171b0b 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [x] Task B6-1: 背景装饰多样式（强化网格 + dots/diagonal/waves/aurora + 8 预览卡）
- [x] Task B6-2: 悬浮球去光晕（删 glow + 中性 hover 投影）
- [x] Task B6-3: 按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌）
- [ ] 最终整体评审 + 合并 main + 合并后全量回归

## 任务进度

### B6-1 背景装饰多样式（强化网格 + dots/diagonal/waves/aurora + 8 预览卡）— complete

- **实施**：`app-main.css` data-backdrop 预设 4→8（grid 强化 2px/24px/交点圆点/40% accent + 新增 dots/diagonal/waves/aurora）；`app-main.js` BD_LABELS 8 键 + 选择器改 8 迷你预览卡（swatch+label）；`partitions.css` 新增 `.app-main__backdrop-card*`（移除旧胶囊样式）；单测 `tests/unit/backdrop.test.js` 新建；e2e 新增 B6-1 用例 + 同步 B2-2 用例（opt→card）。
- **TDD**：RED 4 failed（`[data-backdrop="dots"]`、`24px 24px`、BD_LABELS 键序、预览卡类缺失）→ GREEN 4 passed。
- **测试**：e2e 全量 114 passed（含 app-shell 32）；单测 69 passed；build ✓。
- **视觉基线**：先 canvas 解码比对确认差异仅选择器（胶囊→卡）+ 74px 内容下移，无字体/布局/组件漂移；`--update-snapshots` 重生成 6 张 appearance-partition（app-main/components/motion 零变化）。
- **提交**：feat `1483670`（代码+测试+基线）；docs `7d591af`（报告 + 本账本 + brief）。
- **评审**（独立评审）：Spec ✅ 符合全部要求；Important 1 + Minor 2。

### B6-1 ... — fix round 1/5（Important 修复完成）

- **Important（评审提出）**：`partitions.css` `.app-main__backdrop-sel` `max-width:480px` < 8 卡所需 504px（8×56 + 7×8 间隙）→ 桌面宽度确定性 7+1 换行，第 8 卡孤立。
  - **修复**：`.app-main__backdrop-sel-opts` 改 `display:grid; grid-template-columns: repeat(4, 56px)` → 4×2 平衡网格（248px 宽，卡保持竖向约 56×44）。激活态/描边过渡、`data-bd`/`aria-pressed`/swatch 图案规则不动。
  - **基线**：先 canvas 解码比对确认差异仅卡区排列（7+1→4×2，bbox 限 y 85-190、total 14,810px，y>200 全零），`--update-snapshots` 重生成 6 张 appearance-partition。
  - **测试**：单测 4 passed；B6-1 e2e 1 passed；app-shell 32 passed；全量 e2e 114 passed（两轮含单测无关 flake：components/motion 挂载、亚克力两档 —— 隔离重跑均绿，终轮全绿）；`npm test` 69 passed；`npm run build` ✓。
  - **提交**：feat（修复）`440b563`；docs 本提交（报告 + 本账本）。
- **Minor（deferred，最终评审 triage）**：① grid 预设 `circle at 12px 12px` 圆点落在格心而非交点——计划书 CSS 与规格 §3.1「交点圆点」意图相左（plan 内部张力，实施者按计划原样执行非缺陷）；② 预设图案在 app-main.css / partitions.css 双文件重复（计划允许 swatch 独立规则，维护需双改耦合）。
- **评审闭环**：定点复审 Important ADDRESSED（`grid-template-columns: repeat(4,56px)` 4×2 平衡网格，无孤立卡），无新 Critical/Important 破坏。**Task B6-1: complete（commits 1483670..a53610b，review clean）**。

### B6-2 悬浮球去光晕（删 glow 环 + hover 中性投影）— complete

- **实施**：`float-ball.css` 删 `.c-float-ball__glow` 全部规则，hover 阴影 `0 8px 22px var(--accent-300)` → 中性 `var(--shadow-md)`（blur-16，随 shadow-intensity 缩放）；`float-ball.js` 删 glow span 渲染点 + 注释同步；e2e `components-basic.spec.js` 新增 B6-2 用例。保留上浮 2px + 内高光 + 静止 `--glass-shadow` + backdrop-filter。
- **TDD**：RED 1 failed（glow count 断言 Expected 0 Received 1）→ GREEN 1 passed；components-basic 全文件 5 passed。
- **用例适配（brief verbatim 在本库不红，两因）**：①壳挂载期惰性 append 悬浮球，未等挂载直接 count 断言踩空 DOM（首跑 GREEN 即此）→ 先 `toBeVisible` 再断言；②`--accent-300` 为纯 hex 非 color-mix，旧彩影计算值 `rgb(...) 0px 8px 22px` 同时满足 `not color(` 与 `rgb` → 追加 blur-16/22 特征值判别（`--shadow-md` = `0 4px 16px`）。
- **测试**：全量 e2e 113 passed + 2 flake（app-shell 分区挂载 / title-bar mock 调用，隔离重跑均绿，同型于 B6-1 记录）；单测 69 passed；build ✓。
- **视觉基线**：24/24 passed 零基线变化（静止 glow opacity 0、静止 box-shadow 未改）→ 不 update-snapshots。
- **提交**：feat `1cd42a3`（CSS+JS+用例）；docs 本提交（报告 + 本账本 + brief）。
- **评审**（独立评审）：Spec ✅ 符合全部要求；无 Critical/Important；Minor 3。Task quality Approved。
- **Minor（deferred，最终评审 triage）**：① `components-basic.spec.js`「neutral」仅经 blur 值间接判别（`--accent-300` 为纯 hex，同 blur 的 accent 彩影可通过全部断言）——可加固为断言外层阴影色 = 解析后 `--shadow-md` 色；② hover 后立即读 computed box-shadow，transition 200ms 存在时序敏感性（实测稳定，shadow-list 外层→inset 不可插值故 snap）；③ `float-ball.css` `.c-float-ball { position: relative }` 原仅供已删 glow 的 absolute 定位，现疑为 vestigial（可选清理）。
- **评审闭环**：**Task B6-2: complete（commits 1cd42a3..11615a6，review clean）**。

### B6-3 按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌）— complete

- **实施**：`button.css` primary 渐变+内高光+`--shadow-glow` 彩影 → 实色 `var(--accent)` + `var(--accent-contrast)` + 中性 `var(--shadow-sm)`；hover theme-aware（light 混 black / dark 混 white，经 `:root[data-theme]`，88%）；active 沿用基类 scale(0.97)；danger 同机制（去 `filter: brightness`）；`themes.css` 删 `--shadow-glow`/`--shadow-glow-hover` 令牌（原 143-149 行）；e2e 新增 B6-3 用例 + 同步「主按钮 hover」与 B5-3 按钮断言。
- **TDD**：RED 3 failed（渐变尚在 / inset 尚在 / 旧 hover 彩影尚在）→ GREEN 6 passed。
- **用例适配（brief verbatim 不红两因）**：①Chromium 151 将 `color-mix(..., black)` 计算值序列化为 `oklab(...)` 而非 `color(srgb` → 改 canvas 解析任意 CSS 色为 rgba → Rec.709 亮度，比对 `light < accent < dark` 三档方向性（与序列化格式解耦）；②视觉基线按钮在设置窗 fold 下（components 分区截图仅含顶部 ~816px，按钮矩阵 y=930）→ 基线零变化。
- **测试**：全量 e2e 115 passed + 1 flake（app-shell「亚克力两档」`data-glass` 时序，隔离重跑绿，同 B6-1 记录型）；单测 69 passed；build ✓；`grep -r "shadow-glow" src/ tests/` 零命中。
- **视觉基线**：24 张 `--update-snapshots` 重生成后与原基线 sha1 逐字节一致 → 零改动不提交（解码比对确认按钮在 fold 下）。
- **提交**：feat `ebf9fa5`（CSS+令牌+用例）；docs `393f6fd`（报告 + 本账本 + brief）。
- **评审**（独立评审）：待最终整体评审。
- **关注点**：规格 §5 写 hover 混 92% 而 brief/计划书为 88%，以 brief 为准；`.c-btn` transition 仍留 `filter` 兜底项（brief 明确保留），可留收尾清理。
