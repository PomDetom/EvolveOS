# Task I4 实施报告：迭代修复批 2（规格缺口 — 窄屏折叠导航 + localStorage 不可用提示条）

**需求源**：`docs/superpowers/plans/2026-08-05-iteration.md` Task I4（3 个 Step）
**状态**：完成 — 测试均在 Web 环境执行（迭代期规范）；npm test 36/36、e2e 84/84 全绿（36 张视觉基线**零重生成**）、npm run build 通过

## 提交列表

| 提交 | 内容 |
|---|---|
| `本报告同提交` | `feat: 迭代修复批 2（窄屏折叠导航/存储降级提示）`（Step 1-2 合并一个提交 + 报告） |

## 一、Step 1 — 窄屏折叠导航（规格 §10 缺口）

### 方案取舍

选择**方案 A（完整）**：900px 断点下 `.navwheel` 隐藏，topbar 内出现模块选择下拉，选择后跳转对应 section + 同步 NavigationWheel 选中态。未走方案 B 降级（复杂度并不高，select 复用 NAV_CORE 即可）。

**一处超越计划书的取舍**：≤900px 同时隐藏 `.topbar__nav`（12 项快捷跳转链接）。实测 800px 宽下 topbar 可用宽度约 470px（品牌 110 + actions 170 + 留白），12 项链接需约 720px —— **现状在窄屏本就溢出**。下拉 4 项真实模块（NAV_CORE 去重）完整接管模块导航能力（与快捷跳转能力集相同），且消除溢出。若评审认为应保留顶部 12 项链接，删去媒体查询中 `.topbar__nav { display: none; }` 一行即可。

### 实现要点

- **`src/main.js`**：
  - 模板在 `.topbar__brand` 后新增 `<select class="topbar__nav-mobile" aria-label="模块导航">`，选项取**去重后的 NAV_CORE**（4 个真实模块；NAV_ITEMS 是 4×3 演示重复，不用于下拉）。
  - 下拉 `change` → `wheel.setActive(id)`（侧栏实例，计划书指定 API）—— setActive 内部触发 onChange，复用同一 scrollIntoView 跳转路径，无第二套滚动逻辑。
  - 反向同步：wheel 的 onChange 里 `navMobile.value = item.id` —— 宽屏操作后再缩窗，下拉选中态跟随（可选增强，一行）。
- **`src/styles/layout.css`**：
  - `.topbar__nav-mobile` 基类 `display: none`（≥900px 零渲染影响）。
  - `@media (max-width: 900px)`（与 token-showcase.css 既有 900px 断点同口径）：`.app-shell` 改 `grid-template-columns: 1fr`（**关键**——否则 grid 首列 176px 空档残留，content 缩到 176px 宽）；`.navwheel` / `.topbar__nav` `display: none`；下拉显式展示，观感复刻 `.c-input`（surface-1 底、glass-border、focus accent 描边 + accent-100 光晕，`transition` 仅 border-color/box-shadow —— paint-only 豁免内）。
- 新类名 `.topbar__nav-mobile` 为展示页局部类，不与组件 `.c-select` 等全局类冲突；场景模板的 `.c-navwheel`（组件类）不在媒体查询选择器内，不受影响。

### 测试（TDD 红 → 绿）

`tests/e2e/layout.spec.js` 追加 1 用例（方案书要求的完整断言链）：

1. `page.setViewportSize(800×600)` → `.navwheel` `toBeHidden()`、`.topbar__nav` `toBeHidden()`、下拉 `toBeVisible()`、`option` 计数 4（去重）；
2. `selectOption('scenes')` → `section#scenes` `toBeInViewport()`（scrollIntoView 生效性验证，经 wheel.setActive → onChange 路径，toBeInViewport 自动重试覆盖平滑滚动时序）；
3. `setViewportSize(1280×720)` → `.navwheel` 恢复可见，且 `.c-navwheel__item--active` 的 `data-id` 为 `scenes`（选中态同步验证）。

## 二、Step 2 — localStorage 不可用提示条（规格 §13 缺口）

### 方案取舍

