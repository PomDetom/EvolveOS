# 开发交接文档 — 应用壳 B3（设置完善）实施

- **交接日期**: 2026-08-07
- **当前分支**: `main`（HEAD `9ef4f09`，工作树仅 `src-tauri/Cargo.toml` 行尾噪声未动）
- **上一阶段**: B2 视觉主体 + 亚克力返工 R1-R9 全部完成、最终整体评审 Ready to merge、**已合并 main**（feature/b2-visual 已删）
- **下一阶段**: B3（设置完善），由下一个对话执行

## 1. 项目当前状态

**产品形态**：应用壳为唯一产品形态（浏览器 `/` 与 Tauri 直进应用壳）。B2 视觉主体 + 亚克力返工已合并 main：

- **材质体系 = Windows 11 亚克力**（替代原玻璃）：`blur + saturate(1.8) + brightness(1.1/0.92)` + 着色底（`glass.opacity` 默认 0.48）+ SVG 噪点（`glass.noise` 默认 0.06）+ 细边框；去玻璃高光反光。
- **背景装饰**：`.app-main__backdrop` 四预设 `data-backdrop="gradient|geo|grid|none"`（渐变/几何/网格/关闭），外观分区「背景装饰」按钮切换（会话内纯 UI 态，不进 store）；Tauri 窗口 `transparent:false`，桌面与浏览器观感一致。
- **图标选中态**：无光晕，accent-100 衬底 + accent icon；尺寸分级（active 24/2.2、非 active 20/1.8）。
- **标题栏**：设置按钮（⚙）左边新增**三态主题快捷按钮**（浅色/深色/跟随系统循环，sun/moon/monitor 图标），与设置分区主题选择器双向同步。
- **导航遮罩**：mask-image 内容遮罩（消除顶部双倍着色色带）。
- **自定义器**：「表面质感」组（透明度/模糊/噪点强度滑杆 + 亚克力材质开关，R5 已改名）；其余 5 组仍为 色彩/排版/圆角/动效/阴影（B3-1 待改）。

**验证基线**：unit 60、e2e 97（含视觉基线 24）、build 通过（合并后全量回归绿）。

**核心文件地图**（B2 相关）：
| 文件 | 职责 |
|---|---|
| `src/styles/themes.css` | 亚克力配方令牌（`--acrylic-saturate/brightness/noise`、`--noise-opacity`、`--surface-solid`）、主题色 |
| `src/app/app-main.css` | 应用壳布局 + 表面亚克力 + `.app-main::after` 噪点层 + 背景层四预设 |
| `src/app/app-main.js` | 壳主体 + 背景预设按钮 + 标题栏三态主题按钮接线 + 主题双向同步 |
| `src/config/defaults.js` | `glass: { opacity: 0.48, blur: 30, noise: 0.06, blurEnabled: true }` |
| `src/config/apply.js` | 配置→CSS 变量（含 `--noise-opacity`、`--glass-enabled`、`data-glass`） |
| `src/components/navigation-wheel/` | NavigationWheel（mask-image 内容遮罩、无光晕、分级渲染） |
| `src/components/title-bar/` | 标题栏（含 `themeToggle` 选项） |
| `src/demo/customizer-panel.js` | 定制器「表面质感」组（噪点强度滑杆） |
| `src/scenes/settings-window/settings-pages.js` | 设置分区（通用三态主题选择器 + 外观定制器容器） |

## 2. 待执行计划

| 计划 | 文件 | 内容 |
|---|---|---|
| **B3 设置完善** | `docs/superpowers/plans/2026-08-06-app-shell-b3.md` | B3-1 外观分组重命名（全局语义）+ B3-2 实时整体预览卡 |

**规格**：`docs/superpowers/specs/2026-08-06-app-shell-product-design.md`（§4 B3 部分）为需求源；B3 计划书为唯一实施需求源。

**B3-1 重命名现状适配**（重要）：计划 B3-1 要求把 6 组全部改名（色彩→整体色调、玻璃材质→表面质感、排版→文字排版、圆角→边角形状、动效→动效节奏、阴影→阴影层次）。**其中「玻璃材质」→「表面质感」已在 B2-R5 完成**——实施时只改其余 5 组 + 每组加 `desc` 描述；`.cust-group` count 6 断言（app-shell.spec.js:148 + 外观分区视觉基线守卫）不受影响。

