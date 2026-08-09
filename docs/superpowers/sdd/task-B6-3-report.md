# Task B6-3 报告：按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌）

- **任务**: B6-3（来源：`docs/superpowers/sdd/task-B6-3-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md` §5）
- **分支**: `feature/b6-page-style-refresh`（共享 checkout，无 worktree 隔离）
- **状态**: DONE

## 实施内容

1. **`src/components/button/button.css`** — primary 由「渐变底 + 顶部内高光 + `--shadow-glow` 彩影」改「扁平实心」：
   - 基类 `background: var(--accent)` 实色（去 `linear-gradient`）、`color: var(--accent-contrast)`、`box-shadow: var(--shadow-sm)` 中性轻投影（去 `inset` 内高光 + 去彩影令牌引用）。
   - hover theme-aware：`:root[data-theme="light"]` → `color-mix(in srgb, var(--accent) 88%, black)`（暗一档）；`:root[data-theme="dark"]` → `color-mix(..., white)`（亮一档）。
   - active 下压沿用基类 `.c-btn:active { transform: scale(0.97) }`（删 `.c-btn--primary:active { filter: brightness(0.96) }`）。
   - **danger 协调**：hover 去 `filter: brightness(1.08)` → 同 primary 机制 theme-aware 实色明暗（light→black / dark→white）。
   - `secondary` 玻璃底保留（B5-3，hover `--surface-hover` 不变）、`ghost` 不变；`.c-btn` 基类 transition 的 `box-shadow`/`filter` 项按 brief 保留。
2. **`src/styles/themes.css`** — 删除 B5-F1 引入的 `--shadow-glow` / `--shadow-glow-hover` 定义及其注释块（原 143-149 行）。亚克力配方等其余材质体系零改动。
3. **`tests/e2e/components-basic.spec.js`** — 新增 B6-3 用例；同步「主按钮 hover 阴影为柔和彩影」→「中性投影」；同步 B5-3 用例按钮部分（`inset` → 扁平实心）。
4. **视觉基线**：零改动（见下「解码比对」—— 按钮在设置窗 fold 之下，基线截图不含按钮，24 张重生成后逐字节一致）。

## TDD 证据（RED → GREEN）

**Step 1-2 RED**（实施前，源码未动；先写失败断言再改 CSS）：
```
npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-3"
2 failed
  B5-3：徽标/按钮/悬浮球 iOS 风格（按钮 B6-3 扁平实心）
    expect(btnShadow).not.toContain('inset') —— Received 仍含 inset（内高光尚在）
  B6-3：按钮 primary 实色扁平（无渐变无彩影 + theme-aware hover）
    expect(bg).toBe('none') —— Received "linear-gradient(rgb(130,140,246), rgb(110,123,242))"（渐变尚在）
```
全文件跑（含 Step 4 同步断言）：**3 failed**（另「主按钮 hover 中性投影」断言 `0px 1px 3px` 失败，旧 hover 彩影 `0 4px 14px` + inset）+ 3 passed（图标/四变体/B6-2）。预期内：三处按钮断言全部针对旧实态。

**Step 5 GREEN**（实现后）：
```
npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js
6 passed
```

## 测试用例适配说明（brief verbatim 在本环境不红，两处）

- **① theme-aware hover 计算值序列化为 `oklab(...)` 而非 `color(srgb`**：Chromium 151 将 `color-mix(in srgb, var(--accent) 88%, black)` 的计算值序列化为 `oklab(0.59689 0.0159058 -0.164896)`（非 B5-3 badge 那种 `color(srgb ...)`）。brief verbatim 的「断言计算值含 `color(srgb`」在本环境恒失败。适配：页内 canvas 把任意 CSS 颜色（含 `oklab`/`color(srgb`）解析为 rgba → Rec.709 亮度，比对三档亮度关系 `light < accent < dark`（浅色混 black 暗一档、深色混 white 亮一档、深色亮于浅色）—— 与序列化格式解耦，直接证明需求。
- **② 按钮在设置窗 fold 之下，视觉基线零变化**：见下。

## 视觉基线（Step 6，解码比对 → 零改动）

