# 开发交接文档 — 应用壳 B5（设计语言统一）实施

- **交接日期**: 2026-08-09
- **当前分支**: `main`（HEAD `94546ed`，工作树干净；仅 `.claude/settings.local.json` 未跟踪）
- **上一阶段**: B4 收尾修复（B4F-1..5）全部完成、最终整体评审 Ready to merge: Yes、已合并 main（`317b0c4`）；fix/b4-strip-open 与 worktree-b4-close-sizing 已删
- **下一阶段**: B5（设计语言统一：字体替换 + Slider 统一 + iOS 风格组件 + 自适应布局），由下一个对话执行

## 1. 项目当前状态

**产品形态**：应用壳为唯一产品形态（浏览器 `/` 与 Tauri 直进应用壳）。B4 收尾已落地：

- 悬浮窗尺寸显式 `LogicalSize` 贴合（DPI 下竖排底部不再被裁）+ `computeFitSize` 纯函数 + 诊断 log。
- 主窗关闭可配置（`closeBehavior` 退出应用/保留后台，设置「通用」分区选择器）；关闭逻辑移 Rust `on_window_event`（exit→app.exit / background→prevent_close+hide），JS 已移除脆弱 `onCloseRequested`。
- strip 悬浮窗「恢复主窗」按钮（`showRestore` 仅 Tauri 分支）。

**验证基线**：unit 58、e2e 106（含视觉基线 24）、build 通过、cargo check 通过（合并后全量回归绿）。

**核心文件地图**（B4 相关）：
| 文件 | 职责 |
|---|---|
| `src/app/strip-main.js` | 悬浮窗尺寸贴合（`computeFitSize` + `fit()` 显式 LogicalSize + 恢复主窗按钮接线） |
| `src-tauri/src/lib.rs` | Rust 关闭行为（AppState + set_close_behavior + on_window_event） |
| `src/app/app-main.js` | `syncCloseBehavior` 配置→Rust 同步；移除 JS onCloseRequested |
| `src/config/defaults.js` | `closeBehavior: 'exit'` |
| `src/scenes/settings-window/settings-pages.js` | 「关闭主窗口时」两态选择器 + 主题循环收敛 `[data-mode]` |

## 2. 待执行计划

| 计划 | 文件 | 内容 |
|---|---|---|
| **B5 设计语言统一** | `docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md` | B5-1 字体全局替换 + B5-2 Slider 统一 + B5-3 iOS 组件 + B5-4 自适应布局 + B5-5 控件收尾 |

**规格**：`docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md`（唯一需求源）；B5 计划书为唯一实施需求源。

**B5 四项需求（用户头脑风暴产出）**：
1. **字体**：阿里普惠体全局替换。用户已提供 55 Regular / 85 Bold 两档 WOFF2（官方包带，在 `C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-55-Regular` / `AlibabaPuHuiTi-3-85-Bold`），实施时复制到 `src/assets/fonts/`。正文 55 + 拉丁回退混排，标题 85；`--font-mono` 保留。
2. **组件风格统一**：三区（外观/动效/组件）控件语言统一，滑杆重设计为**胶囊形**（统一 `.c-slider`，删三处独立规则）。用户指出外观页观感问题集中在**布局对齐、密度节奏、风格割裂**。
3. **徽标/按钮/悬浮球 iOS 化**：靠材质/层次/透明度（玻璃/内高光/半透明混色）而非色彩浓度——用户明确「底色过于浓厚」。**材质体系（Windows 亚克力配方）不动**（用户明确选择）。
4. **自适应布局**：窗口放大时内容自适应（表单限宽居中 + 组件/动效撑满），字号间距恒定。**常见 UI 缩放逻辑调研结论**：自适应宽度 + 内容区限宽居中 + 字号恒定（用户认可）。

**B5 任务分解**（5 任务串行，每任务 TDD + 独立评审）：
| Task | 内容 | 关键文件 |
|---|---|---|
| **B5-1** | 字体全局替换：WOFF2 落地 + `fonts.css` + `--font-sans` 前缀 | `src/assets/fonts/*.woff2`、`src/styles/fonts.css`、`tokens.css`、`base.css` |
| **B5-2** | 统一胶囊 Slider：`.c-slider` 重设计 + 三处接入删独立规则 | `slider.css`、`customizer-panel.js`、`customizer.css`、`motion-lab.js`、`motion-lab.css` |
| **B5-3** | iOS 组件：徽标浅 tint + 按钮层次 + 悬浮球玻璃 | `badge.css`、`button.css`、`float-ball.css` |
| **B5-4** | 自适应布局：`data-layout` center/fluid + max-width 1080 居中 | `app-main.css`、app-main.js |
| **B5-5** | 控件语言收尾：外观页行对齐/密度统一 | `customizer.css`、`settings-window.css` |

