# Task G2 报告：边界检查脚本（框架/应用门禁）

- **任务**: G2（来源：`docs/superpowers/sdd/task-G2-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md` §4.1，唯一需求源）
- **分支**: `ui/boundary-check`（共享 checkout，无 worktree 隔离）
- **状态**: DONE

## 实施内容

按 brief Steps 1-7 执行（TDD），全部 verbatim：

1. **`tests/unit/boundary-check.test.js`**（新建，brief Step 1 verbatim）— 6 条断言：应用分支触碰框架文件失败并列出 / 应用分支纯应用内改动通过 / 触碰其他应用目录失败 / 触碰构建配置失败 / ui 框架分支通过（kind=ui）/ 未知分支触碰框架失败（最严格）。
2. **`scripts/boundary-check.js`**（新建，brief Step 3 verbatim）— 纯函数 `assessBranchChanges(branch, files) → { kind, ok, violations, note }`，导出 `FRAMEWORK_PREFIXES` / `FRAMEWORK_FILE_RE` 供复用；分支判定 `app/<id>/` → ui/ → 未知（mixed，触碰框架即失败）。零运行时依赖（纯标准库 + 正则），CLI 与单测共用。
3. **`scripts/check-boundary.js`**（新建，brief Step 4 verbatim）— CLI：`node scripts/check-boundary.js [base...head]`；默认范围 `dev...HEAD`（`git rev-parse --verify dev` 探测）否则 `main...HEAD`；`git diff --name-only <range>` 取改动文件 → 调纯函数 → ok 打 `✓`（stdout），否则打 `✗` + 违规清单（stderr）并 exit 1。
4. **`package.json`**（修改）— scripts 加 `"check:boundary": "node scripts/check-boundary.js"`（test:visual 之后，`"type": "module"` 下 ESM import 正常工作）。

## TDD 证据（RED → GREEN）

**Step 2 RED**（实现前，`npx vitest run tests/unit/boundary-check.test.js`）：
```
❯ TransformPluginContext._formatLog … normalizeUrl …
   src: tests/unit/boundary-check.test.js:2:39 → import { assessBranchChanges } from '../../scripts/boundary-check.js'
 Test Files  1 failed (1)      Tests  no tests
```
（`scripts/boundary-check.js` 不存在 → 模块解析 transform 失败，与 brief 预期一致。）

**Step 6 GREEN**（实现后，同一命令）：
```
✓ tests/unit/boundary-check.test.js (6 tests)
 Test Files  1 passed (1)      Tests  6 passed (6)
```

## CLI 冒烟（Step 6）

当前分支 `ui/boundary-check`（`ui/` 框架分支），显式范围与默认范围均验证：

```
> npm run check:boundary main...HEAD
[ui/boundary-check] ✓ 框架改动：须全量回归 + 框架 owner 评审
exit=0

> npm run check:boundary            （无参数 → 默认 main...HEAD，因 dev 分支尚不存在）
[ui/boundary-check] ✓ 框架改动：须全量回归 + 框架 owner 评审
exit=0
```

`app/<id>/` 与未知分支语义由单测 6 条断言覆盖（fail 分支：应用触碰框架/他应用/构建配置、未知触碰框架；pass 分支：应用内改动、ui 框架改动）。

## 全量回归（Step 7）

- `npm test` → **17 files / 75 passed**（含新 boundary-check.test.js 6 条；G1 apps.test.js 1 条在内，全绿）。
- `npm run build` → **✓ built in 656ms，无警告**（脚本不进产物，纯 dev 工具，构建零影响）。

## 文件变更

- `scripts/boundary-check.js`（新建，纯函数）
- `scripts/check-boundary.js`（新建，CLI）
- `tests/unit/boundary-check.test.js`（新建，6 条断言）
- `package.json`（加 `check:boundary` script）
- `docs/superpowers/sdd/task-G2-report.md`（本文）、`docs/superpowers/sdd/progress-governance.md`（账本追加）、`docs/superpowers/sdd/task-G2-brief.md`（既有，随 docs 提交）
- `.claude/`（本地设置/worktrees）与 `playwright.config.worktree.js`（git-ignored）**均未提交**

## Self-Review

- **完整性**：纯函数 + CLI + npm script + 单测 + 冒烟全齐；接口 `{ kind, ok, violations, note }` 与 brief 逐字段一致。
- **质量**：零运行时依赖（纯 `node:` 标准库 `child_process`）；ESM import 语法（`"type": "module"`）；无逻辑偏离 brief（verbatim）。
- **纪律**：无 scope creep——`src/` 代码零改动；无核心依赖升级；未触碰 `playwright.config.worktree.js`（仅使用）。
- **测试**：TDD RED→GREEN 留痕；CLI 冒烟输出与 brief 预期逐字一致（`✓ 框架改动：须全量回归 + 框架 owner 评审`，exit 0）。

## Concerns

1. 无。唯一环境事实：`dev` 分支未建（G3 建），故默认范围当前回落 `main...HEAD`——CLI 探测逻辑已就绪，G3 建 dev 后自动切换，无需改动。
