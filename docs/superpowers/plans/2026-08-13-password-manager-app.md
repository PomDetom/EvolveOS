# 密码管理器前端应用实施计划（app/key/password-manager）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `src/apps/key/` 占位应用升级为真实密码管理器前端：锁定屏 + 三功能目录（全部/数据管理/设置）+ 条目 CRUD/搜索/标签筛选/密码生成/复制，经 `window.__TAURI__.core.invoke` 调后端 13 命令。

**Architecture:** 复用现有 `mod.mount` 钩子（零框架改动）；mount 闭包管理状态 + WeakMap dispose（仿 token-tool）；浏览器（无 `__TAURI__`）渲染「需桌面端使用」空态。页面渲染（render）与交互（mount）分离，纯函数在 key-utils。

**Tech Stack:** 原生 JS + Vite + Vitest + Playwright；复用现有组件（button/input/switch/search-bar/badge/dialog/empty-state/toast/icon）。

**Spec:** `docs/superpowers/specs/2026-08-13-password-manager-design.md`
**后端命令契约**（Task A4 依赖，均须已由 `chore/pwm-backend` 分支合入 dev 或在 mock 中提供）：见 `docs/superpowers/plans/2026-08-13-password-manager-backend.md` Task 2 的命令签名。

## Global Constraints

- 本分支只允许改 `src/apps/key/**` + `tests/**` + `docs/**`；`check:boundary` 应为 `app` 判定通过。
- 每次 JS 提交前 `npm run build`。
- 动态内容（条目字段/标签/错误信息）必须 `escapeHtml` 后插值，禁止 innerHTML 直接插用户数据。
- 主密码只存表单输入 + invoke 传参，成功后清空；localStorage 只存路径（`pwm.vaultPath`）与开关（`pwm.rememberPath`），**绝不存主密码**。
- 局部类名 `key__*`（避免与全页计数断言冲突）；CSS 全走令牌（圆角必配 `--radius-scale`），禁硬编码值。
- e2e 用 worktree 配置：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。
- 主题测试须 seed `theme`（涉及主题时）；本项目默认 `theme:'system'`，不涉主题测试无需 seed。
- 提交信息中文，前缀 `feat:` / `test:` / `docs:`。

---

### Task A1: key-utils 纯函数 + 单测（TDD）

**Files:**
- Create: `src/apps/key/key-utils.js`, `tests/unit/key.test.js`

**Interfaces:**
- Produces: `VAULT_PATH_KEY`, `REMEMBER_PATH_KEY`, `escapeHtml(str)`, `matchesQuery(entry, query)`, `matchesAnyTag(entry, activeTags)`, `filterEntries(entries, {query, activeTags})`, `allTags(entries)`, `sortByName(entries)`, `splitTags(str)`, `isRememberPathEnabled()`。
- Consumes: 无。

- [ ] **Step 1: 写失败单测**

`tests/unit/key.test.js`（先只测 utils 部分；Task A2 追加渲染/契约用例）：

```js
import { describe, it, expect } from 'vitest';
import {
  VAULT_PATH_KEY, REMEMBER_PATH_KEY,
  escapeHtml, matchesQuery, matchesAnyTag, filterEntries,
  allTags, sortByName, splitTags, isRememberPathEnabled,
} from '../../src/apps/key/key-utils.js';

const gh = { id: '1', name: 'GitHub', url: 'https://github.com', username: 'alice', password: 'p1', notes: null, tags: ['work', 'dev'], created_at: 1000, updated_at: 1000 };
const em = { id: '2', name: 'Email', url: 'https://mail.example.com', username: 'a@x.com', password: 'p2', notes: null, tags: ['personal'], created_at: 1000, updated_at: 2000 };

describe('key-utils', () => {
  it('escapeHtml：转义 HTML 特殊字符', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a"b\'c&d')).toBe('a&quot;b&#39;c&amp;d');
    expect(escapeHtml(null)).toBe('');
  });

  it('matchesQuery：大小写不敏感匹配名称/网址/用户名', () => {
    expect(matchesQuery(gh, 'github')).toBe(true);
    expect(matchesQuery(gh, 'GITHUB')).toBe(true);
    expect(matchesQuery(gh, 'github.com')).toBe(true);
    expect(matchesQuery(gh, 'alice')).toBe(true);
    expect(matchesQuery(gh, 'nope')).toBe(false);
    expect(matchesQuery(gh, '')).toBe(true);
  });

  it('matchesAnyTag：任一标签命中；空筛选为真', () => {
    expect(matchesAnyTag(gh, ['work'])).toBe(true);
    expect(matchesAnyTag(gh, ['dev', 'personal'])).toBe(true);
    expect(matchesAnyTag(gh, ['personal'])).toBe(false);
    expect(matchesAnyTag(gh, [])).toBe(true);
  });

  it('filterEntries：query 与 tags 组合（AND）', () => {
    expect(filterEntries([gh, em], { query: '', activeTags: [] })).toHaveLength(2);
    expect(filterEntries([gh, em], { query: 'git', activeTags: [] })).toEqual([gh]);
    expect(filterEntries([gh, em], { query: '', activeTags: ['work'] })).toEqual([gh]);
    expect(filterEntries([gh, em], { query: 'git', activeTags: ['personal'] })).toEqual([]);
  });

  it('allTags：去重并排序', () => {
    expect(allTags([gh, em])).toEqual(['dev', 'personal', 'work']);
  });

  it('sortByName：按名称 zh locale 排序', () => {
    const sorted = sortByName([em, gh]);
    expect(sorted.map((e) => e.name)).toEqual(['Email', 'GitHub']);
    // 不原地修改
    expect([em, gh].map((e) => e.name)).toEqual(['Email', 'GitHub']);
  });

  it('splitTags：按中英文逗号拆分去空', () => {
    expect(splitTags('work, 邮箱，dev')).toEqual(['work', '邮箱', 'dev']);
    expect(splitTags('')).toEqual([]);
  });

  it('isRememberPathEnabled：默认开，显式 false 关', () => {
    localStorage.removeItem(REMEMBER_PATH_KEY);
    expect(isRememberPathEnabled()).toBe(true);
    localStorage.setItem(REMEMBER_PATH_KEY, 'false');
    expect(isRememberPathEnabled()).toBe(false);
    localStorage.removeItem(REMEMBER_PATH_KEY);
  });

  it('常量名', () => {
    expect(VAULT_PATH_KEY).toBe('pwm.vaultPath');
    expect(REMEMBER_PATH_KEY).toBe('pwm.rememberPath');
  });
});
```

