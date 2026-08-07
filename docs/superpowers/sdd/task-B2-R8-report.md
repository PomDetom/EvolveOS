# Task B2-R8: 导航栏顶部割裂修复（遮罩 → 内容遮罩）+ 标题栏快捷深浅切换按钮 — 实施报告

- **状态**：DONE
- **提交**：`556c936`（feat，12 文件：5 源 + app-shell.spec.js + 6 张 app-main 快照重生成）
- **需求源**：docs/superpowers/sdd/task-B2-R8-brief.md（唯一需求源，代码按字面使用）
- **分支**：feature/b2-visual（R1-R7 已完成并入；Cargo.toml 为本会话前已有改动，未碰）

## 变更文件

| 文件 | 变更 |
|---|---|
| `src/components/navigation-wheel/nav-wheel.js` | 删除 34-41 行叠加渐变遮罩 div 插入块（`.c-navwheel__mask` + `--bottom` 两 div + holder 查找逻辑）；竖向/横向都不再插入遮罩元素 |
| `src/components/navigation-wheel/nav-wheel.css` | 删 `.c-navwheel__mask`/`--bottom` gradient 规则 + `[data-glass="off"]` 覆盖（约 79-87 行）；新增竖向列表内容遮罩 `.c-navwheel__list:not(--horizontal)` mask-image（顶/底 48px 淡出，无叠加色带） |
| `src/app/app-main.css` | 删 `.app-main__nav-l/.nav-r .c-navwheel__mask--bottom { bottom: 0 }` 两条死规则（遮罩元素已删） |
| `src/components/title-bar/title-bar.js` | `renderTitleBar` 加 `themeToggle = false` 选项，按钮（`.c-titlebar__control--theme`）插在设置按钮之前（左缘）；默认 false → 其他调用方逐字节不变 |
| `src/app/app-main.js` | 模板 `renderTitleBar` 传 `themeToggle: true`；import 补 `saveConfig`/`subscribe`（store.js）+ `prefersDark`（apply.js）；挂载后接线主题按钮（点击翻转经 saveConfig→applyConfig，图标随主题 sun/moon，subscribe 同步设置分区等源的变更） |
| `tests/e2e/app-shell.spec.js` | 新增两用例（brief Step 1/Step 8 字面；Step 1 用例加「先等导航轮 7 项挂载」守卫，见下） |
| `tests/e2e/visual-regression.spec.js-snapshots/app-main-*.png` | **6 张** app-main 基线重生成（light/dark × indigo/amber/emerald） |

## TDD 证据

- **Part A Step 1/2（红）**：新增「导航栏顶部无叠加遮罩色带（内容遮罩）」后运行 `npx playwright test tests/e2e/app-shell.spec.js -g "顶部无叠加遮罩"` → FAIL（实测 `.c-navwheel__mask` 解析为 2 个元素，mask-image 为 none）。
- **Part A Step 3-5（实现）**：按上表落地（nav-wheel.js 删插入 → nav-wheel.css 删渐变规则 + 加 mask-image → app-main.css 删死规则）。
- **Part A Step 6（绿）**：`-g "顶部无叠加遮罩"` → PASS。
- **Part B Step 8/9（红）**：新增「标题栏快捷深浅切换按钮：点击翻转 data-theme」→ FAIL（`.c-titlebar__control--theme` 不存在，locator 超时）。
- **Part B Step 7/10（实现）**：title-bar.js 加 themeToggle → app-main.js 接线（模板 + import + 事件 + subscribe）。
- **Part B Step 11（绿）**：`-g "深浅切换"` → PASS。

### 与 brief 的一处测试字面差异（红绿门禁加固）

