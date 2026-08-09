# 开发交接文档 — 应用壳 B6（页面样式刷新）实施

- **交接日期**: 2026-08-09
- **当前分支**: `main`（HEAD `5bb5aad`，工作树由用户 reset 同步）
- **上一阶段**: B5 设计语言统一 + B5-F1 字体修复（伪字重）全部完成并合并 main（`a5edb0a` + `8a2f23e`）
- **下一阶段**: B6（页面样式刷新：背景装饰多样化 + 悬浮球去光晕 + 按钮扁平实心），由下一个对话执行

## 1. 项目当前状态

**产品形态**：应用壳为唯一产品形态（浏览器 `/` 与 Tauri 直进应用壳）。B5 已落地：阿里普惠体全局替换（55/65/85 三档）、三区统一胶囊 Slider、徽标/按钮/悬浮球 iOS 化、内容区自适应布局（data-layout）、控件行对齐收尾、伪字重修复（65 Medium）。

**验证基线**：unit 65、e2e 112（含视觉基线 24）、build 通过（合并后全量回归绿，B5-F1 修复后）。

**核心文件地图**（B6 相关）：
| 文件 | 职责 |
|---|---|
| `src/app/app-main.css` | `data-backdrop` 背景预设（渐变/几何/网格/关闭四预设，B2-2/R3/R6） |
| `src/app/app-main.js` | 背景选择器渲染（BD_LABELS 4 预设按钮，会话内纯 UI 态） |
| `src/app/partitions.css` | 外观分区背景选择器样式（`.app-main__backdrop-opt` 胶囊） |
| `src/components/float-ball/float-ball.css` | 悬浮球玻璃底 + hover 光晕（B5-3） |
| `src/components/button/button.css` | 按钮 primary 渐变底 + 彩影（B5-3 + B5-F1 `--shadow-glow` 令牌） |
| `src/styles/themes.css` | `--shadow-glow`/`--shadow-glow-hover`（B5-F1 新增）、`--shadow-sm/md/lg`、`--glass-shadow` |

## 2. 待执行计划

| 计划 | 文件 | 内容 |
|---|---|---|
| **B6 页面样式刷新** | `docs/superpowers/plans/2026-08-09-app-shell-b6-page-style-refresh.md` | B6-1 背景多样式 + B6-2 悬浮球去光晕 + B6-3 按钮扁平实心 |

**规格**：`docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md`（唯一需求源，已含完整设计决策与三个 Task 的设计细节）；B6 计划书为唯一实施需求源。

**B6 三项需求（用户头脑风暴产出 + 逐项澄清确认）**：
1. **背景装饰多样化**：现「网格」预设几乎看不出效果（1px/40px/25% accent，被磨砂玻璃磨糊）。方向「衬底更鲜明」（用户明确选，保留玻璃材质、图案更突出）：**强化网格**（2px 线 + 24px 格距 + 交点圆点 + 40% accent）+ **新增 4 预设**（圆点阵 dots / 斜线 diagonal / 波纹 waves / 极光 aurora，共 8 预设）+ 外观分区选择器改**8 迷你图案预览卡**。
2. **悬浮球悬停太花哨**：hover 有 `0 8px 22px accent-300` 彩色光晕阴影 + 外圈 `.c-float-ball__glow` 光晕环。方向「去光晕保上浮」（用户明确选）：删 glow 元素 + hover 阴影改中性 `--shadow-md`，保留上浮 2px + 内高光。
3. **按钮仍不好看**：primary 渐变底 + 顶部内高光 + `--shadow-glow` 彩影。方向「扁平实心」（用户参考成熟方案选定）：primary 实色 `var(--accent)` + 白字 + 中性 `--shadow-sm`，去渐变去彩影；hover theme-aware 明暗（`color-mix` 混 black/white，经 `:root[data-theme]` 区分）；删 `--shadow-glow`/`--shadow-glow-hover` 令牌（B5-F1 引入，本次回收）；danger 同机制协调。

**B6 任务分解**（3 任务串行，每任务 TDD + 独立评审）：
| Task | 内容 | 关键文件 |
|---|---|---|
| **B6-1** | 背景装饰多样式：强化网格 + dots/diagonal/waves/aurora 预设 + 8 迷你预览卡 UI | `app-main.css`、`app-main.js`、`partitions.css` |
| **B6-2** | 悬浮球去光晕：删 glow 元素 + hover 中性投影 | `float-ball.css`、`float-ball.js` |
| **B6-3** | 按钮扁平实心：primary 实色 + theme-aware hover + 回收彩影令牌 + danger 协调 | `button.css`、`themes.css` |

