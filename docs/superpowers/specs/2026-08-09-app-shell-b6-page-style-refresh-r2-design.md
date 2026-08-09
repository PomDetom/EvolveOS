# 应用壳 B6-R2 设计规格（用户验收反馈修订：背景装饰可见化 + 按钮精致浅色）

- **日期**: 2026-08-09
- **前置**: B6 已合并 main（`33f1148`）。用户在桌面/浏览器验收后反馈两点问题，本规格为 B6 交付的修订版（R2）。
- **来源**: 用户反馈 + 逐项澄清确认（brainstorming 会话）
- **目标**: ① 8 个背景预设全部可见且互不相同（渐变/极光显著区分）② 按钮改「精致浅色半透明材质」

## 1. 问题与根因

### 1.1 背景细线图案不可见（根因已诊断）

- 图案层（`.app-main__backdrop`，`position:fixed; z-index:-1`）画在玻璃**之下**；内容区玻璃 `backdrop-filter: blur(20px light / 28px dark)` + `--glass-bg` 0.62-0.72 不透明 + 噪点 0.06。
- 现有细线图案（1-2px 线、圆点 1.5-2px、alpha 18-45%）经 20-28px 模糊把能量扩散到整片区域 → 再被 0.62-0.72 玻璃罩衰减 → **肉眼归零**。
- 只有**大尺寸柔光斑**（radial-gradient ≥80% 容器）能穿过 → gradient/geo/aurora 可见。
- gradient 与 aurora 本质都是「accent 柔光团」（分别 2 团 / 3 团 accent），故**高度相似**。

### 1.2 按钮纯平不好看

- B6-3 primary = `var(--accent)`（accent-400，饱和）纯实色 + `--shadow-sm`（`0 1px 3px` × 强度 0.5）→ **死平、廉价**，无层次。

## 2. 方向（用户选定）

- **背景**：大色块构图 —— 保留「衬底」语义 + 材质不动，8 预设各自为**鲜明且互不相同的大尺寸色块/色带构图**（结构区分而非颜色区分）。
- **按钮**：精致 + 浅色半透明材质 —— 对齐**菜单窗口选中态材质**（`.c-navwheel__item--active` = `--accent-100` 浅 tint + `--accent` 文字），更浅更柔和，补上层次。

## 3. 范围与铁律（延续 B6 规格，违反即失败）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；桌面观感由用户目检。
- **e2e 必须用 `--config=playwright.config.worktree.js`**（端口 5174 新鲜 server，本地不入库）。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- e2e 截图前必须等待字体加载完成（`document.fonts.load` 三档，B5-1/F1 模式已在 visual-regression.spec.js）。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量；paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。**背景预设为会话内纯 UI 态（`data-backdrop` 直接设），不进 store。**
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动；12 套强调色/语义色色板不动（仅消费既有 `--accent-100/200/600`、`--danger-50/500/600`）。
- 提交前 `npm run build`；每任务结束全量回归绿。
- 任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离。

## 4. 背景装饰（8 预设 · 大色块构图）

**机制**：沿用既有 `--backdrop-bg` 多层背景 + 对应 `.app-main__backdrop` `background-size`。所有图层改为**大尺寸渐变**（blob/band ≥ 容器 15-25%，blob 占位 ≤100% 容器），alpha 40-55%（经 0.62-0.72 玻璃后可见约 25-40%，**明显但不发艳**）。

**区分原则**：8 个预设靠**结构**（单团 / 单斜带 / 交叉带 / 散斑 / 平行斜带 / 横带 / 多色团）而非颜色区分，每个预设一眼可辨。

| 预设 | 结构 | 图层构成（实现要点） | 与相邻预设的区分 |
|---|---|---|---|
| `gradient` 渐变 | 单一色相·大团 | 1 层 `radial-gradient`（140% 容器，`--accent-300` ~55%，位 15% 10%）→ 柔光过渡全屏 | 单色单团 |
| `geo` 几何 | 单条斜带 | 1 层 `linear-gradient(135deg)` 斜向宽带（~20% 带宽，`--accent-300` ~45%）+ 弱底色 | 一条斜带（非交叉非平行） |
| `grid` 网格 | 交叉宽带（大十字） | 1 横带 + 1 竖带（各 ~12% 宽，`--accent-300` ~40%）交叉成"格"暗示 + 角部小光斑 | 横竖交叉 |
| `dots` 圆点 | 散落大圆斑 | 3-4 层 `radial-gradient` 圆斑（尺寸 25-40% 容器，`--accent-300` 为主 + 1-2 团 `--accent-400`/`--neutral-400` 点缀），分散四角/中心 | 离散多团（非整齐点阵） |
| `diagonal` 斜线 | 平行斜带 | `repeating-linear-gradient(135deg, ...)` 大周期（~200px）→ 2-3 条平行宽斜带（`--accent-300` ~40%） | 平行斜带 |
| `waves` 波纹 | 横向色带 | 2-3 层横向渐变带（不同纵向位置 + 软边），或 `repeating-linear-gradient(180deg)` 大周期 → 横带波感（`--accent-300` ~40%） | 横带（非斜） |
| `aurora` 极光 | 多色多团 | 3 层 `radial-gradient` 不同位置：`--accent-300` + `--accent-400` + `--neutral-400`（各 ~35-45%）交织成流动感 | 与 gradient 拉开：多色多团 |
| `none` 关闭 | 实底 | `var(--surface-solid)`（不变） | — |