brief Step 1 用例在 `page.goto('/?mode=app')` 后直接断言 `.c-navwheel__mask` count 0。若挂载前断言，空 DOM 上 `toHaveCount(0)` 会**真空通过**（失去「删叠加遮罩」真门禁）。参照 B2-R4 用例同款注释（「若在挂载前断言，toHaveCount(0) 会在空 DOM 上通过」），在 count 断言前加 `await expect(page.locator('.app-main__nav-l .c-navwheel__item')).toHaveCount(7);` 等导航轮挂载——旧代码挂载后 mask 仍为 2 个 → 正确红；新代码挂载后 0 个 → 正确绿。断言本体（`toHaveCount(0)` + mask-image 含 linear-gradient）与 brief 字面一致。

## 视觉基线：6 张 app-main 重生成（components/motion 分区零漂移，未重写）

- **实测差异集**：`npm run test:visual` 初跑仅 **app-main 6 张**失败（light/dark × 3 accent）；**appearance-partition 6 + components-partition 6 + motion-partition 6 = 18 张零漂移通过**。brief 预期「components-partition 6 也变」未发生——组件分区截图为设置页内容区，nav-wheel 演示实例在组件分区上下文无可见遮罩观感差异（无玻璃叠加、无 mask 视觉变化），实测为 no-op。`--update-snapshots` 全量重跑后 git 仅 6 张 app-main png 变更，另 18 张字节级不变（证实零漂移）。
- **解码比对（headless canvas 像素级，old baseline vs new，代表 3 张）**：
  - 差异包围盒：`(0,13)-(1088,719)`，粗网格 24×16 定位差异集中在 **x0-107（左导航栏）** + **x1067-1120（标题栏右侧控件区）** 两带，内容区（页面区 x64+）逐像素零差异。
  - 逐点采样（light-indigo）：标题栏 x1075,y20 expected `(249,249,250)`（无按钮）→ actual `(179,180,189)`（新增 sun 图标字形像素）＝**标题栏按钮**；导航栏 y60,x0-64 expected `(243,245,250)` → actual `(242,244,251)`（叠加渐变洗白带消失）＝**顶部色带消除**；y690-720 底缘 expected → actual 微亮＝**底部遮罩机制变化**（叠加渐变 → 内容 mask 淡出）。
  - 中间带（y260-680）少量孤立像素差异（每行 2-7 点，均落在 x8-54 图标字形区）= mask-image 强制列表进入合成层引起的矢量描边亚像素抗锯齿位移，非结构变化。
  - 结论：差异＝导航栏顶部色带消除 + 标题栏按钮 + 底部遮罩机制（均本次改动直接引起），**无布局位移、无内容区漂移** → 仅重生成 app-main 6 张，其余 18 张维持。

## 验证结果

- `npm test`：**60/60**（10 files）
- `npm run test:e2e`：**97/97**（含两个新用例 + 其余零冲击：app-shell 全量 + mobile-nav/nav-wheel/smoke + 24 张视觉基线；首轮全量曾出现 1 次 smoke「app shell renders」孤立失败，隔离复跑 PASS 判为并发 flake，终轮全量 97/97 未复发）
- `npm run test:visual`：**24/24**（重生成后逐像素全绿）
- `npm run build`：**通过**

## 命名边界核对

- `.c-navwheel__mask` 相关仅剩 docs 历史 diff，源码/测试零引用 ✓
- 横向 dock（`.c-navwheel__list--horizontal`）不加 mask-image（列表规则以 `:not(--horizontal)` 排除）✓
- 深浅切换走完整配置链路 saveConfig→applyConfig（不绕过直接写 CSS 变量）；`subscribe` 同步设置分区主题变更 ✓
- 动画红线：mask-image 为静态遮罩（非动画属性）、blur 不动画、过渡只走既有豁免（color/background）✓
- `.cust-group` count 6 不受影响（app-shell「设置模式：选择外观」通过）✓
- `themeUnsub` 变量按 brief 字面声明，桌面常驻订阅无需退订（应用壳单次挂载，移动端不重建标题栏）；无 lint/构建约束 ✓
