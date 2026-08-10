# Task G3: dev 分支工作流 + CLAUDE.md 红线 + 手册同步

> 源：docs/superpowers/plans/2026-08-09-app-shell-dev-governance.md（Task G3）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md（§5 git 迭代 / §4.1 门禁，唯一需求源）

## 任务目标

让开发模式正式生效：① 建 `dev` 分支（从 main 检出，供后续 `ui/*`、`app/<id>/*` 从 dev 检出）② 根 CLAUDE.md 固化「框架单独修改 / 应用禁触框架」铁律 + `npm run check:boundary` ③ docs/CLAUDE.md 加边界门禁提及 ④ `docs/app-integration.md` §1 更新为 `src/apps/<id>/` glob 结构（G1 已迁移，旧"往 MODULES 数组加一项"写法已过时）+ 边界红线。

## Global Constraints（本任务绑定）

- 纯文档 + git 分支操作，不改任何 src/ 代码、不改 package.json、不改测试。
- 遵循项目文档风格（中文、直接可复制代码/命令）。
- 提交前 `npm run build` 可选（无代码改动则不必）；不跑 e2e。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。

## Files

- Modify: `CLAUDE.md`（根：加「开发模式与边界」铁律）
- Modify: `docs/CLAUDE.md`（加边界/check:boundary 提及）
- Modify: `docs/app-integration.md`（§1 更新为 `src/apps/<id>/` glob 结构 + 边界红线）
- Git: 建 `dev` 分支（从 main 检出，作为流程最后一步由控制器在合并后创建亦可）

## Interfaces

- Consumes: G1 的 `src/apps/` 结构、G2 的 `npm run check:boundary`
- Produces: `dev` 分支（后续迭代基线）；CLAUDE.md 固化边界红线；手册指向新结构 —— 开发模式正式生效

---

## 实施步骤

### Step 1: 根 CLAUDE.md 加铁律

在「## 核心铁律」末尾追加：

```markdown
- **开发模式与边界（框架 vs 应用）**：UI 框架（`src/components|styles|config|app|scenes|demo|motion|assets`）如需修改只能**单独修改**（`ui/` 分支，全量回归 + 框架 owner 评审）；应用（`src/apps/<id>/`）只能制作自己的页面，**禁止修改框架目录**，合并前必跑 `npm run check:boundary`。详规：`docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`；git 走 main + dev 双分支（`ui/*`、`app/<id>/*` 从 dev 检出）。
```

### Step 2: docs/CLAUDE.md 加提及

在「## 任务执行规范」末尾追加：

```markdown
- **边界门禁**：应用任务合并前跑 `npm run check:boundary`（禁触框架目录）；框架任务须全量回归 + 框架 owner 评审。设计规格：`docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`。
```

### Step 3: 手册 §1 更新为 glob 结构 + 边界红线

读取 `docs/app-integration.md`，把 §1「最快接入：注册一个模块」整节替换为：

```markdown
## 1. 最快接入：注册一个应用

**应用 = `src/apps/<id>/` 一个目录**，壳用 `import.meta.glob('../apps/*/index.js')` 自动发现（Task G1），**新增应用 = 建目录放文件，壳零改动**。

`src/apps/notes/index.js`：

```js
import { renderButton } from '../../components/button/button.js';
export const module = {
  id: 'notes', name: '便签', icon: 'pin',
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: notesPage,
};
```

> **边界红线**：应用只允许修改 `src/apps/<id>/` 自己目录（+ 该应用测试 + docs），**禁止触碰框架目录**（`src/components|styles|config|app|scenes|demo|motion|assets`、`vite.config`、`package.json`）。合并前跑 `npm run check:boundary`；违反即失败。框架需修改 → 单独 `ui/` 分支。
```

若 §1 现文以「往 `src/app/app-main.js` 的 `MODULES` 数组加一项」开头，则整段替换为上述（同时检查 §2.3「壳自动做的事」是否含过时的「改 MODULES 数组」表述，一并更新为「只改 `src/apps/` 目录」）。

### Step 4: 提交

```bash
git add CLAUDE.md docs/CLAUDE.md docs/app-integration.md
git commit -m "docs: 开发模式边界红线固化（CLAUDE.md）+ 手册同步 glob 应用结构（G3）"
```

> 提交惯例：docs 单枚提交（本任务无代码，不拆 feat/docs）。分支 `ui/governance-docs`。

### Step 5: 报告

写完整报告到 `docs/superpowers/sdd/task-G3-report.md`：改了哪三个文件、替换了什么、自查（无 src/ 代码/package.json 改动）。

> 注：`dev` 分支的创建由控制器在 G3 合并 main 后执行（确保 dev 含全部 G 系列变更），无需本任务做。
