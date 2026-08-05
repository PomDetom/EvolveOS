# Task A2 Report — NavigationWheel 几何参数化（黄金比例锚点 + 方向）

**Status:** DONE_WITH_CONCERNS（1 项范围偏差 + 2 项已知限制，均已在下方说明）
**日期:** 2026-08-05

## What I implemented

将 NavigationWheel 选中锚点从 50% 中心改为 38.2% 黄金比例（`anchorRatio` 默认 0.382），并加 `direction: 'vertical' | 'horizontal'` 主轴抽象。

### geometry 层（`src/components/navigation-wheel/nav-wheel-geometry.js`，全部纯函数）
- `anchorY(index, itemHeight, gap, viewportLength, anchorRatio = 0.382)` — 项锚点位置（= 项中心，主轴坐标）。`viewportLength`/`anchorRatio` 按 brief 接口签名保留（值只取决于项几何），注释说明。
- `scrollTopForAnchor(index, itemHeight, gap, viewportLength, anchorRatio = 0.382)` = `anchorY(i) - viewportLength * anchorRatio`（替代 `scrollTopForCenter` 的 `- viewportLength/2`）。
- `findNearestIndex(scrollTop, count, itemHeight, gap, viewportLength, anchorRatio = 0.382)` — `viewAnchor = scrollTop + viewportLength * anchorRatio`，其余（clamp/无守卫补偿坐标说明）保留。
- `focalScale/focalOpacity(offset, viewportLength, maxScale, falloff)` — 参数 `viewportHeight` 更名 `viewportLength`；**offset 相对主轴锚线**（调用方按 `viewportLength * anchorRatio` 计算），峰值在锚点而非视口中心。falloff 默认保留（scale 1.3 / opacity 1.4）。
- 删除 `itemCenterY`/`scrollTopForCenter` —— 不留中心语义残留（`anchorRatio=0.5` 即恢复旧中心数学，单测锁定向后兼容基准）。

### 渲染层（`src/components/navigation-wheel/nav-wheel.js`）
- `mountNavWheel(root, { items, onChange, anchorRatio = 0.382, direction = 'vertical' })`；`setActive`/`scrollToIndex` 保留。
- 主轴抽象 `AXIS` 映射表（vertical 默认解析为旧的全部属性）：`size`（height/width）、`margin`（marginTop/marginLeft）、`len`（clientHeight/clientWidth）、`scroll`（scrollTop/scrollLeft）、`offset`（offsetTop/offsetLeft）、`translate`（translateY/translateX）、`padBefore/padAfter`、`pointer`（clientY/clientX）、`prev/next`（ArrowUp/ArrowDown 或 ArrowLeft/ArrowRight）。**vertical 路径行为与旧实现逐点等价**（同一组属性/同式）。
- 首尾 padding **非对称**：`padTop = max(0, len*anchorRatio - itemH/2 - marginTop)`、`padBottom = max(0, len*(1-anchorRatio) - itemH/2 - marginTop)`。
  - 设计决策（偏离 brief 单公式但符合其目标「首/末项能滚到锚点」）：brief 给出的 `pad = max(0, len*anchorRatio - itemH/2 - marginTop)` 只保证**首项**能滚到锚线；锚点非居中（38.2%）时对称 padding 会让**末项**滚不到锚线。推导：`padBottom ≥ len*(1-anchorRatio) - itemH/2 - marginTop`（利用 gap=12=2*marginTop=12）。`anchorRatio=0.5` 时二者相等 = 旧中心 pad（vh=400 下均 168，已数值验证）。
  - 数值验证：侧栏 624px 视口 → padTop=206.368（=0.382*624-32）、padBottom=353.632（=0.618*624-32）；末项锚点 raw scrollTop = 704 = maxScroll，首项 = 0，**两端精确可达**。