**B3-2 实时整体预览卡**：外观分区顶部 `.cust-overview` 卡，订阅 store 实时刷新（主题/强调色/玻璃/圆角/图标联动）。计划 Step 3 提示沿用「订阅不重渲染、只同步局部」模式。

**B3 依赖**：B2 亚克力已落地（滑杆「全局生效」观感前提已满足），main 可直接检 `feature/b3-settings`。

## 3. 执行流程（SDD，子代理驱动）

1. **分支**：`git checkout -b feature/b3-settings main`。
2. **每任务**：`task-brief` 提取 → 派发 implementer（机械 haiku / 集成 sonnet / 审查 opus）→ 报告 → `review-package` 生成审查包 → 派发 reviewer → 修复循环（≤5 轮）→ 账本 `docs/superpowers/sdd/progress-b3.md` 留痕（随代码提交）。
   - **注意**：`task-brief` 脚本只匹配 `Task <数字>` 标题，本计划用 `Task B3-N` 标题需手动写 brief（B2 会话同款处理，brief 放 `docs/superpowers/sdd/task-B3-N-brief.md`）。
3. **每任务结束全量回归绿**：`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build`。
4. **全部完成后**：最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归。
5. **常用脚本**：`task-brief PLAN_FILE N` / `review-package PLAN_FILE BASE HEAD`（技能 scripts 目录）。

## 4. 铁律与红线（违反即失败）

- 测试仅在 Web 环境执行（不跑 tauri dev；Tauri 桌面观感由用户目检）。
- 动画红线：只动 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults→store→apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 视觉基线变化必须先解码比对确认差异由本次改动引起，再 `--update-snapshots`；若 no-op（pixelmatch 阈值 > 差异），删快照强制重生成。
- 禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审。

## 5. B2 移交收尾项（B3 顺手处理，优先级从高到低）

**P0（建议 B3 第一个任务先修，用户可见）**：
- **概览页「主题状态」卡陈旧**（最终评审 Issue 1，parked）：标题栏三态主题按钮切主题后，概览卡「当前主题：深/浅色」文本不更新（saveConfig 先触发 subscribe、applyConfig 后写 data-theme → 回调读 data-theme 得旧值，修复无效）。**正确修法**：主题 subscribe 回调内读 `getConfig().theme` + `prefersDark()` 解析 system（同 `updateThemeIcon` 模式），更新 `.app-main__theme-row` 首 span（桌面）与 `.app-main__stack-page` 内同卡（手机，R8 修复未覆盖）。补 e2e 断言（三态循环用例现不断言概览 label）。

**P1（B2 deferred，随 B3 收尾）**：
- B2-1 M-2 亚克力开关行结构与动效开关不一致（省略 `.cust-switch-wrap` 包裹层）——与 motion 行统一。
- B2-2 M-1 手机形态无背景装饰选择 UI（桌面注入，手机页面栈重建未注入；背景层默认 gradient 仍渲染）。
- R3① 背景层预设弱断言只守 gradient（geo/grid alpha 未守卫）——可参数化遍历四预设。
- R5③ 死令牌清理：themes.css `--glass-highlight-rgb/highlight/--shadow-inset-highlight` 已零消费者（spec §6 允许清理）。
- customizer.css:175 `var(--noise-opacity, 0.04)` 兜底未对齐新默认 0.06（死路径，可并齐）。
- B2-3 M-2 select 切换后尺寸互换无断言（可补）。

**P2（豁免/已知风险，知悉即可）**：
- `--glass-enabled` / `data-glass` / `--glass-*` 命名保留（spec §6 明示，B3 不重构）。
- components-partition 长截图 run-to-shot 抖动（噪点层 × 拼接相位）：当前基线稳定绿，若 CI 复现重生成受影响基线即可，勿归因产品改动。
- R9 M2 themeUnsub（已删）、R7 M2 data-tauri 死标志（保留为未来钩子）。

## 6. 其他

- 既有账本 `docs/superpowers/sdd/progress-b2.md` 完整记录 B2 + 返工全过程（每任务评审 + deferred 清单），可参考留痕格式。
- B2 返工规格 `docs/superpowers/specs/2026-08-06-app-shell-b2-acrylic-rework-design.md` 定义了亚克力设计语言（B3 预览卡/重命名须与此一致）。
- 注意：本会话残留一个 dev server 在端口 5174（Vite），若占用可自行停掉；tauri.conf.json `devUrl` 指向 5173。
- Tauri 桌面行为由用户自行目检（测试仅 Web 环境）。
