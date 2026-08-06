# Task B1-3 执行报告：docs e2e 迁移（分区内验证 + 删除无宿主用例）

**任务**：把 docs 展示页 e2e 用例迁移到应用壳设置分区内验证，为 B1-4 删除 docs 页铺路。
**入口 helper**：`openSettingsPartition(page, index)`（`tests/e2e/helpers.js`）。
**提交**：`613eaf1`（`test: docs e2e 迁移至应用壳设置分区（组件/动效/外观）`）。

## 分区索引（B1-1 实测 APP_SECTIONS）

通用0 / 外观1 / 界面2 / 快捷键3 / 通知4 / 数据5 / 高级6 / 关于7 / **组件8 / 动效9**。

## 每个 spec 的处置

| 文件 | 处置 | 迁移目标 | 选择器微调 |
|---|---|---|---|
| `components-basic.spec.js` | 迁移 | 组件分区 index 8 | `#components` → `[data-page="components"]`；`.showcase:has-text("主按钮")` 计数限定在分区容器（矩阵内容不变） |
| `form-controls.spec.js` | 迁移 | 组件分区 index 8 | `#components .c-*` → 分区容器内计数；`.c-switch`/`.c-slider` 取分区内 first（避开壳设置页/手机栈同态类 strict mode） |
| `data-display.spec.js` | 迁移 | 组件分区 index 8 | 同上，`.c-badge`/`.c-tag`/`.c-progress` 限定分区容器 |
| `float-components.spec.js` | 迁移 | 组件分区 index 8 | 拖拽实例改 `.csg-fwin .c-fwin`（分区内唯一挂载的 fixed 交互实例，CSS 定位于视口右下角；docs 时 `.c-fwin` first 是 fwinDemo） |
| `overlays.spec.js` | 迁移 | 组件分区 index 8 | `__toast`/`__openDialog` 为 docs 测试桥，改点分区矩阵自带触发按钮 `[data-toast]`/`[data-dialog]`；Tab 断言限定 `.c-tabs` first |
| `motion-lab.spec.js` | 迁移 | 动效分区 index 9 | `.ml-*` 限定 `[data-page="motion"]` 分区容器 |
| `tokens.spec.js` | 迁移 | 外观分区 index 1 | `goto('/')` → `openSettingsPartition(page, 1)`；令牌层为全局 CSS 变量（挂 html，mode 无关），断言不变 |
| `customizer.spec.js` | 迁移（精简） | 外观分区 index 1 | 外观分区为定制器整页形态（`.csettings__cust` 内 6 组 `.cust-group`，与抽屉面板共用实现 + 同一 store）；`.topbar__customizer`/`.cust-panel` 入口改直接进分区 |
| `title-bar.spec.js` | 迁移 | 组件分区 index 8 | `#titlebar-demo` → 「标题栏 TitleBar」展示盒（3 变体，mountTitleBar 已挂）；**保留 B1-2 `toBe('browser')` 断言** |
| `scene-clipboard.spec.js` | 迁移 | 组件分区 index 8 | `#scenes` 场景模板 → 组件分区末尾组合示例 `.cfloat`（B1-1 已挂） |
| `smoke.spec.js` | 迁移 | `?mode=app` | `goto('/')` → `goto('/?mode=app')`；断言 `.app-main` 骨架 |

## 删除用例清单 + 理由

