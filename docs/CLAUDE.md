# docs/ 文档与任务执行规范细则

## 文档体系（全部集中在 docs/，随代码提交）

- **目标规划文档**：项目目标、设计规格、需求决策（唯一事实源）。
- **计划书**：实施计划（任务分解、全局约束、修订记录）。
- **执行留痕**：每一步的计划、工作内容、提交记录（含每任务提交哈希与评审结论）。
- 会话开始先读执行留痕，从第一个未完成任务恢复；**已完成任务不得重新派发**。

## 动画红线口径（与根 CLAUDE.md / src/CLAUDE.md 动画红线配套）

- 红线核心：**布局/几何属性的动画只允许 transform/opacity**（合成器友好）；**模糊（backdrop-filter）永不动画**；时长/曲线一律经 CSS 变量。
- **paint-only 过渡豁免**：仅引起重绘（不影响布局、不触发合成）的样式属性**允许**有限过渡，与既有实现一致——
  - `background` / `background-color`：按钮 hover（`.c-btn`）、列表行 hover、switch 开关等；
  - `border-color` / `box-shadow`：表单 focus 态（input/select/search-bar 的 focus 边框与阴影过渡）；
  - `color`：文本色 hover / 激活态。
  - `filter`：按钮 hover/active 的 brightness 微调（paint-only，与 background 同型）。
  - 豁免边界：这些属性只用于**短暂状态切换过渡**（hover/focus/active/选中），不用作入场/离场动效主体；不使用 `left/top/width/height/margin/padding` 等 layout 属性做动画；性能关键路径（列表 stagger 等）仍只走 transform/opacity。
- 若新实现需要超出上述范围的过渡，先在此节固化口径再落地。

## 任务执行规范（子代理驱动开发）

- 每任务按 TDD：写失败测试 → 确认红 → 实现 → 跑绿 → 提交。
- 实施子代理按复杂度分级：机械转录用快速模型、集成判断用标准模型、整体审查用最强模型。
- **每任务必须有独立评审**（规格符合 + 质量）。
- Critical/Important 进入修复循环（≤5 轮：前 3 轮续派原实施者，后 2 轮换更强模型）；Minor 记入执行留痕留给收尾。
- 铁律：任务间禁止并行派发实施子代理；控制器不直接修改代码；不接受无评审的自评报告。
- **任务直接在共享 checkout（主工作目录）执行，不用 git worktree 隔离**（B5 确立：worktree 引发沙箱隔离 + 共享 checkout 同步/合并复杂化）。
- 留痕：每一步的计划、工作内容、提交记录写入执行留痕，随代码提交。
- **边界门禁**：应用任务合并前跑 `npm run check:boundary`（禁触框架目录）；框架任务须全量回归 + 框架 owner 评审。设计规格：`docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`。