- [ ] **Step 2: 跑测试确认红**

Run: `npx vitest run tests/unit/key.test.js`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写 key-utils.js**

```js
// 密码管理器纯函数（可单测，无 DOM 依赖；localStorage 需 jsdom）。
export const VAULT_PATH_KEY = 'pwm.vaultPath';
export const REMEMBER_PATH_KEY = 'pwm.rememberPath';

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export function matchesQuery(entry, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return true;
  return (
    String(entry.name).toLowerCase().includes(q) ||
    String(entry.url || '').toLowerCase().includes(q) ||
    String(entry.username).toLowerCase().includes(q)
  );
}

export function matchesAnyTag(entry, activeTags) {
  const tags = activeTags || [];
  if (!tags.length) return true;
  const lower = (list) => list.map((t) => t.toLowerCase());
  const et = lower(entry.tags || []);
  return lower(tags).some((t) => et.includes(t));
}

export function filterEntries(entries, { query = '', activeTags = [] } = {}) {
  return (entries || []).filter((e) => matchesQuery(e, query) && matchesAnyTag(e, activeTags));
}

export function allTags(entries) {
  const set = new Set();
  (entries || []).forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'));
}

export function sortByName(entries) {
  return [...(entries || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'));
}

export function splitTags(str) {
  return String(str || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
}

export function isRememberPathEnabled() {
  return localStorage.getItem(REMEMBER_PATH_KEY) !== 'false';
}
```

- [ ] **Step 4: 跑测试确认绿**

Run: `npx vitest run tests/unit/key.test.js`
Expected: PASS（8 用例）。

- [ ] **Step 5: Commit**

```bash
git add src/apps/key/key-utils.js tests/unit/key.test.js
git commit -m "feat: 密码管理器 key-utils 纯函数 + 单测（过滤/标签/排序/转义）"
```

---

### Task A2: module 契约 + 页面渲染（TDD）

**Files:**
- Create: `src/apps/key/index.js`, `src/apps/key/key.js`（先只写 `keyPage` render + import css）
- Modify: `tests/unit/key.test.js`（追加 page/contract 用例）

**Interfaces:**
- Produces: `module`（id `key` / name `密码` / icon `key` / order 1 / dir 全部·数据管理·设置 / render / mount）；`keyPage(ctx) → string`；`mountKey(pageEl, ctx)`（Task A4 实现，此处先导出 stub 或留待 A4）。
- Consumes: 无（render 只读 ctx）。

- [ ] **Step 1: 追加失败单测（page + contract）**

在 `tests/unit/key.test.js` 追加：

```js
import { keyPage } from '../../src/apps/key/key.js';
import { module } from '../../src/apps/key/index.js';

describe('key page', () => {
  it('浏览器（无 __TAURI__）：需桌面端空态', () => {
    expect(keyPage({ module, dirName: '全部' })).toContain('需桌面端使用');
  });

  it('桌面（有 __TAURI__）：头部 + 可挂载 body', () => {
    globalThis.window.__TAURI__ = { core: {} };
    const html = keyPage({ module, dirId: 'all', dirName: '全部' });
    expect(html).toContain('data-key-body');
    expect(html).toContain('密码');
    delete globalThis.window.__TAURI__;
  });
});

describe('key module 契约', () => {
  it('导出 module 字段齐全', () => {
    expect(module.id).toBe('key');
    expect(module.name).toBe('密码');
    expect(module.icon).toBe('key');
    expect(module.order).toBe(1);
    expect(module.dir).toEqual([
      { id: 'all', name: '全部', icon: 'box' },
      { id: 'data', name: '数据管理', icon: 'folder' },
      { id: 'settings', name: '设置', icon: 'settings' },
    ]);
    expect(typeof module.render).toBe('function');
    expect(typeof module.mount).toBe('function');
  });
});
```

- [ ] **Step 2: 跑测试确认红**

Run: `npx vitest run tests/unit/key.test.js`
Expected: FAIL（key.js/index.js 不存在）。

- [ ] **Step 3: 写 index.js**

```js
// 密码管理器（升级原 key 占位）——复用 Tauri 桌面后端（Argon2id + AES-256-GCM 保险库）。
import { keyPage, mountKey } from './key.js';

export const module = {
  id: 'key', name: '密码', icon: 'key', order: 1,
  dir: [
    { id: 'all', name: '全部', icon: 'box' },
    { id: 'data', name: '数据管理', icon: 'folder' },
    { id: 'settings', name: '设置', icon: 'settings' },
  ],
  render: (ctx) => keyPage(ctx),
  mount: (pageEl, ctx) => mountKey(pageEl, ctx),
};
```

- [ ] **Step 4: 写 key.js（render + mount 骨架）**

```js
// 密码管理器应用页。桌面优先：浏览器（无 __TAURI__）渲染「需桌面端使用」空态；
// 桌面经 window.__TAURI__.core.invoke 调后端命令。锁态/目录页由 mount 按运行时状态填充 data-key-body。
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import './key.css';

export function keyPage(ctx) {
  if (typeof window.__TAURI__ === 'undefined') {
    return `
      <div class="app-main__page-head">
        <h2 class="app-main__page-title">密码</h2>
      </div>
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'key',
          title: '需桌面端使用',
          desc: '密码管理器依赖 Tauri 桌面后端（Argon2id + AES-256-GCM 加密保险库），请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  const sub = ctx.dirName ? ` › ${ctx.dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">密码</h2>
      ${ctx.dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body" data-key-body></div>`;
}

