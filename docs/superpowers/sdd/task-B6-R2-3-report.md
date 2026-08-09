# Task B6-R2-3 报告：导航轮 resize 后顶/底项选中修复（ResizeObserver 重算几何 padding + destroy）

- **任务**: B6-R2-3（来源：`docs/superpowers/sdd/task-B6-R2-3-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md` §6 导航轮选中 bug，唯一需求源）
- **分支**: `feature/b6-r2-page-style-refresh`（共享 checkout，无 worktree 隔离）
- **状态**: DONE_WITH_CONCERNS（concern 为全量 e2e 环境性冷启动 flake，与本次改动无关，已证）

## 根因（复现确认）

`src/components/navigation-wheel/nav-wheel.js` 的几何 padding（`padTop/padBottom`）与 `CONTENT_TOP` **只在 mount 时按当时 `viewLen()` 计算一次，容器尺寸变化后永不重算**。≤900px 手机形态加载时左窗 `display:none` → `clientHeight=0` → `pad=0`；「拉宽」过 900px 断点后左窗显示但 pad 仍为 0、`CONTENT_TOP` 仍为 0（实测拉宽后应为 6=marginTop），窗口较矮可滚动时锚线数学断裂：点底部项 → 目标 scrollTop 超 maxScroll 被 clamp → `snapNow` 的 `findNearestIndex` 锚线指向中间项 → 跳 3-4；点顶部项（从滚动位置跳回）→ `snapNow` 重算锚线最近项为相邻项 → 跳 1-2。

**实测复现 dump**（未修复代码，临时调试 spec，未入库）：`[after-widen-300ms]` clientHeight=360 而 `padTop/padBottom=0px`、`offsetTop0=6`（`CONTENT_TOP` 陈旧为 0）；`[after-click-6-t200]` active `6→3`；`[after-click-0-t200]` active `0→2`。与 brief 所述跳变完全一致。

## 实施内容

1. **`src/components/navigation-wheel/nav-wheel.js`** — 原 mount 一次性 pad 计算 + `const CONTENT_TOP` 整块替换为 brief Step 3 verbatim：
   - `CONTENT_TOP` 改 `let`（`let CONTENT_TOP = itemEls[0][AXIS.offset]`）。
   - 新增 `recomputeGeometry()`：按当前 `viewLen()` 重算 `padTop/padBottom`、写回 `list` 的 `padding-*`、刷新 `CONTENT_TOP = itemEls[0][AXIS.offset]`、`setFocal()`（函数声明提升，调用安全）。mount 时调用一次（与原行为等价，幂等）。
   - `const ro = new ResizeObserver(recomputeGeometry); ro.observe(list);` —— 观察 list（`position:absolute; inset` 铺满容器 → clientHeight=容器高；改 padding 不改变自身 clientHeight，无观测循环；`display:none→可见`亦触发）。**不在 resize 时主动重对齐滚动**（避免触发 snapNow 误改选中；下次交互自然纠正）。
   - 返回值新增 `destroy: () => ro.disconnect()`（防右窗重挂泄漏）。
   - 既有 nav-wheel-geometry.js 纯函数（anchorY/scrollTopForAnchor/findNearestIndex/focalScale/focalOpacity）零改动。

2. **`src/app/app-main.js`** — 右窗 renderRight 重挂前 destroy 旧轮（brief Step 4）：
   - 新增 `let rightWheel = null`（置 `let dockMounted = false;` 附近，带注释说明右窗为多实例、左窗/dock 常驻单实例无需销毁）。
   - `renderRight()` 开头 `rightWheel?.destroy(); rightWheel = null;`（重挂前释放旧 ResizeObserver），两个分支挂载新轮后 `rightWheel = wheel`。

3. **`tests/e2e/app-shell.spec.js`** — 新增 B6-R2-3 resize 回归用例（brief Step 1 语义 + 两处确定性加固，见 TDD 节）。

## TDD 证据（RED → GREEN）

**Step 1-2 RED**（实现前）：`npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "B6-R2-3"`
```
1 failed
× B6-R2-3：resize 后导航顶/底项可正常选中 → toHaveAttribute('data-index','6') failed, Received "3"
```
（点底部项 active 变 3，与 brief 预期「修复前跳到 3/4」一致；隔离调试 dump 另证顶项 0→2。）

> **对 brief verbatim 用例的两处确定性加固**（保证 RED 真实成立、测试真门禁）：
> ① **断言前等吸附沉降**：verbatim 用例在 click 后立即 `toHaveAttribute` —— 该断言在首个轮询（click 同步设 active=6/0 后、150ms snapNow debounce 前）即满足，**旧代码也绿（假绿）**。加 `waitForTimeout(400)`（本 spec 既有吸附等待惯用，line 314「吸附完成后测量位置」同款）令断言落在 snapNow 沉降后。
> ② **拉宽前等挂载**：`page.goto` 返回于 load 事件，而应用壳为动态 import —— verbatim 用例 goto 后立即 `setViewportSize(1440)`，存在「拉宽先于挂载」竞态（此时轮挂载于桌面宽度、pad 正确，bug 前置不成立 → 旧代码也绿）。加 `await expect(page.locator('.app-main')).toBeVisible()`（确保轮在 700px 手机形态下挂载、pad=0），再拉宽。加固后 RED 确定性成立（连续复跑均红），且修复后 GREEN 连续成立。

**Step 5 GREEN**（实现后）：同一命令 → `1 passed`；app-shell 全文件 → `34 passed`（33 既有 + 1 新）。

