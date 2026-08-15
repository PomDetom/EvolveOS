# 悬浮窗贴边收起设计规格

- **日期**: 2026-08-15
- **前置**: 悬浮窗（strip）现状 —— Tauri 预注册透明窗口（`tauri.conf.json` label `strip`，alwaysOnTop / skipTaskbar / resizable:false），`strip-main.js` `fit()` 按内容贴合尺寸（`LogicalSize`），浏览器 transform 定位 + Tauri `setPosition` 双通道，拖拽走系统 `startDragging`，`onMoved` 去抖持久化位置（`localStorage['ui-design-strip-pos']`）。边缘吸附（snapToEdge）仅浏览器模式，Tauri 窗口无磁吸。
- **来源**: 用户请求「探讨悬浮窗贴边收起可行性」并给出三点：① 四边贴靠先把超出部分弹出（弹出后即贴边）② 贴边 1s 缓收起 ③ 探讨收起后显示效果。经头脑风暴逐项澄清确认（见「核心决策」）。
- **目标**: 悬浮窗（**仅 Tauri 悬浮窗端**，不做浏览器端）四边贴边 + **先决校正**（溢出弹出）+ 空闲 1s **缓收起** + **边缘小把手**形态 + hover **弹回**。
- **仓库**: `C:\Repository\EvolveOS`（dev 开发分支，main 发版合并点）

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 范围 | **仅 Tauri 悬浮窗端**（浏览器 transform 收起不做） |
| 先决校正 | **是**：窗口某边超出屏幕 → 先拉回贴齐完整可见（=进入贴边的先决校正），再进入贴边计时 |
| 进入贴边 | **仅溢出校正**（不做磁吸）：贴边 = 精确贴齐（距离 0）或溢出校正后贴齐；≤6px 未溢出不进收起计时 |
| 收起形态 | **B 边缘小把手（~20px）**：窄条 = 窗口靠屏幕中心一侧 ~20px 边带（同 `--surface-solid` 材质 + `--text-3` 边框 + 圆角），内带按贴靠边定向的 chevron grip |
| 触发语义 | **标准自动隐藏**：hover / 拖动 / 点击取消 1s 计时；光标离开条后重新计 1s |
| 收起动画 | 贴边空闲 1s → JS rAF 逐帧 tween `setPosition` 滑向贴靠边，留 ~20px；ease-out ~500ms（时长读 CSS 变量） |
| 弹出 | 收起态 hover 可见窄条 → 反向 tween 回贴边完整位 |
| 持久化 | 收起位置**瞬态不持久化**；贴边完整位 / 自由位才写 `localStorage` |
| 权限 | capabilities 新增 `core:window:allow-current-monitor`（schema 已存在，现未开启） |
| 分支 | `ui/strip-edge-collapse`（从 dev 检出；`ui/*` 框架改动全局串行 + 框架 owner 评审） |

## 2. 总体架构

**状态机（4 态）**：

```
自由(Free) ──溢出校正/贴靠──▶ 贴边(Docked，完整可见) ──空闲1s──▶ 收起(Collapsed)
    ▲                              │                             │
    └─────────────拖动─────────────┴─────────hover窄条弹回─────────┘
```

- **自由**：窗口距四边 > 阈值，无收起逻辑，拖动手感=现状。
- **贴边**：窗口边沿贴靠屏幕边（距离 = 0 精确贴齐，或溢出校正后贴齐）且完整可见；光标离开起 1s 计时。
- **收起**：贴边 1s 空闲 → 缓滑出屏留 ~20px 窄条。

**改动面**：
- `src/app/strip-main.js`：状态机 + 边缘/溢出检测（`screen.currentMonitor`）+ rAF tween 收起/弹回 + 1s 计时器 + 权限调用；`fit()` 在收起/收起态**挂起**。
- `src/components/float-strip/float-strip.js` / `.css`：`.c-strip__grip` 把手元素（绝对定位、仅收起态显示、`data-dock-edge` 定向）+ 收起态类 `.c-strip--collapsed`。
- `src-tauri/capabilities/default.json`：`core:window:allow-current-monitor`。
- 测试：`tests/unit/strip-edge.test.js`（纯函数）+ `tests/e2e/floatstrip.spec.js`（mock 交互）+ `tests/unit/window-capabilities.test.js`（补权限断言）。

## 3. 详细设计

### 3.1 边缘检测与坐标口径

- 窗口 rect：`win.outerPosition()`（物理像素 `{x,y}`）+ `win.outerSize()`（物理像素 `{width,height}`）。
- 显示器 bounds：`win.currentMonitor()`（Monitor API 在 Window 类，无独立 screen 模块）→ `{ position:{x,y}, size:{width,height} }`（物理像素）。需权限 `core:window:allow-current-monitor`。
- 四边距离 = 窗口 rect 到当前显示器 bounds 四边的距离。
- 判定：
  - **溢出某边**：窗口该边越出 monitor bounds（如 `rect.left < m.left`）。
  - **贴靠边（贴边态）**：该边与 monitor 边距离 = 0（精确贴齐）且完整可见；溢出经校正后同样贴齐。