| 文件（用例数） | 理由 |
|---|---|
| `theme-switcher.spec.js`（3） | docs 顶栏主题切换器（`.tsw__mode`/`.tsw__accent`）。应用壳内主题在设置「通用」分区（`.csettings__mode` 三态），行为已被 app-shell.spec.js「冷启动持久化 + 通用页高亮一致」覆盖；docs 切换器无应用壳宿主。 |
| `token-showcase.spec.js`（2） | `#tokens .tk-card`/`.tk-swatch` 令牌展示区为 docs 专属展示，外观分区当前**不含**令牌预览（只有定制器整页形态）。按计划书后备选项：改断言外观定制器存在会与迁移后的 `customizer.spec.js` 重复，故删除，令牌系统行为由 `tokens.spec.js`（全局 CSS 层）+ `customizer.spec.js`（滑杆实时链路）承接。 |
| `nav-wheel.spec.js`（4） | 分区矩阵演示轮（`.c-navwheel--demo` 8 项）为视觉演示（onChange → toast），非行为测试面；docs 侧栏 `.navwheel__list`（12 项 + 设置入口）无应用壳宿主。**评审修复后仅删 3 条**：拖拽滚动/设置入口/点击锚点；「滚轮 → 停止 → 吸附 → 38.2% 锚点」重挂到壳左窗（见文末修复报告），行为覆盖不丢失。 |
| `layout.spec.js`（2） | docs 顶栏/折叠布局（`.topbar`、`.content__section`、窄屏下拉导航）无应用壳宿主；应用壳手机形态布局由 mobile-nav.spec.js 覆盖。 |
| `scene-main-window.spec.js`（1） | `.cmain` 主窗口场景模板即应用壳本身（一体式标题栏 + 双窗 + 内容区），行为由 app-shell.spec.js 全面覆盖，不再单列。 |
| `scene-settings.spec.js`（2） | `.csettings` 设置页场景即应用壳设置模式，`.cust-group 6` 已被 app-shell.spec.js「外观分区含 cust-group 6」覆盖。 |

另有 `customizer.spec.js` 内删 2 条：**导出按钮复制 CSS 变量**、**重置恢复默认配置**——footer（`.cust-export`/`.cust-reset`）为抽屉面板（`.cust-panel`）专属，外观分区整页形态无对应按钮（renderCustomizerGroups 只渲染 6 组，无 footer），删去并保留「滑杆 → CSS 变量实时生效」核心行为验证。

**合计删除用例：16 条**（6 文件 14 条 + customizer 2 条）。

## TDD Evidence（迁移即验证：迁移后用例绿）

逐文件运行，全部绿（Playwright chromium）：

- `components-basic.spec.js` — 3 passed
- `form-controls.spec.js` + `data-display.spec.js` — 6 passed
- `float-components.spec.js` + `overlays.spec.js` — 9 passed
- `motion-lab.spec.js` + `tokens.spec.js` + `customizer.spec.js` — 8 passed
- `title-bar.spec.js` + `scene-clipboard.spec.js` + `smoke.spec.js` — 6 passed

迁移过程中遇到的两处实际 DOM 差异并已按分区实况微调：
1. **浮层测试桥不存在**：`window.__toast`/`__openDialog` 只在 docs-mode 注入 → 改为点分区矩阵 `[data-toast]`/`[data-dialog]` 触发按钮。
2. **悬浮窗拖拽目标**：分区内 `.c-fwin` first() 是静态变体（relative 纯展示不挂载交互），改目标为 `.csg-fwin .c-fwin`（唯一挂载交互的 fixed 实例）。
3. **定制器 footer 不存在**：外观分区无 `.cust-export`/`.cust-reset` → 精简用例（见删除清单）。

## Test results

- **e2e 总数**：迁移前 **120** 条 → 迁移后 **104** 条（净删 16 条：6 文件 14 条 + customizer 2 条）。
  `npm run test:e2e` → **104 passed**（含 app-shell / floatstrip / mobile-nav / visual-regression 全绿）。
- **npm test**（vitest 单测）→ **51 passed**（8 files）。
- **npm run build** → 成功（106 modules，dist 产物正常）。

docs 模式零冲击成立：visual-regression.spec.js 仍测 docs 模式 9 组快照（tokens/components/scenes/main-window/settings-window/clipboard）全部通过；迁移后的行为用例已不再引用 docs 页。

## Files changed

