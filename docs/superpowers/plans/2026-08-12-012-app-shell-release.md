# 0.1.2 应用壳发布实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 0.1.2 发版前置——应用清单重整（去 6 增 6 + 设置内置条目）、设置页关于分区接入远端信息、入口可排序/可隐藏（导航管理）。

**Architecture:** 单一 `ui/012-release` 分支顺序完成 6 个任务（应用清单 → 设置内置模块 → 关于页 → 导航配置链路 → 导航管理 UI → e2e/基线连带），全量回归 + owner 评审后合 dev；Task 7 走 `npm run release -- minor` 发版。核心新增：`src/config/nav.js` 纯函数（`resolveNav`）+ `nav` 配置三件套 + 壳 `rebuildNav` 响应式。全部零运行时依赖。

**Tech Stack:** Node (Vite/Vitest/Playwright)、纯原生 Web、git worktree。

## Global Constraints

- 规格：`docs/superpowers/specs/2026-08-12-012-app-shell-release-design.md`（权威需求源）。
- **零运行时依赖**；禁止升级核心依赖；遵循 `src/AGENTS.md` 既有风格（图标经 `icon()`、动画红线、配置链路三件套）。
- **测试仅 Web 环境**：逻辑改动 Vitest 单测，交互改动 Playwright（e2e 用 `--config=playwright.config.worktree.js`，端口 5174）。
- **每提交前 `npm run build`**；逻辑改动 TDD（红→绿→提交）。
- 分支 `ui/012-release` 从 dev 检出；`check:boundary` 对 `ui/` 放行 + 标 owner 评审。
- 提交信息中文、前缀 `feat:`/`fix:`/`docs:`/`chore:`，匹配仓库风格。
- 视觉基线在 Task 6 一次性重生成（模块集变化），确认由本次改动引起。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/apps/{clipboard,wallet,ledger,search,help,info}/` | 删除 | 被去除的应用 |
| `src/apps/{memo,sync,notes,knowledge,assistant,account}/index.js` | 创建 | 新增占位应用 |
| `src/apps/{key,token-tool}/index.js` | 修改 | order 顺延（2→1、7→2） |
| `src/app/app-main.js` | 修改 | settingsModule 内置 + resolveNav 接线 + rebuildNav + 设置选中态 |
| `src/config/defaults.js` | 修改 | DEFAULTS 加 `nav: { order: [], hidden: [] }` |
| `src/config/nav.js` | 创建 | `resolveNav(all, nav)` 纯函数（过滤+排序） |
| `src/scenes/settings-window/settings-pages.js` | 修改 | SECTIONS 加 nav 分区 + pageBody + aboutPage 远端 + data-open-source |
| `tests/unit/nav.test.js` | 创建 | resolveNav 用例（隐藏/排序/回退） |
| `tests/e2e/app-shell.spec.js` | 修改 | clipboard→key + 设置分区计数 10→11 + nth 偏移 |
| `tests/e2e/mobile-nav.spec.js` | 修改 | clipboard→key |
| `tests/e2e/customizer.spec.js` | 修改 | 外观 nth(1)→data-id |
| `tests/e2e/visual-regression.spec.js` | 修改 | SHOTS 分区序号偏移 + 设置计数 10→11 + app-main 基线重生成 |
| `docs/integration/app-integration.md` | 修改 | 应用清单/设置条目/导航管理契约补丁（Task 6） |

**Task 间接口：**
- `resolveNav(allModules, nav)` → `Array<module>`（`src/config/nav.js`，导出；`nav` = `{ order: string[], hidden: string[] }`）。
- `app-main.js` 导出 `getNavModules()`（返回当前 `MODULES`）供 overview/settings 挂载用（不导出则不跨模块依赖）。
- `settings-pages.js` 的 `pageBody('nav')` 返回空容器 `<div class="app-partition" data-partition="nav"></div>`（与 components/motion 同模式），由 app-main 惰性填充。

---

### Task 1: 应用清单重整（删 6 增 6 + order 归位）+ e2e 引用修复

**Files:**
- Delete: `src/apps/clipboard/` `src/apps/wallet/` `src/apps/ledger/` `src/apps/search/` `src/apps/help/` `src/apps/info/`
- Create: `src/apps/{memo,sync,notes,knowledge,assistant,account}/index.js`
- Modify: `src/apps/key/index.js`（order 2→1）、`src/apps/token-tool/index.js`（order 7→2）
- Modify: `tests/e2e/app-shell.spec.js`、`tests/e2e/mobile-nav.spec.js`

**Interfaces:**
- Consumes: 无（纯应用注册）
- Produces: `src/apps/` 共 8 个应用（order 唯一 1-8）；e2e 不再引用被删应用

- [ ] **Step 1: 删除 6 个被去除应用目录**

Run:
```bash
git rm -r src/apps/clipboard src/apps/wallet src/apps/ledger src/apps/search src/apps/help src/apps/info
```

- [ ] **Step 2: 创建 6 个新占位应用**（模板，每文件替换 `<id>/<name>/<icon>/<n>/<dirId1>/<dirName1>/<dirId2>/<dirName2>`）

`src/apps/memo/index.js`（智能备忘，order 3，dir 全部/归档）：
```js
// 智能备忘应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'memo', name: '智能备忘', icon: 'edit', order: 3,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```
`src/apps/sync/index.js`（远端同步，order 4，dir 全部/历史）：
```js
// 远端同步应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'sync', name: '远端同步', icon: 'refresh', order: 4,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'history', name: '历史', icon: 'refresh' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```
`src/apps/notes/index.js`（牛马笔记，order 5，dir 全部/归档）：
```js
// 牛马笔记应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'notes', name: '牛马笔记', icon: 'list', order: 5,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```
`src/apps/knowledge/index.js`（知识库，order 6，dir 全部/收藏）：
```js
// 知识库应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'knowledge', name: '知识库', icon: 'globe', order: 6,
  dir: [
    { id: 'all', name: '全部', icon: 'globe' },
    { id: 'favorite', name: '收藏', icon: 'star' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```
