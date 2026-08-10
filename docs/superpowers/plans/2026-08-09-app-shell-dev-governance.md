# 应用壳开发模式与 Git 治理落地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地「框架 vs 应用」隔离：MODULES 迁移到 `src/apps/<id>/`（壳 glob 自动发现，应用零侵入）+ 边界检查脚本 + `dev` 分支工作流与 CLAUDE.md 红线。

**Architecture:** 壳 `app-main.js` 内置 home（概览）模块，用 `import.meta.glob('../apps/*/index.js', { eager: true })` 编译期发现应用模块（零运行时依赖）；应用目录自治；`scripts/boundary-check.js` 纯函数 + CLI 评估分支改动是否越界；git 走 main + dev 双分支。行为零回归。

**Tech Stack:** Vite（import.meta.glob）+ 原生 JS + Vitest + Playwright（现有）。

**规格:** docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md（唯一需求源）

## Global Constraints

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，本地不入库）。
- **行为零回归**：迁移后既有 app-shell e2e（左窗 7 模块 / 右键切换 / 概览快捷入口）+ 单测全绿；视觉基线零变化。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系/色板/令牌不动；`--font-mono` 不动。
- 提交前 `npm run build`；任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。
- 已知环境怪癖：Vitest 重写测试内 `import.meta.url`（经它定位文件路径属环境怪癖）；e2e 冷启动 flake 隔离重跑绿即接受。

---

### Task G1: MODULES 迁移到 src/apps/ + 壳 glob 自动发现

**Files:**
- Create: `src/scenes/placeholder-page.js`（从 app-main.js 移出占位页骨架）
- Create: `src/apps/clipboard/index.js`、`src/apps/key/index.js`、`src/apps/wallet/index.js`、`src/apps/search/index.js`、`src/apps/help/index.js`、`src/apps/info/index.js`
- Modify: `src/app/app-main.js`（删 6 个占位模块 + `placeholderPage` + `renderEmptyState` import；加 `homeModule` + glob 发现）
- Test: `tests/unit/apps.test.js`（新建，应用模块契约守卫）

**Interfaces:**
- Consumes: 既有 `renderEmptyState`（components/empty-state）、`renderOverview`（app-main.js 保留）
- Produces: `src/apps/<id>/index.js` 导出 `module = { id, name, icon, order, dir, render }`；壳 `MODULES = [homeModule, ...APPS]`（order 排序，home=0，应用 1-6 保持既有左窗顺序）—— G2 边界脚本依赖此目录结构

- [ ] **Step 1: 写失败单测**（tests/unit/apps.test.js，新建）

```js
import { describe, it, expect } from 'vitest';

// 与壳同机制：glob 发现 src/apps/*/index.js（Vitest 支持 import.meta.glob）
const appModules = import.meta.glob('../../src/apps/*/index.js', { eager: true });

describe('应用模块契约（G1：glob 自动发现）', () => {
  it('每个 src/apps/*/index.js 导出合法 module（id/name/icon/dir/render）且 id 唯一', () => {
    const modules = Object.values(appModules).map((m) => m.module);
    expect(modules.length).toBeGreaterThanOrEqual(6);
    const ids = modules.map((m) => {
      expect(typeof m.id).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.icon).toBe('string');
      expect(typeof m.render).toBe('function');
      expect(Array.isArray(m.dir)).toBe(true);
      expect(typeof m.order).toBe('number'); // 左窗排序
      m.dir.forEach((d) => {
        expect(typeof d.id).toBe('string');
        expect(typeof d.name).toBe('string');
        expect(typeof d.icon).toBe('string');
      });
      return m.id;
    });
    expect(new Set(ids).size).toBe(ids.length); // id 唯一
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/apps.test.js`
Expected: FAIL（`src/apps/*` 不存在，modules.length 为 0）

- [ ] **Step 3: 建占位页场景模板**（src/scenes/placeholder-page.js，新建；内容从 app-main.js 的 `placeholderPage` 移出）

