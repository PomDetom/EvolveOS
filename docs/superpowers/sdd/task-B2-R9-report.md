# Task B2-R9: 标题栏深浅按钮三态循环（浅色/深色/跟随系统）+ 与设置同步 — 实施报告

- **状态**：DONE
- **提交**：`4e4fda5`（feat：app-main.js + app-shell.spec.js + 3 张 app-main light 快照重生成）+ `7d9ddfe`（修复轮 R1/5：I1 挂载期图标初始化 + 3 张 app-main dark 快照重生成 + e2e 防回归断言）
- **需求源**：docs/superpowers/sdd/task-B2-R9-brief.md（唯一需求源，代码按字面使用）
- **分支**：feature/b2-visual（R1-R8 已完成并入；Cargo.toml 为本会话前已有的行尾噪声改动，未碰）

## 变更文件

| 文件 | 变更 |
|---|---|
| `src/app/app-main.js` | 130-157 行：R8 两态翻转改造为**三态循环** `light→dark→system→light`（`THEME_CYCLE` + `THEME_ICONS = { light:'sun', dark:'moon', system:'monitor' }`，点击取当前 theme 的下一个）；图标语义从「点切目标」改为「当前状态」（浅 sun / 深 moon / 系统 monitor）；`subscribe` 回调扩展为 `updateThemeIcon()` + `syncSettingsThemeModes()`（遍历 `.csettings__mode` 同步 active/aria-pressed）；import 移除不再使用的 `prefersDark` |
| `tests/e2e/app-shell.spec.js` | R8「深浅切换」用例改造为「三态循环 + 与设置同步」：三态 cycle + 双向同步断言（标题栏按钮→设置分区高亮 / 设置选择器→标题栏图标）+ 图标判别（sun 含 `<circle>`、moon 无 circle 无 rect、monitor 含 `<rect>`） |
| `tests/e2e/visual-regression.spec.js-snapshots/app-main-light-{indigo,amber,emerald}-chromium-win32.png` | **3 张** app-main light 基线重生成（图标 moon→sun，见「视觉基线」节） |
| `src/app/app-main.js`（修复轮 I1/M1） | `updateThemeIcon()` 定义后补**挂载期调用**（冷启动已存 dark/system 时图标随配置，title-bar.js 初始静态 sun 被覆盖；恢复 R8 行为）；click handler 内冗余 `updateThemeIcon()` 删除（subscribe 已同步触发） |
| `tests/e2e/app-shell.spec.js`（修复轮） | 冷启动用例补「dark 冷启动下标题栏图标 = moon」防回归断言；三态用例 `waitForTimeout(400)` 改 `toHaveAttribute('data-page','settings')` 可见断言（M4） |
| `tests/e2e/visual-regression.spec.js-snapshots/app-main-dark-{indigo,amber,emerald}-chromium-win32.png` | **3 张** app-main dark 基线重生成（图标 sun→moon，修复轮 I1 生效后） |

## TDD 证据

- **Step 1/2（红）**：新增「标题栏快捷主题按钮：三态循环 light→dark→system 且与设置同步」后运行 `npx playwright test tests/e2e/app-shell.spec.js -g "三态循环"` → FAIL。实测 R8 两态翻转下，首条「初始图标 = sun」断言即失败——R8 浅色态显示的是 **moon**（图标语义为「点切目标」），而非 brief Step 6 所称的「默认 light 初始显示 sun」。此为本任务基线判定带来下述漂移。
- **Step 3/4（实现）**：app-main.js 三态循环 + 图标三态 + subscribe 双向同步（按 brief Step 3/Step 4 代码字面，含 handler 内冗余 `updateThemeIcon()`）。
- **Step 5（绿）**：`-g "三态循环"` → PASS。

## 同步语义（subscribe 唯一同步点）

主题从任一入口变更（标题栏按钮 / 设置分区三态选择器）都双向同步：
- **标题栏按钮 → 设置分区**：点击经 `saveConfig→applyConfig`，subscribe 触发 `syncSettingsThemeModes` 更新 `.csettings__mode` 高亮/aria-pressed（设置通用页为预渲染静态 DOM，无需进入设置模式即可命中）。
- **设置选择器 → 标题栏图标**：settings-pages.js 点击 handler 经 `saveConfig→applyConfig`，subscribe 触发 `updateThemeIcon`（浅 sun / 深 moon / 系统 monitor）。
- `syncSettingsThemeModes` 用 `document.querySelectorAll('.csettings__mode')` 全文档遍历，桌面/手机两套实例（`renderStack` 重建的页面栈设置页）均同步；subscribe 常驻桌面订阅无需退订（同 R8 注释）。

## 视觉基线：6 张 app-main 重生成（light 3 初轮 + dark 3 修复轮；分区 18 张零漂移）

