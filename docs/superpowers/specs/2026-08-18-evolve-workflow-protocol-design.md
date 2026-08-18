# Evolve Workflow Protocol 规格

**状态：** Task 1 规格冻结

**日期：** 2026-08-18

**目的：** 为 EvolveOS 建立可恢复、可执行、可验证的仓库原生工作流，使任务状态、计划、验证证据和评审记录不再依赖聊天上下文，同时在迁移期保持现有分支、worktree、边界检查、TDD、独立评审、验证和发版行为不变。

## 范围与非目标

本规格覆盖以下仓库事实：任务状态使用 JSON；说明、计划和评审使用 Markdown；任务和证据绑定 Git SHA；改动范围决定验证 gate；`merge-to-dev` 在 shadow 模式观察 native readiness；迁移最终可切换为 enforced。

本迁移不重写现有分支或 worktree 机制，不删除或迁移 `docs/superpowers/sdd/` 的历史文件，不引入运行时 npm 依赖，不在第一阶段引入工作流服务、数据库、队列或多 Agent 调度器，也不把 Tauri 的真实桌面验证降级为 mock e2e。

## 兼容基线

原有流程继续是迁移期间的行为基线：

- 根 [`AGENTS.md`](../../../AGENTS.md) 规定分支前缀、独立 worktree、`dev → main` 拓扑、边界门禁、回归范围和发版确认。
- [`docs/AGENTS.md`](../../AGENTS.md) 规定文档目录、SDD 规格/计划/留痕关系和 `progress-*.md` 历史账本规则。
- [`scripts/boundary-check.js`](../../../scripts/boundary-check.js) 负责分支名和文件边界双校验，并导出 `assessBranchChanges(branch, files)` 供后续 gate 选择复用。
- [`scripts/merge-to-dev.js`](../../../scripts/merge-to-dev.js) 继续负责基线同步、`check:boundary`、`--no-ff` 合并、祖先验证、分支删除和 worktree 清理。
- [`scripts/release.js`](../../../scripts/release.js) 继续保留版本同步、CHANGELOG、单测、构建和用户确认后的后续发版动作；Task 10 之前不得把 native gate 接入该脚本。

2026-08-18 的现状冻结结果如下：`dev` 与 `main` 的 tree 均为 `c30081366dbc947cb186047be3e175e0f3bf5f45`，二者只有提交历史拓扑差异，没有需要为“同步提交数”额外制造的文件改动。后续任务应以实际 `git diff` 和当前脚本行为为准，不以提交数量推断文件差异。

## 仓库原生目录契约

迁移完成后的目录契约为：

```text
.agents/
├── AGENTS.md
├── README.md
├── protocol.json
├── templates/
│   ├── task.json
│   ├── task-plan.md
│   ├── review.md
│   └── note.md
├── tasks/2026/<task-id>/
│   ├── task.json
│   ├── plan.md
│   └── review.md
├── notes/
│   ├── README.md
│   ├── proposed/
│   ├── implemented/
│   ├── rejected/
│   └── archived/
└── skills/
    ├── evolve-start-task/SKILL.md
    ├── evolve-plan-task/SKILL.md
    ├── evolve-implement-task/SKILL.md
    ├── evolve-verify-change/SKILL.md
    ├── evolve-review-change/SKILL.md
    ├── evolve-merge-to-dev/SKILL.md
    ├── evolve-record-note/SKILL.md
    └── evolve-release/SKILL.md

scripts/agent/
├── workflow-utils.js
├── task-schema.js
├── validate-task.js
├── change-scope.js
├── select-gates.js
├── verify.js
├── validate-notes.js
├── validate-review.js
└── status.js
```

`.agents/AGENTS.md` 只保存长期规则；Skill 保存执行 SOP；Task 保存当前事实、计划和证据；Note 保存跨任务的决策原因；Git 保存完整历史和 diff。普通单应用局部改动不因迁移而强制创建 Note。

## 协议数据模型

### `protocol.json`

```json
{
  "schemaVersion": 1,
  "mode": "shadow",
  "baseBranch": "dev",
  "taskRoot": ".agents/tasks",
  "legacySddRoot": "docs/superpowers/sdd",
  "taskStates": [
    "planned",
    "implementing",
    "verifying",
    "reviewing",
    "ready",
    "blocked",
    "cancelled"
  ],
  "noteClasses": [
    "architecture",
    "process",
    "testing",
    "feature",
    "bug-fix",
    "simplification"
  ]
}
```

`mode` 只有 `shadow` 和 `enforced` 两个合法值。`shadow` 只产生 readiness 报告，不阻止原有合并；`enforced` 要求 native task、验证证据和评审证据满足 ready 条件后才能进入 `dev`。协议不增加第三种模式，避免状态语义分叉。

### `task.json`

```json
{
  "schemaVersion": 1,
  "id": "EWP-001",
  "title": "建立 Evolve Workflow Protocol 骨架",
  "status": "planned",
  "kind": "chore",
  "branch": "chore/ewp-skeleton",
  "baseBranch": "dev",
  "baseSha": "<创建任务时的 dev SHA>",
  "allowedPaths": [
    ".agents/",
    "scripts/agent/",
    "tests/unit/agent-protocol.test.js",
    "AGENTS.md",
    "docs/AGENTS.md"
  ],
  "spec": "docs/superpowers/specs/2026-08-18-evolve-workflow-protocol-design.md",
  "notes": [],
  "requiredGates": "auto",
  "evidence": [],
  "review": null,
  "readyHead": null
}
```

