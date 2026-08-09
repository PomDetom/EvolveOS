# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md

分支：feature/b6-page-style-refresh（自 main 0171b0b 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [x] Task B6-1: 背景装饰多样式（强化网格 + dots/diagonal/waves/aurora + 8 预览卡）
- [ ] Task B6-2: 悬浮球去光晕（删 glow + 中性 hover 投影）
- [ ] Task B6-3: 按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌）
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

### B6-2 悬浮球去光晕

### B6-3 按钮扁平实心
