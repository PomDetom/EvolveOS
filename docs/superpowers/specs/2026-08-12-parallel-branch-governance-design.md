# 并行分支治理设计（worktree 并行 + 分支规范完善 + 回归单点化）

- **日期**: 2026-08-12
- **前置**: `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`（单仓库 + 目录契约 + 边界门禁沿用）；`main` + `dev` 双分支已建；本地单仓、无远端
- **来源**: 用户头脑风暴多轮澄清——「放开 worktree 以支持同仓库多 agent 并行」+「完善分支规范（前缀混用/绕过 dev/merge 不规范/生命周期不清）+ 完整 git 管理闭环」逐项确认
- **目标**: ① 同仓库多 agent 并行（git worktree 隔离）② 分支规范全集 + 生命周期闭环 ③ 回归单点化（全量仅 dev→main / hotfix→main）④ 新增应用碰零共享文件
- **取代**: 08-09 规格的「分支结构 §5」「回归分级 §5.3」「迭代流程 §5.2 中 worktree 条款」；08-09 的应用契约/边界门禁哲学/CODEOWNERS 意向继续有效

---

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 并行模型 | **多会话独立 + 单控制器并行子代理**，两者都支持 |
| 隔离 | **git worktree**，放在**仓库根同级目录**（`evolveos-<slug>`），不用 harness `.claude/worktrees/`（避免索引/监听工具扫到工作副本） |
| 集成分支 | **dev 强门保留**：所有分支从 dev 检出、只合 dev；dev 稳定后 `--no-ff` 合 main（= 一次发版） |
| 紧急修复 | **hotfix/* 唯一直合 main 豁免**，随后必须同步回 dev；其余一律走 dev |
| 回归模型 | **全量仅 dev→main / hotfix→main** 两个点跑；dev 阶段只跑定向测试 |
| 入口文件 | **抗变化**（e2e 计数动态化 + 图标自持 a1），新增应用 = 只建 `src/apps/<id>/` 目录，共享文件零改动 |

## 2. 分支前缀规范（`check:boundary` 按前缀定边界）

**所有分支从 dev 检出**（`hotfix/*` 例外可从 main 检出）。前缀全集：

| 前缀 | 语义 | 允许触碰（边界） | 分支上回归 |
|---|---|---|---|
| `app/<id>/<name>` | 应用功能/修复 | 仅 `src/apps/<id>/` + 该应用测试 + docs | 该应用单测 + 该应用 e2e + build + 壳冒烟 |
| `ui/<name>` | 框架改动 | 框架全目录（标 owner 评审） | 受影响子系统 specs + build + 壳冒烟（触及全局面时自愿全量） |
| `docs/<name>` | 纯文档 | `docs/` + 根 `*.md`（README/CHANGELOG/CLAUDE） | build |
| `chore/<name>` | 维护 | `scripts/ tests/ 锁文件 .gitignore 配置 src-tauri/**`，**不碰 `src/`** | build |
| `hotfix/<name>` | 紧急修复（唯一豁免） | 任意，合并 main 后**必须同步回 dev** | 全量（直合 main 前） |

**未知前缀**（如 `feature/`、`fix/`、`worktree-*`）→ `check:boundary` 报「分支名不合规 + 合规示例」并 fail。

## 3. 生命周期闭环

每分支走完 5 步才算完成：

1. **创建**：`git worktree add <同级目录>/evolveos-<slug> -b <prefix>/<name> dev`。分支名不符规范，合并时被 `check:boundary` 拒。
2. **工作**：定向测试 + build（每提交前）。
3. **合并**：`git merge dev` 同步最新 dev（处理漂移）→ 抢 dev（`git checkout dev`，git 强制互斥）→ `git merge --no-ff <分支>`（禁止直接 `git commit` 造 merge）。
4. **删除**：`git branch -d <分支>`（git 内建「未完全合并拒绝删」= 天然门禁）→ `git worktree remove <path>`。分支与 worktree 一一对应，一并清理。
5. **main**：只从 dev `--no-ff` 合（= 一次发版）；`hotfix/*` 唯一直合豁免，随后同步回 dev。

## 4. 回归模型（gate testing）

**核心：全量回归只在两个点跑——`dev→main` 发版合并、`hotfix→main` 直合。其余阶段只跑「改动影响面」定向测试。**

| 阶段 | 跑什么 | 不跑什么 |
|---|---|---|
| `app/*` 分支内 / 合 dev | 该应用单测 + 该应用 e2e spec + build + 壳冒烟 | 全量 e2e / 其他 app |
| `ui/*` 分支内 / 合 dev | 受影响子系统 specs + build + 壳冒烟 | 全量 |
| dev 集成 | 无独立全量（各分支定向已测） | 全量 |
| **dev→main** | **全量**（单测 + 全量 e2e + build + 视觉基线） | — |
| **hotfix→main** | **全量**（绕过 dev，必须补） | — |

**壳冒烟** = `tests/e2e/smoke.spec.js`（1 条：应用壳能挂载渲染）。成本约等于零，抓「glob 发现断 / 壳挂不起」级致命错。

**原理**：边界门禁保证 `app/*` 碰不到框架 → 定向足够；build + 壳冒烟抓「glob 发现断 / 壳挂不起」这种任何改动都可能踩的致命错（成本极低）。

**代价与兜底**：`ui/*` 破坏不相干子系统会延迟到 dev→main 才发现。兜底：① dev→main 全量在发版前，发现的破坏不会上 tag；② 项目全量规模小（~90 单测 + ~103 e2e + build + 30 视觉基线，约分钟级），常跑不心疼；③ `ui/*` 仍须框架 owner 评审，且定向范围给足（改 `tokens.css` 要带上消费它的组件 specs）。

**与旧规格差异**：原 §5.3 的「`ui/*` 每任务全量回归」「dev 全量回归」均取消，全量收敛到 dev→main / hotfix→main 单点。

## 5. worktree 布局与并行机制

### 5.1 布局与命名

- worktree 放在**仓库根同级目录**，命名 `evolveos-<branch-slug>`（`/` → `-`），如分支 `app/clipboard/history` → 目录 `evolveos-app-clipboard-history`。规格内不写本机绝对路径。
- **主 checkout 常驻 `main`**（发版合并点）；**`dev` 不常驻任何 worktree**，合并时临时 checkout（git 强制「同一分支只被一个 worktree 持有」= 天然互斥）。
- **node_modules**：每个 worktree 独立 `npm install`（成本低——零运行时依赖；Playwright 浏览器二进制走用户级共享缓存不重复下载）。
- **端口**：每个 worktree 的 `playwright.config.worktree.js`（已 git-ignored）用独立端口（5174 起递增），并行跑各自 e2e 不撞车。

### 5.2 撞车规则（git 机制强制，不靠 agent 自觉）

| 要防的 | 谁强制 |
|---|---|
| 两个会话用同名分支 | `git checkout -b` 报「分支已存在」，响亮失败 |
| 两个 worktree checkout 同一分支 | `git worktree add` 报「已被另一 worktree 持有」 |
| 两个会话同时合并 dev | dev 一次只能被一个 worktree 持有，天然互斥 |
| 删掉未完全合并的分支 | `git branch -d` 内建校验，未合并拒绝删 |
| 分支名不规范 | `check:boundary` 分支名校验 |

### 5.3 并行合并协议（两种模式统一）

**多会话独立**（用户自行开多个对话）——每个会话自管一条分支：

```
① 在 worktree 内工作，提交前 build
② 定向测试（该应用单测 + 该应用 e2e + 壳冒烟）绿
③ npm run check:boundary   ← 分支名 + 边界双校验
④ git merge dev            ← 同步最新 dev（处理漂移）→ 定向回归绿
⑤ git checkout dev && git merge --no-ff <分支>   ← 抢 dev，别人此刻合不了
⑥ git branch -d <分支>     ← git 校验已完全合并才放行
⑦ git worktree remove <path>   ← 分支与 worktree 一并清理，闭环
```

**单控制器并行子代理**（SDD 用）——放开「禁止并行派发实施子代理」铁律，控制器给每个子代理建独立 worktree：

```
① 控制器：git worktree add -b app/<id>/<name> dev <slug> × N（并行派发）
② 子代理：只在各自 worktree 内工作，定向测试 + build，报告
③ 控制器串行收尾：逐个 `check:boundary`（分支上）→ merge 到 dev → 删分支 + 清 worktree
```

### 5.4 `ui/*` 串行规则（唯一的协调约束）

- **应用分支（`app/*`）可随意并行**——边界保证互不干扰。
- **框架分支（`ui/*`）同一时刻只允许一个在工作**——动同一套共享文件，并行必然 merge 冲突 + 互相破坏。此条无法靠 git 机制自动强制（无控制器时），**靠用户开会话时错开**：开一个 ui 会话期间，其他会话只做应用/docs。

## 6. 入口文件抗变化（方案 a）

**目标：新增应用 = 只建 `src/apps/<id>/` 目录，共享文件零改动。** 三处改造（各一次，之后永久有效）：

1. **e2e 计数动态化**（一次性改 `tests/e2e/app-shell|mobile-nav|token-tool.spec.js`）：
   - 硬编码 `toHaveCount(8)` → **关系断言**（`>= 已知最小值` 或运行时读 MODULES 长度）。
   - 位置断言 `nth(1)`=剪贴板 / `nth(2)`=密码 → **`[data-id="clipboard"]` 定位**。
   - 效果：加应用后这些 spec 依然绿，不用动。

2. **图标自持（a1）**——应用定义自己的图标，一次 `ui/` 改造：
   - `icon.js` 的 `icon(name, size, stroke)` 加**第四可选参 `icons`**（应用级图标表），查找顺序「应用级 → 全局 PATHS」，向后兼容（既有调用点零改动）。
   - 应用 `module` 导出 `icons: { <name>: '<path …/>' }`，页面里 `icon(name, size, ctx.module.icons)`。
   - 红线：应用自持图标必须 Lucide 风格（24×24 / stroke 1.8 / round cap/join），否则评审打回。
   - 效果：新图标**不需要碰 `src/components/`**，解除「应用禁碰框架」与「新图标要进 icon.js」的既有矛盾。

3. **（现有机制已够，无改动）** 壳经 `import.meta.glob('../apps/*/index.js')` 自动发现新应用，`app-main.js` 零改动。

