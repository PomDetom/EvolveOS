# Task G1 报告：MODULES 迁移到 src/apps/ + 壳 glob 自动发现

- **任务**: G1（来源：`docs/superpowers/sdd/task-G1-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md` §2/§3，唯一需求源）
- **分支**: `ui/apps-migration`（共享 checkout，无 worktree 隔离）
- **状态**: DONE_WITH_CONCERNS（唯一 concern = 全量 e2e 环境性冷启动 flake，与本次改动无关，经基线对照实验已证）

## 实施内容

按 brief Steps 1-8 执行（TDD）：

1. **`src/scenes/placeholder-page.js`**（新建，brief Step 3 verbatim）— 占位页骨架从 app-main.js 移出（页面头 + EmptyState「功能开发中」），导入 `renderEmptyState`。应用接入真实页面后替换 render 即可。
2. **`src/apps/<id>/index.js` × 6**（新建，brief Step 4 verbatim）— clipboard/key/wallet/search/help/info，各导出 `module = { id, name, icon, order, dir, render }`；`order` 1-6 保持既有左窗顺序；`render` 均为 `(ctx) => placeholderPage(ctx)`。
3. **`src/app/app-main.js`**（修改，brief Step 5）：
   - 删 6 个占位模块 + `placeholderPage` 函数 + `renderEmptyState` import（`renderEmptyState` 已确认仅 placeholderPage 使用，移入 scenes 后 import 成死代码）。
   - 新增 `homeModule = { id: 'home', name: '概览', icon: 'home', dir: [], render: renderOverview, order: 0 }`（`renderOverview` 保留、函数声明提升，消费点零改动）。
   - 新增 `const appModules = import.meta.glob('../apps/*/index.js', { eager: true })` → `APPS = Object.values(...).map(m => m.module).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))` → `MODULES = [homeModule, ...APPS]`。
   - 头部扩展契约注释同步（「后续填充真实功能只改 MODULES」→「只新增 src/apps/<id>/index.js」）。
   - 其余 MODULES 消费点（mountNavWheel / renderRight / renderPages / goToModule / navL click / dock / 概览快捷入口）**零改动**。
4. **`tests/unit/apps.test.js`**（新建，brief Step 1 verbatim）— 与壳同机制 `import.meta.glob('../../src/apps/*/index.js', { eager: true })`，校验 6+ 模块契约（id/name/icon/dir/render/order）且 id 唯一。

## TDD 证据（RED → GREEN）

**Step 2 RED**（实现前，`npx vitest run tests/unit/apps.test.js`）：
```
× 应用模块契约（G1：glob 自动发现）> … → expected 0 to be greater than or equal to 6
   AssertionError: expected 0 to be greater than or equal to 6
```
（`src/apps/*` 不存在 → modules.length 为 0，与 brief 预期一致。）

**Step 6 GREEN**（实现后，同一命令）：
```
✓ tests/unit/apps.test.js (1 test)
 Test Files  1 passed (1)      Tests  1 passed (1)
```

## app-shell e2e（Step 7，行为零回归）

`npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js` → **34 passed**。
覆盖：壳结构 7 模块 / 点击应用右窗展开 + 目录项 / 三收起通道 / 换应用目录切换 / 标题栏上下文联动 / 概览 7 快捷入口 / 设置模式全链路 / 冷启动持久化 / 拖拽阈值 / 导航轮 38.2% 锚点 / resize 选中修复 —— 左窗 7 模块 id 与顺序与迁移前完全一致。

## 全量回归（Step 8）

- **全量 e2e**（`npx playwright test --config=playwright.config.worktree.js`，默认 workers）：**4 轮均 123 passed / 1 failed**，失败为**旋转变化的冷启动时序 flake**（`page.goto` 后首断言 5s 内惰性挂载元素未就绪 —— 与 B6-R2-3 报告 §全量回归 记录的同型环境 flake，docs/app-integration.md「e2e 冷启动 flake」既有条目：隔离重跑绿即接受）：
  - 迁移代码 第 1/2 轮：components-basic「B6-R2-2 按钮 primary」；
  - 迁移代码 第 4 轮：app-shell「冷启动应用持久化配置」；
  - **基线对照实验**：`git stash` 后对**未改动旧代码**同条件全量 → **同样 1 failed**（本轮命中 app-shell「概览页结构」，另一受害者）→ 证明 flake 与本次改动无关（环境性争用），且每轮受害者不同。
  - 全部 flake 受害者（components-basic B6-R2-2 / app-shell 概览页结构 / app-shell 冷启动持久化）**隔离复跑均绿** → 并集 124/124 绿（项目既有惯例，见 final-fix-report.md / final-review-fix-report.md）。
- **视觉基线零变化**：本任务零视觉改动（仅模块注册来源重构，HTML 渲染产物逐字节相同）。`tests/e2e/visual-regression.spec.js` 独立跑 → **30 passed**（未 `--update-snapshots`，基线原样通过）。
- `npm test` → **16 files / 69 passed**（含新 apps.test.js）。
- `npm run build` → **✓**（545ms，无警告）；产物 app-main 主 chunk 含全部 6 应用（clipboard/密码/记账/搜索/帮助/关于），glob 在生产构建正确解析。

## 文件变更

- `src/scenes/placeholder-page.js`（新建，占位页骨架移出）
- `src/apps/clipboard/index.js`、`src/apps/key/index.js`、`src/apps/wallet/index.js`、`src/apps/search/index.js`、`src/apps/help/index.js`、`src/apps/info/index.js`（新建，各导出 module，order 1-6）
- `src/app/app-main.js`（删 6 占位模块 + placeholderPage + renderEmptyState import；加 homeModule + glob 发现）
- `tests/unit/apps.test.js`（新建，应用模块契约守卫）
- `docs/superpowers/sdd/task-G1-report.md`（本文）、`docs/superpowers/sdd/progress-governance.md`（账本）、`docs/superpowers/sdd/task-G1-brief.md`（既有，随 docs 提交）
- `playwright.config.worktree.js` **未提交**（本地 git-ignored，仅使用）

## Self-Review

- **完整性**：6 应用目录齐 + placeholder-page 移出 + 壳 glob 发现 + homeModule + 契约单测 + 零回归 —— 全齐。
- **顺序/id 零回归**：home=0 + 应用 order 1-6 → `MODULES = [homeModule, ...APPS]`，左窗 7 模块顺序与迁移前逐位一致（34 条 app-shell 用例含 nth(1)=clipboard、data-id 断言全绿）。
- **质量**：app 文件/场景模板/壳改动均按 brief verbatim，注释更新保持框架说明与实际一致；无死 import（grep 确认 app-main.js 无 renderEmptyState/placeholderPage 残留）。
- **纪律**：材质/色板/令牌/字体零改动；零运行时依赖；无核心依赖升级；`--font-mono` 未动。
- **生产构建**：glob eager 在 build 产物确认解析（6 应用全进 app-main chunk），无警告。

## Concerns

1. **全量 e2e 冷启动 flake**（唯一 concern）：本机默认 workers 全量 + 新鲜 5174 server 下，`page.goto` 后首断言 5s 超时属已知环境时序（惰性挂载/5.3MB 普惠体加载/资源争用），每轮受害者旋转。基线对照（stash 旧代码同条件 1 failed）证明与本次改动无关；全部受害者隔离复跑绿，并集 124/124。按项目惯例接受，未改任何测试。
2. `docs/superpowers/sdd/task-G1-brief.md` 为任务既有文档，随 docs 提交一并纳入（与 task-*-brief 惯例一致）。