按 brief 先实测：全量视觉回归跑两次（对比基线 + `--update-snapshots` 重生成），**24 张重生成后与原基线逐字节一致**（sha1 逐一比对零差异）→ **无需重生成任何分区**。解码验证根因：

- components 分区截图实为 8160px 高，但 Playwright 元素截图仅含可见 fold 内的实际渲染内容（顶部 ~816px），下方为空；按钮展示矩阵 `.showcase(主按钮)` 相对分区顶部 y=930，**落在 fold 之下**。
- 像素扫描（canvas 解码 + 按 indigo accent `#6e7bf2`/`#828cf6` 匹配）：components 基线全图仅 398 个 accent 像素、全部在顶部 band 0/1（y<816），按钮区（y≈930）accent 像素为 0 → 基线确不包含按钮。
- appearance 分区同样零变化（customizer「导出 CSS 变量」primary 按钮亦在 fold 下；accent 像素集中在 y≤650 的主题色 swatch）。

结论：与 B5-3 先例一致（按钮在设置窗 fold 下则按实测），`--update-snapshots` 产物 = 原基线，快照目录无提交内容。

## 全量回归（Step 7）

- `npx playwright test --config=playwright.config.worktree.js` → **115 passed，1 flake**：`app-shell.spec.js:331`「亚克力两档」`data-glass` 断言未及时命中 —— 与 B6-1/B6-2 记录的既有时序 flake 同型（并行负载下挂载 applyConfig 竞态），**隔离重跑 1 passed**。本次改动仅涉按钮 CSS + 一个 e2e 用例，不触玻璃/亚克力路径。
- `npm test` → **15 files / 69 passed**
- `npm run build` → **✓**（built in 420ms）

## grep 全清

```
grep -r "shadow-glow" src/   → 零命中（exit 1）
grep -r "shadow-glow" tests/ → 零命中（exit 1）
```
themes.css 令牌定义已删；button.css 无残留引用（注释亦不写令牌名）；e2e 无 `--shadow-glow` 断言。

## 文件变更

- `src/components/button/button.css`、`src/styles/themes.css`
- `tests/e2e/components-basic.spec.js`
- 视觉基线零改动（快照目录无 diff）

## 提交

- feat `ebf9fa5`：按钮扁平实心（primary 实色 + theme-aware hover + 回收彩影令牌，B6-3）
- docs `393f6fd`：B6-3 交接（报告 + 账本进度 + brief）

## 自评

- **完整性**：primary 实色（去渐变/去内高光/去彩影）+ 中性 `--shadow-sm` + theme-aware hover（light 混 black / dark 混 white，`:root[data-theme]` 区分）+ active scale(0.97) 下压保留 + danger 同机制协调 + 令牌删除 + grep 全清 + 全量回归绿 ✓
- **质量**：沿用 `--accent`/`--shadow-sm` 既有令牌、CSS 变量、逗号多影、注释同步；无硬编码值 ✓
- **纪律**：材质体系（亚克力配方）零改动、`--font-mono` 未动、配置链路（defaults→store→apply）未触碰、`playwright.config.worktree.js` 未提交、零运行时依赖 ✓
- **动画红线**：hover 只动 background（paint-only 豁免）；active 只动 transform（scale）；投影在基类 transition 中过渡，均不触布局/模糊 ✓
- **TDD**：先写失败断言（新用例 + 两处同步）→ RED 3 failed → 实现 → GREEN 6 passed ✓

## 备注 / 关注点

- **规格与 brief 的 88%/92% 出入**：规格 §5 写作 `color-mix(..., 92%, ...)`，brief/计划书均为 `88%`。本任务以 brief 为准（requirements 源），采用 88%；供最终评审 triage。
- `.c-btn` 基类 transition 仍含 `filter` 项（brief 明确「保留」），但 B6-3 后 primary/danger 均不再用 `filter`，属纯兼容性兜底，可留待收尾清理。
- 视觉基线零变化是「fold 之下」的实证结果而非按钮视觉无变化；真实按钮视觉变化由 e2e 计算值断言 + 后续最终评审人工/截图把关。