## 7. 文档落点

| 文件 | 改什么 |
|---|---|
| **本规格** `2026-08-12-parallel-branch-governance-design.md` | 全文（取代 08-09 在分支/回归上的条款） |
| 根 `CLAUDE.md` | 铁律「不用 worktree」→「worktree 并行模型」；「发版与版本治理」更新分支/回归口径；指向本规格 |
| `docs/CLAUDE.md` | 「禁止并行派发实施子代理」→「并行子代理必须在独立 worktree，同一 worktree 内串行，`ui/*` 全局串行」；「每任务全量回归」→「定向 + 全量仅 dev→main/hotfix」；删 worktree 旧行 |
| `scripts/boundary-check.js` + 单测 | 前缀全集 `app/ui/docs/chore/hotfix` + 分支名校验（未知前缀 fail 给示例） |
| `docs/app-integration.md` | 图标自持（a1）替代「新图标进 icon.js」；边界红线与分支规范引用 |
| `src/CLAUDE.md` | 补 `icon()` 第四参约定 + 应用自持图标红线（`src/CLAUDE.md` 属 src/ 内文件，此改动**随 §8 第 4 步 `ui/test-infra` 分支**一起走，不走 docs 分支） |

## 8. 迁移顺序（一次做，之后永久）

1. **dev 同步 main**：`git checkout dev && git merge main`——dev 曾落后 main，先对齐，否则新分支基点错。（已随本规格提交执行）
2. **门禁先行**：扩展 `boundary-check.js` + 单测。让第一条新分支起就受分支名/边界约束。
3. **文档更新**：§7 各文件。
4. **ui/test-infra 分支**（一次 ui 分支完成「入口抗变化」）：e2e 计数动态化 + `icon()` 第四参 + 应用自持图标机制。全量回归 + owner 评审。
5. **试跑验证**：建一个真实 `app/<id>/<name>` worktree 走完整生命周期，确认全流程顺滑。

