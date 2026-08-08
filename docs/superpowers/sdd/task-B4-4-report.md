# Task B4-4 执行报告：颜色方案 —— 强调色预设扩至 12 套

- 任务：B4-4（B4 桌面真实化第 4 任务）
- 状态：DONE
- 提交：`2fb1f72`（feat）+ 本文档 docs 提交（docs 留痕）
- 日期：2026-08-08

## 一、变更总览

把强调色预设从 6 套扩到 12 套（新增 玫红/橙/青柠/青/蓝/品红）。本任务**只加色板 + 预设条目**（B4-3 已删微调链），配置链路未绕过，动画红线零触碰。

| 文件 | 变更 |
|---|---|
| `src/config/defaults.js` | `ACCENTS` 追加 6 项（rose/orange/lime/cyan/blue/fuchsia），`color` 均按已批准设计规格取 500 值；现有 6 项不动 |
| `src/styles/themes.css` | 新增 6 个 `:root[data-accent="..."]` 块（rose/orange/lime/cyan/blue/fuchsia），每块同构：50–950 全阶 + `--accent: var(--accent-400)` / `--accent-hover: var(--accent-300)` / `--accent-active: var(--accent-500)` / `--accent-contrast: <950>`；文件头注释「6 套 / 其余 5 套」同步改「12 套 / 其余 11 套」（否则与新增块自相矛盾） |
| `tests/e2e/customizer.spec.js` | 新增用例「强调色预设扩至 12 套，新预设可切换」（brief 逐字）；既有「色彩微调滑杆已移除」用例的 `.cust-accent-card` 计数 6→12（扩至 12 的必然同步，否则全文件非零回归） |
| 视觉基线 | `tests/e2e/visual-regression.spec.js-snapshots/appearance-partition-{light,dark}-{indigo,amber,emerald}-chromium-win32.png` 6 张重生成（色卡网格 6→12 多两行） |

## 二、TDD 执行记录

### 1. e2e 新用例 → 确认红

写新用例（brief 逐字）+ 既有计数断言 6→12，`npx playwright test tests/e2e/customizer.spec.js -g "12 套"`：

```
Error: expect(locator).toHaveCount(12) failed
Locator: .csettings__page--active .cust-accent-card
Received: 6
```

红符合预期：现 6 卡，`[data-accent="rose"]` 不存在。

### 2. 实现 → 转绿

改 `defaults.js` ACCENTS（6→12）+ `themes.css` 6 块色板，复跑同用例：

```
1 passed (10.6s)
```

### 3. 全文件零回归

```
npx playwright test tests/e2e/customizer.spec.js
7 passed (23.4s)
```

含既有 6 用例（teal 切色、B3-2 预览卡联动、B3-1 组标题、排版缩放等）+ 新用例，全部通过。

### 4. 视觉基线重生成

首次 `npm run test:visual`：

```
6 failed   [chromium] › appearance-partition · light/dark × indigo/amber/emerald
18 passed
```

**恰为 brief 预期**：仅 appearance-partition 6 张失败（色卡网格 6→12 多两行），其余 18 张零漂移。解码比对确认差异区域后（见第三节），`npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots` 重生成 6 张，复跑 `npm run test:visual` 24/24 绿。

### 5. 全量回归

```
npm test            → 11 files / 56 tests passed
npm run test:e2e    → 101 passed (4.0m，含视觉基线 24/24)
npm run build       → ✓ built in 385ms
```

## 三、视觉基线解码比对说明（decode-compare）

对 `appearance-partition-light-indigo` 做像素级解码比对（Python PIL 载入基线 PNG 与实际 PNG，逐像素比较）：