## 3. 执行流程（SDD，子代理驱动）

1. **分支**：`git checkout -b feature/b6-page-style-refresh main`（起点 main `5bb5aad`，含规格 + 计划书）。
2. **每任务**：手动写 brief（`task-brief` 脚本只匹配 `Task <数字>`，本计划用 `Task B6-N` 标题需手动写，放 `docs/superpowers/sdd/task-B6-N-brief.md`）→ 派发 implementer（B6-1 集成 sonnet / B6-2 机械 haiku / B6-3 集成 sonnet）→ 报告 → `review-package` 生成审查包 → 派发 reviewer → 修复循环（≤5 轮）→ 账本 `docs/superpowers/sdd/progress-b6.md` 留痕（随代码提交）。
3. **每任务结束全量回归绿**：`npm test` + `npx playwright test --config=playwright.config.worktree.js` + `npm run build`。
4. **全部完成后**：最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归。
5. **常用脚本**：`task-brief PLAN_FILE N` / `review-package PLAN_FILE BASE HEAD`（技能 scripts 目录）。

## 4. 铁律与红线（违反即失败）

- 测试仅在 Web 环境执行（不跑 tauri dev；Tauri 桌面观感由用户目检）。
- 动画红线：只动 transform/opacity；模糊（backdrop-filter）永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。**背景预设为会话内纯 UI 态（data-backdrop 直接设），不进 store（B2 决策延续）。**
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖；禁止删除用户已有改动。
- **视觉基线变化必须先解码比对确认差异由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（`document.fonts.load` 显式 400/500/700 三档，B5-1/F1 模式已在 visual-regression.spec.js）。
- 禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审。
- **任务直接在共享 checkout（主工作目录）执行，不使用 git worktree 隔离**（B5 确立，已入根 CLAUDE.md 核心铁律 + docs/CLAUDE.md 任务执行规范）。

## 5. 环境告警（重要）

- **共享 checkout 陈旧 server**：上一会话期间共享 checkout 曾有陈旧 5173 Vite dev server（PID 11964）serve 旧代码。用户已 reset 到 main（`8a2f23e`）并被告知重启 dev 服务——**实施前先确认共享 checkout 的 dev server 已重启/无陈旧 5173 残留**，否则 e2e 一律用 `playwright.config.worktree.js`（5174 新鲜 server，`reuseExistingServer:false`，放 worktree 根不提交）规避。
- 若在共享 checkout 直接执行（按新铁律），默认 `npm run test:e2e`（5173 + reuseExistingServer:true）会连到陈旧 server——**务必先重启或换 5174 配置**。
- Tauri 桌面行为由用户目检（B6：① 背景网格/点阵/斜线等可感知 ② 浮球 hover 克制不花哨 ③ 按钮扁平实心好看、hover 明暗自然）。

## 6. 字体依赖（无新增）

- B6 不需要新字体资产（55/65/85 三档已在 `src/assets/fonts/`）。
- 视觉基线截图须等字体加载（含 500 档），沿用 B5-1/F1 已建机制。

## 7. 上一阶段遗留（B5 相关，均已闭环）

- B5 全部 5 任务 + 修复波（滑杆 --fill 全接线 + primary 彩影令牌化）已闭环，`--shadow-glow` 令牌在 B6-3 被回收（本次删，非遗留缺陷）。
- `feature/b5-faux-weight-fix`、`docs/b6-spec`、`chore/claude-md-no-worktree` 等已删分支均无未合内容。
- worktree `b5-design-language`（上会话隔离用）已无任务，可删：`Remove-Item -Recurse -Force C:\Repository\ui-design\.claude\worktrees\b5-design-language`。
- **B6 注意事项（B5 沉淀）**：Chromium 151 起 `getComputedStyle` 对 `::-webkit-slider-*` 伪元素样式反射失效（与 B6 无关但按钮/浮球断言若涉伪元素须像素验证）；`filter({hasText})` 只匹配可见文本（预览卡 label 是可见文本，可用）。

## 8. 其他

- 既有账本 `docs/superpowers/sdd/progress-b5.md`（B5 完整）、`progress-b5-fix.md`（B5-F1）完整记录全过程，可参考留痕格式。
- B6 规格（含完整设计决策：8 预设表、按钮 CSS 方向、浮球改动）+ B6 计划书（3 任务 TDD 步骤 + 具体 CSS）+ 本交接书已合并 main（`5bb5aad` 规格 + `35f2375` 提交）。
- 本会话产出：B6 规格（35f2375）+ B6 计划书 + 本交接书（HANDOFF-B6.md）。