## 9. 验收标准

- **闭环**：一条 app 分支从 `git worktree add ... dev` → 定向测试+build → `check:boundary` 绿 → 合 dev → `git branch -d` + `worktree remove` 全流程无手工干预卡点。
- **门禁**：`check:boundary` 对 `feature/foo` 报「分支名不合规 + 示例」；对 `app/<id>/` 触框架 fail；对合规分支通过。
- **入口抗变化**：新增一个应用后 `app-shell/mobile-nav` spec 仍绿（计数动态化生效）；应用自持图标渲染生效、`icon()` 既有调用零回归。
- **并行互不干扰**：两个 worktree 同时存在，各跑各的 e2e（不同端口）；对同一分支二次 `worktree add` 被 git 拒绝。
- **回归模型**：dev 阶段只有定向测试；全量只在 dev→main（及 hotfix→main）跑。

## 10. 非目标

- 不引入远端/CI（本阶段仍本地单仓，多会话靠共享 `.git`）。
- 不用 git hooks 强制（保持显式脚本，不隐式拦截）。
- `ui/*` 串行靠人错开，不做自动锁。
- 不做多克隆方案（worktree 已解决隔离）。

## 11. 与既有规格关系

- **继续有效**（08-09）：应用契约（module 字段/render/mount）、边界门禁哲学、CODEOWNERS 意向（上远端后生效）、目录契约。
- **本规格取代**（08-09）：分支结构 §5.1、迭代流程 §5.2（worktree 条款反转）、回归分级 §5.3、迭代节奏 §5.4。
- **本规格新增**：分支前缀全集、生命周期闭环、回归单点化、入口文件抗变化。
