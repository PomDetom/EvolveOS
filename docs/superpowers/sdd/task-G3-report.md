# Task G3 报告：开发模式边界红线固化（CLAUDE.md）+ 手册同步 glob 应用结构

- **任务**: G3（来源：`docs/superpowers/sdd/task-G3-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md` §5 git 迭代 / §4.1 门禁，唯一需求源）
- **分支**: `ui/governance-docs`（共享 checkout，无 worktree 隔离）
- **状态**: DONE
- **提交**: `80e5634` — `docs: 开发模式边界红线固化（CLAUDE.md）+ 手册同步 glob 应用结构（G3）`（docs 单枚提交，无代码改动）

## 实施内容（3 处文档修改，全部 verbatim 于 brief）

1. **根 `CLAUDE.md`** — 在「## 核心铁律」末尾（`禁止升级核心依赖…` 之后）追加「开发模式与边界（框架 vs 应用）」铁律：框架目录（`src/components|styles|config|app|scenes|demo|motion|assets`）只能 `ui/` 分支单独修改 + 全量回归 + 框架 owner 评审；应用（`src/apps/<id>/`）禁触框架目录、合并前必跑 `npm run check:boundary`；git 走 main + dev 双分支。附录规格路径。逐字用 brief Step 1 内容。

2. **`docs/CLAUDE.md`** — 在「## 任务执行规范」末尾追加「边界门禁」：应用任务合并前跑 `npm run check:boundary`（禁触框架目录）；框架任务全量回归 + 框架 owner 评审。逐字用 brief Step 2 内容。

3. **`docs/app-integration.md`** —
   - §1「最快接入：注册一个模块」整节替换为「注册一个应用」：`src/apps/<id>/` 一个目录 + `import.meta.glob('../apps/*/index.js')` 自动发现（Task G1），**新增应用 = 建目录放文件，壳零改动**；附 `src/apps/notes/index.js` 的 `module` 导出示例；末尾加「边界红线」引用块（禁触框架目录 + `vite.config`/`package.json`，合并前跑 `check:boundary`，框架需修改 → 单独 `ui/` 分支）。逐字用 brief Step 3 内容。
   - §2.3「壳自动做的事」末句 `**扩展新应用只改 \`MODULES\` 数组**` → `**扩展新应用只改 \`src/apps/\` 目录**`（brief Step 3 注明的过时表述清理）。

## 超出 brief 的最小一致性修正（判断项）

- **§0「接入模型」末段**原为「你只需往 `src/app/app-main.js` 的 `MODULES` 数组加一项…」，与新的 §1「壳零改动」直接矛盾；已改为「在 `src/apps/<id>/index.js` 放一个导出 `module` 的文件，壳经 `import.meta.glob` 自动发现…」。属同类过时「改 MODULES 数组」表述，不修则文档自相矛盾，故一并修正（最小改动，未扩大其他范围）。

## 自查

- **无 `src/` 代码改动**：`git diff` 仅 3 个文档文件（CLAUDE.md +1 / docs/CLAUDE.md +1 / app-integration.md 17+/35−），提交 `80e5634` 3 files changed。
- **无 `package.json` / 测试文件改动**：`npm run check:boundary`（G2）与 `src/apps/`（G1）均为既有事实，仅被文档引用。
- **过时表述清理核查**：全文档 grep `MODULES|app-main.js|src/apps` —— 剩余 3 处 `MODULES`/`app-main.js` 引用均为**描述性注释**（§2.2 `ctx.module` 字段标注「本模块 MODULES 项」、§7 场景模板表「MODULES 契约」、页首「壳 + 7 个占位模块」），非「新增应用要改 MODULES 数组」的操作指引，按 brief 范围不触碰。
- **结构与代码一致性**：`src/apps/` 实为 clipboard/help/info/key/search/wallet（+ 内置 homeModule），壳 `app-main.js:34` 确有 `import.meta.glob('../apps/*/index.js', { eager: true })`；brief 的 `notes` 示例 `module = { id, name, icon, dir, render }` 与实际 `clipboard/index.js` 导出形状一致（仅示例省略可选 `order` 字段）。
- **提交纪律**：docs 单枚提交；`dev` 分支未建（按 brief Step 5 注，由控制器在 G3 合并 main 后创建），`ui/governance-docs` 分支直接落 main。

## Concerns

1. **`task-G3-brief.md` 保持 untracked**：控制器交付的提交命令只含 3 个文档文件，未含 brief（G2 曾随 docs 一并提交 brief）。如需 brief 入库，由控制器/收尾步骤补 `git add docs/superpowers/sdd/task-G3-brief.md`。`.claude/`（本地设置）未提交，与 G2 一致。
2. **§1 示例引用未定义的 `notesPage`**（brief 自带内容，verbatim 保留）：`export const module = { render: notesPage }` 未在示例中给出 `notesPage` 函数体。属 brief 原文，未擅自改动；如需补全可后续微调。