// —— 交互挂载（Task A4 实现）——
const disposes = new WeakMap();
export function mountKey(pageEl, ctx) {
  // Task A4 填充
}
```

- [ ] **Step 5: 写 key.css 骨架 + 跑测试确认绿**

先建 `src/apps/key/key.css` 占位（Task A3 填充完整样式）：

```css
/* 密码管理器局部样式（Task A3 填充） */
```

Run: `npx vitest run tests/unit/key.test.js`
Expected: PASS（10 用例）。
再跑 `npm run build`（CSS 占位空文件应无碍；若 vite 报空 css 警告忽略）。

- [ ] **Step 6: Commit**

```bash
git add src/apps/key/index.js src/apps/key/key.js src/apps/key/key.css tests/unit/key.test.js
git commit -m "feat: 密码管理器 module 契约 + 页面渲染骨架（升级 key 占位为三目录）"
```

---

### Task A3: key.css 局部样式

**Files:**
- Modify: `src/apps/key/key.css`

**Interfaces:**
- Produces: `key__*` 类（锁定屏/工具栏/列表行/标签 chips/数据卡片/设置行/编辑器）。供 Task A4 渲染代码引用。

- [ ] **Step 1: 写完整样式**

```css
/* 密码管理器局部样式（令牌驱动；类名 key__* 防全页计数断言冲突） */
.key__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* —— 锁定屏 —— */
.key__lock {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 460px;
  margin: var(--space-6) auto;
  padding: var(--space-6);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-lg) * var(--radius-scale, 1));
  box-shadow: var(--shadow-sm);
}
.key__lock-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: calc(var(--radius-full) * var(--radius-scale, 1));
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}
.key__lock-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-1);
}
.key__lock-desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-2);
  line-height: 1.6;
}
.key__mode {
  display: flex;
  gap: var(--space-2);
}
.key__mode-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  background: transparent;
  color: var(--text-2);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.key__mode-btn.is-active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
}
.key__mode-btn:hover {
  border-color: var(--glass-border);
  background: var(--surface-hover);
}

/* —— 通用表单字段 —— */
.key__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.key__field-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-2);
}

/* —— 工具栏 + 标签筛选 —— */
.key__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.key__toolbar-search { flex: 1; min-width: 240px; }
.key__toolbar-actions { display: flex; gap: var(--space-2); }
.key__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.key__tag {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-full) * var(--radius-scale, 1));
  background: transparent;
  color: var(--text-2);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.key__tag.is-active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
}

/* —— 条目列表 —— */
.key__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.key__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-md) * var(--radius-scale, 1));
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.key__row:hover { border-color: var(--glass-border); background: var(--surface-hover); }
.key__row-main { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.key__row-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-1);
}
.key__row-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: var(--font-size-xs);
  color: var(--text-2);
}
.key__row-url { opacity: 0.75; }
.key__row-pass {
  margin-top: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--text-1);
  word-break: break-all;
}
.key__row-actions { display: flex; gap: var(--space-1); opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
.key__row:hover .key__row-actions,
.key__row:focus-within .key__row-actions { opacity: 1; }
.key__act {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: calc(var(--radius-sm) * var(--radius-scale, 1));
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.key__act:hover { background: var(--surface-hover); color: var(--text-1); }
.key__act--danger:hover { color: var(--danger); }

/* —— 数据管理 / 设置 —— */
.key__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
  align-items: start;
}
.key__cards .app-main__card { display: flex; flex-direction: column; gap: var(--space-3); }
.key__info { display: flex; justify-content: space-between; gap: var(--space-3); font-size: var(--font-size-sm); color: var(--text-2); }
.key__info code { font-size: var(--font-size-xs); color: var(--text-1); word-break: break-all; text-align: right; }
.key__setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--glass-border);
}
.key__setting:last-of-type { border-bottom: none; }
.key__setting-text { display: flex; flex-direction: column; gap: var(--space-1); }
.key__setting-name { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-1); }
.key__setting-desc { font-size: var(--font-size-xs); color: var(--text-2); }

/* —— 编辑器表单 —— */
.key__form { display: flex; flex-direction: column; gap: var(--space-4); }
.key__pass-row { display: flex; gap: var(--space-2); align-items: center; }
.key__pass-row .c-input { flex: 1; }
.key__gen-opts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: calc(var(--radius-sm) * var(--radius-scale, 1));
  font-size: var(--font-size-xs);
  color: var(--text-2);
}
.key__gen-opt { display: inline-flex; align-items: center; gap: var(--space-1); }
.key__gen-opt input[type="number"] { width: 64px; }
```

> 注：`.key__editor`（编辑器遮罩实底材质覆盖）见 Task A4。动画仅 transform/opacity/背景色（paint-only 豁免），无 backdrop-filter 动画。

- [ ] **Step 2: 跑构建确认**

Run: `npm run build`
Expected: 0 error。

- [ ] **Step 3: Commit**

```bash
git add src/apps/key/key.css
git commit -m "feat: 密码管理器 key.css 局部样式（锁定屏/工具栏/列表/数据/设置）"
```

---

### Task A4: mount 交互 + mock e2e

**Files:**
- Modify: `src/apps/key/key.js`（完整 `mountKey` + 对话框助手）
- Create: `tests/e2e/key-password.spec.js`

**Interfaces:**
- Consumes: 后端 13 命令（create_vault / unlock_vault / lock_vault / list_entries / get_entry / create_entry / update_entry / delete_entry / generate_password / export_vault / import_vault / default_vault_path / current_vault_path）；`key-utils`（Task A1）；组件（button/input/switch/search-bar/badge/dialog/empty-state/toast/icon）。
- Produces: `mountKey(pageEl, ctx)` 完整交互；`key-password.spec.js` 浏览器空态 + mock 桌面全链路。

- [ ] **Step 1: 写 key.js 完整 mountKey**

将 `src/apps/key/key.js` 整份替换为：

```js
// 密码管理器应用页。桌面优先：浏览器（无 __TAURI__）渲染「需桌面端使用」空态；
// 桌面经 window.__TAURI__.core.invoke 调后端命令。锁态/目录页由 mount 按运行时状态填充 data-key-body。
import { renderButton } from '../../components/button/button.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import { renderDialog } from '../../components/dialog/dialog.js';
import { renderInput } from '../../components/input/input.js';
import { renderSwitch, mountSwitch } from '../../components/switch/switch.js';
import { renderSearchBar, mountSearchBar } from '../../components/search-bar/search-bar.js';
import { renderBadge } from '../../components/badge/badge.js';
import { toast } from '../../components/toast/toast.js';
import { icon } from '../../components/icon/icon.js';
import {
  VAULT_PATH_KEY, REMEMBER_PATH_KEY,
  escapeHtml, filterEntries, allTags, sortByName, splitTags, isRememberPathEnabled,
} from './key-utils.js';
import './key.css';

