# Task I3 实施报告：迭代修复批 1（低风险遗留项）

**需求源**：`docs/superpowers/plans/2026-08-05-iteration.md` Task I3（6 个 Step / 7 个 4.x 小修项）
**状态**：完成 — 测试均在 Web 环境执行（迭代期规范）；npm test 34/34、e2e 83/83 全绿（36 张视觉基线零重生成）、npm run build 通过

## 提交列表

| 提交 | 内容 |
|---|---|
| `7e32f27` | `test: 滚轮吸附专用 e2e（停止 150ms 后最近项居中选中）`（Step 1） |
| `231bc60` | `fix: toast e2e 稳定性（消失断言放宽超时，消除全量并行下定时器拖延竞态）`（Step 2） |
| `37c4a46` | `docs: 动画红线补充 paint-only 过渡豁免口径（与既有实现一致）`（Step 3） |
| `267631e` | `fix: 迭代修复批 1（无障碍/浮层/令牌化/稳定性）`（Step 4，合并一个提交） |
| 本次 docs | `docs: Task I3 实施留痕（报告）` |

## 一、Step 1 — 滚动吸附补专用 e2e

`tests/e2e/nav-wheel.spec.js` 追加「滚轮滚动停止后吸附最近项并选中」：

- 方法参考最终审查复评实测：`mouse.move` 到列表中心 + `mouse.wheel(0, 100)` → 停止 150ms+ 后吸附。
- 几何实测修正计划书表述：滚 100px 后最近项是**第 3 项**（index 2，其中心偏离 28px 小于第 2 项的 36px），吸附后 scrollTop 收敛 100 → 128。故断言不硬编码 index：滚动确实发生（scrollTop > 50）+ **选中项存在 --active 且其中心与视口中心 delta < 4px**。
- 无需实现改动（吸附功能既有），直接绿。

## 二、Step 2 — toast e2e flake 排查

**根因（时序竞态）**：toast 生命周期由页面内 setTimeout 驱动（2500ms 自动消失 + 220ms 淡出移除 ≈ 2720ms）。旧消失断言 `toHaveCount(0, { timeout: 4000 })` 预算 4s——在全量并行（18 spec 文件、多 worker + playwright.config 强制 swiftshader 软件栅格化）下页面主线程被 CPU 竞争拖延、setTimeout 偶发延迟 >1.3s 时预算耗尽 → 「消失断言超时」。与账本「全量偶发 1 次、单跑必过」特征完全吻合（单跑/小批量无 CPU 竞争）。

**修复**：两个断言全部走自动重试 + 足够超时（出现 `toContainText` 10s、消失 `toHaveCount(0)` 15s），不依赖精确计时预算——慢环境不再失败，测试语义（出现 → 自动消失）不变。修复后**全量跑 2 次均 78 passed** 确认稳定。

## 三、Step 3 — motion 红线 paint-only 豁免文档固化

`docs/CLAUDE.md` 新增「动画红线口径」节：核心红线不变（transform/opacity、模糊永不动画、时长曲线经 CSS 变量），补充 **paint-only 过渡豁免**——background/background-color（按钮/列表行 hover、switch）、border-color/box-shadow（input/select/search-bar 的 focus 态）、color（文本 hover/激活）允许有限状态切换过渡；豁免边界：仅限短暂状态切换（hover/focus/active/选中），不做入场/离场动效主体，layout 属性仍禁。口径与既有实现逐项核对一致（button.css L5-6、input/select/search-bar focus、switch 背景等）。

（未改 `src/CLAUDE.md`：该文件存在控制器未提交的评审留痕，为避免混提交改选干净文件。）

## 四、Step 4 — 小修批（每项 TDD 红→绿）

