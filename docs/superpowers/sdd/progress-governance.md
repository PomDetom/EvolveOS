# SDD 账本 — plan: docs/superpowers/plans/2026-08-09-app-shell-dev-governance.md

分支：ui/apps-migration（G1）/ ui/boundary-check（G2）/ G3 建 dev + docs（自 main 9aca5dc 检出）
会话启动环境：无陈旧 5173 server；worktree e2e 配置已本地生成（playwright.config.worktree.js，5174，不提交）。

## 任务清单

- [x] Task G1: MODULES 迁移到 src/apps/ + 壳 glob 自动发现
- [ ] Task G2: 边界检查脚本（npm run check:boundary）
- [ ] Task G3: dev 分支 + CLAUDE.md 红线 + 手册同步
- [ ] 最终整体评审 + 合并 main + 建 dev + 合并后全量回归

## 任务进度

（每任务完成后追加：complete 行 / 修复轮行 / minor 记录）

### Task G1 — MODULES 迁移到 src/apps/ + 壳 glob 自动发现（complete 2026-08-10）

- **提交**：`7207bb5` feat（9 文件 +123/-76：6 应用目录 + placeholder-page 场景 + 壳 glob + 契约单测）；docs 提交（本账本 + 报告 + brief）。
- **TDD**：`tests/unit/apps.test.js` 红（`expected 0 to be >= 6`，apps 目录不存在）→ 绿（1 passed）。
- **验证**：app-shell e2e 34/34 绿（左窗 7 模块顺序/id 零回归）；视觉基线 30/30 原样通过（零视觉改动）；`npm test` 16 files/69 passed；`npm run build` ✓（glob 生产构建解析正确，无警告）。
- **全量 e2e**：4 轮均 123 passed / 1 failed，失败为**旋转变化的冷启动时序 flake**（B6-R2-3 报告同型；docs/app-integration.md「e2e 冷启动 flake」既有条目）。**基线对照**：stash 旧代码同条件全量 → 同样 1 failed（不同受害者）→ 与环境争用有关、与本次改动无关。全部 flake 受害者隔离复跑绿 → 并集 124/124 绿。
- **Minor**：无。
- **评审**（独立评审）：Spec ✅ 符合全部要求；无 Critical/Important；Minor 3。Task quality Approved。
- **Minor（deferred，最终评审 triage）**：① `tests/unit/apps.test.js` `>= 6` 不拦第 7 个应用、未断言 `order` 唯一（改为 `toBe(6)` + `new Set(orders).size === orders.length` 更贴合意图）；② `src/apps/*/index.js` `render: (ctx) => placeholderPage(ctx)` 为多余包装（可 `render: placeholderPage`，brief 原值故非缺陷）；③ `app-main.js` 注释前瞻 `check:boundary`（G2 未落，harmless 前瞻引用）。
- **评审闭环**：**Task G1: complete（commits 7207bb5..5776032，review clean）**。

### Task G2 — 边界检查脚本（npm run check:boundary）（complete 2026-08-10）

- **提交**：`feat`（4 文件 +117：scripts/boundary-check.js 纯函数 + scripts/check-boundary.js CLI + package.json script + tests/unit/boundary-check.test.js）；docs 提交（本账本 + task-G2-report.md + task-G2-brief.md）。
- **TDD**：`tests/unit/boundary-check.test.js` 红（`scripts/boundary-check.js` 不存在 → import transform 失败）→ 绿（6 passed）。
- **验证**：CLI 冒烟 `npm run check:boundary main...HEAD` 与无参数默认范围均输出 `✓ 框架改动：须全量回归 + 框架 owner 评审`（kind=ui，exit 0）；`app/<id>/` 与未知分支 fail 语义由单测 6 条断言覆盖。`npm test` 17 files/75 passed；`npm run build` ✓（656ms，无警告）。
- **Minor**：无。
- **评审**（独立评审）：Spec ✅ 符合全部要求；无 Critical/Important；Minor 4。Task quality Approved。
- **Minor（deferred，最终评审 triage）**：① app 允许集 `tests/(unit|e2e)/` 收窄了绑定约束的 `tests/`（当前等价、fail-closed 无害，但未来 tests/ 直接子目录会被拦——需在规格固化 `(unit|e2e)` 意图）；② **未知分支仅「触框架即失败」、未实现规格「按应用边界检查」全义**（未知分支可能碰其他应用目录而通过——当前可行、交由最终评审裁定是否补严）；③ 单测缺边角覆盖（空文件列表/嵌套子目录前缀/config `.ts`/`.mjs`/未知分支非框架改动通过）；④ G2 报告误称 task-G2-brief 为既有（实为本任务新建，cosmetic）。
- **评审闭环**：**Task G2: complete（commits eb3ae68..8b7237d，review clean）**。