`src/apps/assistant/index.js`（小助理，order 7，dir 会话/配置）：
```js
// 小助理应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'assistant', name: '小助理', icon: 'sparkles', order: 7,
  dir: [
    { id: 'chat', name: '会话', icon: 'message' },
    { id: 'config', name: '配置', icon: 'settings' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```
`src/apps/account/index.js`（账本，order 8，dir 全部/归档）：
```js
// 账本应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'account', name: '账本', icon: 'wallet', order: 8,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

> 图标 `message` 在 `src/components/icon/icon.js` PATHS 中**不存在**（既有 47 个含 `help` 无 `message`）。将 assistant 的 `chat` 图标改为 `help`（圆问号，语义相近）：`{ id: 'chat', name: '会话', icon: 'help' }`。其余图标（edit/refresh/list/globe/sparkles/wallet/star/folder/settings）均在 PATHS 中，无需新增。

- [ ] **Step 3: 归位保留应用 order**

`src/apps/key/index.js`：`order: 2,` → `order: 1,`
`src/apps/token-tool/index.js`：`order: 7,` → `order: 2,`

- [ ] **Step 4: 运行单测确认 apps 契约绿**

Run: `npx vitest run tests/unit/apps.test.js`
Expected: 8 个应用，id 唯一、order 唯一（1-8），`modules.length >= 6` 通过。

- [ ] **Step 5: 修 e2e 引用（clipboard → key）**

`tests/e2e/app-shell.spec.js` 全局替换（bash 逐条）：
```
1. `.app-main__nav-l .c-navwheel__item[data-id="clipboard"]` → `.app-main__nav-l .c-navwheel__item[data-id="key"]`（12 处：31/46/56/60/67/78/101/175/223/229/249/261）
2. `data-page="clipboard"` → `data-page="key"`（3 处：39/122/180）
3. `toContainText('剪贴板')` → `toContainText('密码')`（2 处：40/181）
4. `.c-navwheel__item')).toContainText(['历史', '固定', '分组'])` → `(['全部', '分组'])`（:36，key 目录）
5. 右窗 `[data-id="history"]` → `[data-id="all"]`、`[data-id="pinned"]` → `[data-id="groups"]`（81/87/104/243/265）
6. ctx `'剪贴板 › 历史'` → `'密码 › 全部'`、`'剪贴板 › 固定'` → `'密码 › 分组'`、`'剪贴板'` → `'密码'`（102/268）
7. `.app-main__shortcut[data-shortcut="clipboard"]` → `[data-shortcut="key"]`（:119）
```
`tests/e2e/mobile-nav.spec.js`：
```
8. `.app-main__dock .c-navwheel__item[data-id="clipboard"]` → `[data-id="key"]`（34/48/62）
```

**特殊：`换应用` 测试（:75-93）**——原为 clipboard→key 两应用切换，现在两者都指向 key。改写为 **key→memo**（两不同应用）：
```js
test('换应用：右窗目录内容切换（不收起）', async ({ page }) => {
  await page.goto(APP_URL);
  // 密码（目录：全部/分组）
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(2);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="all"]')).toHaveCount(1);
  // 换到智能备忘（目录：全部/归档）→ 右窗保持展开，目录内容切换
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="memo"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(2);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="all"]')).toHaveCount(0);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="archived"]')).toHaveCount(1);
  // 内容区切到智能备忘页
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'memo');
  await expect(active).toContainText('智能备忘');
});
```

- [ ] **Step 6: 跑受影响 e2e 确认绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js`
Expected: 全绿（左窗 9 项：home + 8 应用）。

