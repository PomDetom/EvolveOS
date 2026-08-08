# 应用壳 B4（桌面真实化）设计规格

- **日期**: 2026-08-08
- **分支**: 待检 `feature/b4-desktop-realism`（自 main）
- **前置**: B3（设置完善）已合并 main；本规格为 B4 唯一需求源
- **目标**: 四项桌面真实化功能 —— ① 窗口控制（权限修复）② 独立悬浮窗 ③ 颜色方案（删微调组 + 扩预设）④ 文字排版真实生效

## 1. 项目当前状态与背景

应用壳为唯一产品形态（浏览器 `/` 与 Tauri 直进应用壳）。B3 已落地：概览主题卡实时更新、外观分组全局语义重命名 + desc、外观分区实时整体预览卡（`.cust-overview`）。

**B4 四项的来源**（用户报告的真实桌面/观感问题）：

1. **窗口控制失效**：Tauri 桌面模式下，标题栏三按钮（最小化/最大化/关闭）"完全没反应"，窗口也无法拖动。
   - 根因（已定位）：`src-tauri/capabilities/default.json` 只授权 `core:default`；Tauri 2 窗口**变更**操作（`minimize`/`maximize`/`toggle_maximize`/`close`/`start_dragging`）不在默认集内，被权限层拒绝；JS `bindWindowControls` 的 `.catch(()=>{})` 静默吞掉拒绝 → 无现象。`data-tauri-drag-region` 内部走 `start_dragging` 命令同样被拒 → 拖不动。**代码接线本身正确**（Tauri 2.11 API、`withGlobalTauri: true`、拖拽区 `.c-titlebar__drag` flex:1 占整条除按钮外）。
2. **悬浮窗与窗口一体**：现有悬浮条是主窗右下 FloatBall 展开的**窗口内**元素，只能窗口内拖动；期望是独立于主窗的置顶小窗（类真实剪贴板悬浮窗）。
   - 现状：`?mode=strip` 已有 body 级独立渲染入口（`src/app/strip-main.js`，注释"供 Tauri 独立透明窗口接入"），但**从未创建第二个 Tauri 窗口**。
3. **色相污染主题色**：外观「整体色调」组的色相(0-360)/饱和度/色温微调滑杆可把强调色扭到任意色相，`applyColorTint` 覆盖 `--accent` → 整个界面强调色被污染。期望：删除微调组，改为更多**协调的预设色板**。
   - 语义色（成功/警告/危险/信息）为固定值（非强调色派生）；每套强调色是手写 50–950 全阶色板（`data-accent` 块）。
4. **文字排版几乎无效**：`type.scale` 存于配置但 **apply.js 从未写入 CSS**（死配置 → "缩放无变化"是字面必然）；`baseSize` 只覆盖 `--font-size-base`，绝大多数界面文字用 tokens.css 静态 `--font-size-xs/sm/lg/...`（10/12/14/16px），故"基准字号只改行距"。

## 2. 核心铁律（延续既有，违反即失败）

- 测试仅在 Web 环境执行（Playwright/Vitest）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖（Tauri 2.11 已满足本迭代需求）。
- 视觉基线变化必须先解码比对确认差异由本次改动引起，再 `--update-snapshots`。
- 每任务 TDD、独立评审、修复循环（≤5 轮）、留痕入 `docs/superpowers/sdd/`；每任务结束全量回归绿。

## 3. 功能 1：窗口控制（权限修复）

**改动文件**：
- `src-tauri/capabilities/default.json`（唯一改动，纯配置）

**要求**：在 `permissions` 追加窗口变更权限：
```
core:window:allow-minimize
core:window:allow-maximize
core:window:allow-unmaximize
core:window:allow-toggle-maximize
core:window:allow-close
core:window:allow-is-maximized
core:window:allow-start-dragging
```

**不改 JS**：`bindWindowControls`（src/demo/window-controls.js）接线已验证正确。改配置后需重新 build，桌面真机由用户验证：三按钮 + 标题栏拖拽区（flex:1，占除按钮外整条）均可操作。

