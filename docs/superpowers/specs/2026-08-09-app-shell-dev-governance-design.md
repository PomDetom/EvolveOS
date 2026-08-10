# 应用壳开发模式与 Git 治理设计规格

- **日期**: 2026-08-09
- **前置**: B6-R2 已合并 main；`docs/app-integration.md` 已定义接入契约（MODULES）
- **来源**: 用户头脑风暴「UI 框架如需修改只能单独修改；应用只能制作自己的页面，禁止修改原有整体 UI；git 如何管理迭代」逐项澄清确认
- **目标**: ① 框架与应用物理/流程隔离 ② 应用零侵入壳即可新增页面 ③ 可执行的 git 迭代模型与边界门禁

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 隔离模型 | **单仓库 + 目录契约 + CI/门禁**（不拆 npm 包） |
| 应用注册 | **`import.meta.glob` 自动发现** `src/apps/*/index.js`，壳零改动 |
| git 迭代 | **main + dev 双分支**（main 稳定发版 / dev 集成），特性分支 + SDD |

## 2. 目录契约（框架 vs 应用）

```
src/
├─ components/   ← 框架（34 组件，只许框架改动）
├─ styles/       ← 框架（tokens/themes/base/layout/motion）
├─ config/       ← 框架（defaults/store/apply 配置链路）
├─ app/          ← 框架（壳：app-main/mode/strip-main/partitions）
├─ scenes/       ← 框架（场景模板：settings-window/clipboard-float）
├─ demo/ · motion/ · assets/  ← 框架
└─ apps/         ← 应用（每个子目录一个应用）
   ├─ <app-id>/index.js   → export const module = { id, name, icon, dir, render }
   ├─ <app-id>/pages.js / <app-id>.css / <app-id>.test.js / 交互 JS（应用自持）
   └─ ...
```

**壳发现机制**（`src/app/app-main.js` 改一次即永久）：

```js
// 壳 = 内置 home（概览）+ glob 发现的应用
const appModules = import.meta.glob('../apps/*/index.js', { eager: true });
const APPS = Object.values(appModules).map((m) => m.module);
const MODULES = [homeModule, ...APPS];   // home 为壳内置概览
```

- `import.meta.glob` eager → 编译期静态打包进壳 chunk（零运行时依赖、无动态 import 竞态；非按需懒加载，见 §7 非目标）。
- 新增应用 = `src/apps/<id>/` 建目录 + `index.js` 导出 `module`，**壳与既有应用零改动**。
- 删除/停用应用 = 删目录（或 glob 改为非 eager + 显式开关，按需）。

## 3. 应用契约

### 3.1 应用能做什么

- 按 `docs/app-integration.md` 的 MODULES 契约写自己的页面（`render(ctx) → string`）、局部 CSS（类名 `app-<id>__*`）、局部交互、单测。
- 复用框架组件（`c-` 前缀）、设计令牌（`--text/--space/--radius/--dur/--glass/--accent-*`）、图标（`icon(name,size)`）、配置链路（`getConfig/saveConfig/subscribe`）。
- 应用目录内自由迭代；不越过 `src/apps/<id>/` 边界。

### 3.2 应用禁止（红线，违反即失败）

- 修改 `src/components|styles|config|app|scenes|demo|motion|assets` 任何文件。
- 修改 `vite.config.*`、`vitest.config.*`、`index.html`、`package.json`（依赖）、`package-lock.json`、`playwright.config.*`。
- 绕过配置链路直接写 CSS 变量 / `data-theme` / `data-accent`。
- 引入运行时依赖、升级核心依赖。

### 3.3 新组件/框架能力需求

应用需要新组件/新框架能力 → **不能自己加**：先在应用内用局部类名临时实现 → 提议升框架（`ui/` 分支，框架 owner 评审，经 `scenes/demo` 验证后再入 `components/`）。

## 4. 边界执行（三层防线）

### 4.1 边界检查脚本（现在即可用，本地/CI 通用）

- `scripts/check-boundary.js` + npm script `npm run check:boundary`。
- 用法：`npm run check:boundary -- <base>...<head>`（如 `main...dev` / `dev...HEAD`）。
- 规则：
  - **应用改动**（分支前缀 `app/<id>/` 且改动全在 `src/apps/<id>/` + 该应用测试）：断言未触碰框架路径（§2 框架目录 + `vite.config` + `vitest.config` + `index.html` + `package.json` + `package-lock.json` + `playwright.config`）；触碰即 exit 1 + 列出违规路径。
  - **框架改动**（分支前缀 `ui/`）：允许触碰框架，但输出标记「须全量回归 + 框架 owner 评审」。
  - **不匹配前缀 / 混合**：按最严格处理（按应用边界检查，触框架即失败）。