任务校验器必须验证 `schemaVersion`、任务 ID、目录 ID、状态、类型、分支、基分支、路径范围、规格链接、证据结构和评审结构。`app` 类型任务必须包含对应的 `src/apps/<id>/` 允许路径；`ready` 任务必须包含 `readyHead`。`baseBranch` 必须为 `dev`，除非协议未来明确扩展 schema。

### 状态机

```text
planned → implementing → verifying → reviewing → ready
   └──────────────→ blocked ──────────────┘
planned|implementing|verifying|reviewing → cancelled
```

状态只能由对应 Skill 或脚本依据 task 文件和 Git 事实推进。`ready` 不是人工宣称，而是以下条件全部成立后写入 `readyHead`：

1. task branch、实际当前分支和 `baseBranch` 关系一致；
2. 改动路径全部在 `allowedPaths` 内；
3. `agent:scope` 选出的所有 gate 都已通过；
4. 每条自动化证据的 `headSha` 等于当前 HEAD；
5. 评审记录的 `reviewedHead` 等于当前 HEAD；
6. 没有未解决的 Critical 或 Important findings；
7. 需要 Tauri 验证的任务存在真实桌面验证记录，不能以 mock e2e 代替。

HEAD 变化会使旧的验证和评审证据失效；脚本必须重新判定，不能沿用旧的 `readyHead`。

## Gate 选择矩阵

`agent:scope` 只读取 `git diff --name-only <base>...<head>` 并输出稳定 JSON；`agent:gates` 只做确定性选择，不直接执行测试。gate 集合由任务 `kind` 与改动路径共同决定：

| 改动范围 | 必选验证 |
| --- | --- |
| `docs/` | task-check、notes-check（存在 Note 时）、build |
| `src/apps/<id>/` | boundary、相关 unit、相关 e2e、shell smoke、build |
| `src/components/`、`styles/`、`config/`、`app/` | boundary、受影响 unit/e2e、视觉判断、build、owner review |
| `scripts/` | 脚本 unit、失败路径测试、build |
| `src-tauri/` | Web 回归、Rust 检查、权限检查、真实桌面验证 |
| 版本或发版文件 | 单元、全量 e2e、build、版本一致性、用户明确确认 |

相同的 base、head、task 输入必须产生相同 gate 顺序和集合。gate 选择器不改变现有 `check:boundary` 的判定，也不自行执行任何命令。

## 证据与评审契约

验证执行器只在命令实际结束后写入简短证据：gate 名称、命令、base SHA、head SHA、退出码、结果、时间和摘要；不得把完整终端日志写入 task 或提交仓库。命令失败时写入失败摘要并以非零退出，不能写成成功。

评审记录必须包含被评审的 `reviewedHead`、结论、acceptance 对照和 findings。Critical/Important finding 未解决时不能 ready；Minor 可记录在留痕中，但不能伪装为已解决。评审 SHA 变化后记录自动失效。

## 旧 SDD 的处理原则

`docs/superpowers/sdd/` 在整个迁移中冻结为历史证据：不迁移、不删除、不覆盖、不新增原始 `.diff`。迁移期新任务按 Task 2 的约定维护 native task，并在 shadow 模式下继续维护现有 `progress-*.md` 账本，直到 Task 10 明确完成切换。旧 SDD 只用于历史任务恢复和审计，不能作为 native task 当前状态源。

## 分阶段切换条件

实施顺序固定为：

1. Task 1：本规格与现状冻结；
2. Task 2：`.agents` 骨架和 shadow 协议；
3. Task 3：task 校验与状态读取；
4. Task 4：改动范围与 gate 选择；
5. Task 5：验证执行器与证据格式；
6. Task 6/7：Skill 和 Note；
7. Task 8：`merge-to-dev` shadow 接入；
8. Task 9：docs、单应用、UI 或 Tauri 三类真实试点；
9. Task 10：enforced 切换和旧 SDD 冻结说明。

只有三类真实试点都完成独立 review，且没有 native workflow 导致错误放行或错误阻断，才允许把 `mode` 从 `shadow` 改为 `enforced`。如果 gate 误报、任务无法恢复或 Tauri 证据成本不清晰，保持 `shadow`，修复 schema/Skill/Note 或补充 testing Note；不得删除历史 SDD、关闭 boundary gate，或把真实桌面验证标记为 flake 来绕过 ready 条件。

## 回滚边界

- native gate 误报：只把 `mode` 恢复为 `shadow`。
- 单个阶段引入缺陷：回退该阶段独立 merge commit，不改写历史 SDD。
- merge 集成不稳定：只回退 Task 8，保留原 `merge-to-dev` 流程。
- Note 规则过重：缩小强制触发范围，不删除关键 Note。
- 试点恢复不稳定：保持 shadow，修复 task schema/Skill 后再试点。
- Tauri 验证成本不清晰：保持 `desktop-manual: pending`，不能写入 ready。

## Task 1 验收记录

- 规格覆盖协议状态机、JSON 数据契约、gate matrix、旧 SDD 原则、兼容脚本和切换条件。
- `main` 与 `dev` tree 已复核相同，没有额外同步改动。
- Task 1 只允许新增本规格并在 `docs/AGENTS.md` 增加入口链接；不创建 `.agents`、不修改脚本、不改变既有合并或发版行为。
- Markdown 链接、构建和 `git diff --check` 是本阶段验收 gate；单测/构建若受当前 worktree 沙箱路径限制，应记录实际命令、错误摘要和提升权限后的结果，不得把环境阻断写成代码通过。
