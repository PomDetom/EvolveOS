# 治理最终评审修复报告（spec 分支图 / 门禁构建文件 / 手册 order / G3 报告入库）

- **状态**：DONE（2026-08-10）
- **需求源**：dev-governance 变更集最终整支评审 —— 2 Important + 5 Minor 收尾清单（唯一权威来源为评审结论；规格 `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`）
- **分支**：`main`（共享 checkout 直改，无 worktree 隔离）
- **提交**：`b1ac428` `fix: 治理最终评审闭环（spec 分支图对齐 ui/app 前缀 + 门禁补构建文件 + 手册 order 字段 + G3 报告入库）`（8 files changed, 53 insertions(+), 7 deletions(-)；含新增 `task-G3-report.md`）

## 变更内容（逐项对照评审清单）

| 项 | 严重级 | 改动 |
|---|---|---|
| Important 1 | spec §5.1 分支图 | 图内 `feature/ui/<name>`、`feature/app/<id>/<name>` → 落地约定 `ui/<name>`、`app/<id>/<name>`（与门禁仅认 `ui/`、`app/<id>/` 前缀一致，避免按图命名落入未知分支路径） |
| Important 2 | G3 报告入库 | `git add docs/superpowers/sdd/task-G3-report.md`（随本提交入库，与 G1/G2 报告同权；`task-G3-brief.md` 已在 G3 提交时入库） |
| Minor 1 | 手册缺 `order` 字段 | `docs/app-integration.md` §2.1 字段表加 `order` 行（左窗排序，home=0，应用按 order 递增）；§1 `notes` 示例补 `order: 7`（既有 6 应用 order 1–6，新增即 7） |
| Minor 2 | 门禁漏仓库根文件 | `scripts/boundary-check.js` `FRAMEWORK_FILE_RE` 补 `/^vitest\.config/`、`/^index\.html/`、`/^package-lock\.json/`（三个文件均存在于仓库根，已核验）；规格 §3.2 应用禁止、§4.1 规则列表同步镜像；`tests/unit/boundary-check.test.js` 新增用例（应用分支触碰 index.html / package-lock.json / vitest.config → 失败并列出） |
| Minor 3 | G1 契约缺 order 唯一断言 | `tests/unit/apps.test.js` 加 `new Set(modules.map(m => m.order)).size === modules.length`（重复 order 会静默错排左窗）；**未改** `toBeGreaterThanOrEqual(6)`（保留「新增应用」合法路径） |
| Minor 4 | 根 CLAUDE.md 红线漏构建文件 | `CLAUDE.md`「开发模式与边界」括号补 `、vite.config、package.json`（与手册/门禁一致） |
| Minor 5 | `.claude/` 未忽略 | `.gitignore` 加 `.claude/`（`git check-ignore .claude/` 确认生效；G2 报告「git-ignored」口径现成立，`git add -A` 不再误纳） |

## 验证

| 命令 | 结果 |
|---|---|
| `npx vitest run tests/unit/boundary-check.test.js` | **7 passed**（旧 6 + 新增 index.html/package-lock.json/vitest.config 用例） |
| `npx vitest run tests/unit/apps.test.js` | **1 passed**（order 唯一断言通过） |
| `npm test`（全量） | **17 files / 76 passed** |
| `npm run build` | 通过（✓ built in 466ms） |
| `git status`（提交前） | 仅 7 个预期改动文件 + 新增 G3 报告，无杂项；`.claude/` 已 ignored |

> 仓库根文件核验：`index.html`、`package-lock.json`、`vitest.config.js` 三者均存在，故全部入 `FRAMEWORK_FILE_RE`。

## 关注点

1. **`final-review-fix-report.md` 复用本路径**：本文件原为 B6 最终评审修复报告，本次按收尾指令覆写为治理最终评审报告。B6 版本仍在 git 历史中（对应提交），如需恢复可 `git checkout <commit> -- docs/superpowers/sdd/final-review-fix-report.md`。
2. **`ui/<name>` 行对齐**：分支图 `ui/<name>` 与 `app/<id>/<name>` 文本按评审给定示例 verbatim 对齐（`ui/` 前缀无需 `feature/` 前缀）。
3. **`playwright.config.worktree.js`** 未入库、未改动（git-ignored，仅本地使用）。

## 提交

`b1ac428`（8 files changed, 53 insertions(+), 7 deletions(-)）：
- `.gitignore`、`CLAUDE.md`、`docs/app-integration.md`
- `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`
- `docs/superpowers/sdd/task-G3-report.md`（新增入库）
- `scripts/boundary-check.js`、`tests/unit/apps.test.js`、`tests/unit/boundary-check.test.js`