export function keyPage(ctx) {
  if (typeof window.__TAURI__ === 'undefined') {
    return `
      <div class="app-main__page-head">
        <h2 class="app-main__page-title">密码</h2>
      </div>
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'key',
          title: '需桌面端使用',
          desc: '密码管理器依赖 Tauri 桌面后端（Argon2id + AES-256-GCM 加密保险库），请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  const sub = ctx.dirName ? ` › ${ctx.dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">密码</h2>
      ${ctx.dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body" data-key-body></div>`;
}

// —— 交互挂载（每次左右窗切换重挂；WeakMap 按 pageEl 释放上次挂载）——

const disposes = new WeakMap();

export function mountKey(pageEl, ctx) {
  if (typeof window.__TAURI__ === 'undefined') return;
  const body = pageEl.querySelector('[data-key-body]');
  if (!body) return;
  disposes.get(pageEl)?.();

  let disposed = false;
  const api = window.__TAURI__.core;
  const errMsg = (err) => (typeof err === 'string' ? err : (err && err.message) || '未知错误');

  let entries = [];
  let vaultPath = '';
  let query = '';
  let activeTags = [];
  const revealed = new Set();

  const render = () => {
    if (disposed) return;
    if (!vaultPath) renderLocked();
    else if (ctx.dirId === 'data') renderData();
    else if (ctx.dirId === 'settings') renderSettings();
    else renderAll();
  };

  // —— 会话探测：list_entries + current_vault_path 同时失败 = 锁定 ——
  const load = async () => {
    try {
      const [es, path] = await Promise.all([
        api.invoke('list_entries'),
        api.invoke('current_vault_path'),
      ]);
      entries = es; vaultPath = path; revealed.clear();
      render();
    } catch {
      entries = []; vaultPath = ''; revealed.clear();
      render(); // 锁定屏
    }
  };

  const rememberPath = () => isRememberPathEnabled();

  // —— 锁定屏 ——
  const renderLocked = () => {
    const remembered = localStorage.getItem(VAULT_PATH_KEY) || '';
    let mode = 'unlock';
    body.innerHTML = `
      <div class="key__lock">
        <div class="key__lock-icon">${icon('lock', 32)}</div>
        <h3 class="key__lock-title">保险库已锁定</h3>
        <p class="key__lock-desc">输入主密码解锁现有保险库，或创建一个新的。主密码仅本次会话使用，绝不保存。</p>
        <div class="key__field">
          <label class="key__field-label" for="key-path">保险库文件路径</label>
          ${renderInput({ value: escapeHtml(remembered), placeholder: 'vault.json 的完整路径', label: '保险库文件路径' })}
        </div>
        <div class="key__field">
          <label class="key__field-label" for="key-pwd">主密码</label>
          ${renderInput({ type: 'password', value: '', placeholder: '主密码', label: '主密码' })}
        </div>
        <div class="key__field">
          <span class="key__field-label">模式</span>
          <div class="key__mode">
            <button type="button" class="key__mode-btn is-active" data-key-mode="unlock">解锁现有</button>
            <button type="button" class="key__mode-btn" data-key-mode="create">创建新保险库</button>
          </div>
        </div>
        ${renderButton({ label: '解锁', variant: 'primary', iconName: 'log-out' })}
      </div>`;
    const pathInput = body.querySelector('.c-input');
    const pwdInput = body.querySelectorAll('.c-input')[1];
    const submitBtn = body.querySelector('.key__lock .c-btn');

    const syncMode = (m) => {
      mode = m;
      body.querySelectorAll('[data-key-mode]').forEach((b) =>
        b.classList.toggle('is-active', b.dataset.keyMode === m));
      submitBtn.textContent = m === 'create' ? '创建并解锁' : '解锁';
    };
    body.querySelectorAll('[data-key-mode]').forEach((b) =>
      b.addEventListener('click', () => syncMode(b.dataset.keyMode)));

    if (!remembered) {
      api.invoke('default_vault_path').then((p) => {
        if (!disposed && !pathInput.value) pathInput.value = p;
      }).catch(() => {});
    }

    const submit = async () => {
      const path = pathInput.value.trim();
      const master = pwdInput.value;
      if (!path) { toast('请填写保险库路径', { variant: 'danger' }); return; }
      if (!master) { toast('请填写主密码', { variant: 'danger' }); return; }
      try {
        if (mode === 'create') await api.invoke('create_vault', { path, masterPassword: master });
        else await api.invoke('unlock_vault', { path, masterPassword: master });
        if (rememberPath()) localStorage.setItem(VAULT_PATH_KEY, path);
        pwdInput.value = '';
        await load();
      } catch (err) {
        const msg = errMsg(err);
        toast(`解锁失败: ${msg}${mode === 'create' ? '（若文件已存在请用「解锁现有」模式）' : ''}`, { variant: 'danger' });
      }
    };
    submitBtn.addEventListener('click', submit);
    pwdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  };

  // —— 全部：工具栏 + 搜索 + 标签筛选 + 列表 ——
  const entryRow = (e) => `
    <div class="key__row" data-key-id="${e.id}">
      <div class="key__row-main">
        <div class="key__row-name">${escapeHtml(e.name)}</div>
        <div class="key__row-meta">
          ${e.username ? `<span>${escapeHtml(e.username)}</span>` : ''}
          ${e.url ? `<span class="key__row-url">${escapeHtml(e.url)}</span>` : ''}
          ${(e.tags || []).map((t) => renderBadge({ label: escapeHtml(t) })).join('')}
        </div>
        ${revealed.has(e.id) ? `<div class="key__row-pass">${escapeHtml(e.password)}</div>` : ''}
      </div>
      <div class="key__row-actions">
        <button class="key__act" type="button" data-key-act="copy-user" title="复制用户名" aria-label="复制用户名">${icon('copy', 15)}</button>
        <button class="key__act" type="button" data-key-act="copy-pass" title="复制密码" aria-label="复制密码">${icon('clipboard', 15)}</button>
        <button class="key__act" type="button" data-key-act="reveal" title="${revealed.has(e.id) ? '隐藏密码' : '显示密码'}" aria-label="${revealed.has(e.id) ? '隐藏密码' : '显示密码'}">${icon('eye', 15)}</button>
        <button class="key__act" type="button" data-key-act="edit" title="编辑" aria-label="编辑">${icon('edit', 15)}</button>
        <button class="key__act key__act--danger" type="button" data-key-act="del" title="删除" aria-label="删除">${icon('trash', 15)}</button>
      </div>
    </div>`;

  const renderList = () => {
    const listEl = body.querySelector('[data-key-list]');
    if (!listEl) return;
    const filtered = sortByName(filterEntries(entries, { query, activeTags }));
    listEl.innerHTML = filtered.length
      ? filtered.map(entryRow).join('')
      : renderEmptyState({
          iconName: 'box',
          title: '暂无条目',
          desc: query || activeTags.length ? '没有符合筛选条件的条目。' : '点击「添加」创建第一个密码条目。',
        });
  };

  const renderAll = () => {
    const tags = allTags(entries);
    body.innerHTML = `
      <div class="key__toolbar">
        <div class="key__toolbar-search">${renderSearchBar({ placeholder: '搜索名称 / 网址 / 用户名…' })}</div>
        <div class="key__toolbar-actions">
          ${renderButton({ label: '添加', variant: 'primary', iconName: 'plus' })}
          ${renderButton({ label: '锁定', variant: 'secondary', iconName: 'lock' })}
        </div>
      </div>
      ${tags.length ? `<div class="key__tags">${tags.map((t) => `<button type="button" class="key__tag${activeTags.includes(t) ? ' is-active' : ''}" data-key-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div>` : ''}
      <div class="key__list" data-key-list></div>`;
    mountSearchBar(body, { onQuery: (q) => { query = q; renderList(); } });
    renderList();
  };

  // —— 数据管理 ——
  const renderData = () => {
    const remembered = localStorage.getItem(VAULT_PATH_KEY) || '';
    body.innerHTML = `
      <div class="key__cards">
        <div class="app-main__card">
          <h3 class="app-main__card-title">导出备份</h3>
          <p class="app-main__card-desc">导出为明文 JSON（含密码），请妥善保管。</p>
          <div class="key__field">
            ${renderInput({ value: escapeHtml(remembered), placeholder: '导出文件路径', label: '导出路径' })}
          </div>
          ${renderButton({ label: '导出备份', variant: 'primary', iconName: 'download' })}
        </div>
        <div class="app-main__card">
          <h3 class="app-main__card-title">导入恢复</h3>
          <p class="app-main__card-desc">从明文 JSON 合并导入条目（新增，不覆盖）。</p>
          <div class="key__field">
            ${renderInput({ value: '', placeholder: '导入文件路径', label: '导入路径' })}
          </div>
          ${renderButton({ label: '导入恢复', variant: 'secondary', iconName: 'upload' })}
        </div>
        <div class="app-main__card">
          <h3 class="app-main__card-title">保险库信息</h3>
          <div class="key__info"><span>路径</span><code>${escapeHtml(vaultPath)}</code></div>
          <div class="key__info"><span>条目数</span><b>${entries.length}</b></div>
        </div>
      </div>`;
    const inputs = body.querySelectorAll('.key__cards .key__field .c-input');
    const exportBtn = body.querySelectorAll('.key__cards .c-btn')[0];
    const importBtn = body.querySelectorAll('.key__cards .c-btn')[1];
    exportBtn.addEventListener('click', async () => {
      const p = inputs[0].value.trim();
      if (!p) { toast('请填写导出路径', { variant: 'danger' }); return; }
      try { await api.invoke('export_vault', { path: p }); toast('导出成功', { variant: 'success' }); }
      catch (err) { toast(`导出失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });
    importBtn.addEventListener('click', async () => {
      const p = inputs[1].value.trim();
      if (!p) { toast('请填写导入路径', { variant: 'danger' }); return; }
      try {
        const n = await api.invoke('import_vault', { path: p });
        await load();
        toast(`导入 ${n} 条`, { variant: 'success' });
      } catch (err) { toast(`导入失败: ${errMsg(err)}`, { variant: 'danger' }); }
    });
  };

  // —— 设置 ——
  const renderSettings = () => {
    body.innerHTML = `
      <div class="key__cards">
        <div class="app-main__card">
          <h3 class="app-main__card-title">偏好</h3>
          <div class="key__setting">
            <div class="key__setting-text">
              <span class="key__setting-name">记住上次保险库路径</span>
              <span class="key__setting-desc">解锁/创建成功后保存路径，下次自动预填。主密码绝不保存。</span>
            </div>
            ${renderSwitch({ checked: isRememberPathEnabled(), label: '记住上次保险库路径' })}
          </div>
          <div class="key__setting">
            <div class="key__setting-text">
              <span class="key__setting-name">清除记住的路径</span>
              <span class="key__setting-desc">移除本地保存的保险库路径。</span>
            </div>
            ${renderButton({ label: '清除', variant: 'secondary', iconName: 'trash' })}
          </div>
        </div>
        <div class="app-main__card">
          <h3 class="app-main__card-title">关于</h3>
          <p class="app-main__card-desc">密码管理器：Argon2id 派生密钥 + AES-256-GCM 加密保险库，主密码不落盘、仅桌面端可用。导出文件为明文 JSON，请妥善保管。</p>
        </div>
      </div>`;
    mountSwitch(body);
    const sw = body.querySelector('.c-switch');
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') === 'true';
      localStorage.setItem(REMEMBER_PATH_KEY, on ? 'true' : 'false');
    });
    body.querySelectorAll('.key__cards .c-btn').forEach((btn) => {
      if (btn.textContent.includes('清除')) {
        btn.addEventListener('click', () => {
          localStorage.removeItem(VAULT_PATH_KEY);
          toast('已清除记住的路径', { variant: 'success' });
        });
      }
    });
  };

  // —— 条目编辑器对话框 ——
  const openEntryEditor = (id) => {
    const existing = id ? entries.find((e) => e.id === id) : null;
    return new Promise((resolve) => {
      const mask = document.createElement('div');
      mask.className = 'key__editor';
      mask.innerHTML = renderDialog({
        title: existing ? '编辑条目' : '添加条目',
        content: editorFormHtml(existing),
        confirmLabel: '保存',
        cancelLabel: '取消',
      });
      const dialog = mask.querySelector('.c-dialog');
      const bodyEl = mask.querySelector('.c-dialog__body');
      const pwdInput = bodyEl.querySelector('[data-key-field="password"] .c-input');
      const optsBox = bodyEl.querySelector('[data-key-gen-opts]');

      const genPassword = async () => {
        const opts = {
          length: Number(optsBox.querySelector('input[type="number"]').value) || 16,
          useLower: optsBox.querySelector('[data-key-gen-opt="lower"]').checked,
          useUpper: optsBox.querySelector('[data-key-gen-opt="upper"]').checked,
          useDigits: optsBox.querySelector('[data-key-gen-opt="digits"]').checked,
          useSymbols: optsBox.querySelector('[data-key-gen-opt="symbols"]').checked,
          excludeAmbiguous: optsBox.querySelector('[data-key-gen-opt="excludeAmbiguous"]').checked,
        };
        try {
          const pw = await api.invoke('generate_password', opts);
          pwdInput.value = pw;
        } catch (err) { toast(`生成失败: ${errMsg(err)}`, { variant: 'danger' }); }
      };

      bodyEl.querySelector('[data-key-gen]').addEventListener('click', () => {
        optsBox.hidden = !optsBox.hidden;
        if (!optsBox.hidden) genPassword();
      });
      optsBox.querySelectorAll('[data-key-gen-opt]').forEach((cb) =>
        cb.addEventListener('change', () => { if (!optsBox.hidden) genPassword(); }));
      optsBox.querySelector('input[type="number"]').addEventListener('change', () => {
        if (!optsBox.hidden) genPassword();
      });

      const done = (input) => {
        document.removeEventListener('keydown', onKey);
        mask.remove();
        resolve(input);
      };
      const onKey = (e) => { if (e.key === 'Escape') done(null); };

      const collect = () => {
        const val = (key) => bodyEl.querySelector(`[data-key-field="${key}"] .c-input`).value.trim();
        const name = val('name');
        if (!name) { toast('请填写名称', { variant: 'danger' }); return null; }
        const tagsRaw = val('tags');
        return {
          name,
          url: val('url') || null,
          username: val('username'),
          password: val('password'),
          notes: val('notes') || null,
          tags: splitTags(tagsRaw),
        };
      };

      const save = async () => {
        const input = collect();
        if (!input) return;
        try {
          if (existing) await api.invoke('update_entry', { id, ...input });
          else await api.invoke('create_entry', input);
          await load();
          done(input);
        } catch (err) { toast(`保存失败: ${errMsg(err)}`, { variant: 'danger' }); }
      };

      mask.querySelector('[data-action="cancel"]').addEventListener('click', () => done(null));
      mask.querySelector('.c-dialog__footer .c-btn').addEventListener('click', () => done(null));
      mask.querySelector('.c-dialog__footer .c-btn:last-child').addEventListener('click', save);
      mask.addEventListener('click', (e) => { if (e.target === mask) done(null); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(mask);
      dialog.querySelector('.c-dialog__close').focus();
    });
  };

  function editorFormHtml(e) {
    e = e || {};
    return `
      <div class="key__form">
        <label class="key__field" data-key-field="name">
          <span class="key__field-label">名称</span>
          ${renderInput({ value: escapeHtml(e.name ?? ''), placeholder: '如：GitHub', label: '名称' })}
        </label>
        <label class="key__field" data-key-field="url">
          <span class="key__field-label">网址</span>
          ${renderInput({ value: escapeHtml(e.url ?? ''), placeholder: 'https://…', label: '网址' })}
        </label>
        <label class="key__field" data-key-field="username">
          <span class="key__field-label">用户名</span>
          ${renderInput({ value: escapeHtml(e.username ?? ''), placeholder: '邮箱或账号', label: '用户名' })}
        </label>
        <div class="key__field" data-key-field="password">
          <span class="key__field-label">密码</span>
          <div class="key__pass-row">
            ${renderInput({ type: 'password', value: escapeHtml(e.password ?? ''), placeholder: '密码', label: '密码' })}
            <button class="key__act" type="button" data-key-gen title="生成随机密码" aria-label="生成随机密码">${icon('bolt', 15)}</button>
          </div>
          <div class="key__gen-opts" data-key-gen-opts hidden>
            <label class="key__gen-opt">长度 ${renderInput({ type: 'number', value: 16, label: '长度' })}</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="lower" checked> 小写</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="upper" checked> 大写</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="digits" checked> 数字</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="symbols" checked> 符号</label>
            <label class="key__gen-opt"><input type="checkbox" data-key-gen-opt="excludeAmbiguous"> 排除易混</label>
          </div>
        </div>
        <label class="key__field" data-key-field="notes">
          <span class="key__field-label">备注</span>
          ${renderInput({ value: escapeHtml(e.notes ?? ''), placeholder: '备注（可选）', label: '备注' })}
        </label>
        <label class="key__field" data-key-field="tags">
          <span class="key__field-label">标签</span>
          ${renderInput({ value: escapeHtml((e.tags || []).join(', ')), placeholder: '逗号分隔，如：工作, 邮箱', label: '标签' })}
        </label>
      </div>`;
  }

  // —— 行为 ——
  const copyText = async (text, kind) => {
    try { await navigator.clipboard.writeText(text); toast(`已复制${kind}`); }
    catch { toast(`复制${kind}失败`, { variant: 'danger' }); }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('确认删除该条目？此操作不可撤销。')) return;
    try {
      await api.invoke('delete_entry', { id });
      entries = entries.filter((e) => e.id !== id);
      toast('已删除', { variant: 'success' });
      renderList();
    } catch (err) { toast(`删除失败: ${errMsg(err)}`, { variant: 'danger' }); }
  };

  const doLock = async () => {
    try { await api.invoke('lock_vault'); } catch {}
    entries = []; vaultPath = ''; revealed.clear();
    render();
  };

  const onClick = (e) => {
    const act = e.target.closest('[data-key-act]');
    if (act) {
      const row = act.closest('[data-key-id]');
      if (!row) return;
      const id = row.dataset.keyId;
      const entry = entries.find((x) => x.id === id);
      if (!entry) return;
      const a = act.dataset.keyAct;
      if (a === 'copy-user') copyText(entry.username, '用户名');
      else if (a === 'copy-pass') copyText(entry.password, '密码');
      else if (a === 'reveal') {
        if (revealed.has(id)) revealed.delete(id); else revealed.add(id);
        renderList();
      } else if (a === 'edit') openEntryEditor(id);
      else if (a === 'del') deleteEntry(id);
      return;
    }
    const tag = e.target.closest('[data-key-tag]');
    if (tag) {
      const t = tag.dataset.keyTag;
      activeTags = activeTags.includes(t) ? activeTags.filter((x) => x !== t) : [...activeTags, t];
      renderAll();
      return;
    }
    const btn = e.target.closest('.key__toolbar-actions .c-btn');
    if (btn) {
      if (btn.textContent.includes('添加')) openEntryEditor();
      else if (btn.textContent.includes('锁定')) doLock();
    }
  };

  body.addEventListener('click', onClick);

  disposes.set(pageEl, () => {
    disposed = true;
    body.removeEventListener('click', onClick);
  });

  load();
}
```

> 说明：编辑/添加对话框返回 Promise（确认返回 input，取消/Esc 返回 null）；`save()` 在 Promise 内 invoke + `load()` 刷新 + `done(input)` 关闭。搜索/标签筛选全部客户端做（解锁时 `list_entries` 取全量）。

- [ ] **Step 2: 单测补跑 + build**

Run: `npx vitest run tests/unit/key.test.js` && `npm run build`
Expected: 单测 10/10、build 0 error。

- [ ] **Step 3: 写 key-password.spec.js（浏览器空态 + mock 桌面全链路）**

`tests/e2e/key-password.spec.js`：

```js
import { test, expect } from '@playwright/test';

const APP_URL = '/?mode=app';
const SEED = [
  { id: 'e1', name: 'GitHub', url: 'https://github.com', username: 'alice', password: 'p@ss-w0rd!', notes: null, tags: ['work', 'dev'], created_at: 1000, updated_at: 1000 },
  { id: 'e2', name: 'Email', url: 'https://mail.example.com', username: 'a@x.com', password: 'secret-mail', notes: null, tags: ['personal'], created_at: 1000, updated_at: 2000 },
];

// mock __TAURI__：内存 vault 实现 13 命令，记录 invokes 供断言
function installMock() {
  return `
  const state = { session: null, defaultPath: 'C:/mock/appdata/vault.json' };
  const invokes = [];
  window.__keyInvokes__ = invokes;
  window.__keyMock__ = state;
  const seed = ${JSON.stringify(SEED)};
  window.__TAURI__ = {
    window: {
      getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
      getAllWindows: () => Promise.resolve([]),
    },
    event: { listen: async () => () => {} },
    core: {
      invoke: async (cmd, args = {}) => {
        invokes.push({ cmd, args });
        const s = state.session;
        switch (cmd) {
          case 'default_vault_path': return state.defaultPath;
          case 'current_vault_path':
            if (!s) throw 'vault locked';
            return s.path;
          case 'list_entries': {
            if (!s) throw 'vault locked';
            const q = (args.query || '').trim().toLowerCase();
            const tags = args.tags || [];
            return s.entries.filter((e) =>
              (!q || e.name.toLowerCase().includes(q) || (e.url || '').toLowerCase().includes(q) || e.username.toLowerCase().includes(q)) &&
              (!tags.length || tags.some((t) => (e.tags || []).includes(t))));
          }
          case 'unlock_vault':
            if (args.masterPassword !== 'master') throw 'incorrect master password';
            state.session = { path: args.path, entries: structuredClone(seed) };
            return null;
          case 'create_vault':
            state.session = { path: args.path, entries: [] };
            return null;
          case 'lock_vault': state.session = null; return null;
          case 'create_entry': s.entries.push({ id: 'new-' + s.entries.length, ...args }); return null;
          case 'update_entry': {
            const e = s.entries.find((x) => x.id === args.id);
            if (e) Object.assign(e, { name: args.name, url: args.url, username: args.username, password: args.password, notes: args.notes, tags: args.tags });
            return null;
          }
          case 'delete_entry': s.entries = s.entries.filter((x) => x.id !== args.id); return null;
          case 'generate_password': return 'Abc123!xyz789#';
          case 'export_vault': return null;
          case 'import_vault': s.entries.push({ id: 'imp', name: 'Imported', url: null, username: 'u', password: 'p', notes: null, tags: ['imported'], created_at: 0, updated_at: 0 }); return 1;
          default: return null;
        }
      },
    },
  };
  `;
}

test('密码：浏览器空态（无 __TAURI__）+ 三目录 + 快捷卡', async ({ page }) => {
  await page.goto(APP_URL);
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview.locator('.app-main__shortcut[data-shortcut="key"]')).toBeVisible();
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'key');
  await expect(active).toContainText('需桌面端使用');
});

