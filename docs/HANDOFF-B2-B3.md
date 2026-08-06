# 开发交接文档 — 应用壳产品化 B2/B3 实施

- **交接日期**: 2026-08-06
- **当前分支**: `main`（HEAD `618cea1`，工作树干净）
- **上一阶段**: 应用壳 A1-A7 + 产品化 B1 全部完成并合并 main
- **下一阶段**: B2（视觉主体）+ B3（设置完善），由下一个对话执行

## 1. 项目当前状态

**产品形态**：应用壳为唯一产品形态（浏览器 `/` 与 Tauri 直进应用壳），docs 设计系统展示页已删除（B1）。设计系统展示内容内化为应用壳设置分区：
- 设置目录 10 分区（`APP_SECTIONS`）：通用0/外观1/界面2/快捷键3/通知4/数据5/高级6/关于7/组件8/动效9
- 「组件」分区（index 8）：32 组件矩阵（7 `.csg`）+ 剪贴板悬浮窗组合示例
- 「动效」分区（index 9）：动效实验室（5 卡）
- 窗口控制双通道：Tauri 真实 + 浏览器降级（按钮保留 + toast）

**验证基线**：unit 54、e2e 82（含 18 张视觉基线）、build 通过。

**核心文件地图**：
| 文件 | 职责 |
|---|---|
| `src/main.js` | 入口：mode 分支（app/strip 动态 import） |
| `src/app/mode.js` | `resolveMode` app/strip 两态 |
| `src/app/app-main.js` | 应用壳主体（双窗/设置/手机形态/分区惰性挂载） |
| `src/app/app-main.css` | 应用壳布局（grid、玻璃表面 `--surface-1`、动画） |
| `src/scenes/settings-window/settings-pages.js` | 设置页共享（SECTIONS/APP_SECTIONS/pageBody/交互） |
| `src/demo/customizer-panel.js` | 外观定制器（GROUPS 6 组滑杆 + 订阅双向同步） |
| `src/config/defaults.js` | 配置默认值 + RANGES + ACCENTS |
| `src/config/apply.js` | 配置→CSS 变量（玻璃/色彩/动效/圆角/阴影） |
| `src/components/navigation-wheel/` | NavigationWheel（几何参数化 0.382 锚点 + 横竖） |
| `src/demo/component-showcase-full.js` | 组件矩阵（惰性挂载进组件分区） |
| `src/demo/motion-lab.js` | 动效实验室（惰性挂载进动效分区，已返回 unsub） |

## 2. 待执行计划

| 计划 | 文件 | 内容 |
|---|---|---|
| **B2 视觉主体** | `docs/superpowers/plans/2026-08-06-app-shell-b2.md` | 玻璃材质两档（磨砂 backdrop-filter/纯色不透明）+ 浏览器装饰背景层（3 预设）+ 导航图标四项增强（提亮/衬底/光晕/尺寸分级） |
| **B3 设置完善** | `docs/superpowers/plans/2026-08-06-app-shell-b3.md` | 外观分组重命名（全局语义）+ 实时整体预览卡 |

**规格**：`docs/superpowers/specs/2026-08-06-app-shell-product-design.md`（§3 B2 / §4 B3 为需求源）

**依赖**：B3 依赖 B2 玻璃落地（滑杆「全局生效」观感的前提）；执行顺序 B2 → B3，或各自独立分支按序合并。

## 3. 执行流程（SDD，子代理驱动）

1. **分支**：B2 自 main 检出 `feature/b2-visual`；B3 自 main（或 B2 合并后）检出 `feature/b3-settings`。
2. **每任务**：`task-brief` 提取 → 派发 implementer（机械 haiku / 集成 sonnet / 审查 opus）→ 报告 → `review-package` 生成审查包 → 派发 reviewer → 修复循环（≤5 轮，前 3 续派原实施者，后 2 换更强模型）→ 账本 `docs/superpowers/sdd/progress-b2.md` / `progress-b3.md` 留痕（随代码提交）。
3. **每任务结束全量回归绿**：`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build`。
4. **全部完成后**：最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归。
5. **常用脚本**（项目内 `docs/superpowers/sdd/` 有现成留痕格式可参考）：
   - `task-brief PLAN_FILE N` / `review-package PLAN_FILE BASE HEAD`（技能 scripts 目录）

## 4. 铁律与红线（违反即失败）

- 测试仅在 Web 环境执行（不跑 tauri dev）。
- 动画红线：只动 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults→store→apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 视觉基线变化必须先解码比对确认差异由本次改动引起，再 `--update-snapshots`。
- 禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审。

## 5. 已确认的用户决策（brainstorming 记录）

| 决策 | 内容 |
|---|---|
| 玻璃质感 | 磨砂玻璃（backdrop-filter）↔ 纯色不透明两档，默认磨砂 |
| 浏览器磨砂对象 | 应用壳根部装饰背景层（渐变/几何/网格，3 预设，Tauri 透明） |
| 窗口控制 | Tauri 真实 + 浏览器保留按钮 + toast（已 B1-2 完成） |
| 图标增强 | 四项全做：提亮高对比 / icon 衬底 / 选中态光晕分层 / 尺寸粗细分级 |
| 外观调整 | 重命名分组 + 实时整体预览（滑杆真正作用于全局） |
| docs 去留 | 移出产品形态，展示内容收进设置组件/动效分区（B1 完成） |

## 6. Deferred Minor 清单（前序评审遗留，下阶段可顺手处理）

**B1 遗留（记于 `docs/superpowers/sdd/progress-b1.md`）**：
- `src/styles/layout.css` 含 docs 时代死规则（`.app-shell/.topbar/.navwheel/.tsw__*`）+ 第 17 行引用已删 token-showcase.css 的过时注释（`.showcase__*` 仍被组件分区用故文件保留）
- `src/scenes/settings-window/settings-window.css` 含死场景规则（`.csettings-scene*/.csettings 820×520/.csettings__nav/.csettings__back`，仅已删的 settings-window.js 场景用，`.csettings__page` 等仍被用）
- `resolveMode` 的 `hasTauri` 参数现为死参数（保留接口）
- visual-regression.spec.js 硬编码 `toHaveCount(10)`（共享分区增减需同步）
- 分区标题栏变体不再收窗口控制绑定（惰性挂载后 bindWindowControls 已运行；行为变更，可接受或分区挂载时再绑）
- 测试覆盖缺口：手机 components/motion tabs 无 e2e；「激活前空」惰性加载未断言；`--settings` 按钮不劫持无负向断言；customizer 重置/导出覆盖丢失；theme-switcher aria-pressed 断言丢失

**B2 已知风险（计划书内）**：
- B2-1 apply.js 需同时写 CSS 变量与 data-glass（CSS 选择器用后者）
- B2-3 图标分级需 JS 重渲染 icon（CSS 无法改 svg 宽高），勿破坏 setFocal transform/opacity

## 7. 其他

- 既有迭代期账本 `docs/superpowers/sdd/progress-app-shell.md` / `progress-iteration.md` 记录历史，可参考留痕格式。
- Tauri 桌面行为由用户自行目检（测试仅 Web 环境）。
- 若需查看已删除的 docs 展示页历史实现，`git show` 早期 commit 即可。