| 项 | 处理 | 测试 |
|---|---|---|
| a. `.tsw__mode` aria-pressed | 渲染加 `aria-pressed="false"`，`syncUI` 同步单选状态（true/false 与 active 类一致，覆盖初始/切换/订阅外部变更路径）。默认主题为 system → 初始按下的是「跟随」（测试据此修正） | e2e（theme-switcher.spec.js） |
| b. popover 常驻监听 | document 关闭监听改为**打开时一次性注册、关闭即移除**（命名引用保证 add/remove 成对；N 实例 N 常驻监听消除） | 单测（tests/unit/popover.test.js，spy document add/removeEventListener，仅统计 click 避开 jsdom 环境噪音） |
| c. tab 指示条 resize | 两层修复：(1) `window.addEventListener('resize', place)` 重定位；(2) **比登记更深的根因**——`scaleX` 围绕指示条中心缩放会把左边缘额外推 `(新宽-基准宽)/2`px，且原 `dataset.w` 每次被更新为最新 tab 宽、与固定 CSS width 脱节（宽度回变时视觉宽错误）。修复：translateX 补偿中心漂移、`dataset.w` 保持首帧基准宽。演示布局下容器随视口整体平移使指示条「天然跟随」（delta 恒 0，直接测是假绿），故用「tab 宽度变化（响应式重排）+ 真实 resize」复现漂移 | e2e（overlays.spec.js） |
| d. hover 阴影令牌化 | `.c-btn--primary:hover` `box-shadow: 0 4px 12px rgba(0,0,0,0.18)` → `var(--shadow-md)`（现随 shadow-intensity 定制器，符合「禁止硬编码值」） | e2e 断言 hover 后 blur 16px（--shadow-md 特征值） |
| e. fwin close 行为 | `mountFloatingWindow` 补 close 监听 → `win.remove()`（关闭即移除演示窗口；Tauri 真实关闭由壳层接线，注释说明） | e2e（float-components.spec.js） |
| f. fwin 拖拽劫持 | I2 同款修复：`data-tauri-drag-region` 从整条 `.c-fwin__titlebar`（含 pin/fold/close 三按钮）移到 `.c-fwin__title` 非按钮区；浏览器演示拖拽零变化（属性在浏览器无意义） | e2e 契约断言（titlebar 无属性、title 有属性） |
| g. velocity EMA | `pointermove` 单样本导数改 EMA（`velocity = v===0 ? sample : v*0.7 + sample*0.3`），pointerdown 重置 velocity=0 使首样本直接采用；抑制慢速微抖的虚假高初速惯性，快速甩动保留惯性 | 既有拖拽/滚轮/点击 e2e 回归全绿 |

**核实项**：计划书列「键盘方向键 select 前 preventDefault（已修？）」——已核实 `nav-wheel.js` keydown（L111-113）ArrowDown/ArrowUp 均 `e.preventDefault()`，无需改动。

## 五、回归与基线

| 项 | 结果 |
|---|---|
| `npm test`（Vitest） | **34 passed**（31 + 3 新增 popover 单测） |
| `npm run test:e2e`（全量） | **83 passed**（78 + 5 新增用例；Step 2 阶段另 2 次全量 78 passed） |
| 视觉基线 | 36 张全过，**零重生成**——小修批无默认渲染变化（hover 阴影仅 hover 态，基线不截；fwin 仅属性位置变化） |
| `npm run build` | built in 619ms |

## 六、顾虑与备注

1. **4d hover 阴影观感微变**：`--shadow-md`（blur 16、主题色 0.12×intensity）与旧硬编码（blur 12、黑 0.18）数值不同——这正是令牌化目的（跟随 shadow-intensity 定制器、深浅主题自适应）；基线不覆盖 hover 态，未重生成。观感略柔，可在真机复核。
2. **4c 修的是规格缺口下的深坑**：登记 minor 只说「resize 漂移」，实际根因是 scaleX 中心漂移 + 基准宽失联双重问题；演示布局下漂移不可直接复现（容器整体平移天然跟随），已用宽度重排模拟验证。点击切换/指示条动画行为与改动前一致（回归通过）。
3. **4g EMA alpha=0.3 为经验值**：慢速微抖抑制与甩动保留的折中；拖拽 e2e 通过，手感微调建议用户真机/演示复核。
4. **4e close 语义**：选「移除」而非「折叠」（任务二选一）；静态变体（csg-fwin-static）未挂 mount 不受影响。
5. **账本未更新**：`progress-iteration.md` 存在控制器未提交的 I2 评审留痕，为不混提交由我触碰，I3 账本行建议控制器合并其未提交留痕时补入（本报告即完整留痕）。
6. **e2e 用例增长**：83 用例（+5），全量耗时约 2.6-2.9min，可接受。