## 3. 执行流程（SDD，子代理驱动）

1. **分支**：`git checkout -b feature/b5-* main`（起点 main `94546ed`，含规格 + 计划书）。
2. **每任务**：手动写 brief（`task-brief` 脚本只匹配 `Task <数字>`，本计划用 `Task B5-N` 标题需手动写，放 `docs/superpowers/sdd/task-B5-N-brief.md`）→ 派发 implementer（B5-1 机械 haiku / B5-2,3,5 集成 sonnet / B5-4 布局 sonnet）→ 报告 → `review-package` 生成审查包 → 派发 reviewer → 修复循环（≤5 轮）→ 账本 `docs/superpowers/sdd/progress-b5.md` 留痕（随代码提交）。
3. **每任务结束全量回归绿**：`npm test` + `npx playwright test --config=playwright.config.worktree.js` + `npm run build`。
4. **全部完成后**：最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归。
5. **常用脚本**：`task-brief PLAN_FILE N` / `review-package PLAN_FILE BASE HEAD`（技能 scripts 目录）。

## 4. 铁律与红线（违反即失败）

- 测试仅在 Web 环境执行（不跑 tauri dev；Tauri 桌面观感由用户目检）。
- 动画红线：只动 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults→store→apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **视觉基线变化必须先解码比对确认差异由本次改动引起，再 `--update-snapshots`**；B5 字体替换 + 组件改版 → 预期内大量重生成。
- **e2e 截图前必须等待字体加载完成（`document.fonts.ready`）**，否则 CJK 大字体未加载完会截图系统字体 → 基线抖动。
- 禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审。

## 5. 环境告警（重要，本会话遗留）

- **共享 checkout 可能有陈旧 Vite dev server（端口 5173）serve 旧代码**（本会话期间 PID 2528，后为 11964，均未授权终止）。Playwright `playwright.config.js` 的 `reuseExistingServer:true` 会误连它 → `npm run test:e2e` 测到旧代码失真。
- **处置**：所有 e2e 用 `playwright.config.worktree.js`（端口 5174，`reuseExistingServer:false`，指向新鲜 server）。模板在计划书 Global Constraints 节，实施时创建在 worktree 根、不提交。
- **建议用户**：手动终止陈旧 5173 server（`Get-Process | Where-Object { $_.Id -eq <PID> } | Stop-Process -Force`），或重启 dev server，否则默认 `npm run test:e2e` 持续失真。

## 6. 字体依赖（B5-1 前置，需用户配合）

- 用户已下载阿里普惠体 55/85 完整包（含 woff2）：
  - `C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-55-Regular\AlibabaPuHuiTi-3-55-Regular.woff2`（5.2MB）
  - `C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-85-Bold\AlibabaPuHuiTi-3-85-Bold.woff2`（5.5MB）
- B5-1 Step 1 从上述路径复制到 `src/assets/fonts/` 随代码提交。若实施时路径不可用，向用户确认新路径。

## 7. B4 遗留（随 B5 可顺手处理）

- **B4F-2 Minor**：`[data-mode]` 裁定回归测试（点主题→断言 close-behavior 高亮仍在）——最终评审已补（a13413d），已闭环。
- **B4 环境遗留**：陈旧 5173 server（见 §5）。
- **B4 无未完成代码任务**（5 任务 + 修复波全闭环，合并后回归绿）。

## 8. 其他

- 既有账本 `docs/superpowers/sdd/progress-b4.md`（B4 桌面真实化）、`docs/superpowers/sdd/progress-b4-fix.md`（B4 收尾修复）完整记录全过程，可参考留痕格式。
- B5 规格 `docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md` 含完整设计决策（字体/Slider/iOS 组件/自适应/非目标/测试策略）。
- 本会话产出：B5 规格（62ad138）+ B5 计划书（94546ed），均已合并 main。
- Tauri 桌面行为由用户自行目检（测试仅 Web 环境）。