按计划书选择**回调方案**：store 导出 `onStorageError` 回调，main.js 挂载时注册回调 → toast。理由：store.js 是纯配置层（唯一状态源），直接 `import toast` 会把 UI 依赖注入配置层，破坏分层（配置层从此不可在无 DOM 环境单独测试/复用）；回调把「存储失败」事件与「如何提示」解耦，UI 接线留在 main.js（入口本就是接线层）。

### 实现要点

- **`src/config/store.js`**（纯配置层，无 UI 依赖）：
  - `saveConfig` 的 catch 分支：模块级 `storageErrorReported` flag —— **首次写失败起只通知一次，后续失败静默**（flag 不随成功写复位：规格语义是「会话内一次性」）；
  - 新增 `onStorageError(fn)`（返回解除注册函数，与 subscribe 同构）。
- **`src/main.js`**：注册 `onStorageError(() => toast('隐私模式下配置仅在本次会话内生效，刷新后恢复默认', { variant: 'warning' }))` —— 复用既有 toast 组件 warning 语义色。
- 触发时机按计划书为 **saveConfig 写失败**（隐私模式/配额满）；getConfig 读失败维持静默兜底（规格表原意可覆盖，计划书钉死写路径，读路径未加事件，避免重复弹）。

### 测试（TDD 红 → 绿）

`tests/unit/store.test.js` 追加 2 用例：

- 存储正常时写配置**不**触发回调；
- `vi.spyOn(Storage.prototype, 'setItem')` 抛错 → 连续 3 次 saveConfig → 回调**恰触发 1 次**（防重复弹验证）。

**e2e 取舍**：页面级模拟隐私模式困难（jsdom 单测可精确模拟 setItem 抛错，Playwright 无法低成本模拟 localStorage 不可用），按计划书以单测覆盖并说明取舍。

## 三、回归与基线

| 项 | 结果 |
|---|---|
| `npm test`（Vitest） | **36 passed**（34 + 2 新增 store 单测） |
| `npm run test:e2e`（全量） | **84 passed**（83 + 1 新增窄屏用例） |
| 视觉基线 | 36 张全过，**零重生成** —— 新样式均在 `@media (max-width: 900px)` 内或默认 `display: none`（`.topbar__nav-mobile`），1280×720 默认渲染逐像素不变 |
| `npm run build` | built in 598ms |

## 四、提交

`feat: 迭代修复批 2（窄屏折叠导航/存储降级提示）`（含本报告）

## 五、顾虑与备注

1. **`.topbar__nav` 窄屏隐藏是超越计划书的取舍**（见 Step 1 方案取舍）：能力不丢失（下拉 4 项 = 快捷跳转 4 目标），但 12 项链接在窄屏的「更多入口」感消失。已留一行 CSS 便于评审回退。
2. **wheel.setActive 不重列侧栏滚动位置**：计划书指定的 setActive(id)（`select(i, false)`，无居中动画）只同步 active 类；窄屏选择后切回宽屏，active 项可能在列表滚动区外未居中（点击/滚动轮交互后自然归位）。测试按计划书断言 active 类一致；如需「切回即居中」可改用 `wheel.scrollToIndex`（含居中动画 + 同样触发 onChange），一处调用差异，留待用户真机复核定夺。
3. **下拉用原生 select 而非 .c-select 组件**：4 选项的顶部小控件用原生 select 最简单可靠（零挂载成本、键盘/读屏语义原生）；样式复刻 .c-input 观感。若设计评审要求统一组件语言，可换 .c-select。
4. **存储提示只覆盖写失败路径**：getConfig 读失败仍静默兜底默认值（规格 §13 表中「JSON 损坏静默修复」语义）；若用户只浏览不改配置，隐私模式下不会弹条（无写即无提示）——符合「写失败时提示」的计划口径。
5. **`storageErrorReported` flag 会话级不复位**：同页会话内最多弹一次；刷新页面后重置（模块重新加载）——若刷新后仍隐私模式、再次写失败会再弹一次，符合「一次性（会话内）」语义。
6. **e2e 用例增长**：84 用例（+1），全量耗时约 3.0min。
