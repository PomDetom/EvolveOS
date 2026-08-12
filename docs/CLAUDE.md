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
- 铁律：**并行实施子代理必须在独立 worktree**（各占一条分支）；同一 worktree 内串行；`ui/*` 全局串行（同一时刻只一个 ui 分支，靠人错开）；控制器不直接修改代码；不接受无评审的自评报告。
- **任务在各自 worktree 执行**：`git worktree add <仓库根同级目录>/evolveos-<slug> -b <prefix>/<name> dev`；分支与 worktree 一一对应，合并 dev 后 `git branch -d` + `git worktree remove` 一并清理。
- 留痕：每一步的计划、工作内容、提交记录写入执行留痕，随代码提交。
- **边界门禁**：应用任务合并前跑 `npm run check:boundary`（禁触框架目录）；框架任务须框架 owner 评审。分支前缀/生命周期/回归单点化（全量仅 dev→main/hotfix→main）：`docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`。
- **派发实施子代理前先做 pre-flight 计划-现实冲突扫描**：对照计划代码段与当前代码/测试 mock 的实际签名与成员形态（含 LogicalSize/CSS import 等），发现计划缺陷先呈报用户裁定再派发，避免评审期才发现返工。
- **子代理报告 e2e 失败为「无关 flake」时，控制器须独立隔离复跑确认后再放行**，不直接采信。
- **全量 e2e 旋转失败判「环境 flake」的最硬证据**：stash 本次改动后对同批失败用例跑旧代码基线对照（同批同样失败 = 与改动无关），勿仅凭隔离单跑或子代理结论放行。
- **harness 任务清单（TaskCreate/TaskUpdate）跨会话会清空丢失**：SDD 任务进度以 `docs/superpowers/sdd/progress-*.md` 账本为唯一权威来源，勿依赖任务列表持久性。
- **后台子代理中途 yield（如仍在跑 e2e）会留下未提交工作树改动**：恢复/续跑前先 `git status` 检查仓库状态，勿直接派发新任务。
- **Windows 下提交前用 `git status`/`git diff --stat` 核对**，防 Cargo.toml 等被构建触碰文件的行尾（LF/CRLF）噪声混入提交。
- **dev→main / hotfix→main 合并后全量回归**（`npm test` + `npm run test:e2e` + `npm run build`）通过再删分支收尾；dev 阶段只跑改动影响面定向测试。
- **发版步骤**：dev 稳定 → `npm run release -- <patch|minor|major>`（bump+CHANGELOG+门禁）→ dev→main `--no-ff` 全量回归 → tag `vX.Y.Z`。main 只收 dev 合入 + hotfix；docs 也走 dev。
