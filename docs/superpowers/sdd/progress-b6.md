# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md

分支：feature/b6-page-style-refresh（自 main 0171b0b 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [ ] Task B6-1: 背景装饰多样式（强化网格 + dots/diagonal/waves/aurora + 8 预览卡）
- [ ] Task B6-2: 悬浮球去光晕（删 glow + 中性 hover 投影）
- [ ] Task B6-3: 按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌）
- [ ] 最终整体评审 + 合并 main + 合并后全量回归

## 任务进度

### B6-1 背景装饰多样式（强化网格 + dots/diagonal/waves/aurora + 8 预览卡）— complete

- **实施**：`app-main.css` data-backdrop 预设 4→8（grid 强化 2px/24px/交点圆点/40% accent + 新增 dots/diagonal/waves/aurora）；`app-main.js` BD_LABELS 8 键 + 选择器改 8 迷你预览卡（swatch+label）；`partitions.css` 新增 `.app-main__backdrop-card*`（移除旧胶囊样式）；单测 `tests/unit/backdrop.test.js` 新建；e2e 新增 B6-1 用例 + 同步 B2-2 用例（opt→card）。
- **TDD**：RED 4 failed（`[data-backdrop="dots"]`、`24px 24px`、BD_LABELS 键序、预览卡类缺失）→ GREEN 4 passed。
- **测试**：e2e 全量 114 passed（含 app-shell 32）；单测 69 passed；build ✓。
- **视觉基线**：先 canvas 解码比对确认差异仅选择器（胶囊→卡）+ 74px 内容下移，无字体/布局/组件漂移；`--update-snapshots` 重生成 6 张 appearance-partition（app-main/components/motion 零变化）。
- **提交**：feat `1483670`（代码+测试+基线）；docs 本提交（报告 + 本账本 + brief）。
- **评审**：待独立评审。

### B6-2 悬浮球去光晕

### B6-3 按钮扁平实心
