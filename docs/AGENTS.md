# docs/ 文档与任务执行规则

## 文档体系

- 全部集中在 docs/，随代码提交：**目标规划**（设计规格/需求决策，唯一事实源）/ **计划书**（实施计划）/ **执行留痕**（每步计划/工作/提交，含提交哈希与评审结论）。
- 会话开始先读执行留痕（`docs/superpowers/sdd/progress-*.md`），从第一个未完成任务恢复；**已完成任务不得重新派发**。
- 动画红线口径在 `src/AGENTS.md`（不在此重复）。

## 工作流红线（子代理驱动开发）

- 每任务 TDD：写失败测试 → 确认红 → 实现 → 跑绿 → 提交。
- 实施子代理按复杂度分级：机械转录用快速模型、集成判断用标准模型、整体审查用最强模型。
- **每任务必须有独立评审**（规格符合 + 质量）；Critical/Important 进修复循环（≤5 轮：前 3 轮续派原实施者，后 2 轮换更强模型）；Minor 记入执行留痕留给收尾。
- **并行实施子代理必须在独立 worktree**（各占一条分支）；同一 worktree 内串行；`ui/*` 全局串行（同一时刻只一个 ui 分支）；控制器不直接修改代码；不接受无评审的自评报告。
- 派发实施子代理前先做 **pre-flight 计划-现实冲突扫描**（对照计划代码段与当前代码/测试 mock 实际签名与成员形态），发现计划缺陷先呈报用户再派发。
- 子代理报告 e2e 失败为「无关 flake」时，控制器须**独立隔离复跑确认**后再放行，不直接采信。
- 全量 e2e 旋转失败判「环境 flake」的最硬证据：**stash 本次改动后对同批失败用例跑旧代码基线对照**（同批同样失败 = 与改动无关）。
- **dev→main / hotfix→main 合并后全量回归**（`npm test` + `npm run test:e2e` + `npm run build`）通过再删分支收尾；dev 阶段只跑改动影响面定向测试。
- Windows 下提交前用 `git status`/`git diff --stat` 核对，防 Cargo.toml 等被构建触碰文件的行尾（LF/CRLF）噪声混入提交。
- 后台子代理中途 yield（仍在跑 e2e）会留下未提交工作树改动：恢复/续跑前先 `git status` 检查，勿直接派发新任务。

## 执行留痕

- SDD 任务进度以 `docs/superpowers/sdd/progress-*.md` 账本为唯一权威来源，勿依赖 harness 任务清单持久性（跨会话会清空丢失）。
- 发版：dev 稳定 → `npm run release -- <patch|minor|major>`（bump+CHANGELOG+门禁）→ dev→main `--no-ff` 全量回归 → tag `vX.Y.Z`；main 只收 dev 合入 + hotfix；docs 也走 dev。
