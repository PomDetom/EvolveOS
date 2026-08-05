# Task A4 报告：设置模式（⚙ 按钮 + 右窗设置目录 + 设置页共享）

- **日期**：2026-08-06
- **提交**：见本账本（progress-app-shell.md）Task A4 条目
- **分支**：feature/iteration（Base 9a481a1 Task A3）

## What you implemented

### 共享提取结构（前置门槛：scene-settings.spec 回归绿）
- **新建 `src/scenes/settings-window/settings-pages.js`**：从 settings-window.js 抽出**纯渲染部分**——
  - `SECTIONS`（8 分区数据）、`pageBody(id)`（各分区页渲染：通用/外观/界面/快捷键/通知/数据/高级/关于）、
    `renderSettingsPages()`（8 个 `.csettings__page` 页面栈 HTML，首项 active，模板与原 SECTIONS.map 逐字节一致）、
    `loadHotkeys` / `HOTKEY_STORAGE`（快捷键持久化，会话级）；
  - **交互接线** `mountSettingsInteractions(root)`（主题三态 click→store、动效开关→store、保存→toast、
    快捷键 mount→sessionStorage、开源链接→toast、`mountSwitch` 开关视觉）—— 场景模板与应用壳共用，行为一致。
  - 类名 `.csettings__*` **保持不变**（scene-settings.spec 断言 `.csettings` / `.c-navwheel__item` 8 /
    `.csettings__page--active` / `.cust-group` 6）。
- **`settings-window.js` 重构**：删除已抽出内容，改 import settings-pages.js；保留场景布局、NavigationWheel 分区切换、
  外观分区定制器首次激活惰性挂载（`renderCustomizerGroups`）、返回入口、`mountTitleBar`。场景 DOM **逐字节等价**。

### 设置模式接线（src/app/app-main.js + app-main.css）
- **标题栏 ⚙ 按钮**：`title-bar.js` `renderTitleBar` 新增 `settings: false` 选项（默认 false → docs/场景输出逐字节不变），
  app-main 传 `settings: true` 在窗口控制（min/max/close）之前渲染 ⚙（`icon('settings', 16)`）；激活态高亮
  `.app-main__settings-toggle--active`（accent 色 + surface-hover，仅 paint）。
- **右窗设置目录**：复用 A3 右窗 NavigationWheel 机制（纯 icon 64px，anchorRatio 0.382，名称由标题栏承担）；
  `state.rightMode: 'apps' | 'settings'` 分支渲染 —— settings 时右窗轮 items = SECTIONS 8 分区，选中项 `setSettingsSection`。
- **内容区设置页**：新增第 8 区 `.app-main__page[data-page="settings"]`，包 `.csettings__pages.app-main__settings`
  （8 个 `.csettings__page`，唯一 active；切页动画沿用壳 `app-main-page-in`，120ms transform/opacity）；
  外观分区定制器首次激活惰性挂载 `renderCustomizerGroups`（与场景同构，`.cust-group` 6）。
- **⚙ toggle 状态机**：进入 = rightMode→'settings' + 右窗展开 + 内容区设置页 + ⚙ 高亮；
  再次点击 / 返回按钮 / Esc / 左窗已选中项 = 退出设置模式回应用模式（右窗收起，内容区回左窗选中应用页）。
  **左栏应用恒可选中**：设置模式点左窗应用 → 切回应用模式（右窗变该应用目录）。
- **上下文联动**：「设置 › 分区」（设置目录选中项实时联动）。
- **右窗状态纯 UI 态**：`rightMode` / `settingsId` 在会话内 `state` 对象，不进配置存储。

## TDD Evidence

- **RED**：先写 5 个新 e2e 用例 → `git stash push -u -- src/` 还原到 A3 → 5 例**全红**
  （`locator.click` 等待 `.app-main .c-titlebar__control--settings` 超时，A3 无 ⚙ 按钮/无设置模式）→ `git stash pop` 恢复。
- **GREEN**：实现后 5 例全绿。scene-settings 回归绿（前置门槛）。

## Test results

- **scene-settings.spec 回归**：2/2 绿（前置门槛，共享提取后类名不变）。
- **app-shell.spec**：13/13（原 8 + 新增 5 设置模式用例）。
- **全量 `npm run test:e2e`**：**97 passed** —— docs 模式 84 零冲击 + app-shell 13（8+5）。
- **36 视觉基线零变化**：visual-regression 全绿（docs 模式逐字节等价 + 场景 DOM 不变）。
- **`npm test`**：45/45（单元测试零变化）。
- **`npm run build`**：通过（103 modules，655ms）。