- **初轮实测差异集**：`npm run test:visual` 初跑仅 **app-main light 3 张**失败（各 **64 像素 / 0.01**），app-main dark 3 + 分区 18 = 21 张「零漂移」通过——但后经评审 I1 揭示该「零漂移」实为 bug 态巧合（见下）。
- **背景澄清（与 brief Step 6 预期差异）**：brief 预期「R8 默认 light 初始显示 sun（未变）→ 基线零漂移」，但**实测 R8 浅色态显示 moon**（R8 图标语义为「点切目标」：当前深色显示 sun、当前浅色显示 moon）。三态改造把图标语义改为「当前状态」后，浅色初始图标由 moon→sun——故 light 基线**有**漂移（且属 brief Step 3 规格的直接结果）。
- **dark 初轮「零漂移」的真实成因（修复轮 M3 勘误）**：初轮报告称 dark 未漂移是「提交的 dark 快照已显示 moon」——**失实**。真实成因：R9 按 brief Step 3 字面**漏掉挂载期 `updateThemeIcon()`**（R8 有，见评审 I1）→ 冷启动 dark 时按钮显示 title-bar.js 的**静态 sun**（bug 态），恰与 R8 dark 的图标（同为 sun）逐像素一致 → dark 3 张基线零漂移。light 的 64px 漂移同样截的是 bug 态（静态 sun），只是静态 sun 恰好等于 R9 正确的 light=sun，故初轮 light 重生成结果碰巧正确。修复 I1 后 dark 冷启动渲染 **moon** → dark 3 张基线重生成（sun→moon）。
- **解码比对（PIL 像素级，expected vs actual / old vs new）**：
  - light 差异包围盒 **`(1075,13)-(1088,26)`，14×14**（约 118 个非零像素点，Playwright 计入 64 像素），落在 `.app-main` 内。
  - 对照真实 DOM（headless chromium 探测）`.c-titlebar__control--theme` bbox `(1060,0)-(1104,40)`：差异盒中心 `(1081.5, 19.5)` 与按钮 16px 图标中心重合 → **差异 = 标题栏主题按钮 16×16 图标（moon→sun）**，别无他物。
  - **修复轮 dark 3 张**：差异包围盒同为 `(1075,13)-(1088,26)` 14×14（118 非零像素点）→ **= 标题栏按钮图标 sun→moon**，别无他物。light 3 张修复后仍为 sun（挂载期初始化 light→sun 与静态 sun 同像素），逐像素不变未重写。
  - 分区 18 张：逐像素零差异，未重写。
- 两轮 `--update-snapshots`（初轮 `-g "app-main · light"` 3 张 + 修复轮 `-g "app-main · dark"` 3 张）后 git 仅 **6 张** app-main png 变更，另 18 张分区字节级不变（证实零漂移）。

## 修复轮 R1/5（评审反馈落地，提交 `7d9ddfe`）

评审独立验证发现：

- **Important I1 —— 冷启动主题图标未初始化（R8 回归）**：R9 按 brief Step 3 字面删了 R8 的挂载期 `updateThemeIcon()`，且无启动 notify 触发 subscribe → 已存 `theme='dark'` 或 `'system'` 冷启动时，标题栏显示 title-bar.js 硬编码的**静态 sun**，而页面已是 dark、设置分区高亮 dark —— 标题栏与设置失同步，违背本任务核心目标。e2e 只测 light 冷启动（静态 sun 恰好正确）未暴露；app-main dark 3 张基线恰好编码了 bug 态（静态 sun → 零漂移）。**修复**：`updateThemeIcon()` 定义后补挂载期调用（恢复 R8 行为）；修复后 dark 冷启动渲染 moon → 重生成 app-main dark 3 张基线（解码比对确认差异=按钮图标 sun→moon）；冷启动用例补「dark 下标题栏图标 = moon」断言防回归。
- **Minor M1**：click handler 内 `updateThemeIcon()` 与 subscribe 重复（每次点两写 DOM）→ 删除 handler 内的（subscribe 触发一次即够）。
- **Minor M3**：报告叙事失实（dark 零漂移被误述为「快照已显示 moon」）→ 本报告「视觉基线」节勘误：真实原因是 R8/R9 冷启动 dark 均显示静态 sun（视觉测试不点按钮）。
- **Minor M4**：三态用例 `waitForTimeout(400)` → 改 `await expect(page.locator('.app-main__page--active')).toHaveAttribute('data-page', 'settings')`（Playwright 断言自带重试）。

## 验证结果

- `npm test`：**60/60**（10 files）
- `npm run test:e2e`：**97/97**（含新三态用例 + 冷启动防回归断言 + R8 遮罩守卫 + 其余零冲击：app-shell 27 + mobile-nav/smoke/title-bar 等 46 + 视觉 24）
- `npm run test:visual`：**24/24**（两轮重生成后逐像素全绿）
- `npm run build`：**通过**

## 命名边界核对

- `.c-titlebar__control--theme` 类名保留不变（R8 已建，e2e 依赖）✓
- 三态循环走完整配置链路 saveConfig→applyConfig（不绕过直接写 CSS 变量）；`getConfig().theme` 恒为 light|dark|system 三者之一，非法值经 `indexOf(-1)→light` 与 `?? 'sun'` 兜底 ✓
- 动画红线：本次仅改图标内联 SVG（静态属性，无动画）✓
- `.cust-group` count 6 不受影响（app-shell「设置模式：选择外观」通过）✓
- `themeUnsub` 按 brief 字面声明，桌面常驻订阅无需退订 ✓
