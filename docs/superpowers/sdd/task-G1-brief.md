# Task G1: MODULES 迁移到 src/apps/ + 壳 glob 自动发现

> 源：docs/superpowers/plans/2026-08-09-app-shell-dev-governance.md（Task G1）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md（§2 目录契约 / §3 应用契约，唯一需求源）

## 任务目标

把 `src/app/app-main.js` 内联的 MODULES 数组（7 个模块）重构为「壳内置 home + glob 自动发现应用」：6 个占位应用（clipboard/key/wallet/search/help/info）迁移到 `src/apps/<id>/index.js`（各导出 `module = { id, name, icon, order, dir, render }`），壳用 `import.meta.glob('../apps/*/index.js', { eager: true })` 编译期发现。**行为零回归**（左窗 7 模块顺序与 id 不变）。

## Global Constraints（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，本地不入库）。
- **行为零回归**：迁移后既有 app-shell e2e（左窗 7 模块 / 右键切换 / 概览快捷入口）+ 单测全绿；视觉基线零变化。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 材质体系/色板/令牌不动；`--font-mono` 不动。
- 提交前 `npm run build`；任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。
- 已知环境怪癖：Vitest 重写测试内 `import.meta.url`（经它定位文件路径属环境怪癖，勿判缺陷）。

## Files

- Create: `src/scenes/placeholder-page.js`（从 app-main.js 移出占位页骨架）
- Create: `src/apps/clipboard/index.js`、`src/apps/key/index.js`、`src/apps/wallet/index.js`、`src/apps/search/index.js`、`src/apps/help/index.js`、`src/apps/info/index.js`
- Modify: `src/app/app-main.js`（删 6 个占位模块 + `placeholderPage` + `renderEmptyState` import；加 `homeModule` + glob 发现）
- Test: `tests/unit/apps.test.js`（新建，应用模块契约守卫）

## Interfaces

- Consumes: 既有 `renderEmptyState`（components/empty-state）、`renderOverview`（app-main.js 保留）
- Produces: `src/apps/<id>/index.js` 导出 `module = { id, name, icon, order, dir, render }`；壳 `MODULES = [homeModule, ...APPS]`（order 排序，home=0，应用 1-6 保持既有左窗顺序）—— G2 边界脚本依赖此目录结构

---

## 实施步骤（TDD）

### Step 1: 写失败单测（tests/unit/apps.test.js，新建）

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

### Step 2: 运行确认红

Run: `npx vitest run tests/unit/apps.test.js`
Expected: FAIL（`src/apps/*` 不存在，modules.length 为 0）

### Step 3: 建占位页场景模板（src/scenes/placeholder-page.js，新建；内容从 app-main.js 的 `placeholderPage` 移出）

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

### Step 4: 建 6 个应用模块（src/apps/<id>/index.js，每个导出 `module`；order 保持既有左窗顺序）

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

### Step 5: 改壳 app-main.js（删 6 占位模块 + `placeholderPage` 函数 + `renderEmptyState` import；加 homeModule + glob 发现）

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

### Step 6: 单测确认绿

Run: `npx vitest run tests/unit/apps.test.js`
Expected: PASS（modules.length ≥ 6，契约全过）

### Step 7: e2e 行为零回归

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js`
Expected: 全绿（左窗 7 模块 / 右键切换 / 概览快捷入口 / 设置模式行为与迁移前一致——order 保持既有顺序）。若某用例依赖左窗顺序/计数，确认 id 与数量不变即可（不应出现真回归）。

### Step 8: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`

```bash
git add src/scenes/placeholder-page.js src/apps/ src/app/app-main.js tests/unit/apps.test.js
git commit -m "feat: 应用模块迁至 src/apps/（glob 自动发现，壳零侵入，G1）"
```

> 提交惯例：feat + docs 两枚提交。分支前缀 `ui/`（本任务触 src/app/ 框架）。