- `setFocal` 的 offset 改为相对锚线：`anchorY(i) + CONTENT_TOP - st - vl*anchorRatio`；transform 轴向经 `AXIS.translate`。
- `snapNow`/`select`/`animateScrollTo` 全部改 `scrollTopForAnchor`，滚动轴经 `AXIS.scroll`。
- 指针/键盘事件沿主轴（`AXIS.pointer`、`AXIS.prev/next`）。

### CSS（`src/components/navigation-wheel/nav-wheel.css`）
- 无 JS 占位回退 padding 由 `calc(50% - 32px) 0 50% 0` 改为 `calc(38.2% - 32px) 0 calc(61.8% - 32px) 0`（注释同步；JS 实测值仍覆盖）。

### 设计决策要点
- **geometry 层方向无关**：只有「主轴长度」语义，horizontal 渲染复用同一套公式（scrollTop→scrollLeft、clientHeight→clientWidth 等）。等价性由单测覆盖。本任务**未挂载任何 horizontal 实例**（Task A6 范围，brief 明确不要求）。
- anchorRatio/direction 是**组件实例参数**（mount 时传入），非全局配置项，按 brief 铁律不进 store/config 链路。
- 向后兼容：默认值直接生效，全部既有调用点（docs-mode.js / component-showcase-full.js / main-window.js / settings-window.js）未传参即得新锚点行为，无需改动调用点。

## TDD Evidence

### RED
- 步骤：先改写 `tests/unit/geometry.test.js`（锚点数学、anchorRatio=0.5 恢复、末项 clamp、focal 峰值在锚点、horizontal 等价性），此时 geometry 仍导出旧函数。
- 命令：`npm test`
- 输出（摘要）：
  ```
  tests/unit/geometry.test.js > findNearestIndex > anchorRatio=0.5 时与旧中心语义一致
  TypeError: (0 , scrollTopForAnchor) is not a function
  Test Files 1 failed | 5 passed (6)；Tests 9 failed | 36 passed (45)
  ```
- 为何预期失败：新接口（`anchorY`/`scrollTopForAnchor`/带 `anchorRatio` 的 `findNearestIndex`）尚不存在，所有 9 个新/适配用例 import 即失败。

### GREEN
- 步骤：实现 geometry 参数化 + nav-wheel.js 主轴抽象 + CSS 回退。
- 命令：`npm test`
- 输出（摘要）：
  ```
  tests/unit/geometry.test.js (13 tests) ✓
  Test Files 6 passed；Tests 45 passed (45)
  ```

## Test results（全绿）

| 命令 | 结果 |
|---|---|
| `npm test` | **45/45**（原 41；geometry 9→13） |
| `npm run test:e2e` | **84/84**（含 36 视觉） |
| `npm run test:visual` | **36/36**（重生成后新基线全绿） |
| `npm run build` | **通过**（101 modules，621ms） |

## 基线重生成清单 + 差异区域比对

### 范围偏差：预期 24 张 → 实际 18 张（`components` 6 张不变）
brief/账本预判 `scenes/main-window/settings-window/components` 各 2 主题 × 3 accent = 24 张变化。实测 **`components-*.png` 6 张零变化**：
- 证据：`#components` 全元素截图（1040×7597）中，展示轮 `.c-navwheel--demo`（176×280，位于 `[432,163]`）区域**新旧均为纯背景色**（surface 251,251,253，0 非背景像素）——该轮未进入 `#components` 元素截图的捕获（预存渲染现象，非本任务引入）。`components` 视觉测试改动前后均通过。
- 处理：**未重生成** components 基线（已正确）。18 张已重生成清单（grep 过滤只动这 18）：

```
main-window-{light,dark}-{indigo,amber,emerald}        (6)
scenes-{light,dark}-{indigo,amber,emerald}             (6)
settings-window-{light,dark}-{indigo,amber,emerald}    (6)
```

不变（12+6=18 张，git 仅见上述 18 张 PNG 变更）：`tokens` 6 + `clipboard` 6 + `components` 6。