- [ ] **Step 7: build + 提交**

```bash
npm run build
git add -A src/apps tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js
git commit -m "feat: 应用清单重整（去剪贴板/记账×2/搜索/帮助/关于，增 6 占位 + key/token-tool order 归位）"
```

---

### Task 2: 设置内置模块（壳）

**Files:**
- Modify: `src/app/app-main.js`

**Interfaces:**
- Consumes: Task 1 后的 8 应用 + home
- Produces: `MODULES = [home, ...APPS, settingsModule]`；`onLeftSelect('settings')` 触发设置模式；设置模式激活时左窗高亮「设置」；概览快捷卡 `settings` 触发设置模式

- [ ] **Step 1: 增加 settingsModule 并入 MODULES 组装**

`src/app/app-main.js` 在 `homeModule` 定义后加：
```js
// 0.1.2：设置内置模块（非 app 目录）—— 左窗点选 = 触发设置模式（等同标题栏 ⚙）
const settingsModule = { id: 'settings', name: '设置', icon: 'settings', order: 9, dir: [], special: 'settings' };
```
`MODULES` 组装改为：
```js
const MODULES = [homeModule, ...APPS, settingsModule];
```
（保持既有 glob + `APPS` sort 逻辑不变，settingsModule 追加尾部。）

- [ ] **Step 2: 左窗选中 settings 触发设置模式**

在 `onLeftSelect`（现 `if (id !== state.moduleId) setModule(id);`）前加：
```js
if (id === 'settings') { setSettingsMode(); return; }
```
并在 `setSettingsMode()` 内追加左窗高亮同步：`leftWheel.setActive('settings');`。

`goToModule`（概览快捷入口）无需改——它 scrollToIndex 左窗 → onChange → `onLeftSelect('settings')` → 触发设置模式。

- [ ] **Step 3: 概览快捷卡渲染包含 settings**

`renderOverview()` 的 `MODULES.map` 已含 settingsModule（MODULES 含它），快捷卡自动出现；`goToModule('settings')` 走 Step 2 路径。

- [ ] **Step 4: 设置模式退出时左窗高亮恢复**

在 `exitSettingsMode()` / `collapseRight()`（设置模式分支）内加：`leftWheel.setActive(state.moduleId);`（恢复应用选中态）。

- [ ] **Step 5: 验证 + 提交**

Run: `npm run build` + `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js`
Expected: 绿（左窗 10 项含设置；既有设置模式用例不受影响）。
```bash
git add src/app/app-main.js
git commit -m "feat: 设置内置模块（左窗点选=触发设置模式，等同标题栏 ⚙）"
```

---

### Task 3: 关于页远端信息

**Files:**
- Modify: `src/scenes/settings-window/settings-pages.js`

**Interfaces:**
- Consumes: 无
- Produces: `aboutPage()` 显示仓库地址；`[data-open-source]` 按钮打开真实远端

- [ ] **Step 1: aboutPage 补仓库地址行**

`aboutPage()` 的 `.csettings__meta` 内追加一行：
```js
<div class="csettings__row"><span>仓库</span><span>github.com/PomDetom/EvolveOS</span></div>
```

- [ ] **Step 2: 开源按钮接真实 URL**

`mountSettingsInteractions` 末尾，替换 :280-282 占位 toast：
```js
root.querySelector('[data-open-source]')?.addEventListener('click', () => {
  window.open('https://github.com/PomDetom/EvolveOS', '_blank');
});
```

- [ ] **Step 3: 验证 + 提交**

