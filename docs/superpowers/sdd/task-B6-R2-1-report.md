# Task B6-R2-1 报告：背景装饰大色块构图（8 预设可见且互不相同）

- **任务**: B6-R2-1（来源：`docs/superpowers/sdd/task-B6-R2-1-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md` §4）
- **分支**: `feature/b6-r2-page-style-refresh`（共享 checkout，无 worktree 隔离）
- **状态**: DONE

## 实施内容

1. **`src/app/app-main.css`** — 8 预设 `--backdrop-bg` 全部替换为大尺寸渐变构图（按 brief Step 3 原值）：
   - `gradient` 单 accent 大团（`radial-gradient(140% 140% at 15% 8%)`，accent-300 55%）；`geo` 单条 135° 斜带 + 角部小光斑；`grid` 横带+竖带交叉大十字 + 角部光斑；`dots` 3 团散落大圆斑（accent-300/400 + neutral-400 点缀）；`diagonal` 大周期平行斜带（`repeating-linear-gradient(135deg, ... 0 90px, transparent 90px 210px)`）；`waves` 横向大周期色带（180deg 60px/150px）；`aurora` 3 团多色极光（accent-300 + accent-400 + neutral-400）；`none` 不变（`var(--surface-solid)`）。
   - **删除**旧 grid/dots 的 `background-size: 24px 24px` 平铺规则（渐变全部 `%` 定位/尺寸 → 默认 background-size 拉伸铺满）。
   - 顶部注释块更新为 B6-R2 大色块构图说明（结构区分原则 + 无平铺规则）。

2. **`src/app/partitions.css`** — 8 个 `[data-bd-swatch]` swatch mini 图案同步改为大构图（与真实 `--backdrop-bg` 同结构缩放到 40×26 盒内；repeating 周期缩到 mini 视口 14px/32px、10px/24px）；删除旧 grid/dots swatch 的 `background-size: 24px 24px`；顶部选择器注释同步更新。

3. **`tests/unit/backdrop.test.js`** — 按 brief 全文件替换（3 用例：8 预设存在性 / 非 none 预设含渐变 wash 且无 24px 细线 / gradient-aurora 结构区分）。

4. **`tests/e2e/app-shell.spec.js`** — 在既有 B6-1 用例后追加 `B6-R2-1：8 背景预设切换均生效（非 none 预设 backdrop 含渐变 wash）`（按 brief Step 6 原值：8 卡逐个点击，断言 `.app-main__backdrop` computed background-image 为多层渐变 / none 为 `none`）。

## TDD 证据（RED → GREEN）

**Step 1-2 RED**（实施前）：`npx vitest run tests/unit/backdrop.test.js`
```
2 failed | 1 passed
× 每个非 none 预设…无 24px 细线平铺 → expected … not to contain '24px 24px'（旧 grid/dots 平铺规则仍在）
× gradient 与 aurora 结构区分 → expected [ 'radial-gradient(', …(1) ] to have a length of 1 but got 2（旧 gradient 为 2 团 accent）
```
**Step 4 GREEN**：`npx vitest run tests/unit/backdrop.test.js` → `3 passed`

**⚠️ 与 brief 的偏差（已在代码注释说明）**：brief 原文的单测按「verbatim」替换后在**旧代码上即全绿**（RED 不可复现）——根因：① 旧 grid 的 `24px 24px` 在**独立选择器** `.app-main[data-backdrop="grid"] .app-main__backdrop` 中，brief 正则 `[^}]*` 只捕获首个 `{…}` 块（`--backdrop-bg`），不含该行；② 旧 gradient 已是单 accent 色、无 `--neutral-400`。为满足「confirm RED」的 TDD 铁律，按 brief 意图补两条判别断言：测试 2 增 `expect(css).not.toContain('24px 24px')`（对应 brief Step 3「删旧平铺规则」）；测试 3 增 gradient 单 radial 层（`toHaveLength(1)`）与 aurora 三层结构断言。两条断言在旧代码红、新代码绿，RED→GREEN 成立。其余断言保持 brief 原值。

**Step 7 e2e**：`npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-1"` → 1 passed；app-shell 全文件 → 33 passed。

## 视觉基线（Step 8，先解码比对再更新）

**失败集**（未 update 裸跑）：仅 `appearance-partition` dark × 3（indigo/amber/emerald）在 Playwright 默认阈值（YIQ 感知差 0.2）下失败；app-main 6 张与 appearance-partition light 3 张因渐变 wash 差异低于阈值而「通过」——**但这不代表无变化**：`--update-snapshots=all` 强制全量重写后，解码比对显示 **24 张全部有背景 wash 差异**（背景层 `position:fixed; z-index:-1` 铺满视口，透过玻璃表面在**所有**分区截图可见）。