test('密码：mock 桌面解锁 → 列表 → 添加/编辑/删除 → 锁定全链路', async ({ page }) => {
  await page.addInitScript(installMock);
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  // 锁定屏：默认路径预填 + 模式默认解锁
  await expect(active.locator('.key__lock')).toBeVisible();
  await expect(active.locator('.key__lock .c-input').first()).toHaveValue('C:/mock/appdata/vault.json');
  // 错误密码 → 解锁失败 toast
  await active.locator('.key__lock .c-input').nth(1).fill('wrong');
  await active.locator('.key__lock .c-btn').click();
  await expect(page.locator('.c-toast--danger')).toContainText('解锁失败');
  // 正确密码解锁
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  await expect(active.locator('.key__row', { hasText: 'GitHub' })).toContainText('alice');
  // 搜索过滤
  await active.locator('.c-search-bar__input').fill('git');
  await expect(active.locator('.key__row')).toHaveCount(1);
  await active.locator('.c-search-bar__input').fill('');
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 标签筛选
  await active.locator('.key__tag', { hasText: 'work' }).click();
  await expect(active.locator('.key__row')).toHaveCount(1);
  await active.locator('.key__tag', { hasText: 'work' }).click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 显示密码
  await active.locator('.key__row', { hasText: 'GitHub' }).locator('[data-key-act="reveal"]').click();
  await expect(active.locator('.key__row', { hasText: 'GitHub' })).toContainText('p@ss-w0rd!');
  // 添加条目（生成器 + 保存）
  await active.locator('.key__toolbar-actions .c-btn', { hasText: '添加' }).click();
  await expect(page.locator('.c-dialog')).toBeVisible();
  await page.locator('[data-key-field="name"] .c-input').fill('GitLab');
  await page.locator('[data-key-field="username"] .c-input').fill('bob');
  await page.locator('[data-key-field="tags"] .c-input').fill('work, dev');
  await page.locator('[data-key-gen]').click();
  await expect(page.locator('[data-key-field="password"] .c-input')).toHaveValue('Abc123!xyz789#');
  await page.locator('.c-dialog__footer .c-btn:last-child').click();
  await expect(active.locator('.key__row')).toHaveCount(3);
  await expect(active.locator('.key__row', { hasText: 'GitLab' })).toBeVisible();
  // 编辑
  await active.locator('.key__row', { hasText: 'GitLab' }).locator('[data-key-act="edit"]').click();
  await page.locator('[data-key-field="username"] .c-input').fill('bob2');
  await page.locator('.c-dialog__footer .c-btn:last-child').click();
  await expect(active.locator('.key__row', { hasText: 'GitLab' })).toContainText('bob2');
  // 删除（确认）
  page.once('dialog', (d) => d.accept());
  await active.locator('.key__row', { hasText: 'GitLab' }).locator('[data-key-act="del"]').click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 锁定
  await active.locator('.key__toolbar-actions .c-btn', { hasText: '锁定' }).click();
  await expect(active.locator('.key__lock')).toBeVisible();
});