### 差异区域比对（重生成前，解码比对新旧基线）
对 18 张失败的 actual vs expected（均按测试条件捕获）做像素差异分析，可见阈值（单像素 RGB 差和 > 30）下：
- `main-window`：changed=1728px，bbox **[17,206,45,497]**（29×292 竖向条）；内容区（x≥176）**0 变化**。
- `settings-window`：bbox **[14,191,44,462]**（31×272）；内容区（x≥220）**0 变化**。
- `scenes`：bbox **[17,881,45,1172]**（29px 宽同轴条）。
- 结论：全部可见差异收敛在导航轮图标带的竖向条内 = **锚点位移**（38.2% vs 50% 使项整体上移 ~0.118×viewLen），内容页像素级不变。锚点数学另经数值探针确认（showcase 轮 padTop=53.568=0.382*224-32、item0 中心在 38.2% 线；侧栏轮 padTop=206.368）。

重生成命令（grep 过滤，避免碰其余 18 张）：
```
npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots --grep "main-window|settings-window|scenes"
```

## Files changed

- `src/components/navigation-wheel/nav-wheel-geometry.js`（参数化重写）
- `src/components/navigation-wheel/nav-wheel.js`（anchorRatio + AXIS 主轴抽象）
- `src/components/navigation-wheel/nav-wheel.css`（无 JS 回退 padding → 38.2%/61.8%）
- `tests/unit/geometry.test.js`（13 用例：锚点数学/anchorRatio=0.5 恢复/clamp/focal 峰值/方向等价性）
- `tests/e2e/nav-wheel.spec.js`（居中断言 → 38.2% 锚点断言，3 用例）
- `tests/e2e/visual-regression.spec.js-snapshots/*.png`（18 张重生成）
- `docs/superpowers/sdd/task-A2-report.md`（本报告）
- `docs/superpowers/sdd/task-A2-brief.md`（需求源，随任务提交）

未改动：`tests/e2e/visual-regression.spec.js`（无需代码变更）。

## Self-review findings

- **完整性**：brief 全部接口齐备（anchorY/scrollTopForAnchor/findNearestIndex(+anchorRatio)/focal 系列/方向参数化/mountNavWheel 签名/setActive·scrollToIndex 保留）；CSS 回退同步。
- **向后兼容**：默认 0.382 直接生效、调用点零改动；`anchorRatio=0.5` 恢复旧中心数学（单测）；vertical 路径属性等价（e2e 84 全绿证明）。
- **纪律**：TDD 先红后绿；不留中心语义残留（grep 确认代码仅锚点函数，注释中「中心」仅为解释旧行为）；动画红线只动 transform/opacity、锚点吸附沿用 `--dur-base`/`--ease-spring`、pad 非动画；零新依赖；测试仅在 Web 环境执行；构建通过。
- **配置链路**：anchorRatio/direction 为实例参数，未入 store（符合 brief 铁律）。
- **quality**：geometry 保持纯函数可单测；AXIS 映射表集中方向分歧点；非对称 pad 数学精确（两端可达，数值验证）。

## Issues / concerns

1. **范围偏差（已确认，非错误）**：`components` 6 张基线未变化（展示轮未进入 `#components` 元素截图，预存现象）。24→18 张。若未来展示轮在截图内可见，届时需补重生成。已在账本说明。
2. **horizontal 渲染层未闭环**：方向等价性仅几何层单测覆盖；渲染层 horizontal 分支（无实例挂载）未经渲染级测试，留待 Task A6 闭环。
3. **horizontal CSS/几何假设**：JS 轴向抽象假设横向 gap = 2×marginLeft（同 vertical 的 12=6+6）；横向 item 尺寸/间距/mask 朝向由 A6 定义。
4. **`anchorY` 签名含未用参数**（viewportLength/anchorRatio）按 brief 接口保留；值只取决于项几何（代码注释说明）。可选收尾：改为 3 参精简签名。