```js
// 占位页骨架（框架场景模板，Task G1 从 app-main.js 移出）——
// 应用模块未接入真实页面时的占位渲染。接入真实页面后替换 render 即可
// （见 docs/app-integration.md §5.1 页面骨架）。
import { renderEmptyState } from '../components/empty-state/empty-state.js';

export function placeholderPage(ctx) {
  const { module, dirName } = ctx;
  const sub = dirName ? ` › ${dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">${module.name}</h2>
      ${dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body">
      ${renderEmptyState({
        iconName: module.icon,
        title: '功能开发中',
        desc: `「${module.name}${sub}」为应用壳占位骨架，接入真实功能后替换此处。`,
      })}
    </div>`;
}
```

- [ ] **Step 4: 建 6 个应用模块**（src/apps/<id>/index.js，每个导出 `module`；order 保持既有左窗顺序）

`src/apps/clipboard/index.js`：
```js
// 剪贴板应用（占位）—— MODULES 契约见 docs/app-integration.md。
// 接入真实功能：把 render 替换为本应用页面渲染函数（可复用框架组件）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'clipboard', name: '剪贴板', icon: 'clipboard', order: 1,
  dir: [
    { id: 'history', name: '历史', icon: 'list' },
    { id: 'pinned', name: '固定', icon: 'pin' },
    { id: 'groups', name: '分组', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

`src/apps/key/index.js`：
```js
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'key', name: '密码', icon: 'key', order: 2,
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'groups', name: '分组', icon: 'folder' },
    { id: 'trash', name: '回收站', icon: 'trash' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

`src/apps/wallet/index.js`：
```js
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'wallet', name: '记账', icon: 'wallet', order: 3,
  dir: [
    { id: 'overview', name: '概览', icon: 'wallet' },
    { id: 'flows', name: '流水', icon: 'list' },
    { id: 'categories', name: '分类', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

`src/apps/search/index.js`：
```js
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'search', name: '搜索', icon: 'search', order: 4,
  dir: [
    { id: 'all', name: '全部', icon: 'search' },
    { id: 'web', name: '网页', icon: 'globe' },
    { id: 'files', name: '文件', icon: 'image' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

`src/apps/help/index.js`：
```js
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'help', name: '帮助', icon: 'help', order: 5,
  dir: [
    { id: 'usage', name: '使用', icon: 'list' },
    { id: 'faq', name: '常见问题', icon: 'help' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

`src/apps/info/index.js`：
```js
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'info', name: '关于', icon: 'info', order: 6,
  dir: [
    { id: 'version', name: '版本', icon: 'box' },
    { id: 'license', name: '许可', icon: 'shield' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

- [ ] **Step 5: 改壳 app-main.js**（删 6 占位模块 + `placeholderPage` 函数 + `renderEmptyState` import；加 homeModule + glob 发现）

在 `const MODULES = [` 处替换（约 32-87 行）为：

```js
// —— MODULES 扩展契约：home 为壳内置概览，其余应用经 glob 自动发现（Task G1）——
// 应用 = src/apps/<id>/index.js 导出 module（id/name/icon/order/dir/render），壳零改动即可新增。
// 应用只能制作自己的页面，禁止修改框架目录（边界见 docs/app-integration.md + check:boundary）。
const homeModule = { id: 'home', name: '概览', icon: 'home', dir: [], render: renderOverview, order: 0 };
const appModules = import.meta.glob('../apps/*/index.js', { eager: true });
const APPS = Object.values(appModules)
  .map((m) => m.module)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99)); // 左窗顺序：home(0) + 应用按 order
const MODULES = [homeModule, ...APPS];
```

同时：
- 删 import：`import { renderEmptyState } from '../components/empty-state/empty-state.js';`（app-main.js 不再用；已移入 scenes/placeholder-page.js）。
- 删 `placeholderPage` 函数（约 761-777 行）。
- `renderOverview` 保留（home 用；其内部 `MODULES.map` 建概览快捷入口，行为不变）。
- 其余 `MODULES` 消费点（左窗 mountNavWheel、renderRight、renderPages、goToModule、navL click 等）**零改动**（`MODULES` 仍是同一数组，仅来源变为 home + glob 应用）。

- [ ] **Step 6: 单测确认绿**

Run: `npx vitest run tests/unit/apps.test.js`
Expected: PASS（modules.length ≥ 6，契约全过）

- [ ] **Step 7: e2e 行为零回归**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js`
Expected: 全绿（左窗 7 模块 / 右键切换 / 概览快捷入口 / 设置模式行为与迁移前一致——order 保持既有顺序）。若某用例依赖左窗顺序/计数，确认 id 与数量不变即可（不应出现真回归）。

- [ ] **Step 8: 全量回归 + 提交**

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/scenes/placeholder-page.js src/apps/ src/app/app-main.js tests/unit/apps.test.js
git commit -m "feat: 应用模块迁至 src/apps/（glob 自动发现，壳零侵入，G1）"
```

> 提交惯例：feat + docs 两枚提交。分支前缀 `ui/`（本任务触 src/app/ 框架）。

---

### Task G2: 边界检查脚本（框架/应用门禁）

**Files:**
- Create: `scripts/boundary-check.js`（纯函数，CLI 与单测共用）
- Create: `scripts/check-boundary.js`（CLI）
- Modify: `package.json`（加 `check:boundary` script）
- Test: `tests/unit/boundary-check.test.js`

**Interfaces:**
- Consumes: G1 的 `src/apps/<id>/` 目录契约
- Produces: `assessBranchChanges(branch, files) → { kind, ok, violations, note }`；npm script `npm run check:boundary [base...head]`—— 后续 git 工作流（G3 + 未来迭代）的合并前门禁

- [ ] **Step 1: 写失败单测**（tests/unit/boundary-check.test.js，新建）

```js
import { describe, it, expect } from 'vitest';
import { assessBranchChanges } from '../../scripts/boundary-check.js';

describe('边界检查（G2：框架/应用门禁）', () => {
  it('应用分支触碰框架文件 → 失败并列出', () => {
    const r = assessBranchChanges('app/ledger/report',
      ['src/apps/ledger/pages.js', 'src/components/button/button.css']);
    expect(r.ok).toBe(false);
    expect(r.violations).toContain('src/components/button/button.css');
    expect(r.kind).toBe('app');
  });
  it('应用分支纯应用内改动 → 通过', () => {
    const r = assessBranchChanges('app/ledger/report',
      ['src/apps/ledger/pages.js', 'src/apps/ledger/ledger.css', 'tests/unit/ledger.test.js', 'docs/app-ledger.md']);
    expect(r.ok).toBe(true);
  });
  it('应用分支触碰其他应用目录 → 失败', () => {
    const r = assessBranchChanges('app/ledger/report', ['src/apps/notes/index.js']);
    expect(r.ok).toBe(false);
  });
  it('应用分支触碰构建配置 → 失败', () => {
    const r = assessBranchChanges('app/ledger/report', ['package.json', 'vite.config.js']);
    expect(r.ok).toBe(false);
  });
  it('ui 框架分支触碰框架 → 通过（标记须全量回归）', () => {
    const r = assessBranchChanges('ui/backgrounds', ['src/components/button/button.css']);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('ui');
  });
  it('未知分支触碰框架 → 失败（按最严格处理）', () => {
    const r = assessBranchChanges('feature/foo', ['src/styles/themes.css']);
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/boundary-check.test.js`
Expected: FAIL（`scripts/boundary-check.js` 不存在）

- [ ] **Step 3: 实现纯函数**（scripts/boundary-check.js，新建）

```js
// 框架/应用边界评估纯函数（Task G2）—— CLI（scripts/check-boundary.js）与单测共用。
// 框架路径（应用禁止触碰）：壳 + 组件 + 样式 + 配置 + 场景 + 展示 + 动效 + 资产 + 构建配置。
export const FRAMEWORK_PREFIXES = [
  'src/components/', 'src/styles/', 'src/config/', 'src/app/',
  'src/scenes/', 'src/demo/', 'src/motion/', 'src/assets/',
];
export const FRAMEWORK_FILE_RE = [/^vite\.config/, /^package\.json/, /^playwright\.config/];

export function assessBranchChanges(branch, files) {
  const appMatch = branch.match(/^app\/([^/]+)\//); // app/<id>/<name>
  const isUi = /^ui\//.test(branch);
  const inFramework = (f) =>
    FRAMEWORK_PREFIXES.some((p) => f.startsWith(p)) || FRAMEWORK_FILE_RE.some((r) => r.test(f));

  if (appMatch) {
    const appId = appMatch[1];
    const allowed = (f) =>
      f.startsWith(`src/apps/${appId}/`) || // 本应用目录
      /^tests\/(unit|e2e)\//.test(f) ||     // 测试
      f.startsWith('docs/');                // 文档
    const violations = files.filter((f) => !allowed(f));
    return {
      kind: 'app',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '应用改动，边界通过' : `应用改动触碰边界外文件 ${violations.length} 个`,
    };
  }

  if (isUi) {
    return { kind: 'ui', ok: true, violations: [], note: '框架改动：须全量回归 + 框架 owner 评审' };
  }

  const violations = files.filter((f) => inFramework(f));
  return {
    kind: 'mixed',
    ok: violations.length === 0,
    violations,
    note: violations.length === 0 ? '非应用/框架前缀分支，边界通过' : '未知分支触碰框架文件',
  };
}
```

- [ ] **Step 4: 实现 CLI**（scripts/check-boundary.js，新建）

```js
#!/usr/bin/env node
// 边界检查 CLI（Task G2）：检查当前分支改动是否越界（框架/应用）。
// 用法：node scripts/check-boundary.js [base...head]
// 默认范围：dev 存在则 dev...HEAD，否则 main...HEAD。
import { execSync } from 'node:child_process';
import { assessBranchChanges } from './boundary-check.js';

function defaultRange() {
  try {
    execSync('git rev-parse --verify dev', { stdio: 'ignore' });
    return 'dev...HEAD';
  } catch {
    return 'main...HEAD';
  }
}

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const range = process.argv[2] || defaultRange();
const files = execSync(`git diff --name-only ${range}`).toString().trim().split('\n').filter(Boolean);
const result = assessBranchChanges(branch, files);

if (result.ok) {
  console.log(`[${branch}] ✓ ${result.note}`);
} else {
  console.error(`[${branch}] ✗ ${result.note}`);
  result.violations.forEach((f) => console.error('  ' + f));
  process.exit(1);
}
```

- [ ] **Step 5: package.json 加 script**

在 `scripts` 加：`"check:boundary": "node scripts/check-boundary.js",`

- [ ] **Step 6: 单测确认绿 + CLI 冒烟**

Run: `npx vitest run tests/unit/boundary-check.test.js` → PASS
冒烟（当前分支为 `ui/`）：`npm run check:boundary main...HEAD` —— 应输出 `✓ 框架改动：须全量回归 + 框架 owner 评审`（kind=ui，exit 0）；再用单测覆盖的样本验证 `app/<id>/` 分支语义（单测已断言）。

- [ ] **Step 7: 全量回归 + 提交**

Run: `npm test`（全量，含新单测）→ 全绿；`npm run build`

```bash
git add scripts/boundary-check.js scripts/check-boundary.js package.json tests/unit/boundary-check.test.js
git commit -m "feat: 框架/应用边界检查脚本（npm run check:boundary，G2）"
```

> 提交惯例：feat + docs 两枚提交。分支前缀 `ui/`（本任务触 scripts/package.json 框架）。

---

### Task G3: dev 分支工作流 + CLAUDE.md 红线 + 手册同步

**Files:**
- Modify: `CLAUDE.md`（根：加「开发模式与边界」铁律）
- Modify: `docs/CLAUDE.md`（加边界/check:boundary 提及）
- Modify: `docs/app-integration.md`（§1 更新为 `src/apps/<id>/` glob 结构 + 边界红线）
- Git: 建 `dev` 分支（从 main 检出）

**Interfaces:**
- Consumes: G1 的 `src/apps/` 结构、G2 的 `npm run check:boundary`
- Produces: `dev` 分支（后续 `ui/*`、`app/<id>/*` 从 dev 检出）；CLAUDE.md 固化边界红线；手册指向新结构 —— 开发模式正式生效

- [ ] **Step 1: 建 dev 分支**

```bash
git checkout main
git checkout -b dev
git checkout main   # 回到 main；后续特性分支从 dev 检出
git branch --list dev
```
Expected: `dev` 存在（指向 main 当前 HEAD）。

- [ ] **Step 2: 根 CLAUDE.md 加铁律**

在「## 核心铁律」末尾追加：

```markdown
- **开发模式与边界（框架 vs 应用）**：UI 框架（`src/components|styles|config|app|scenes|demo|motion|assets`）如需修改只能**单独修改**（`ui/` 分支，全量回归 + 框架 owner 评审）；应用（`src/apps/<id>/`）只能制作自己的页面，**禁止修改框架目录**，合并前必跑 `npm run check:boundary`。详规：`docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`；git 走 main + dev 双分支（`ui/*`、`app/<id>/*` 从 dev 检出）。
```

- [ ] **Step 3: docs/CLAUDE.md 加提及**

在「## 任务执行规范」末尾追加：

```markdown
- **边界门禁**：应用任务合并前跑 `npm run check:boundary`（禁触框架目录）；框架任务须全量回归 + 框架 owner 评审。设计规格：`docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`。
```

- [ ] **Step 4: 手册 §1 更新为 glob 结构 + 边界红线**

`docs/app-integration.md` 的 §1 段落改为（含 0 接入模型下方补边界红线）：

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

（若 §1 现文以「往 MODULES 数组加一项」开头，则整段替换为上述；§2.3 的「壳自动做的事」末尾补一句「新增应用只改 src/apps/ 目录」。）

- [ ] **Step 5: 提交 + 验证**

```bash
git add CLAUDE.md docs/CLAUDE.md docs/app-integration.md
git commit -m "docs: 开发模式边界红线固化（CLAUDE.md）+ 手册同步 glob 应用结构；建 dev 分支（G3）"
```

验证：`git branch --list dev` 存在；`npm run check:boundary main...HEAD`（当前分支为 main，应输出 `✓ 非应用/框架前缀分支，边界通过` 或按实现输出）。

---

## 执行交接指引（给实施会话）

1. **起点**：main（含 G1 前代码 + 规格）检出分支。G1/G2 为框架改动 → `ui/` 前缀分支；G3 建 dev + docs。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报 → 派发（G1 集成 sonnet / G2 集成 sonnet / G3 机械 haiku）→ 报告 → 审查包 → 评审 → 修复循环 → 账本 `docs/superpowers/sdd/progress-governance.md` 留痕。
3. **铁律**：任务间禁止并行派发实施子代理；控制器不改码；每任务独立评审；测试仅 Web 环境；每任务结束全量回归绿（e2e 用 worktree 配置）。
4. **已知注意**：
   - G1 迁移必须**保持左窗顺序**（home 0 + 应用 order 1-6）与 id 不变，否则 app-shell e2e 依赖序/计数的用例会误红；`renderOverview` 保留在 app-main.js（home 用），`placeholderPage` 移到 `src/scenes/`。
   - G2 的 `assessBranchChanges` 为纯函数（CLI 与单测共用）；框架文件正则覆盖 `vite.config.*`/`package.json`/`playwright.config.*`；`app/<id>/*` 分支允许的改动 = 本应用目录 + tests + docs。
   - G3 建 `dev` 分支是 git 操作（从 main 检出）；CLAUDE.md/docs 修改随提交。
   - e2e 冷启动 flake 隔离重跑绿即接受。
5. **完成后**：最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 建 dev（若 G3 未建）→ 合并后全量回归；用户目检（应用壳视觉与迁移前一致）。
