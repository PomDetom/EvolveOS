# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh-r2.md

分支：feature/b6-r2-page-style-refresh（自 main 0b0b9fb 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [x] Task B6-R2-1: 背景装饰大色块构图（8 预设可见且互不相同，渐变/极光区分）
- [x] Task B6-R2-2: 按钮精致浅色材质（accent-100 tint + 描边 + 上浮 hover + 按钮像素基线）
- [x] Task B6-R2-3: 导航轮 resize 后顶/底项选中修复（ResizeObserver + destroy）
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
- **提交**：feat `1a4b0fa`（代码+测试+基线）；docs `32bfab1`（本账本 + 报告 + brief）。
- **评审**（独立评审）：Spec ✅ 符合全部要求；无 Critical/Important；Minor 5。Task quality Approved。
- **Minor（deferred，最终评审 triage）**：① `components-basic.spec.js` `toRGB`/`token` helper 两测试块重复（可提模块级，低价值）；② `visual-regression.spec.js` `buttons` 选择器 `.showcase:has-text("按钮")` + `.first()` 依赖 DOM 序（未来按钮前插入含「按钮」文字的 showcase 会误重定向基线——潜在 footgun）；③ primary hover 测试 boxShadow/accent-200 读取在 `toHaveCSS(transform)` 后（安全仅因 `.c-btn` 过渡共用 `--dur-fast`，时长若分化会 flake）；④ danger hover 未测（补充用例只覆盖静止材质，规格清单未要求）；⑤ `toRGB` 对未知序列化返回 null（两侧 null 会假通过，当前 token 全 hex 不可达）。另记录：danger hover 75%（brief 原值，规格 §5 允许 80% 或所需档位）；补充用例 active 依赖 `mouse.down()` 触发 `:active`（正常演进信号）；e2e 冷启动 flake 为环境问题。
- **评审闭环**：**Task B6-R2-2: complete（commits 1a4b0fa..3238bb1，review clean）**。按钮像素基线已补（B6 最终评审 Important-1 跟进项闭环）。

### B6-R2-3 导航轮 resize 后顶/底项选中修复（ResizeObserver + destroy）— complete

- **实施**：`nav-wheel.js` mount 一次性 pad 计算 + `const CONTENT_TOP` 整块替换为 `recomputeGeometry()`（重算 padTop/padBottom + `CONTENT_TOP = itemEls[0].offsetTop` + `setFocal()`）+ `const ro = new ResizeObserver(recomputeGeometry); ro.observe(list)`（`CONTENT_TOP` 改 `let`；list `position:absolute; inset` → clientHeight=容器高、改 padding 不改自身 clientHeight 无观测循环、display:none→可见亦触发）；返回值新增 `destroy: () => ro.disconnect()`。`app-main.js` `renderRight()` 重挂前 `rightWheel?.destroy(); rightWheel = null`（新增 `rightWheel` 句柄置 `dockMounted` 旁），防右窗多实例重挂 RO 泄漏。左窗/横向 dock/component-showcase 均为常驻单实例，无需销毁。**不在 resize 主动重对齐滚动**（避免 snapNow 误改选中，下次交互纠正）。nav-wheel-geometry.js 纯函数零改动。
- **TDD**：RED 1 failed（点底部项 active `6→3`，与 brief「跳到 3/4」一致；调试 dump 另证顶项 `0→2`）→ GREEN 1 passed。⚠️ **brief verbatim e2e 用例在旧代码即「假绿」**——① 断言早于 snapNow 150ms 沉降（click 同步 active=6/0 先满足 toHaveAttribute）；② `goto` 后立即拉宽存在「拉宽先于动态 import 挂载」竞态（此时轮挂载于桌面宽度、pad 正确，bug 前置不成立）。已加固：断言前 `waitForTimeout(400)`（吸附沉降，spec 既有惯用）+ 拉宽前 `await expect(.app-main).toBeVisible()`（确保轮于手机形态挂载）。加固后 RED 连续成立、GREEN 连续成立。
- **测试**：app-shell 全文件 34 passed（33 既有 + 1 新，零回归）；单测 15 files / 68 passed；`npm run build` ✓。**视觉基线零变化**（零视觉改动，未 update-snapshots）。
- **全量 e2e**：默认 workers 每轮 1-3 个旋转失败的冷启动 flake（app-shell 亚克力/mobile-nav 主题卡/smoke/设置分区组件/visual 字体加载超时，均为 `page.goto` 后首断言 5s 内惰性元素未就绪或 5.3MB 普惠体加载超时）。**基线对照（stash 旧代码同条件全量 = 同批 3 failed）** 证明与本次改动无关；`--workers=1` 串行全量 **124 passed 全绿**（决定性证明套件完整全绿可达）。
- **提交**：fix `4b16118`（代码+测试）；docs（本账本 + 报告 + brief）。
- **评审**：待独立评审（占位）。
- **Minor（deferred，最终评审 triage）**：① 全量默认 workers 冷启动 flake 为环境性（基线对照已证），若想根治可在既有冷启动易敏用例加「先等 `.app-main` 可见再首断言」挂载门（本次仅在 B6-R2-3 新用例加固，未扩到其他既有用例，避免范围外改动）；② `renderRight` 每次调用 `rightWheel?.destroy()`，若后续出现右窗轮需保留跨重挂状态（当前无此需求，纯 UI 态每次重建）。