**不做**：不加双击标题栏最大化（未要求）；不改拖拽区范围（已覆盖整条标题栏除按钮）。

## 4. 功能 2：独立悬浮窗（置顶小窗 + 位置持久化）

**架构**：主窗 FloatBall 点击 → Tauri JS `WebviewWindow` 按需创建独立透明置顶小窗加载 `?mode=strip`。浏览器形态保持窗口内演示。

**改动文件**：
- `src/app/app-main.js`：FloatBall 展开逻辑分 Tauri/浏览器两分支（Tauri → 创建/显示 strip 窗口；浏览器 → 现状窗口内 strip）
- `src/app/strip-main.js`：加 Tauri 感知分支（检测 `window.__TAURI__`）
- `src-tauri/capabilities/default.json`：追加新权限（见下）
- `tests/e2e/`：mock 驱动的窗口创建/位置存取用例

**Tauri strip 窗口配置**（WebviewWindow 选项）：
- `url: '/?mode=strip'`；`transparent: true`；`decorations: false`；`alwaysOnTop: true`；`resizable: false`；尺寸随内容自适应
- 位置：持久化 `{x, y}`（屏幕坐标）到 localStorage（同源共享）；启动时读回 `setPosition` 恢复

**strip-main.js Tauri 分支行为**：
- **布局**：strip 铺满窗口（Tauri 分支给 `.strip-root`/`.c-strip` 加铺满类 `position:fixed; inset:0`，不用浏览器形态的底右 dock）；窗口尺寸 = strip 内容自然尺寸
- **尺寸自适应**：初次渲染后测量 `strip.getBoundingClientRect()` → `setSize()` 贴合（取整，留透明边距）；旋转后重测重设
- 拖动（drag handle / 内容区）→ `getCurrentWindow().startDragging()` 移动**窗口**（不再用窗口内 transform 拖拽 + 磁吸——窗口模型下磁吸无意义，自由拖放）
- 点 X（close 按钮）→ `close()` 销毁窗口；主窗 FloatBall 再点重新创建
- 位置存取：窗口 `onMoved` 事件写 localStorage（去抖）；加载时若有存档 `setPosition`

**浏览器行为不变**：
- `?mode=strip`：现状窗口内拖拽 + 磁吸（floatstrip.spec 回归零冲击）
- app 内 FloatBall：现状窗口内 strip 演示

**新权限**（capabilities/default.json 追加）：
```
core:window:allow-start-dragging
core:window:allow-set-position
core:window:allow-outer-position
core:webview:allow-create-webview-window
```

**可测性**：窗口创建 + 位置保存/恢复逻辑封装在注入式 API 后（同 `bindWindowControls(api)` 模式），e2e 注入 mock `__TAURI__` 验证调用与存取；不测真实窗口（Web 环境无 Tauri 窗口）。

## 5. 功能 3：颜色方案（删微调组 + 扩预设 12 套）

**目标**：删除会污染主题色的色相/饱和度/色温微调，改为更多协调的预设色板。

**改动文件**：
- `src/demo/customizer-panel.js`：删「整体色调」组色相/饱和度/色温三滑杆；`CFG_PATH` 删 hue/saturation/temperature；`tintHsl`/`hueSliderValue`/`tintSwatch` 处理；预览卡 `--preview-accent` 改取 `accent.color`
- `src/config/defaults.js`：`DEFAULTS` 删 `color.{hue,saturation,temperature}`；`RANGES` 删 hue/saturation/temperature；`ACCENTS` 6 → 12
- `src/config/apply.js`：删 `applyColorTint` 与 `temperatureToHue`（强调色 = 预设色板 `--accent-400` 直接生效）
- `src/styles/themes.css`：新增 6 个 `data-accent` 色板块（50–950 全阶）
- `tests/e2e/customizer.spec.js` + `tests/e2e/visual-regression.spec.js`（appearance-partition 基线重生成）

**「整体色调」组最终形态**：纯强调色卡选择（`accentCards` + `semanticBar` 语义色预览），组标题保留「整体色调」，desc 更新为「预设主题色 / 语义色自动协调」。