- **基线 720×1567 → 实际 720×1742**：高度增长 175px = 色卡网格 6→12（3 列 × 2 行 → 3 列 × 4 行）多出的 2 行卡（含卡距）总高。
- **差异带（对齐左上角比较）**：
  - `y 0-118` 逐像素完全相同 —— 头部（概述预览卡 + 组标题 + 色卡网格上缘之前）零漂移。
  - 首个差异行 `y 119` —— 色卡网格起点。
  - `y 119-679`（约 561 行）—— 色卡网格重排区：前 2 行卡相同，插入 2 行新卡后，网格内语义色条等后续内容整体下移。
  - `y 680-1391`（712 行）逐像素满足 `base[y] == actual[y+175]` —— 网格下方所有内容（表面质感组及以下）被**均匀下移恰好 175px**，形状无变化。
  - `y 1567-1741`（175 行）—— 新增的 2 行色卡区域。
- **漂移范围确认**：差异全部落在 appearance-partition 元素截图内的色卡网格区（下移位移恰等于 2 行卡高）；其余 18 张（components/motion 分区 × 深浅 × 3 色）零漂移，`npm run test:visual` 全量复跑 24/24 绿，证明无分区外漂移。

## 四、`--accent` 序列化实测结论

B4-3 已实测未注册 CSS 自定义属性 `getComputedStyle().getPropertyValue()` 返回**原始序列化 hex**（非 rgb）；本任务新用例再次实测确认：

- 点 rose 卡后 `getComputedStyle(document.documentElement).getPropertyValue('--accent')` = `#fb7185`（rose-400，hex）—— 断言按 hex，与 `tokens.spec.js` 既有 `--accent` hex 断言口径一致。
- 预览卡 `getComputedStyle(.cust-overview).getPropertyValue('--preview-accent')` = `#f43f5e`（ACCENTS rose.color = rose-500，hex）—— 断言同时覆盖 `--accent`（取色板 400）与 `--preview-accent`（取 ACCENTS.color 500），两者不同、各自按 hex 断言，符合既有现状（teal/amber 等 6 项本就 400/500 混用）。

## 五、偏差修正（verbatim 适配，Concerns）

1. **既有用例计数 6→12**：`customizer.spec.js`「色彩微调滑杆已移除，强调色预设保留」用例的 `.cust-accent-card` 断言 6→12。brief 未列此项，但「全文件零回归」要求下不改必红；属扩至 12 的必然同步，非行为语义变化。
2. **themes.css 文件头注释同步**：「6 套 / 其余 5 套在这里定义」→「12 套 / 其余 11 套」。brief 未列，但不改则新增 6 块后注释与文件内容自相矛盾；仅注释文案，无行为影响。
3. **brief 文件未纳入 feat 提交**：`docs/superpowers/sdd/task-B4-4-brief.md` 按 repo 既有惯例（B4-3）随 docs 执行留痕提交，feat 提交仅含代码 + 基线。

## 六、自评（self-review）

- **规格符合**：需求 1-3 逐字落地（ACCENTS 6 项 color 均 500 值、themes.css 6 块 50–950 + 4 语义令牌齐全且 `--accent: var(--accent-400)`、e2e 新用例逐字）；配置链路不绕过（只加色板数据 + 预设条目，accent = 预设色板直出）；动画红线零触碰；`src-tauri/Cargo.toml` 行尾噪声未动、未提交。
- **质量**：与既有块同构（样式一致）；`--accent` hex 断言与 tokens.spec 口径统一。
- **测试**：单测 56/56、e2e 101/101（含视觉 24/24）、build 通过。
- **遗留（Minor）**：`README.md`「6 套主题色：靛蓝/…/翡翠」行、`src/CLAUDE.md`「data-accent（6 套主题色）」行、`README.md`「11 条滑杆（含色相/色温/饱和度微调）」行（B4-3 遗留）现过期 —— 按 repo 惯例留收尾（Minor），本任务不改写；`base.css` 焦点环注释「6 套主题色」同属历史文案，不动。

## 七、提交记录

- `2fb1f72` `feat: 强调色预设扩至 12 套（玫红/橙/青柠/青/蓝/品红），B4-4`（9 files，+68/-2）
- docs 提交（本报告 + 简报 + 台账 progress-b4.md，随评审后留痕）
