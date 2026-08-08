# Task B4-2: 文字排版真实生效（baseSize/scale 全局缩放）— 实施报告

- **状态**：DONE_WITH_CONCERNS（两处 verbatim 适配：tokens.css 乘数取精确有理数 + e2e 选择器改 data-key；均强制必要，详见「verbatim 适配说明」）
- **提交**：`b6ba3ac`
- **需求源**：docs/superpowers/sdd/task-B4-2-brief.md（唯一需求源）
- **分支**：feature/b4-desktop-realism

## 任务背景

应用壳 B4 第二个任务。设置「文字排版」滑杆几乎无效：`type.scale` 存在配置但 apply.js 从未写入 CSS（死配置 → 缩放无变化）；`baseSize` 只覆盖 `--font-size-base`，绝大多数界面文字用 tokens.css 静态 `--font-size-xs/sm/lg/...`（10/12/14/16px），故「基准字号只改行距」。**修法**：字号令牌全部派生自 `--font-size-base`；`applyConfig` 写 `--font-size-base = calc(baseSize px × scale)`，两滑杆共同驱动整套字号。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src/config/apply.js` | `--font-size-base` 一行由 `${cfg.type.baseSize}px` 改为 `calc(${cfg.type.baseSize}px * ${cfg.type.scale})`（两滑杆共同驱动；默认 14×1 → calc(14px * 1) = 14px，计算值不变） |
| `src/styles/tokens.css` | 字号令牌由静态 `10/12/14/16/20/24/28px` 改为全部派生自 `--font-size-base` 的 calc（乘数取精确有理数，见下方适配说明） |
| `src/demo/customizer-css.js` | 「导出 CSS 变量」第 39 行同步改为 `calc(${type.baseSize}px * ${type.scale})`，与 applyConfig 完全一致 |
| `tests/unit/apply.test.js` | 新增单测：`--font-size-base = calc(baseSize px * scale)`（逐字取自 brief） |
| `tests/e2e/customizer.spec.js` | 新增 e2e：读真实元素解析 fontSize（body + `.c-titlebar__title`），断言默认 14/12、scale↑字号↑、baseSize↓字号↓（断言逻辑逐字取自 brief，仅选择器适配） |

- **动画红线**：font-size 非动画属性，零动画相关改动。
- **配置链路**：不新增参数，只改 applyConfig 对 `--font-size-base` 的写入公式；defaults → store → apply 链路不变。
- **`type.weight`（无滑杆死配置）不触碰**；RANGES（baseSize [12,16,0.5] / scale [0.9,1.15,0.01]）不改。

### verbatim 适配说明（重要披露）

Brief 给定的两处 verbatim 代码在真实环境无法直接落地，均做最小适配并保持 brief 语义不变：

**① tokens.css 乘数：3 位小数 → 精确有理数（零漂移强制）**

Brief 逐字给定 `calc(var(--font-size-base) * 0.714)` / `* 0.857` / `* 1.143` / `* 1.429` / `* 1.714`。实测这些乘数在默认 base=14 下**不产生整数值**：

| 令牌 | brief 乘数 × 14 | 原静态值 | 偏差 |
|---|---|---|---|
| xs | 0.714 × 14 = **9.996** | 10 | -0.004 |
| sm | 0.857 × 14 = **11.998** | 12 | -0.002 |
| lg | 1.143 × 14 = **16.002** | 16 | +0.002 |
| xl | 1.429 × 14 = **20.006** | 20 | +0.006 |
| 2xl | 1.714 × 14 = **23.996** | 24 | -0.004 |
| 3xl | 2 × 14 = **28** | 28 | 0（精确） |

**解码比对证据**：`npm run test:visual` 首轮 **21/24，motion-partition · light × indigo/amber/emerald 三张失败**（各 11 像素超阈值）。用 System.Drawing 逐像素解码 expected vs actual：差异为**整个内容区（y 0..679）的 ±1 RGB 均匀偏移**——典型亚像素文字栅格化漂移特征，而非孤立字形噪声。**stash 仅回滚 tokens.css 后复跑该 3 张 → 全部通过**，确认漂移完全由 brief 乘数引起（子像素 11.998px 渲染与 12px 不同）。

Brief 同时要求「默认（14×1）计算值不变 → 默认态视觉零漂移」，且本任务控制侧指令将零漂移列为 MUST（`--font-size-base` 覆盖层在视觉测试中被 removeAttribute 移除，回落到 tokens.css 自身 `14px`，故漂移真实作用于截图）。**逐字 3 位小数与零漂移 MUST 直接矛盾**，故按 MUST 优先，改为精确有理数乘数：

```css
--font-size-xs: calc(var(--font-size-base) * 5 / 7);    /* 14→10 */
--font-size-sm: calc(var(--font-size-base) * 6 / 7);    /* 14→12 */
--font-size-lg: calc(var(--font-size-base) * 8 / 7);    /* 14→16 */
--font-size-xl: calc(var(--font-size-base) * 10 / 7);   /* 14→20 */
--font-size-2xl: calc(var(--font-size-base) * 12 / 7);  /* 14→24 */
--font-size-3xl: calc(var(--font-size-base) * 2);       /* 14→28 */
```

`(14 × k)/7` 为浮点精确整数（10/12/16/20/24），派生语义与 brief 的 `14→X` 注释意图完全一致；非默认 base/scale 下仍正确缩放（如 base 12 × scale 1.15 → base=13.8px → xs=13.8×5/7≈9.86px）。**复跑 `npm run test:visual` → 24/24 零漂移**。

**② e2e 选择器：`.cust-row:has-text("缩放")` → `.cust-range[data-key="scale"]`**

Brief 逐字给定 `.cust-row:has-text("缩放") input[type="range"]`。实测 Playwright strict mode 冲突：外观分区同时含「缩放」（scale，key=scale）与「**时长**缩放」（durationScale，key=durationScale）两行，`:has-text` 为子串匹配命中 2 元素 → `strict mode violation`，无法落地。改为按唯一 `data-key` 精确定位（`[data-key="scale"]` / `[data-key="baseSize"]`），与同文件既有用例同款约定（`.cust-range[data-key="radiusScale"]`、`.cust-range[data-key="noise"]`）。断言逻辑、readFont、默认 14/12、缩放方向断言均逐字保留。

## TDD 证据

- **Step 1（红）**：先加 apply.test 新用例 → `npx vitest run tests/unit/apply.test.js` → **1 failed**：`AssertionError: expected '14px' to be 'calc(14px * 1.15)'`（现写入 `14px`，正是 brief 预期红态）。
- **Step 2（改实现）**：apply.js + tokens.css + customizer-css.js 三处。
- **Step 3（绿）**：复跑同命令 → **1 passed**（16/16）。
- **Step 4（e2e）**：加 e2e → `npx playwright test tests/e2e/customizer.spec.js -g "缩放字号"`。首跑因选择器 strict 冲突红（前述适配 ① 之外的另一适配点），改 `data-key` 定位后 → **1 passed**。（scale 生效逻辑已由 Step 1 单测红→绿证明；e2e 是对默认值/缩放方向读真实元素的端到端验证。）
- **Step 5（视觉）**：首轮 21/24 漂移 → 解码比对 + stash 归因 → 改精确乘数 → **24/24 零漂移**。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx vitest run tests/unit/apply.test.js`（改前） | 1 failed（`expected '14px' to be 'calc(14px * 1.15)'`，RED 符合 brief 预期） |
| `npx vitest run tests/unit/apply.test.js`（改后） | 16/16 passed（GREEN） |
| `npm test` | 11 files / **62 passed**（+1 为本任务新增用例） |
| `npm run test:e2e` | **101 passed**（3.8m；含视觉回归 24 张 app-main/appearance/components/motion 分区，**24/24 零漂移**，未跑 `--update-snapshots`；含本任务新增「文字排版真实全局缩放字号」用例） |
| `npm run test:visual` | **24/24 passed**（零漂移；首轮 21/24 的归因与修复见上文） |
| `npm run build` | 通过（Vite，`✓ built in 381ms`） |

