# docs/ 文档与任务执行规则

## 文档体系

- 全部集中在 docs/，随代码提交。**根目录只放 `AGENTS.md`/`CLAUDE.md` 记忆文件**，文档按主题入文件夹：
  - `integration/`：应用接入指南（`app-integration.md`）+ Tauri 桌面壳配置（`tauri-integration.md`）。
  - `handoffs/`：历史阶段交接（`HANDOFF-B*.md`，只读存档，不改写）。
  - `superpowers/`：历史 SDD 归档——`specs/`、`plans/`、`sdd/` 均只读，不承载新任务状态。
- 新任务从 Git HEAD/diff、`.agents/tasks/` recovery manifest、`.agents/notes/`、review 和验证证据恢复；`docs/superpowers/sdd/` 的进度账本只读保留，不再作为任务派发或生命周期状态来源。
- 动画红线口径在 `src/AGENTS.md`（不在此重复）。

Evolve Workflow Protocol 迁移规格：[`docs/superpowers/specs/2026-08-18-evolve-workflow-protocol-design.md`](superpowers/specs/2026-08-18-evolve-workflow-protocol-design.md)。该规格只固定迁移约束；`docs/superpowers/sdd/` 的历史留痕仍按下文规则保留。

文档规则只约束格式、质量和协作证据，不定义 workflow lifecycle 状态；workflow requirements 以 `.agents/protocol.json` 与 Change Policy 为准。TDD、独立 semantic review、pre-flight 和基线复跑仍是质量护栏。

## 质量与协作护栏

- 每任务 TDD：写失败测试 → 确认红 → 实现 → 跑绿 → 提交。
- Change Policy 决定本次改动需要的 task、check、review 和 attestation；需要 review 时必须保留独立 semantic review，Critical/Important 未解决不得合入。
- 新任务按 v2 需要时使用 `.agents/tasks/` recovery manifest；历史 `docs/superpowers/sdd/` 文件只读保留。
- 并行实施必须使用独立 worktree；`ui/*` 是 `framework/*` 的历史别名并沿用同一边界检查。
- 子代理报告 e2e 失败为「无关 flake」时，控制器须**独立隔离复跑确认**后再放行，不直接采信。
- 全量 e2e 旋转失败判「环境 flake」的最硬证据：**stash 本次改动后对同批失败用例跑旧代码基线对照**（同批同样失败 = 与改动无关）。
- **dev→main / hotfix→main 合并后全量回归**（`npm test` + `npm run test:e2e` + `npm run build`）通过再删分支收尾；dev 阶段按 Change Policy 跑改动影响面测试。
- Windows 下提交前用 `git status`/`git diff --stat` 核对，防 Cargo.toml 等被构建触碰文件的行尾（LF/CRLF）噪声混入提交。
- 后台子代理中途 yield（仍在跑 e2e）会留下未提交工作树改动：恢复/续跑前先 `git status` 检查，勿直接派发新任务。

## 执行留痕

- 新任务进度不写入 SDD 账本；从 Git、recovery manifest、Note、review 和实时验证结果恢复。
- 发版：dev 稳定 → `npm run release -- <patch|minor|major>`（bump+CHANGELOG+门禁）→ dev→main `--no-ff` 全量回归 → tag `vX.Y.Z`；main 只收 dev 合入 + hotfix；docs 也走 dev。