test('密码：创建新保险库模式（空库）', async ({ page }) => {
  await page.addInitScript(installMock);
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await active.locator('.key__mode-btn[data-key-mode="create"]').click();
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await expect(active.locator('.key__list .c-empty')).toBeVisible();
  await expect(active.locator('.key__list .c-empty')).toContainText('暂无条目');
});

test('密码：数据管理导出/导入 + 保险库信息', async ({ page }) => {
  await page.addInitScript(installMock);
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  // 解锁
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  // 切到数据管理目录
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="data"]').click();
  await page.waitForTimeout(400);
  await expect(active.locator('.key__cards')).toBeVisible();
  await expect(active).toContainText('C:/mock/appdata/vault.json'); // 保险库信息路径
  await expect(active).toContainText('2'); // 条目数
  // 导出
  await active.locator('.key__cards .key__field .c-input').first().fill('C:/mock/export.json');
  await active.locator('.key__cards .c-btn', { hasText: '导出备份' }).click();
  await expect(page.locator('.c-toast')).toContainText('导出成功');
  // 导入
  await active.locator('.key__cards .key__field .c-input').nth(1).fill('C:/mock/import.json');
  await active.locator('.key__cards .c-btn', { hasText: '导入恢复' }).click();
  await expect(page.locator('.c-toast')).toContainText('导入 1 条');
  await expect(active.locator('.key__cards')).toContainText('3');
});