Run: `npm run build`；手动/现有 e2e 关于用例（`设置→关于：应用信息卡渲染`）确认 `csettings__ver` 仍绿。
```bash
git add src/scenes/settings-window/settings-pages.js
git commit -m "feat: 关于分区接真实远端仓库（地址行 + 开源按钮打开仓库）"
```

---

### Task 4: 导航配置链路 + resolveNav 纯函数（壳响应式）

**Files:**
- Create: `src/config/nav.js`
- Create: `tests/unit/nav.test.js`
- Modify: `src/config/defaults.js`
- Modify: `src/app/app-main.js`

**Interfaces:**
- Consumes: Task 2 的 `MODULES`（home+apps+settings）
- Produces: `resolveNav(allModules, nav)`（`src/config/nav.js` 导出）；`app-main` 的 `rebuildNav()` + `getNavModules()`

- [ ] **Step 1: 写失败测试**（`tests/unit/nav.test.js`）

```js
import { it, expect } from 'vitest';
import { resolveNav } from '../../src/config/nav.js';

const M = (id, order) => ({ id, name: id, icon: 'box', order, dir: [], render: () => '' });

it('resolveNav：hidden 过滤', () => {
  const all = [M('home', 0), M('a', 1), M('b', 2)];
  expect(resolveNav(all, { order: [], hidden: ['a'] }).map((m) => m.id)).toEqual(['home', 'b']);
});
it('resolveNav：空 order/hidden → 按 module.order', () => {
  const all = [M('home', 0), M('a', 1), M('b', 2)];
  expect(resolveNav(all, { order: [], hidden: [] }).map((m) => m.id)).toEqual(['home', 'a', 'b']);
});
it('resolveNav：nav.order 中的按列表位置优先，未列入的按 module.order 跟随', () => {
  const all = [M('home', 0), M('a', 1), M('b', 2), M('c', 3)];
  const nav = { order: ['c', 'a'], hidden: [] };
  expect(resolveNav(all, nav).map((m) => m.id)).toEqual(['c', 'a', 'home', 'b']);
});
it('resolveNav：默认 nav（undefined）等价空配置', () => {
  const all = [M('a', 1), M('b', 2)];
  expect(resolveNav(all, undefined).map((m) => m.id)).toEqual(['a', 'b']);
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/nav.test.js`
Expected: FAIL（`src/config/nav.js` 不存在，import 报错）

- [ ] **Step 3: 实现 resolveNav**（`src/config/nav.js`）

```js
// 入口导航解析纯函数（0.1.2）：过滤隐藏 + 按 nav.order 排序。
// nav.order 中的 id 按其列表位置排；未列入的按 1000 + module.order 跟随（用户排序项优先）。
export function resolveNav(allModules, nav) {
  const hidden = new Set(nav?.hidden ?? []);
  const order = nav?.order ?? [];
  const visible = allModules.filter((m) => !hidden.has(m.id));
  const rank = (m) => {
    const i = order.indexOf(m.id);
    return i === -1 ? 1000 + (m.order ?? 99) : i;
  };
  return [...visible].sort((a, b) => rank(a) - rank(b));
}
```

- [ ] **Step 4: 运行确认绿**

Run: `npx vitest run tests/unit/nav.test.js`
Expected: 全绿（4 用例）

- [ ] **Step 5: defaults 加 nav 配置**

`src/config/defaults.js` DEFAULTS 追加：
```js
  nav: { order: [], hidden: [] }, // 0.1.2 入口排序/隐藏（功能性配置，非样式参数，不入 apply）
```

- [ ] **Step 6: 壳接线（resolveNav + rebuildNav）**

