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
