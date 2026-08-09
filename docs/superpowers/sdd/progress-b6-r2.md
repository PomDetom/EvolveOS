# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh-r2.md

分支：feature/b6-r2-page-style-refresh（自 main 0b0b9fb 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [x] Task B6-R2-1: 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分）
- [x] Task B6-R2-2: 按钮精致浅色材质（accent-100 tint + 描边 + 上浮 hover + 按钮像素基线）
- [ ] Task B6-R2-3: 导航轮 resize 后顶/底项选中修复（ResizeObserver + destroy）
- [ ] 最终整体评审 + 合并 main + 合并后全量回归

## 任务进度

### B6-R2-1 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分）— complete

- **实施**：`app-main.css` 8 预设 `--backdrop-bg` 全部改大尺寸渐变构图（blob/band ≥ 容器 15-25%，alpha 40-55%）：gradient 单 accent 大团 / geo 单斜带 / grid 交叉带 / dots 散斑 / diagonal 平行斜带 / waves 横带 / aurora 多色多团 / none 不变；删旧 grid/dots `background-size: 24px 24px` 平铺规则（`%` 定位自动铺满）。`partitions.css` 8 swatch 同步 mini 大构图（repeating 周期缩 mini 视口），删 swatch 旧平铺规则。单测 `tests/unit/backdrop.test.js` 按 brief 全文件替换；e2e 追加 B6-R2-1「8 预设均可见」用例。
- **TDD**：RED 2 failed（`24px 24px` 平铺仍在 / gradient 2 团）→ GREEN 3 passed。⚠️ brief verbatim 单测在旧代码即全绿（grid 的 24px 在独立选择器、正则只捕首个 `{}` 块；旧 gradient 已单 accent 色）——补两条判别断言使 RED 成立（详见报告）。
- **测试**：e2e 全量 117 passed（含 app-shell 33、B6-R2-1 1）；单测 68 passed（backdrop 4→3 用例）；build ✓。
- **视觉基线**：先 chromium canvas 解码比对确认差异仅背景图案（app-main = 纯低幅 wash 全帧、appearance = swatch 构图 + wash、components/motion = 仅低幅 wash 低于阈值），无字体/布局/组件漂移；`--update-snapshots` 重生成 app-main 6 + appearance-partition 6（12 张），components/motion 恢复原基线（零变化）。重跑 visual 24 passed。
- **提交**：feat `1c8dce2`（代码+测试+基线）；docs `b9f6723`（本账本 + 报告 + brief）。
- **评审**（独立评审）：Spec ✅ 符合全部要求；无 Critical/Important；Minor 4。Task quality Approved。
- **Minor（deferred，最终评审 triage）**：① e2e「8 预设均可见」`toContain('gradient')` 断言偏弱（1px 细线 repeating-gradient 亦可通过，单测已用 `not.toContain('24px 24px')` + 层数断言兜底）；② 单测整文件 `not.toContain('24px 24px')` 守卫脆（未来无关 24px 会误红，可接受）；③ **dots 与 aurora 是互异性最接近的一对**（同为 accent-300/400+neutral-400 三团、锚点相近，区分靠团尺寸与 neutral alpha）——用户桌面目检时建议并排对比；waves 主层 alpha 36% 略低于规格 40-55% 下限（brief 原值，若目检偏淡可提到 ~42%）；④ 单测覆盖略降（删 BD_LABELS 键序/渲染卡断言，e2e B6-1 仍覆盖）。
- **评审闭环**：**Task B6-R2-1: complete（commits 1c8dce2..211fa7a，review clean）**。核心验收（8 预设经玻璃后可见且互不相同）为规格既定用户目检闸门，实现层 CSS 结构证据充分。

### B6-R2-2 按钮精致浅色材质（accent-100 tint + 描边 + 上浮 hover + 按钮像素基线）— complete

- **实施**：`button.css` primary/danger 重写为浅色材质（brief Step 3 verbatim）—— primary 底 `--accent-100` + 字 `--accent-600` + 柔和 accent 描边（`color-mix(var(--accent-500) 45%, transparent)`）+ 顶部白内高光 `inset 0 1px 0 rgba(255,255,255,0.5)` + `--shadow-sm`；hover `translateY(-1px)` + `--shadow-md` + 底 `--accent-200`（两主题一致）；active `translateY(0) scale(0.97)`。danger 同机制（`--danger-50`/`--danger-600`/`--danger-500` 描边，hover 底 `color-mix(var(--danger-50) 75%, var(--danger-500))`）。**删除** B6-3 `:root[data-theme]` color-mix 明暗 hover 4 条。`components-basic.spec.js` 按钮断言全同步：B6-3 luma 用例 → brief verbatim「primary 浅色材质」；删「hover 中性投影」用例；增「内高光 + active 压下 + danger 浅色材质」补充用例（spec §5 验证清单补齐）；B5-3 按钮 `not inset` → `toContain('inset')`。`visual-regression.spec.js` SHOTS 加 `buttons` 项（下滚到按钮 showcase 单独捕获，修复 B6 评审 Important-1 跟进项）。
- **TDD**：RED 3 failed（旧实色底无 inset/无描边/hover 无上浮）→ GREEN components-basic 6 passed。
- **测试**：e2e 全量 **123 passed**（components-basic 6 + 其余 + 视觉 30；三轮含 3 个与改动无关的冷启动时序 flake：smoke/app-shell 亚克力/mobile-nav 主题卡 —— 隔离重跑均绿，第三轮全绿）；单测 15 files / 68 passed（customizer 曾与后台 e2e 并发偶发 1 flake，独占重跑全绿）；`npm run build` ✓。
- **视觉基线**：解码比对闸门 —— 裸跑 visual 24 passed（既有 24 张字节零变化，按钮改动在 components-partition fold 下）+ 6 failed（buttons 无基线）；`--update-snapshots` 后 **30 passed，仅新增 6 张 buttons-*（light/dark × indigo/amber/emerald），既有 24 张零修改**（git status 证实）。
- **提交**：feat `1a4b0fa`（代码+测试+基线）；docs `（见下）`（本账本 + 报告 + brief）。
- **评审**（独立评审）：待控制器评审后填写。
- **Minor（deferred，最终评审 triage）**：① danger hover 色档按 brief 用 75%（规格 §5 允许 80% 或既有所需档位）；② 补充用例的 active 断言依赖 `page.mouse.down()` 触发 :active（若未来基类 `:active` 变换与 primary 覆写不一致会误红，属正常演进信号）；③ e2e 冷启动时序 flake 为环境问题（见「测试」节），建议最终评审归入已知抖动，不阻塞。