`src/app/app-main.js`：
1. import：`import { resolveNav } from '../config/nav.js';`
2. `const MODULES = [homeModule, ...APPS, settingsModule];` → 改为运行时解析：
```js
let MODULES = resolveNav([homeModule, ...APPS, settingsModule], getConfig().nav);
```
3. 新增响应式函数：
```js
// 0.1.2 导航响应式：nav 配置变更 → 重排左窗 + 手机 dock + 概览快捷卡（设置内容不重渲）
function rebuildNav() {
  MODULES = resolveNav([homeModule, ...APPS, settingsModule], getConfig().nav);
  // 重挂左窗轮（destroy 旧轮防 ResizeObserver 泄漏）
  leftWheel?.destroy?.();
  leftWheel = mountNavWheel(navL, {
    items: MODULES.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
    onChange: (item) => onLeftSelect(item.id),
    anchorRatio: 0.382,
  });
  // 若设置模式激活，左窗高亮 settings；否则保持当前 moduleId
  leftWheel.setActive(state.rightMode === 'settings' ? 'settings' : state.moduleId);
  // 手机 dock 重建（若已挂载）
  if (dockMounted) mountDock(true); // dockMounted 重置 + 重挂
  // 概览页重渲（若当前显示概览）
  if (state.moduleId === 'home' && state.rightMode !== 'settings') renderPages();
}
```
4. 订阅 nav 变更（仅 nav 变化才重建，避免主题切换也重建左窗）：
```js
let lastNav = JSON.stringify(getConfig().nav ?? {});
subscribe((cfg) => {
  const navJson = JSON.stringify(cfg.nav ?? {});
  if (navJson !== lastNav) { lastNav = navJson; rebuildNav(); }
});
```
5. `const leftWheel = mountNavWheel(...)` → 改为 `let leftWheel = ...`（供 rebuildNav 重赋值 + destroy）；`dockMounted` 逻辑适配（`mountDock(force)` 参数：`if (dockMounted && !force) return; dockMounted = true;`）。

> 说明：`navL` 为左窗容器（`root.querySelector('.app-main__nav-l .c-navwheel__list')`），在 `mountAppMode` 作用域内可用。`rebuildNav` 定义于 `mountAppMode` 内部。

- [ ] **Step 7: 验证 + 提交**

Run: `npx vitest run tests/unit/nav.test.js`（4 绿）+ `npm run build` + `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js`
Expected: 绿（默认 nav 空 → 左窗序 home/key/token-tool/memo/sync/notes/knowledge/assistant/account/settings，10 项）。
```bash
git add src/config/nav.js src/config/defaults.js src/app/app-main.js tests/unit/nav.test.js
git commit -m "feat: 入口导航配置链路（nav {order,hidden} + resolveNav 纯函数 + 壳 rebuildNav 响应式）"
```

---

### Task 5: 设置「导航」分区 UI + 概览管理入口

**Files:**
- Modify: `src/scenes/settings-window/settings-pages.js`
- Modify: `src/app/app-main.js`

**Interfaces:**
- Consumes: Task 4 的 `resolveNav`/`getConfig().nav`；Task 2 的 `setSettingsSection('nav')`
- Produces: SECTIONS 加 `nav` 分区（APP_SECTIONS 10→11）；导航管理列表交互（上移/下移/隐藏）；概览「管理入口」卡

- [ ] **Step 1: SECTIONS 加 nav 分区**

`settings-pages.js` `SECTIONS` 数组在 `general` 后插入：
```js
  { id: 'nav', name: '导航', icon: 'layout' },
```
（`APP_SECTIONS` 自动变 11 项：9 共享 + 组件 + 动效。）

- [ ] **Step 2: pageBody 加 nav 容器**

`pageBody` switch 加：
```js
    case 'nav':       return `<div class="app-partition" data-partition="nav"></div>`;
```
（与 components/motion 同模式，内容由 app-main 惰性填充。）

- [ ] **Step 3: app-main 挂载导航管理列表**