- 由 `src/CLAUDE.md` 固化为「应用合并前必跑」。

### 4.2 CODEOWNERS（上远端后生效）

```gitignore
src/components/  src/styles/  src/config/  src/app/  src/scenes/  src/demo/  src/motion/  src/assets/   @framework-owner
docs/           @framework-owner
src/apps/       @framework-owner
src/apps/*/     @<app-owner>        # 各应用目录各自 owner
```
应用 PR 触碰框架目录 → 须框架 owner approve。

### 4.3 评审把关（接入既有 SDD）

每任务独立评审时，评审者核对 diff 路径契约：**应用任务触框架目录 = 不合格**（进修复循环）。控制器合并前跑 `npm run check:boundary`。

## 5. git 迭代工作流（main + dev 双分支）

### 5.1 分支结构

```
main  （稳定 · 可发版）     只接受 dev 合入 / hotfix 直合
  ▲
dev   （集成 · 全量回归绿）  接受特性分支合入
  ▲
ui/<name>                   框架特性（从 dev 检出）
app/<id>/<name>             应用特性（从 dev 检出）
hotfix/<name>              紧急修复（直合 main → 同步 dev）
```

### 5.2 迭代流程（沿用 SDD）

1. 从 `dev` 检出特性分支（`ui/*` 或 `app/<id>/*`），共享 checkout 执行（不用 worktree，B5 铁律）。
2. SDD：TDD → 独立评审 → 修复循环 → 每任务回归。
3. 合回 `dev` → **dev 全量回归**（e2e + 单测 + build）。
4. dev 稳定 → 合 `main`（`--no-ff`，视作一次发版）→ **main 合并后全量回归** → 删分支。
5. 里程碑打 tag：`ui/vX.Y.Z`。
6. 留痕：`docs/superpowers/sdd/progress-*.md` 账本 + HANDOFF 交接；dev 集成 / main 发版各记一笔。

### 5.3 回归门（按改动分级）

| 改动 | 边界检查 | 每任务回归 | dev 回归 | main 回归 |
|---|---|---|---|---|
| `ui/*` 框架 | 无（允许触框架，标记 owner 评审） | ✅ | 全量 | 全量 |
| `app/<id>/*` 应用 | ✅ 必须过（禁触框架） | 应用内测试 + 壳冒烟 | 全量 | 全量 |

### 5.4 迭代节奏

- **框架**（`ui/*`）：慢、谨慎——全量回归、框架 owner 评审、新组件经 `scenes/demo` 验证后再升。
- **应用**（`app/<id>/*`）：快、隔离——只动自己目录，边界脚本保证不越界，不等框架节奏。

### 5.5 当前落地（无远端，本地单仓）

- 建 `dev` 分支（从 main 检出）。
- 后续 `ui/*`、`app/<id>/*` 均从 `dev` 检出，合并走 dev 集成门。
- `check:boundary` 先在本地 SDD 合并前跑；上远端后再接 CODEOWNERS/CI。

## 6. 落地步骤（迁移）

1. **重构 MODULES**：`src/app/app-main.js` 内联的 7 个模块迁移到 `src/apps/<id>/index.js`（每应用导出 `module`），壳改 glob 发现 + 内置 home。既有 7 占位模块：home 留壳内置概览，clipboard/key/wallet/search/help/info 迁 apps/。
2. **边界脚本**：`scripts/check-boundary.js` + `npm run check:boundary` + 单测。
3. **git 分支**：建 `dev`；后续流程按 §5。
4. **CLAUDE.md 固化**：根 CLAUDE.md 加「应用禁止修改框架目录，边界检查见 check:boundary」红线 + 指向本设计。
5. **文档同步**：`docs/app-integration.md` 更新为 `src/apps/<id>/` 结构 + 边界红线。

## 7. 非目标

- 不拆 npm 包 / 多仓库（单仓 + 契约 + 门禁已满足）。
- 不做运行时动态加载应用（零运行时依赖；glob eager 编译期打包）。
- 不改既有组件/令牌/壳代码（迁移只是移动 MODULES 定义 + 壳改 glob，行为不变）。
- 不引入 monorepo 工具链（pnpm workspace/turborepo 等）。

## 8. 验证与验收

- **行为零回归**：迁移后 `npm test`（68）+ 全量 e2e（124 隔离验收）+ build 全绿；左窗/右键/内容区/概览快捷入口行为不变（既有 e2e 覆盖）。
- **边界生效**：`npm run check:boundary` 对「应用改动触碰框架」返回失败并列出路径；对「纯应用改动」通过。
- **迭代可执行**：建 `dev` 后，一个 `app/<id>/*` 分支走完整流程（SDD → 边界检查 → dev 回归 → main）可落地。
- 用户目检：应用壳视觉与迁移前一致（背景/按钮/导航不变）。
