# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh-r2.md

分支：feature/b6-r2-page-style-refresh（自 main 0b0b9fb 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [x] Task B6-R2-1: 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分）
- [ ] Task B6-R2-2: 按钮精致浅色材质（accent-100 tint + 描边 + 上浮 hover + 按钮像素基线）
- [ ] Task B6-R2-3: 导航轮 resize 后顶/底项选中修复（ResizeObserver + destroy）
- [ ] 最终整体评审 + 合并 main + 合并后全量回归

## 任务进度

### B6-R2-1 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分）— complete

- **实施**：`app-main.css` 8 预设 `--backdrop-bg` 全部改大尺寸渐变构图（blob/band ≥ 容器 15-25%，alpha 40-55%）：gradient 单 accent 大团 / geo 单斜带 / grid 交叉带 / dots 散斑 / diagonal 平行斜带 / waves 横带 / aurora 多色多团 / none 不变；删旧 grid/dots `background-size: 24px 24px` 平铺规则（`%` 定位自动铺满）。`partitions.css` 8 swatch 同步 mini 大构图（repeating 周期缩 mini 视口），删 swatch 旧平铺规则。单测 `tests/unit/backdrop.test.js` 按 brief 全文件替换；e2e 追加 B6-R2-1「8 预设均可见」用例。
- **TDD**：RED 2 failed（`24px 24px` 平铺仍在 / gradient 2 团）→ GREEN 3 passed。⚠️ brief verbatim 单测在旧代码即全绿（grid 的 24px 在独立选择器、正则只捕首个 `{}` 块；旧 gradient 已单 accent 色）——补两条判别断言使 RED 成立（详见报告）。
- **测试**：e2e 全量 117 passed（含 app-shell 33、B6-R2-1 1）；单测 68 passed（backdrop 4→3 用例）；build ✓。
- **视觉基线**：先 chromium canvas 解码比对确认差异仅背景图案（app-main = 纯低幅 wash 全帧、appearance = swatch 构图 + wash、components/motion = 仅低幅 wash 低于阈值），无字体/布局/组件漂移；`--update-snapshots` 重生成 app-main 6 + appearance-partition 6（12 张），components/motion 恢复原基线（零变化）。重跑 visual 24 passed。
- **提交**：feat `1c8dce2`（代码+测试+基线）；docs `b9f6723`（本账本 + 报告 + brief）。
- **评审**：待控制器独立评审。