- 新增：`tests/e2e/helpers.js`（`openSettingsPartition`）
- 修改（11）：`components-basic` / `form-controls` / `data-display` / `float-components` / `overlays` / `motion-lab` / `tokens` / `customizer` / `title-bar` / `scene-clipboard` / `smoke`
- 删除（6）：`theme-switcher` / `token-showcase` / `nav-wheel` / `layout` / `scene-main-window` / `scene-settings`
- 未改：`app-shell.spec.js` / `floatstrip.spec.js` / `mobile-nav.spec.js` / `visual-regression.spec.js`（非本任务范围）

## Self-review findings

- **完整性**：11 个迁移文件 + helpers.js + 6 个删除文件全部落实，索引按实测（组件 8 / 动效 9 / 外观 1）对齐；title-bar 保留 B1-2 `toBe('browser')`。
- **质量**：所有断言限定在分区容器内（`.app-main__page[data-page="settings"]` 为桌面设置页，避开手机栈同态类）；`openSettingsPartition` 等待惰性挂载容器非空（`not.toBeEmpty`）防懒加载竞态。
- **纪律**：零产品代码改动、零新增依赖；提交仅含 `tests/e2e/` + `helpers.js`。
- **测试**：每文件独立跑绿 + 全量回归绿。

## Issues / concerns

- **Minor**：`src/scenes/settings-window/settings-pages.js` 文件头注释仍引用已删除的 `scene-settings.spec`（类名说明）。场景模板类名仍被 app-shell 用例覆盖，属过时注释，留待 B1-4（docs/场景删除）一并清理，本任务不越界改产品代码。
- **Minor**：`docs/superpowers/plans/2026-08-06-app-shell-b1.md` 有一处未提交改动（B1-1 遗留：动效分区示例断言 `.ml-grid`/`.ml-card`），与本任务无关，未纳入本次提交。
- **设计取舍**：token-showcase（令牌展示）与 nav-wheel（演示轮）按计划书后备/或选项删除，理由见删除清单；外观分区无令牌预览，其滑杆实时链路与令牌全局层已分别由 customizer / tokens 承接。

---

# B1-3 评审修复报告（Important #1：垂直导航轮滚轮吸附覆盖丢失）

**评审结论**：删除 `nav-wheel.spec.js` 时把「垂直滚轮 → 停止 → 吸附 → 38.2% 锚点」（规格 §8.3 不得悬置）的唯一测试一并删掉；报告所述「app-shell/mobile-nav 已覆盖」对**横向** dock 成立，但无存活用例覆盖**垂直**主轴的滚轮路径。结论成立，予以修复。

## 修改内容

重挂到应用壳左窗（`?mode=app` 的 `.app-main__nav-l .c-navwheel__list`，7 模块垂直轮，anchorRatio 0.382），保留原始断言语义：
- `wheel(0,100)` 滚轮 → 停止 150ms 吸附 → 选中项唯一（`.c-navwheel__item--active` count 1）
- 滚动确实发生（`scrollTop > 50`）
- 选中项中心精确对齐视口 **38.2% 锚线**（`delta < 4px`，黄金比例锚点非居中）

复用原有 `page.mouse.move` 悬停 + `page.mouse.wheel` 技巧（Chromium wheel 派发到 hover 元素），吸附延迟 150ms 由 `toHaveClass` 自动重试覆盖。几何可行性：左窗 680px 视口（100vh−40px 标题栏）下 7 项（52px + 12px gap）加非对称 anchor padding 提供约 380px 滚动余量，滚轮可真实消费。

## 覆盖测试

- 位置：`tests/e2e/app-shell.spec.js`
- 测试名：`左窗导航轮：滚轮滚动停止后吸附最近项并选中（38.2% 锚点）`（行 303）

## 验证命令与输出

| 命令 | 结果 |
|---|---|
| `npx playwright test tests/e2e/app-shell.spec.js -g "左窗导航轮"` | 1 passed |
| `npx playwright test tests/e2e/app-shell.spec.js` | 19 passed |
| `npm run test:e2e` | **105 passed**（104 + 1 重挂用例） |
| `npm test` | 51 passed（8 files） |
| `npm run build` | 成功（106 modules） |

## 提交

`fix: 恢复垂直导航轮滚轮吸附覆盖测试`