## Files changed

- `src/scenes/settings-window/settings-pages.js`（**新建**，共享模块）
- `src/scenes/settings-window/settings-window.js`（重构为复用共享模块，DOM 逐字节等价）
- `src/app/app-main.js`（设置模式状态机 + ⚙ 接线 + 右窗设置轮 + 设置页第 8 区 + 上下文联动）
- `src/app/app-main.css`（⚙ 激活态 + 设置页内容区尺寸覆盖）
- `src/components/title-bar/title-bar.js`（`settings` 选项，默认 false）
- `tests/e2e/app-shell.spec.js`（+5 设置模式用例）

## Self-review findings

- **docs 模式零冲击**（硬门槛）：场景渲染 `renderSettingsPages()` 与原 `SECTIONS.map` 模板逐字节一致；
  title-bar 默认 `settings:false`；36 视觉基线像素级零变化；84 docs e2e 全绿。
- **动画红线**：右窗推入/收起沿用 transform/opacity + `--dur-push`（240ms）；设置页切页 `app-main-page-in`
  （transform/opacity + `--dur-fast` 120ms）；⚙ 激活态仅 paint（color/background，豁免过渡）；无模糊动画。
- **隔离**：`.cust-group` / `.csettings__*` 仅在 app 模式出现（docs 互斥渲染不并存），
  app-shell.spec 与 scene-settings.spec 各自页面选择器唯一。
- **共享度**：渲染 + 交互接线均抽入 settings-pages.js，场景与应用壳各只保留布局/导航轮/生命周期接线，
  未来改分区页只动共享模块。
- **零运行时依赖**：仅原生 JS，无新增依赖。

## Issues / concerns

- 无 blocker。观察项：
  1. 应用壳设置页交互（主题三态/动效/快捷键）与场景共用同一实现，但 e2e 仅覆盖渲染/导航/定制器挂载，
     交互行为依赖共享模块与场景同构（场景侧由 scene-settings.spec 隐式覆盖 DOM 结构）。
  2. `exitSettingsMode` 会重渲染左窗选中应用页（`renderPages`），滚动位置重置 —— 与 A3 收起行为一致，可接受。
  3. `renderSettingsPages()` 在挂载时读取 `getConfig()`（通用页主题态烘焙），配置变更后需重新进入设置模式
     才会重渲染 —— 与场景模板行为一致（A3 Minor ⑥ 留收尾，A4 未扩展）。

---

## 独立评审修复（2026-08-06）：退出设置模式后右窗目录轮残留

### 评审发现（1 Important，原文摘录）
**Stale settings directory wheel after exiting settings and re-opening via the same left-app click** ——
`exitSettingsMode()` / `collapseRight()` 退出设置模式时未调用 `renderRight()`，左窗重开路径只 `applyRightOpen()`
不重渲染；复现：选剪贴板（右窗=应用目录）→ ⚙（右窗=设置目录 8 项）→ ⚙ 退出 → 再点仍选中的剪贴板项 →
右窗重开仍显示设置轮，而标题栏/内容区已是「剪贴板 › 历史」应用模式 —— 违反「apps 模式右窗=应用目录」不变量。

### 修复内容（`src/app/app-main.js`）
在**所有**设置模式退出路径补 `renderRight()`（退出即重渲染应用目录轮，重开后不残留设置轮）：
- `exitSettingsMode()`：`rightMode→'apps'` 后加 `renderRight()`（覆盖 ⚙ toggle 退出、左窗已选中项退出）
- `collapseRight()`：`wasSettings` 分支内加 `renderRight()`（覆盖返回按钮 / Esc 退出）

根因修复：任一右Mode 回到 'apps' 的路径都同步重渲染右窗轮 → 右窗内容与 rightMode 恒一致。

### 覆盖测试（`tests/e2e/app-shell.spec.js`，+1）
`设置模式退出后右窗目录轮回归：exit settings → same-app re-click → 右窗显示应用目录`
- **RED**：修复前运行 —— `toHaveCount(3)` 收到 8（残留设置轮）
- **GREEN**：修复后运行 —— 右窗 3 项剪贴板目录、`[data-id="general"]` 0 项、上下文「剪贴板 › 历史」

### 验证
- `npx playwright test tests/e2e/app-shell.spec.js`：14/14（13 + 新 1）
- `npm run test:e2e`：98/98（app-shell 14/14 + docs 84 零冲击 + 36 基线零变化）
- `npm test`：45/45
- `npm run build`：通过
- 提交：`fix: 退出设置模式后右窗目录轮残留修复`（见下）
