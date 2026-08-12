# 并行分支治理迁移执行留痕

- **状态**: DONE（2026-08-12）
- **规格**: `docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`（提交 `763f3b2` 合 dev）
- **计划**: `docs/superpowers/plans/2026-08-12-parallel-branch-governance.md`（提交 `992575d` 合 dev）
- **分支**: `ui/governance-migration`（Tasks 1-4）→ 合 dev `70e03ff` 删除；`app/ledger/onboarding`（Task 5 验收 worktree）→ 合 dev `92efb01` 删除
- **前置迁移**: dev 同步 main（原 dev 落后 2 提交，fast-forward 对齐）

## Task 执行记录

| Task | 提交 | 内容 | 验证 |
|---|---|---|---|
| 1 边界门禁扩展 | `9ec9db4` | `boundary-check.js` 前缀全集（docs/chore/hotfix/base）+ 未知分支名 fail | 单测 14/14；CLI 对 `feature/scratch` 报「分支名不合规」exit 1 |
| 2 图标自持 | `d2a2341` | `icon()` 第四参 `icons`（应用级→全局→monitor）+ src/CLAUDE.md 契约 | 单测 7/7（含应用级命中/同名覆盖/回退守卫） |
| 3 e2e 入口抗变化 | `12c2b31` | app-shell/mobile-nav/token-tool 计数动态化 + data-id 定位 | 三 spec 48/48 绿 |
| 4 治理文档同步 | `be2fade` | 根 CLAUDE.md + AGENTS.md（双文件同步）+ docs/CLAUDE.md + app-integration.md | grep 无旧口径残留；build 绿 |
| 5 worktree 试跑验收 | `471d612` + `92efb01` | ledger 演示应用 + worktree 全生命周期 | 见下 |

## Task 5 验收证据

- **新增应用碰零共享**：建 `src/apps/ledger/index.js`（占位）后，app-shell/mobile-nav/token-tool 三 spec 在 9 模块下 **48/48 绿**（动态计数 + data-id 定位生效，壳 glob 自动发现）。
- **门禁**：`npm run check:boundary` → `[app/ledger/onboarding] ✓ 应用改动，边界通过`。
- **并行互斥**：对已持有分支二次 `git worktree add` → `fatal: already used by worktree`（git 强制单 checkout）。
- **生命周期闭环**：`git worktree add <同级>/evolveos-app-ledger -b app/ledger/onboarding dev` → 提交 → 主 checkout 合 dev → `git branch -d` + `git worktree remove --force`（node_modules 等临时物，代码已合 dev）。
- **回归门点**：dev 全量回归（npm test 103/103 + build + 全量 e2e）在迁移收尾单点执行。

## 迁移收尾（Step 7 门点）

dev 全量回归：
- `npm test`：**103/103** ✓（含 boundary-check 14 + icon 7 新增用例）
- `npm run build`：✓
- 全量 e2e：首跑 **121 passed**，7 项待处置 →
  - **app-main 视觉基线 6 张**：ledger 应用把 8 模块变 9，截图必然变化（确认由本次改动引起）→ `--update-snapshots` 重生成后 `visual-regression` 全量 **30/30 绿**（git diff 仅 6 张 PNG，+~1KB/张）。
  - **`data-display.spec.js:7`**：设置「组件」分区 List 选中态，隔离复跑 **3/3 绿** —— 已知 components 惰性挂载超时 flake（全量并行资源紧张，与 B5/B6 记录同型），非本次改动回归。
- **并集全绿**：121（首跑）+ data-display 隔离 3 + 视觉 30 全绿。