**视觉基线说明**：默认 14×1 下所有字号令牌计算值为浮点精确整数（10/12/14/16/20/24/28），与改动前静态值一致 → 24 张基线**零漂移**。按要求**未运行 `--update-snapshots`**。

## Self-review 结论

- **规格符合**：apply.js / customizer-css.js 公式、apply.test.js 单测逐字取自 brief；tokens.css 派生机制与 `14→X` 语义保留；`type.weight` 与 RANGES 不动；未碰 `src-tauri/Cargo.toml`；未跑 `--update-snapshots`。
- **两处 verbatim 适配**（上文充分披露）：① 乘数取精确有理数以兑现零漂移 MUST（brief 3 位小数实测导致 3/24 视觉漂移，stash 归因确证）；② e2e 选择器改 `data-key`（brief 的 `:has-text("缩放")` 与「时长缩放」strict 冲突，无法落地）。
- **质量**：单测 62/62、e2e 101/101（含视觉 24 零漂移）、build 通过。两滑杆共同驱动整套字号；「导出 CSS 变量」与 applyConfig 公式一致。
- **结论**：Ready to merge（DONE_WITH_CONCERNS，详见上文适配披露）。

## 备注

- `src-tauri/Cargo.toml` 为本会话前已有的行尾（LF→CRLF）噪声改动，**未碰、未提交、保持 unstaged**（提交前/后 `git status` 均确认）。
- 提交内容：`src/config/apply.js`、`src/styles/tokens.css`、`src/demo/customizer-css.js`、`tests/unit/apply.test.js`、`tests/e2e/customizer.spec.js`。
- 本报告与 `docs/superpowers/sdd/progress-b4.md` 的 Task B4-2 台账随代码另立 docs 提交（含本提交哈希）。