test('密码：设置记住路径开关 + 清除', async ({ page }) => {
  await page.addInitScript(installMock);
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="settings"]').click();
  await page.waitForTimeout(400);
  const sw = active.locator('.c-switch');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  // 关掉记住路径
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => localStorage.getItem('pwm.rememberPath'))).toBe('false');
  // 清除记住的路径按钮
  await active.locator('.key__cards .c-btn', { hasText: '清除' }).click();
  await expect(page.locator('.c-toast')).toContainText('已清除');
});
```

- [ ] **Step 4: 跑 e2e（worktree 配置）**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/key-password.spec.js`
Expected: 5 用例全绿。若冷启动 flake（首断言 5s 超时）隔离单跑通过即接受（src/AGENTS.md 环境性 flake 规则）。

- [ ] **Step 5: 全量单测 + build**

Run: `npm test` && `npm run build`
Expected: 全绿（既有单测 + 新增 10）、build 0 error。

- [ ] **Step 6: Commit**

```bash
git add src/apps/key/key.js tests/e2e/key-password.spec.js
git commit -m "feat: 密码管理器 mount 交互（解锁/CRUD/生成/复制/导出导入/锁定）+ mock e2e"
```

---

### Task A5: 既有 e2e 断言更新 + 全量校验 + 文档