**解码比对**（chromium canvas 逐像素，旧=备份基线 vs 新=重生成；脚本已删）：
- **app-main 6 张**：diff 24-78% 像素，mean per-diff 2.35-11.22（RGB 求和），mean 每通道 0.002-4.3（/255，极低），hiPx（单像素 |Δ|>60）仅 28-37 → **纯背景 wash 低幅全帧漂移，无字体/布局/组件结构差**。
- **appearance-partition 6 张**：diff 8.8-30.6%，hiPx 798-2765（集中于 8 个 swatch 盒的图案变化：细线 → 大构图；dark 最显著，light 最弱），bbox 全帧（背景 wash 所致）→ **swatch 构图变化 + 背景 wash，无结构漂移**。
- **components/motion 12 张**：diff 1.5-62%，mean 每通道 0-3.3，hiPx 0-262 → 仅背景 wash（diff 低于 Playwright 阈值，裸跑即通过，故**未重生成基线**，保持「零变化」与 brief 一致）。

**结论**：差异仅背景图案（默认 gradient 单团 wash + appearance swatch 构图），无字体/布局/组件漂移。

**更新**：`--update-snapshots` 重生成 **app-main 6 张 + appearance-partition 6 张**（12 张）；components/motion 12 张 `git checkout` 恢复原基线（零变化）。重跑 `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js` → 24 passed。

## 全量回归（Step 9）

- `npx playwright test --config=playwright.config.worktree.js` → **117 passed**（两轮含单测无关 flake：B1-2 标题栏拖拽区 class、B2-2 背景层挂载 —— 均为 `page.goto` 后首断言 5s 内元素未挂载的加载时序 flake，与本次改动无关（纯 CSS 背景，无 JS 改动），隔离重跑均绿；第三轮全绿）。
- `npm test` → **15 files / 68 passed**（较 B6-1 的 69 少 1：backdrop 单测由 4 用例 → 3 用例）。
- `npm run build` → **✓**

## 文件变更

- `src/app/app-main.css`、`src/app/partitions.css`
- `tests/unit/backdrop.test.js`、`tests/e2e/app-shell.spec.js`
- `tests/e2e/visual-regression.spec.js-snapshots/`（12 张：app-main + appearance-partition）

## 自评

- **完整性**：8 预设全部大构图 + swatch 同步 + 单测 + e2e + 基线解码比对重生成 + 全量回归全绿 ✓
- **质量**：沿用既有 `data-backdrop` + `--backdrop-bg` 机制、`%` 定位渐变（默认 background-size 拉伸，无平铺规则）、局部类 `.app-main__backdrop-*`、CSS 变量、paint-only 豁免过渡，风格与现有代码一致 ✓
- **纪律**：材质体系（themes.css）、`--font-mono`、12 套色板、配置链路（defaults→store→apply）均未触碰；背景预设保持会话内纯 UI 态（`data-backdrop`，未进 store）；`playwright.config.worktree.js` 未提交；组件/动效基线零变化 ✓
- **动画红线**：背景预设切换为静态 `--backdrop-bg` 变化（非动画属性）；swatch 激活态仅 color/background/border-color 过渡（paint-only 豁免）✓

## 备注 / 关注点

- **可见性调参（未做）**：按 brief 原值落地，未对任一预设 alpha/位置做额外微调。解码比对显示默认 gradient 经玻璃后的 wash 变化低于 Playwright 感知阈值（app-main 裸跑即过）——属「低幅 wash」而非「不可见」：8 预设切换的结构差异（单团/斜带/交叉/散斑/平行带/横带/多色团）仍可在桌面逐预设目检区分，且 appearance-partition dark swatch 已显著变化（裸跑失败即证）。桌面「鲜明但克制」观感留给用户目检（规格 §4 验证即用户桌面逐预设目检）。
- **背景层贯穿所有分区截图**：背景层铺满视口，故 components/motion 截图也带低幅 wash 差异（低于阈值、基线未动）。后续任务（如 B6-R2-2 按钮基线）若背景 wash 变化，需知悉其会波及所有分区基线。
- **单测偏差**：如上「TDD 证据」节——brief verbatim 单测在旧代码即全绿，为满足 RED 铁律补两条判别断言（偏离 brief 原值，已注释说明）。

---

## 评审（独立评审占位）

（独立评审结论待控制器评审后填写 / 无评审发现则标 clean。）