**修复后行为 dump**（同调试 spec）：`[after-widen-300ms]` `padTop=105.52px`/`padBottom=190.48px`/`offsetTop0=112`（RO 触发重算，值不再陈旧）；`[after-click-6-t400]` active 保持 6、scrollTop=384（精确锚点）；`[after-click-0-t400]` active 保持 0、scrollTop=0。

## 全量回归（Step 6）

- `npx playwright test --config=playwright.config.worktree.js`（默认 workers 全量）→ **多轮均为 121-123 passed / 1-3 failed**，失败为**旋转变化的冷启动时序 flake**：app-shell「标题栏上下文联动」/「亚克力两档」/「设置分区组件/动效」/「浏览器装饰背景层」、components-basic「B6-R2-2 按钮 primary」、mobile-nav「概览主题状态卡」、smoke「app shell renders」、visual「app-main light/indigo」等 —— 全部为 `page.goto` 后首断言 5s 内惰性挂载元素未就绪、或 5.3MB 普惠体加载/worker 资源超时，且 **每轮失败集合不同**（旋转变化）。**基线对照实验**：`git stash` 后对**未改动旧代码**同条件全量 → **同一批用例同样 3 failed** → 证明 flake 与本次改动无关（环境性争用）。最终轮 3 个失败用例（标题栏上下文联动 / components-basic primary / 视觉 app-main light/indigo）**隔离复跑均绿**；串行运行中断涉及的 visual app-main light/amber+emerald 隔离复跑 20 张全绿。
- `--workers=3` → 123 passed / 1 failed（smoke 首测冷启动，隔离复跑绿）。
- `--workers=1` 串行 → 运行至 test 97（视觉 app-main light/amber）处 **worker 崩溃中断**（amber/emerald 0-41ms 即失败 + 其后 28 项中断、无 summary）—— 单进程资源性崩溃（软件栅格化 + 大字体内存压力），非断言失败；该两图隔离复跑绿。
- `npm test` → **15 files / 68 passed**。
- `npm run build` → **✓**（4.60s）。
- **视觉基线零变化**：本任务零视觉改动（仅 JS 几何重算逻辑 + 测试），未 `--update-snapshots`；视觉用例在非争用/隔离下全部通过。

## 文件变更

- `src/components/navigation-wheel/nav-wheel.js`（ResizeObserver 重算几何 + `CONTENT_TOP` 改 let + `destroy()`）
- `src/app/app-main.js`（renderRight 重挂前 destroy 旧轮 + `rightWheel` 句柄）
- `tests/e2e/app-shell.spec.js`（新增 B6-R2-3 resize 回归用例）
- `docs/superpowers/sdd/task-B6-R2-3-report.md`、`docs/superpowers/sdd/progress-b6-r2.md`、`docs/superpowers/sdd/task-B6-R2-3-brief.md`
- `playwright.config.worktree.js` **未提交**（本地 git-ignored，仅使用）

## 自评

- **完整性**：ResizeObserver 重算 pad/CONTENT_TOP + `CONTENT_TOP` 改 let + `destroy()` + app-main renderRight 重挂前 destroy + resize 回归用例（RED→GREEN）+ 全量回归（单测 68 passed / build ✓ / 全量 e2e 隔离复跑全绿）✓
- **质量**：替换块与既有风格一致（注释说明根因与 RO 无观测循环原理）；`recomputeGeometry()` 幂等（mount 调用与 RO 初始回调重复无害）；destroy 仅为 `ro.disconnect()`，不触碰既有监听器/行为；`rightWheel` 声明于 `dockMounted` 旁、renderRight 调用点晚于声明（无 TDZ 问题）✓
- **纪律**：零运行时依赖（ResizeObserver 浏览器原生 API）；材质体系（themes.css）、`--font-mono`、配置链路（defaults→store→apply）、视觉基线全部未触碰；未动 nav-wheel-geometry.js 纯函数；`playwright.config.worktree.js` 未入库；动画红线：scrollTop 原生赋值非动画属性、无 layout 动画新增 ✓
- **测试**：TDD 红→绿证据完整；测试为本 spec 既有断言/等待惯用（toHaveAttribute + waitForTimeout 吸附等待）✓

## 备注 / 关注点

- **verbatim 用例加固**（见 TDD 节）：brief 的 verbatim e2e 用例在旧代码上「假绿」（断言早于 snapNow 沉降 / 拉宽竞态先于挂载），不构成真实门禁；已加「吸附沉降等待 + 拉宽前等挂载」两处确定性加固使其成为真 RED→GREEN 门禁。语义与 brief 完全一致（点击顶/底项、断言 active 索引）。
- **全量 e2e 冷启动/资源 flake（环境，非本次改动）**：默认 workers 全量下每轮 1-3 个旋转失败，均为「`page.goto` 后首断言 5s 内惰性挂载元素未就绪」或「5.3MB 普惠体加载/worker 资源超时」—— app-shell 亚克力/mobile-nav 主题卡/smoke 等已记入 B6-R2-2 账本。**基线对照（stash 旧代码同条件全量 = 同批 3 failed）** 证明与本次改动无关；每轮 flake 用例**隔离复跑均绿**（最终轮 3 个 + 串行中断涉及的视觉 2 图）。串行 `--workers=1` 亦在视觉用例处 worker 崩溃中断（资源性）。建议控制器在最终评审时知悉：全量回归绿以「隔离复跑验证 + 改动相关用例确定性全绿」为准（本机默认 workers 全量无法稳定全绿，与代码无关）。
- **临时调试 spec**（`tests/e2e/__b6r23-debug.spec.js`）仅用于 RED/GREEN 证据采集，已删除，不入库。

---

## 评审（独立评审占位）

（独立评审结论待控制器评审后填写 / 无评审发现则标 clean。）