> 若某预设叠加后观感不符「鲜明但克制」，按上述结构方向微调浓度/尺寸/位置（勿大改玻璃材质），解码比对 + 记入报告。

**预览卡 swatch**：`partitions.css` 8 个 `[data-bd-swatch]` 规则同步改为各预设的 **mini 大构图**（同款多层渐变缩放到 swatch 盒内，`background-size` 相应对齐），保持与真实背景一致的观感。

**验证**：e2e 断言每个预设 `.app-main__backdrop` computed `background-image` 为多层渐变（非 `none`、非纯 `surface-solid`）——即每个预设都有可见 wash；既有 8 卡存在性 + 切换断言保留；**用户桌面逐预设目检**（8 个都可见、互不相同、渐变/极光区分明显）。

## 5. 按钮（精致 · 浅色半透明材质）

对齐菜单选中态材质（`--accent-100` 浅 tint + accent 文字），补上层次与交互反馈。**primary 三态：**

| 状态 | 视觉 | CSS 要点 |
|---|---|---|
| 静止 | 底 `--accent-100`（浅 tint，柔和似半透明）+ 文字 `--accent-600` + 描边 `1px`（`color-mix(in srgb, var(--accent-500) 45%, transparent)` 柔和 accent 描边）+ `--shadow-sm` + 顶部内高光 `inset 0 1px 0 rgba(255,255,255,0.5)` | `background: var(--accent-100); color: var(--accent-600); border: 1px solid <soft accent>; box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.5);` |
| hover | `translateY(-1px)` 上浮 + 阴影加深 `--shadow-md` + 底色微深 `--accent-200` | `transform: translateY(-1px); box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.5); background: var(--accent-200);` |
| active | `translateY(0) scale(0.97)` 压下 + 阴影回落 `--shadow-sm` | `transform: translateY(0) scale(0.97);` |

**danger**：同机制 —— `--danger-50` 底 + `--danger-600` 文字 + `color-mix(in srgb, var(--danger-500) 45%, transparent)` 描边 + 白内高光 + hover 上浮/加深/底 → 深一档（`color-mix(in srgb, var(--danger-50) 80%, var(--danger-500))` 或既有所需档位）。

**secondary / ghost**：不变（玻璃底 / 描边已有层次）。

**说明**：`--accent-100` 为**不透明浅 tint**（观感柔和似半透明，与 nav 选中一致）；深色主题下为浅色 pastel 按钮（Material tonal 风格）。hover 底色加深为 `--accent-200` 两主题一致（**取代** B6-3 的 `:root[data-theme]` color-mix 明暗规则）。

**层级保持**：primary 靠 accent 色（文字+描边+浅 tint）与 secondary 的中性玻璃区分。

**验证**：更新 B6-3 e2e 断言（`--accent-100` 底 / `--accent-600` 字 / 描边存在 / 顶部内高光 / hover `translateY(-1px)` + `--shadow-md` 加深 / active `scale(0.97)`；删除 color-mix 明暗 luma 断言）；**新增按钮像素基线**（修复 B6 最终评审 Important-1 跟进项：components 分区滚到按钮 showcase 或独立按钮捕获截图，按钮矩阵不再被 fold 遮挡）。

## 6. 非目标

- 材质体系（玻璃/亚克力配方）不改。
- 不引入背景参数可配置化（密度/色浓度固定）。
- 不做按钮微交互动画（ripple 等）。
- 不改 `--font-mono`、不改 12 套强调色/语义色色板（只消费既有档位）。
- 不重构组件抽象层；不碰 secondary/ghost 现有样式。
- `.c-btn` 基类 transition 的 `filter` 项与 `.c-float-ball { position:relative }` 等 B6 deferred minor 不属本次范围（维持现状）。

## 7. 交付形态

- Git：分支（自 main 检出，如 `feature/b6-r2-page-style-refresh`），共享 checkout 执行；SDD 流程（每任务 TDD + 独立评审 + 全量回归绿）→ 最终整体评审 → 合并 main → 合并后全量回归。
- 留痕：`docs/superpowers/sdd/progress-b6-r2.md`（或追加 B6 账本）。
- 桌面目检：① 8 背景预设各可见且互不相同、渐变/极光区分明显 ② 按钮浅色柔和有层次、hover 上浮自然、danger 协调。