- 多显示器：`currentMonitor()` 返回窗口所在显示器，边检测相对该显示器（含 scaleFactor 处理，物理/物理一致）。

### 3.2 先决校正（进入贴边）

- 拖拽结束检测：`onMoved` 去抖 ~150ms 无移动 = 松手。
- 校正：若窗口某边**溢出** → `setPosition` 将该边对齐 monitor 边（拉回完整可见）→ 进入贴边态。
- **不做磁吸**：靠边但未溢出 → 不动，不进入收起计时。

### 3.3 收起动画

- **方向**：贴靠边决定 —— 底→向下滑出、顶→向上、左→向左、右→向右。角位（贴两条边）选**主贴靠边**（距边最小者）。
- **目标位**：贴边完整位 + 沿贴靠边方向位移 `(窗口该边尺寸 - SLIVER)`，使屏幕内仅剩 `SLIVER = 20px`。
- **动画**：JS rAF 逐帧 `setPosition` tween，ease-out ~500ms（比 `--dur-slow` 300ms 更慢的「缓收起」节奏）。时长读 CSS 变量 `--strip-dur-collapse`（float-strip.css 定义，默认 500ms；JS 经 `getComputedStyle` 读取，同现有 `readDur` 模式），动效降级时归零。窗口移动是 OS 层 `setPosition`，**非 CSS 布局动画**（不触动画红线）。
- **收起态协调**：挂起 `fit()`（现有 hover→onResize 贴合 + 倒计时宽度漂移重贴），防把滑出窗口重新顶回屏内；收起滑出期间不触发位置持久化。

### 3.4 收起形态 B（边缘小把手）

- 窄条 = 窗口**靠屏幕中心一侧** ~20px 边带（同 `--surface-solid` 材质 + `--text-3` 边框 + 圆角）——「依旧靠近弹出效果」：收起来仍像悬浮条本身的一截。
- grip：`.c-strip__grip` chevron，指向屏幕中心（拉出方向）：底贴→↑、顶贴→↓、左贴→→、右贴→←，由 `data-dock-edge` 类定向。**仅在 Tauri 窗口模式渲染**（`renderFloatStrip` 加可选 flag，浏览器 demo/strip 模式不渲染，保既有 DOM 结构严格计数断言），收起态显示。
- **仅收起态显示**（常态 `display:none`，无布局位移）；绝对定位到内缘（不占布局、不改变常态几何）。
- 语义：可发现性好、有「拉出来」暗示；可见窄条始终在窗口 bounds 内 → hover 事件可达。

### 3.5 触发语义（标准自动隐藏）

- 贴边态：hover / 拖动 / 点击 → **取消**计时；光标离开条（`.c-strip` mouseleave）→ **重新**起 1s 计时 → 到时缓收起。
- 收起态：hover 可见窄条（`.c-strip` mouseenter）→ 弹回贴边完整位。
- 可见窄条在窗口 bounds 内 → mouseenter / mouseleave 照常触发。

### 3.6 持久化

- 收起位置不写 `localStorage`（瞬态）。
- 贴边完整位 / 自由位才保存（沿用现有 `onMoved` 去抖持久化；收起滑出期间跳过）。
- 弹回后贴边位持久化（与自由位同存储键）。

## 4. 动画红线与协调

- 全部位移走 `setPosition`（OS 层）；CSS 无布局动画；grip 显示/隐藏走 `display` 切换 + paint-only 过渡（`border-color` / `opacity`）。
- 时长经 CSS 变量 `--strip-dur-collapse`（500ms）；动效降级（`data-motion="off"` / reduced-motion）时该变量归零 → 收起/弹出瞬时完成。
- `fit()` 在收起/收起态挂起，恢复正常态后恢复。

## 5. 测试

- 纯函数单测 `tests/unit/strip-edge.test.js`：四边距离计算、溢出判定、贴靠边→滑出方向映射、收起目标位计算（`computeCollapseTarget` 等）。
- e2e `tests/e2e/floatstrip.spec.js`（mock）：半出屏松手→校正贴齐；贴边 1s→收起（含 hover 取消计时）；收起态 hover→弹回；四边方向 + `data-dock-edge`；grip 仅收起态显示。
- `tests/unit/window-capabilities.test.js`：补 `core:window:allow-current-monitor` 断言。
- Tauri 真机行为标注待 `npm run tauri:dev` 验证（web 测试只验 JS 调用形态，不验证真实 setPosition 滑出屏 / monitor bounds / 屏外 hover）。

## 6. 待真机验证

- 真实显示器 bounds 与 DPI：`outerPosition`/`outerSize`（物理）与 `currentMonitor` bounds（物理）坐标口径一致。
- 窗口大部分滑出屏后，可见窄条的 hover 事件可达性（Windows 命中测试）。
- 角位主贴靠边选择与收起方向观感。