`app-main.js`：`setSettingsPageActive()` 内加惰性挂载分支（与 custMounted/componentsMounted 同模式）：
```js
let navMounted = false;
// 在 setSettingsPageActive 内：
if (state.settingsId === 'nav' && !navMounted) {
  navMounted = true;
  mountNavPartition(sec.querySelector('[data-page="nav"] [data-partition="nav"]'));
}
```
新增 `mountNavPartition(container)`（定义于 `mountAppMode` 内，可访问 `MODULES`/`saveConfig`）：
```js
function mountNavPartition(container) {
  const cfg = getConfig();
  const nav = cfg.nav ?? { order: [], hidden: [] };
  const hidden = new Set(nav.hidden ?? []);
  const visibleCount = MODULES.filter((m) => !hidden.has(m.id)).length;
  container.innerHTML = `
    <div class="csettings__nav">
      <div class="csettings__field-desc">调整入口顺序与显示。至少保留 1 个可见入口。</div>
      <div class="csettings__nav-list" data-nav-mgmt>
        ${MODULES.map((m, i) => {
          const isHidden = hidden.has(m.id);
          const canHide = visibleCount > 1 || !isHidden; // 最后一个可见不可隐藏
          return `
          <div class="csettings__nav-row" data-nav-id="${m.id}" data-hidden="${isHidden}">
            <span class="csettings__nav-icon">${icon(m.icon, 16)}</span>
            <span class="csettings__nav-name">${m.name}</span>
            <span class="csettings__nav-actions">
              <button type="button" class="csettings__nav-btn" data-nav-move="up" ${i === 0 ? 'disabled' : ''}>${icon('chevron-up', 14)}</button>
              <button type="button" class="csettings__nav-btn" data-nav-move="down" ${i === MODULES.length - 1 ? 'disabled' : ''}>${icon('chevron-down', 14)}</button>
              <button type="button" class="csettings__nav-btn csettings__nav-hide" data-nav-hide ${canHide ? '' : 'disabled'}>${icon(isHidden ? 'eye' : 'eye-off', 14)}</button>
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  container.querySelector('[data-nav-mgmt]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav-move],[data-nav-hide]');
    if (!btn) return;
    const row = btn.closest('[data-nav-id]');
    const id = row.dataset.navId;
    const nav = getConfig().nav ?? { order: [], hidden: [] };
    const order = [...(nav.order ?? [])];
    const hidden = [...(nav.hidden ?? [])];
    // 当前可见顺序 = resolveNav(MODULES, nav) 的 id
    const current = resolveNav(MODULES, nav).map((m) => m.id);
    if (btn.dataset.navMove === 'up' || btn.dataset.navMove === 'down') {
      const i = current.indexOf(id);
      const j = btn.dataset.navMove === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= current.length) return;
      [current[i], current[j]] = [current[j], current[i]];
      saveConfig({ nav: { order: current, hidden } });
    } else if (btn.dataset.navHide !== undefined) {
      if (hidden.includes(id)) hidden.splice(hidden.indexOf(id), 1);
      else hidden.push(id);
      saveConfig({ nav: { order, hidden } });
    }
  });
}
```
> 图标 `eye`/`eye-off` 需确认存在：PATHS 含 `eye`（:50 读到），`eye-off` **不在** 47 个中。隐藏开关统一用 `eye`（隐藏态加 `--off` 类 + title「显示」/「隐藏」），不新增图标。

> `saveConfig` 需在 `app-main.js` 作用域内可用（已 import）。`resolveNav`/`icon` 已 import。

- [ ] **Step 4: 概览「管理入口」卡**

`renderOverview()` 的 `.app-main__shortcuts` 卡片追加一张管理卡（点击跳设置导航分区）：
```js
<button class="app-main__shortcut" data-shortcut="__nav-mgmt__">
  ${icon('layout', 20)}
  <span class="app-main__shortcut-name">管理入口</span>
</button>
```
`pagesEl` click 委托（现处理 `.app-main__shortcut` → `goToModule`）加分支：
```js
if (card.dataset.shortcut === '__nav-mgmt__') { setSettingsMode(); setSettingsSection('nav'); return; }
```
> `setSettingsSection` 已是 `mountAppMode` 内函数。`data-shortcut="__nav-mgmt__"` 不进 `MODULES`，与真实应用快捷卡区分。

- [ ] **Step 5: 同步 e2e 设置分区计数（10→11）+ customizer 外观定位**

`tests/e2e/app-shell.spec.js`：4 处 `toHaveCount(10)`（设置右窗目录 :137/173/255/278）→ `toHaveCount(11)`；`:280` 注释 APP_SECTIONS 序更新（通用0/导航1/外观2/...）；`:282` `nth(8)`（组件）→ `nth(9)`；`:287` `nth(9)`（动效）→ `nth(10)`；`:691` `nth(7)`（关于）→ `nth(8)`。
`tests/e2e/customizer.spec.js`：3 处 `nth(1)`（外观 :49/58/81）→ `[data-id="appearance"]`。

- [ ] **Step 6: 验证 + 提交**

Run: `npm run build` + `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/customizer.spec.js`
Expected: 全绿（11 分区计数 + 导航分区功能）。
```bash
git add src/scenes/settings-window/settings-pages.js src/app/app-main.js tests/e2e/app-shell.spec.js tests/e2e/customizer.spec.js
git commit -m "feat: 设置「导航」分区（入口排序/隐藏管理）+ 概览管理入口 + e2e 11 分区计数"
```

---

### Task 6: e2e 连带更新 + 视觉基线重生成

**Files:**
- Modify: `tests/e2e/app-shell.spec.js`、`tests/e2e/mobile-nav.spec.js`（若涉及）、`tests/e2e/customizer.spec.js`、`tests/e2e/visual-regression.spec.js`
- Modify: `docs/integration/app-integration.md`

**Interfaces:**
- Consumes: Task 2（设置模块）+ Task 5（导航分区）
- Produces: e2e 全绿（11 分区 + 新应用集）；视觉基线更新

- [ ] **Step 1: visual-regression SHOTS 偏移 + 计数**

`tests/e2e/visual-regression.spec.js`：
- SHOTS appearance 分区 `1`→`2`（:19）、components `8`→`9`（:20）、motion `9`→`10`（:21）、buttons `8`→`9`（:24）
- 右窗计数 `toHaveCount(10)` → `toHaveCount(11)`（:49）

- [ ] **Step 2: 重生成 app-main 视觉基线**

Run:
```bash
npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js -g "app-main" --update-snapshots
```
Expected: 6 张 app-main PNG 重生成（左窗 8→10 项、概览快捷卡变化）。确认 git diff 仅 app-main 6 张。

- [ ] **Step 3: 全量受影响 e2e 绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/customizer.spec.js tests/e2e/visual-regression.spec.js`
Expected: 全绿。

- [ ] **Step 4: 更新接入指南**

`docs/integration/app-integration.md`：
- §1 边界红线补「0.1.2 起应用清单/设置内置模块/导航管理见 `docs/superpowers/specs/2026-08-12-012-app-shell-release-design.md`」。
- §2.1 字段表 `order` 行补注：「0.1.2 起左窗排序可被 `nav.order` 覆盖、`nav.hidden` 隐藏」。

- [ ] **Step 5: build + 提交**

```bash
npm run build
git add -A tests/e2e docs/integration/app-integration.md
git commit -m "fix: e2e 连带（视觉 SHOTS 偏移）+ app-main 基线重生成 + 接入指南补丁"
```

---

### Task 7: 0.1.2 发版

**Files:**
- Modify: `package.json` / `Cargo.toml` / `tauri.conf.json` / `CHANGELOG.md`（经 `npm run release`）

**Interfaces:**
- Consumes: Task 1-6 全部合入 dev 且 dev 全量回归绿
- Produces: `v0.1.2` tag + main 同步

- [ ] **Step 1: 全量回归（门点）**

Run: `npm test` + `npx playwright test --config=playwright.config.worktree.js` + `npm run build`
Expected: 全绿（单测含 nav.test.js；e2e 全量含视觉；已知冷启动/惰性挂载 flake 隔离复跑绿即接受）。

- [ ] **Step 2: 发版**

Run: `npm run release -- minor`（bump 0.1.1→0.1.2 + CHANGELOG + test+build 门禁 + 提交）。
Expected: 提交 `release: v0.1.2`。

- [ ] **Step 3: dev→main**

Run: `git checkout main && git merge --no-ff dev` + `npm test && npm run test:e2e && npm run build`（main 全量回归）→ `git tag v0.1.2`。
Expected: main 同步 + tag。

- [ ] **Step 4: 推送远端**

Run: `git push origin main --tags`（+ `git push origin dev` 同步）。

---

## 自审（对照 0.1.2 规格）

**规格覆盖：**
- §2 应用清单（去 6/留 2/增 6/设置内置模块/order 归位）→ Task 1 + Task 2
- §3 关于页远端信息 → Task 3
- §4 入口排序/隐藏（nav 配置链路 + resolveNav + rebuildNav + 导航分区 + 护栏 + 概览入口）→ Task 4 + Task 5
- §5 连带更新（e2e/基线/接入指南）→ Task 1（clipboard→key）+ Task 6
- §6 验证验收 / 0.1.2 发版 → Task 7

**占位扫描：** 无 TBD/TODO；`<id>/<name>/<icon>` 为模板变量由 Task 1 Step 2 逐一展开为 6 个具体文件。图标 `message`/`eye-off` 已在 Task 1 Step 2 与 Task 5 Step 3 注明替换（PATHS 不含），无悬空引用。

**类型一致性：** `resolveNav(allModules, nav)` 签名在 Task 4 定义与 Task 5 `mountNavPartition` 使用一致；`MODULES`（Task 2 组装 → Task 4 `resolveNav` → Task 5 `mountNavPartition`）类型一致；`saveConfig({ nav: { order, hidden } })` 与 defaults `nav: { order: [], hidden: [] }` 一致。