**Files:**
- Modify: `tests/e2e/app-shell.spec.js`、`tests/e2e/mobile-nav.spec.js`（如有 key 目录/占位断言）、`docs/superpowers/sdd/progress-key-app.md`（新建执行留痕）

**Interfaces:**
- Produces: 更新后 app-shell/mobile-nav 断言与新的 key 三目录/空态一致；`check:boundary` 通过。

- [ ] **Step 1: 定位需改断言**

Run: `grep -rn "功能开发中\|全部/分组\|密码 › 分组\|分组\|回收站" tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js`

- [ ] **Step 2: 更新 app-shell.spec.js**

逐处改为（key 占位 → 浏览器空态、目录 全部/分组/回收站 → 全部/数据管理/设置）：
- 右窗目录项文本：`toContainText(['全部', '分组'])` → `toContainText(['全部', '数据管理'])`；`toHaveCount(3)` 保持不变（key 仍 3 目录）。
- 页面内容：`toContainText('功能开发中')` → `toContainText('需桌面端使用')`。
- 标题栏上下文：`'密码 › 分组'` → `'密码 › 数据管理'`；`'密码 › 全部'` / `'密码'` 保持不变。
- 注释 `（目录：全部/分组/回收站）` → `（目录：全部/数据管理/设置）`。
- 若其它处断言 key 目录项文本（如 `data-id="groups"`），同步删/改。

- [ ] **Step 3: 更新 mobile-nav.spec.js（如有）**

若 mobile-nav 断言 key 的目录结构/占位文本，按新三目录/空态同步；若仅导航点击（`data-id="key"`），保持不变。

- [ ] **Step 4: 定向 e2e + 全量**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/key-password.spec.js`
Expected: 全绿。
再跑 `npm test` + `npm run build`。

- [ ] **Step 5: check:boundary**

Run: `node scripts/check-boundary.js`
Expected: `[app/key/password-manager] ✓ 应用改动，边界通过`。

- [ ] **Step 6: 文档 + 提交**

新建 `docs/superpowers/sdd/progress-key-app.md`（执行留痕：每任务计划/工作/提交/评审；格式仿 `progress-tokentool.md`），随 Task A5 提交。

```bash
git add tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js docs/superpowers/sdd/progress-key-app.md
git commit -m "test: 密码管理器 app-shell/mobile-nav 断言更新 + 执行留痕"
```

---

## 分支汇总验收

- 分支 `app/key/password-manager`（自 dev 检出），5+ commits。
- `npm test` 全绿、`npm run build` 0 error、关键 e2e（app-shell/mobile-nav/key-password）全绿。
- `check:boundary` 通过；合并 dev 用 `--no-ff`。
- **待桌面真机验证**（web 测试不覆盖）：真实 IPC invoke 13 命令、Argon2id 派生解锁、磁盘加解密、`%APPDATA%\com.evolveos.system\vault.json` 默认路径、导出明文 JSON 含密码。
