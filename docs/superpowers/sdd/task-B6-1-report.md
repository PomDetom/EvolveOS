# Task B6-1 报告：背景装饰多样式（强化网格 + 新增 4 预设 + 8 迷你预览卡）

- **任务**: B6-1（来源：`docs/superpowers/sdd/task-B6-1-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md` §3）
- **分支**: `feature/b6-page-style-refresh`（共享 checkout，无 worktree 隔离）
- **状态**: DONE

## 实施内容

1. **`src/app/app-main.css`** — `data-backdrop` 预设 4 → 8：
   - **强化网格** `grid`：2px 线 + 24px 格距 + 交点圆点（`radial-gradient(circle at 12px 12px, ...)`）+ accent 25%→40% 浓度（`background-size: 24px 24px` 三层对齐）
   - 新增 `dots`（圆点点阵 24px 网格）、`diagonal`（45° 斜纹 12px）、`waves`（两层 14px/8px 波纹叠加）、`aurora`（两团 accent + 中性色光晕多色极光）
   - 全部沿用既有 `--backdrop-bg` 多层 background 机制 + `.app-main__backdrop` 上的 background-size（不继承，须落在 backdrop 元素上）；`gradient`/`geo`/`none` 保持不变（规格「保留/微调」、实测默认 gradient 无需动）
   - 顶部注释块更新为 8 预设 + B6-1 说明

2. **`src/app/app-main.js`** — `BD_LABELS` 扩至 8 键（顺序：渐变/几何/网格/圆点/斜线/波纹/极光/关闭）；背景选择器由 4 文字胶囊 → 8 迷你图案预览卡（`app-main__backdrop-card` = swatch + label，激活态 `--active` + `aria-pressed`），点击仍走既有 `data-backdrop` 会话内纯 UI 态（不进 store、不触发配置链路）

3. **`src/app/partitions.css`** — 移除旧 `.app-main__backdrop-opt` 胶囊样式，新增 `.app-main__backdrop-card*` 预览卡样式（竖向 56px 卡：swatch 在上 label 在下；激活态 accent 描边 + tint，仅 paint-only 过渡）；8 个 swatch mini 图案独立规则（与 `--backdrop-bg` 解耦，grid/dots 用 24px 平铺对齐 mini 视口）

4. **`tests/unit/backdrop.test.js`**（新建）— 8 预设存在性 + 网格强化（24px 格距）+ BD_LABELS 8 键顺序 + 预览卡 HTML 守卫

5. **`tests/e2e/app-shell.spec.js`** — 新增 `B6-1：背景装饰 8 预设 + 切换生效` 用例；既有 B2-2 `浏览器装饰背景层存在且可切换预设` 用例同步更新（`.app-main__backdrop-opt` → `.app-main__backdrop-card`，因胶囊类已移除）

## TDD 证据（RED → GREEN）

**Step 1-2 RED**（实施前）：`npx vitest run tests/unit/backdrop.test.js`
```
4 tests | 4 failed
× app-main.css 定义 8 个 data-backdrop 预设 → expected ... to contain '[data-backdrop="dots"]'
× 网格预设强化（2px 线 + 交点圆点 + 24px 格距） → expected ... to contain '24px 24px'
× app-main.js BD_LABELS 含 8 预设键且顺序固定 → expected false to be true
× app-main.js 背景选择器渲染迷你预览卡 → expected ... to contain 'app-main__backdrop-card'
```
预期内：`[data-backdrop="dots"]` 等 4 新预设不存在、grid 仍为 1px/40px、BD_LABELS 仅 4 键、无预览卡类。

**Step 3 中间态**（CSS 实现后）：2 CSS 断言转绿，2 JS 断言仍红（守卫有效，证明 JS 侧尚未实现）。

**Step 4 GREEN**：`npx vitest run tests/unit/backdrop.test.js` → `4 passed`

**Step 7 e2e**：`npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-1"` → 1 passed；app-shell 全文件 32 passed。

## 视觉基线（Step 8，先解码比对再更新）

**失败集**：仅 `appearance-partition` 6 张（light/dark × indigo/amber/emerald）；`app-main`/`components-partition`/`motion-partition` 18 张零变化（app-main 默认 gradient 未改、选择器只在外观分区）。

**解码比对**（canvas 逐像素，脚本已删）：新旧截图在 y≈680 以下同为裁剪统一底色（滚动祖先 overflow 裁剪的既有捕获伪影，两版一致，比较公平）。crop 对齐（新图裁掉选择器净高增量 74px 后顶对齐）逐 200px 带残差：
```
0-200: 25583（选择器区 = 预期：胶囊→卡）
200-400: 101 | 400-600: 475（≈0：选择器以下内容逐像素一致，仅整体下移 74px）
600-800: 80405（内容/裁剪边界伪影：新版内容已移出可视窗，旧版仍在；非内容漂移）
800+: 0
```
结论：差异仅为「选择器 4 胶囊 → 8 预览卡」及其带来的 74px 内容下移；选择器以下定制器内容逐像素一致（20 行带 0-6 diff px），无字体/布局/组件漂移。

**更新**：`npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` → 24 passed；仅 6 张 appearance-partition 基线变更。

## 全量回归（Step 9）

- `npx playwright test --config=playwright.config.worktree.js` → **114 passed**
- `npm test` → **15 files / 69 passed**
- `npm run build` → **✓**

## 文件变更

- `src/app/app-main.css`、`src/app/app-main.js`、`src/app/partitions.css`
- `tests/unit/backdrop.test.js`（新建）、`tests/e2e/app-shell.spec.js`
- `tests/e2e/visual-regression.spec.js-snapshots/`（6 张 appearance-partition 基线）

## 自评

- **完整性**：8 预设 + 预览卡 UI + 单测 + e2e + 视觉基线 + 全量回归全绿 ✓
- **质量**：沿用既有 `data-backdrop` + `--backdrop-bg` 机制、局部类 `.app-main__backdrop-*`、CSS 变量、paint-only 豁免过渡，风格与现有代码一致 ✓
- **纪律**：材质体系（themes.css）、`--font-mono`、配置链路（defaults→store→apply）、`playwright.config.worktree.js` 均未触碰/未提交；背景预设保持会话内纯 UI 态 ✓
- **动画红线**：预设切换为静态 `--backdrop-bg` 变化；预览卡激活态仅 color/background/border-color 过渡（paint-only 豁免）✓

## 备注 / 关注点

- 预设 CSS 按 brief 原值落地，未做额外浓度微调（brief 值已平衡「衬底更鲜明但克制」；swatch 图案复用同款 color-mix 浓度缩放至 mini 视口）。
- 视觉基线变化落在 `appearance-partition`（非 brief 措辞的「app-main」）——因默认背景 gradient 未改、选择器本身位于外观分区，属「按实测」；app-main 6 张基线零变化。
- 既有 B2-2 e2e 用例因胶囊类移除而同步更新（含于 brief「背景预设切换断言」Files 范围）。