**ACCENTS 新增 6 套**（拟议，实施时可微调，避开危险红避免语义混淆）：
| id | name | color |
|---|---|---|
| rose | 玫红 | #f43f5e |
| orange | 橙 | #f97316 |
| lime | 青柠 | #84cc16 |
| cyan | 青 | #06b6d4 |
| blue | 蓝 | #3b82f6 |
| fuchsia | 品红 | #d946ef |

每套在 themes.css 手写 50–950 全阶色板（与既有 5 块 `data-accent` 同构；`--accent`/`--accent-hover`/`--accent-active`/`--accent-contrast` 齐全）。

**存量兼容**：localStorage 已存 `color:{...}` 的配置经 deepMerge 保留为死键，无消费者、零影响，不清理。

**B3-2 预览卡联动**：`--preview-accent` 由 `tintHsl(cfg)` 改为 `ACCENTS.find(a=>a.id===cfg.accent).color`（色板 hex 直出）。

## 6. 功能 4：文字排版真实生效

**目标**：`baseSize` 与 `scale` 滑杆都真实全局缩放整套字号。

**改动文件**：
- `src/styles/tokens.css`：字号令牌改为派生自 `--font-size-base`
- `src/config/apply.js`：`--font-size-base` 改为 `calc(${baseSize}px * ${scale})`
- `src/demo/customizer-css.js`：「导出 CSS 变量」的 `--font-size-base` 同步改为 `calc(${type.baseSize}px * ${type.scale})`（与 applyConfig 一致，避免导出与生效不一致）
- `tests/e2e/customizer.spec.js`：新断言

**派生公式**（以 base 14px 为基准的比例）：
```css
--font-size-xs: calc(var(--font-size-base) * 0.714);   /* 14→10 */
--font-size-sm: calc(var(--font-size-base) * 0.857);   /* 14→12 */
--font-size-base: 14px;                                 /* 默认；applyConfig 覆盖 */
--font-size-lg: calc(var(--font-size-base) * 1.143);   /* 14→16 */
--font-size-xl: calc(var(--font-size-base) * 1.429);   /* 14→20 */
--font-size-2xl: calc(var(--font-size-base) * 1.714);  /* 14→24 */
--font-size-3xl: calc(var(--font-size-base) * 2);      /* 14→28 */
```

**applyConfig**：`s.setProperty('--font-size-base', `calc(${cfg.type.baseSize}px * ${cfg.type.scale})`)`

**效果**：`baseSize`(12–16) 设基准绝对尺寸，`scale`(0.9–1.15) 全局倍数，两滑杆共同驱动整套字号。默认（14×1）计算值不变 → 默认态视觉基线零漂移。`type.weight`（无滑杆死配置）不触碰。

## 7. 非目标

- 不实现应用真实功能填充（剪贴板/密码/记账仍占位页）。
- 不做多悬浮窗（一次一个 strip 窗口）。
- 不加双击标题栏最大化、不自定义窗口 resize 手柄。
- 不新增「配色方案」整套语义色联动（用户已选"扩预设"而非"方案"）。
- 悬浮窗不做屏幕级磁吸（窗口模型自由拖放即可，用户选项未含磁吸）。

## 8. 测试策略（仅 Web 环境）

| 功能 | 验证 |
|---|---|
| 1 窗口控制 | 纯配置改动，web 测试零影响；桌面真机用户验证 |
| 2 独立悬浮窗 | e2e 注入 mock `__TAURI__`：FloatBall → 创建 strip 窗口调用；strip 位置保存/恢复逻辑；浏览器 strip 演示回归零冲击 |
| 3 颜色 | e2e：微调组滑杆消失、12 预设可点、预览卡 `--preview-accent` 联动；appearance-partition 基线重生成（组内容 + 12 卡布局变化） |
| 4 排版 | e2e：baseSize/scale 滑杆 → `--font-size-base`/派生令牌变化 → 实际字号变化；默认态视觉零漂移 |

每任务结束：`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿；完成全部后最终整体评审 → 修复波 → merge main → 合并后全量回归。
