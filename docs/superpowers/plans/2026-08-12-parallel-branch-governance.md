# 并行分支治理迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地「并行分支治理设计」：扩展边界门禁前缀全集、图标自持机制、e2e 入口抗变化、治理文档更新，并用 worktree 全生命周期试跑验证。

**Architecture:** 本迁移在单一 `ui/governance-migration` 分支上顺序完成 4 个代码/文档任务（边界脚本 → 图标 → e2e → 文档），全量回归 + owner 评审后合入 dev；随后 Task 5 在 dev 上创建独立 worktree，用真实应用分支走完整生命周期做验收。全部改动零运行时依赖。

**Tech Stack:** Node (Vite/Vitest/Playwright)、纯原生 Web、git worktree。

## Global Constraints

- **零运行时依赖**；禁止升级核心依赖；遵循 `src/CLAUDE.md` 既有代码风格。
- **测试仅在 Web 环境执行**：逻辑改动走 Vitest 单测，交互改动走 Playwright（e2e 用 worktree 配置 `--config=playwright.config.worktree.js`，端口 5174 新鲜 server，`reuseExistingServer:false`）。
- **每提交前 `npm run build`**；逻辑改动 TDD：先写失败测试 → 确认红 → 实现 → 跑绿 → 提交。
- **本分支 `ui/governance-migration`** 从 dev 检出（`check:boundary` 对 `ui/` 放行 + 标 owner 评审）。
- 提交信息中文、前缀 `feat:`/`fix:`/`chore:`/`docs:`，匹配仓库既有风格。
- 迁移完成前不要跑全量（新回归模型生效前，用受影响子系统 specs + build 定向验证即可）。

**规范来源:** `docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`（权威需求源，后续所有分支/回归/边界判定依此）。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `scripts/boundary-check.js` | 修改 | 边界评估纯函数：前缀全集 + 分支名校验 + 基分支跳过 |
| `tests/unit/boundary-check.test.js` | 修改 | 各前缀/未知/基分支边界用例 |
| `src/components/icon/icon.js` | 修改 | `icon()` 加第四可选参 `icons`（应用级图标回退） |
| `tests/unit/icon.test.js` | 修改 | 第四参用例（应用级命中/回退全局/回退 monitor） |
| `tests/e2e/app-shell.spec.js` | 修改 | 模块数断言动态化 + 位置断言改 `data-id` |
| `tests/e2e/mobile-nav.spec.js` | 修改 | dock 数动态化 + 位置断言改 `data-id` |
| `tests/e2e/token-tool.spec.js` | 修改 | 位置断言改 `data-id` |
| `CLAUDE.md`（根）、`docs/CLAUDE.md`、`docs/app-integration.md`、`src/CLAUDE.md` | 修改 | 治理文本同步新模型 |
| `src/apps/ledger/index.js` | 创建 | Task 5 演示应用（占位，验收「新增应用碰零共享」） |

**Task 间接口：** `assessBranchChanges(branch, files)` 导出签名不变（`{ kind, ok, violations, note }`），新增 `kind` 取值 `base|app|ui|docs|chore|hotfix|invalid`。`icon(name, size, stroke, icons)` 第四参向后兼容，既有两参/三参调用零改动。

---

### Task 1: 边界门禁扩展（前缀全集 + 分支名校验）

**Files:**
- Modify: `scripts/boundary-check.js`
- Test: `tests/unit/boundary-check.test.js`

**Interfaces:**
- Consumes: 现有 `assessBranchChanges(branch, files)` 纯函数（导出签名不变）
- Produces: `kind` 取值扩展为 `base|app|ui|docs|chore|hotfix|invalid`；未知前缀返回 `kind:'invalid'`、`ok:false`

- [ ] **Step 1: 写失败测试**（追加到 `tests/unit/boundary-check.test.js`）

```js
it('docs 分支纯文档 → 通过（docs/ + 根 *.md）', () => {
  const r = assessBranchChanges('docs/parallel-governance', ['docs/specs/x.md', 'CLAUDE.md']);
  expect(r.ok).toBe(true);
  expect(r.kind).toBe('docs');
});
it('docs 分支触碰 src → 失败', () => {
  const r = assessBranchChanges('docs/parallel-governance', ['src/components/button/button.css']);
  expect(r.ok).toBe(false);
  expect(r.violations).toContain('src/components/button/button.css');
});
it('chore 分支触碰 scripts/锁文件/.gitignore/tests → 通过', () => {
  const r = assessBranchChanges('chore/boundary-prefixes',
    ['scripts/check-boundary.js', 'package-lock.json', '.gitignore', 'tests/unit/boundary-check.test.js']);
  expect(r.ok).toBe(true);
  expect(r.kind).toBe('chore');
});
it('chore 分支触碰 src → 失败', () => {
  const r = assessBranchChanges('chore/boundary-prefixes', ['src/config/defaults.js']);
  expect(r.ok).toBe(false);
});
it('hotfix 分支触碰任意 → 通过（标记同步回 dev）', () => {
  const r = assessBranchChanges('hotfix/crash', ['src/components/button/button.css', 'package.json']);
  expect(r.ok).toBe(true);
  expect(r.kind).toBe('hotfix');
  expect(r.note).toContain('同步回 dev');
});
it('未知前缀分支仅触碰 docs → 仍因分支名不合规失败', () => {
  const r = assessBranchChanges('feature/foo', ['docs/readme.md']);
  expect(r.ok).toBe(false);
  expect(r.kind).toBe('invalid');
});
it('基分支 dev/main → 跳过门禁', () => {
  expect(assessBranchChanges('dev', ['src/components/x.js']).ok).toBe(true);
  expect(assessBranchChanges('main', ['src/components/x.js']).kind).toBe('base');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/boundary-check.test.js`
Expected: 新增用例失败（`docs/` 前缀被当作未知 → 现返回 `kind:'invalid'` 而非 docs/chore/hotfix/base）

- [ ] **Step 3: 实现**（重写 `scripts/boundary-check.js` 的 `assessBranchChanges`，保留 `FRAMEWORK_PREFIXES`/`FRAMEWORK_FILE_RE` 导出不变）

```js
// 文档分支允许：docs/ 目录 + 仓库根 *.md（README/CHANGELOG/CLAUDE）
const ROOT_MD_RE = /^[^/]+\.md$/;
// 维护分支允许：scripts/ tests/ src-tauri/ + 锁文件/.gitignore/package.json/构建配置（不碰 src/）
const CHORE_PREFIXES = ['scripts/', 'tests/', 'src-tauri/'];
const CHORE_FILE_RE = [
  /\.lock$/, /^\.gitignore$/, /^package\.json$/,
  /^vite\.config/, /^vitest\.config/, /^playwright\.config/,
];

export function assessBranchChanges(branch, files) {
  // 基分支（dev/main）不是特性分支，跳过门禁
  if (branch === 'dev' || branch === 'main') {
    return { kind: 'base', ok: true, violations: [], note: '基分支，跳过门禁' };
  }
  const appMatch = branch.match(/^app\/([^/]+)\//); // app/<id>/<name>
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
  if (/^ui\//.test(branch)) {
    return { kind: 'ui', ok: true, violations: [], note: '框架改动：分支上受影响子系统定向回归；全量仅 dev→main/hotfix→main；框架 owner 评审' };
  }
  if (/^docs\//.test(branch)) {
    const violations = files.filter((f) => !(f.startsWith('docs/') || ROOT_MD_RE.test(f)));
    return {
      kind: 'docs',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '文档改动，边界通过' : `文档分支触碰非文档文件 ${violations.length} 个`,
    };
  }
  if (/^chore\//.test(branch)) {
    const inChore = (f) =>
      CHORE_PREFIXES.some((p) => f.startsWith(p)) || CHORE_FILE_RE.some((r) => r.test(f));
    const violations = files.filter((f) => !inChore(f));
    return {
      kind: 'chore',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '维护改动，边界通过' : `维护分支触碰非维护文件 ${violations.length} 个`,
    };
  }
  if (/^hotfix\//.test(branch)) {
    return { kind: 'hotfix', ok: true, violations: [], note: '紧急修复：合并 main 后必须同步回 dev + main 全量回归' };
  }
  // 未知前缀：分支名不合规（不再按 mixed 检查文件，直接 fail 给示例）
  return {
    kind: 'invalid',
    ok: false,
    violations: [branch],
    note: '分支名不合规，须用 app/<id>/<name> | ui/<name> | docs/<name> | chore/<name> | hotfix/<name>',
  };
}
```

- [ ] **Step 4: 运行确认绿**

Run: `npx vitest run tests/unit/boundary-check.test.js`
Expected: 全绿（既有 7 用例 + 新增 7 用例；`feature/foo` 用例断言 `ok===false` 在新逻辑下仍成立）

- [ ] **Step 5: 验证门禁 CLI 对未知前缀报错 + build**

Run: `npm run build`（绿）→ 新建一个临时未知名分支跑 `node scripts/check-boundary.js` 观察 `✗ 分支名不合规` 输出后删除该分支：
```
git checkout -b feature/scratch
node scripts/check-boundary.js      # 期望: ✗ 分支名不合规...（exit 1）
git checkout dev && git branch -D feature/scratch
```

- [ ] **Step 6: 提交**

```bash
git add scripts/boundary-check.js tests/unit/boundary-check.test.js
git commit -m "feat: 边界门禁前缀全集（docs/chore/hotfix/base）+ 未知分支名 fail（配单测）"
```

---

### Task 2: 图标自持机制（icon() 第四参）

**Files:**
- Modify: `src/components/icon/icon.js:62-66`
- Modify: `src/CLAUDE.md`（组件契约节补第四参约定 + 应用自持图标红线）
- Test: `tests/unit/icon.test.js`

**Interfaces:**
- Consumes: 现有 `icon(name, size = 18, stroke = 1.8)`
- Produces: `icon(name, size, stroke, icons)` —— `icons` 为可选应用级图标表 `{ name: '<svg path>' }`，查找顺序「应用级 → 全局 PATHS → PATHS.monitor」

- [ ] **Step 1: 写失败测试**（追加到 `tests/unit/icon.test.js`）

```js
// 并行治理 a1：应用级自持图标（icon 第四参 icons，查找顺序 应用级 → 全局 PATHS → monitor）
it('icon 第四参：应用级图标命中', () => {
  const appIcons = { sparkle: '<path d="M5 12h14M12 5v14"/>' };
  const svg = icon('sparkle', 18, 1.8, appIcons);
  expect(svg).toContain('M5 12h14M12 5v14');
});
it('icon 第四参：应用级查无 → 回退全局 PATHS', () => {
  const svg = icon('home', 18, 1.8, { other: '<path d="M1 1"/>' });
  expect(svg).toContain('m3 9 9-7 9 7'); // PATHS.home 片段
});
it('icon 第四参：全局与应用都无 → 回退 monitor（含第四参时）', () => {
  const svg = icon('nope', 18, 1.8, { other: '<path d="M1 1"/>' });
  expect(svg).toContain('<rect x="2" y="4" width="20" height="13" rx="2"/>'); // PATHS.monitor
});
it('icon 第四参：空图标表不破坏既有调用（无第四参向后兼容）', () => {
  expect(icon('home', 20)).toContain('m3 9 9-7 9 7');
  expect(icon('home', 20, 2.2)).toContain('stroke-width="2.2"');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/icon.test.js`
Expected: 新增 4 用例失败（当前 `icon()` 忽略第四参，应用级图标不会命中）

- [ ] **Step 3: 实现**（改 `src/components/icon/icon.js` 的 `icon` 函数）

```js
export function icon(name, size = 18, stroke = 1.8, icons) {
  // 并行治理 a1：icons 为应用级自持图标表，查找顺序 应用级 → 全局 PATHS → monitor（向后兼容）
  const path = (icons && icons[name]) || PATHS[name] || PATHS.monitor;
  return `<svg class="c-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${path}</svg>`;
}
```

- [ ] **Step 4: 运行确认绿**

Run: `npx vitest run tests/unit/icon.test.js`
Expected: 全绿（既有 2 用例 + 新增 4 用例）

- [ ] **Step 5: 同步 src/CLAUDE.md 契约**（在「组件契约」节图标条目补一行）

```markdown
- 图标：全部内联 SVG（24×24、stroke 1.8、Lucide 风格、currentColor、aria-hidden），统一经 `icon(name, size)`；`icon(name, size, stroke, icons)` 第四参为应用级自持图标表（查找顺序 应用级 → 全局 PATHS → monitor），应用自持图标必须 Lucide 风格（24×24/stroke 1.8/round），否则评审打回。
```

- [ ] **Step 6: 提交**

```bash
git add src/components/icon/icon.js tests/unit/icon.test.js src/CLAUDE.md
git commit -m "feat: icon() 第四参应用级自持图标（a1，查找顺序 应用级→全局→monitor，配单测）"
```

---

### Task 3: e2e 入口抗变化（计数动态化 + data-id 定位）

**Files:**
- Modify: `tests/e2e/app-shell.spec.js`、`tests/e2e/mobile-nav.spec.js`、`tests/e2e/token-tool.spec.js`

**Interfaces:**
- Consumes: nav-wheel 项已渲染 `data-id="${it.id}"`（`src/components/navigation-wheel/nav-wheel.js:30`，无需改动）
- Produces: 新增应用后 `app-shell/mobile-nav/token-tool` 三 spec 依然绿（计数不再硬编码 8、定位不靠 nth 下标）

- [ ] **Step 1: app-shell.spec.js 模块计数动态化**（4 处 `toHaveCount(8)`，均为**左窗/概览模块数**）

`app-shell.spec.js:17`（左窗 8 模块）替换为：
```js
  // 左窗模块数动态（home + 应用，新增应用不破断言）
  const navCount = await page.locator('.app-main__nav-l .c-navwheel__item').count();
  expect(navCount).toBeGreaterThanOrEqual(8);
  await expect(page.locator('.app-main__nav-l .c-navwheel__item[data-id="home"]')).toHaveCount(1);
```
`app-shell.spec.js:113`（概览快捷入口 8）替换为：
```js
  const shortcutCount = await overview.locator('.app-main__shortcut').count();
  expect(shortcutCount).toBeGreaterThanOrEqual(8);
```
`app-shell.spec.js:459` 与 `:475`（左窗 8 模块，选中态/遮罩态两处）各替换为 `toHaveCount(8)` → 相同的动态断言（复制 Step 1 第一段写法）。

同步改 `:10` 测试标题 `'壳结构：标题栏/左窗 8 模块/...'` → `'壳结构：标题栏/左窗模块（≥8）/...'`。

> 注意：`:396`/`:414` 的 `toHaveCount(8)` 是背景装饰 8 预设（与模块无关），**不要动**。

- [ ] **Step 2: app-shell.spec.js 左窗位置断言改 data-id**

全部 11 处 `page.locator('.app-main__nav-l .c-navwheel__item').nth(1)` → `page.locator('.app-main__nav-l .c-navwheel__item[data-id="clipboard"]')`（行 29/44/54/58/65/76/99/172/220/226/246/258）；行 81 的 `nth(2)`（切到密码）→ `[data-id="key"]`。

> 右窗设置分区位置断言（`:381` 外观、`:683` 关于）属 APP_SECTIONS 固定 10 项，**不要动**。

- [ ] **Step 3: mobile-nav.spec.js**（dock 计数 + 位置）

`:20` `await expect(items).toHaveCount(8);` →
```js
  const dockCount = await items.count();
  expect(dockCount).toBeGreaterThanOrEqual(8);
```
行 34/48/62 的 `page.locator('.app-main__dock .c-navwheel__item').nth(1)` → `[data-id="clipboard"]`。

- [ ] **Step 4: token-tool.spec.js**（左窗第 8 项）

行 11/61/110/143/177 的 `page.locator('.app-main__nav-l .c-navwheel__item').nth(7)` → `[data-id="token-tool"]`；`:5` 注释「作为第 8 个模块可导航」→「作为 token-tool 模块可导航」。

- [ ] **Step 5: 运行三个 spec 确认绿**

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/token-tool.spec.js`
Expected: 全绿（无改动语义，断言更稳健；若 `playwright.config.worktree.js` 缺失，先在仓库根用 08-09 计划书模板生成：端口 5174、`reuseExistingServer:false`）

- [ ] **Step 6: 提交**

```bash
git add tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/token-tool.spec.js
git commit -m "fix: e2e 模块计数动态化 + 位置断言改 data-id（新增应用不破 spec）"
```

---

### Task 4: 治理文档同步

**Files:**
- Modify: `CLAUDE.md`（根）、`docs/CLAUDE.md`、`docs/app-integration.md`

**Interfaces:**
- Consumes: 新规格 `docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`（已合 dev）
- Produces: 各 CLAUDE.md / 接入指南与新模型一致，无残留「不用 worktree / 禁并行派发」旧口径

- [ ] **Step 1: 根 CLAUDE.md**

`核心铁律`节替换（删旧 worktree 铁律行）：
```markdown
- **开发用 git worktree 并行**：每个特性分支在**仓库根同级目录**的独立 worktree（`evolveos-<slug>`，如 `evolveos-app-clipboard-history`）执行；主 checkout 常驻 main（发版合并点）。分支规范/生命周期/回归/边界全集见 `docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`。
```
`发版与版本治理`节「分支」条目更新为：
```markdown
- **分支**：前缀全集 `app/<id>/*`、`ui/*`、`docs/*`、`chore/*`、`hotfix/*`，**一律从 dev 检出**（hotfix 例外可从 main），完成后合 dev 删分支；main **只从 dev `--no-ff` 合并**（=一次发版），`hotfix/*` 唯一直合 main 豁免随后同步回 dev；未知前缀 `check:boundary` 拒绝。
- **回归**：全量回归**只在 dev→main 与 hotfix→main 两个点跑**；dev 阶段只跑改动影响面定向测试（+ build + 壳冒烟）。
```

- [ ] **Step 2: docs/CLAUDE.md**（`任务执行规范`节）

`:27`「铁律：任务间禁止并行派发实施子代理；控制器不直接修改代码；不接受无评审的自评报告。」→
```markdown
- 铁律：**并行实施子代理必须在独立 worktree**（各占一条分支）；同一 worktree 内串行；`ui/*` 全局串行（同一时刻只一个 ui 分支，靠人错开）；控制器不直接修改代码；不接受无评审的自评报告。
```
`:28`「任务直接在共享 checkout（主工作目录）执行，不用 git worktree 隔离（...）。」→
```markdown
- **任务在各自 worktree 执行**：`git worktree add <仓库根同级目录>/evolveos-<slug> -b <prefix>/<name> dev`；分支与 worktree 一一对应，合并 dev 后 `git branch -d` + `git worktree remove` 一并清理。
```
`:30` 边界门禁条目补：「全量仅 dev→main/hotfix→main；分支前缀与生命周期见 `docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`。」
`:37`「合并 feature 分支进 main 后须先全量回归（npm test + test:e2e + build）通过再删分支收尾。」→「**dev→main / hotfix→main 合并后全量回归**（npm test + test:e2e + build）通过再删分支收尾。」
`:38` 发版步骤维持（dev→main 全量回归 + tag），与 `npm run release` 门禁一致。

- [ ] **Step 3: docs/app-integration.md**（§5.5 图标 + §1 边界红线）

`§5.5 图标`整段替换：
```markdown
### 5.5 图标

全部内联 SVG（Lucide 风格、currentColor、aria-hidden），统一 `icon(name, size, stroke)`。**新图标默认复用既有 `PATHS`（`src/components/icon/icon.js`，47 个）**；确实需要新图标时用**应用自持图标**：`module` 导出 `icons: { <name>: '<svg path>' }`，页面里 `icon(name, size, stroke, ctx.module.icons)`（查找顺序 应用级 → 全局 → monitor）。**禁止在页面里内联手写 SVG、禁止为加图标改 `src/components/`**；应用自持图标必须 Lucide 风格（24×24、stroke 1.8、round cap/join），否则评审打回。
```
`§1` 边界红线条目末尾补：「分支规范（前缀全集/生命周期/回归单点化）见 `docs/superpowers/specs/2026-08-12-parallel-branch-governance-design.md`。」

- [ ] **Step 4: 验证无残留旧口径**

Run: `npx grep -rn "不用 git worktree\|禁止并行派发实施子代理\|每任务结束全量回归" CLAUDE.md docs/ src/ 2>$null`
Expected: 无命中（残留即回改）。`npm run build` 确认不受文档影响。

- [ ] **Step 5: 提交**

```bash
git add CLAUDE.md docs/CLAUDE.md docs/app-integration.md
git commit -m "docs: 治理口径同步（worktree 并行 + 分支前缀/生命周期/回归单点化 + 图标自持）"
```

---

### Task 5: worktree 全生命周期试跑（验收）

**Files:**
- Create: `src/apps/ledger/index.js`（演示应用，占位，与既有 clipboard 占位同型）
- 前置：**Task 1-4 已合入 dev**（`ui/governance-migration` 全量回归 + owner 评审 → 合 dev → 删分支）

**Interfaces:**
- Consumes: 新门禁（前缀/边界/生命周期）、动态化 e2e、工作区在 dev
- Produces: 验收证据——新增应用碰零共享文件、worktree 生命周期闭环、并行隔离机制生效

- [ ] **Step 1: 从 dev 建 worktree + app 分支**

Run（`<仓库根同级目录>` 替换为仓库根的实际同级路径，如 `C:\Repository` 即建 `C:\Repository\evolveos-app-ledger`）：
```powershell
git checkout dev
git worktree add <仓库根同级目录>/evolveos-app-ledger -b app/ledger/onboarding dev
```

- [ ] **Step 2: 在 worktree 内创建演示应用**

Create `src/apps/ledger/index.js`（在 worktree 的 `C:\...\evolveos-app-ledger` 下）：
```js
// 记账应用（占位）—— 并行治理验收演示：新增应用碰零共享文件（壳 glob 自动发现）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'ledger', name: '记账', icon: 'wallet', order: 8,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

- [ ] **Step 3: 验证入口抗变化——三个 spec 带 9 模块仍绿**

Run（在 worktree 内，先 `npm install`）：
```powershell
npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js tests/e2e/mobile-nav.spec.js tests/e2e/token-tool.spec.js
```
Expected: 全绿（左窗/概览/dock 现为 9 项，动态计数 `>= 8` + `data-id` 定位通过）——证明「新增应用碰零共享文件」

- [ ] **Step 4: 验证门禁**

Run（worktree 内）: `npm run check:boundary`
Expected: `[app/ledger/onboarding] ✓ 应用改动，边界通过`

额外验证 git 机制（主 checkout 任一会话内）：
```powershell
git worktree add <仓库根同级目录>/evolveos-app-ledger2 app/ledger/onboarding  # 期望: fatal 分支已被另一 worktree 持有
git worktree remove <仓库根同级目录>/evolveos-app-ledger2  # 清理失败的残留（若创建成功）
```

- [ ] **Step 5: 合 dev + 删分支 + 清 worktree（生命周期闭环）**

Run（worktree 内）:
```powershell
git checkout dev
git merge --no-ff app/ledger/onboarding -m "merge: 记账演示应用（并行治理验收）"
git branch -d app/ledger/onboarding     # git 校验已完全合并才放行
cd <仓库根同级目录>
git worktree remove evolveos-app-ledger
```

- [ ] **Step 6: dev 定向回归 + 留痕**

Run（主 checkout dev）: `npm test` + `npm run build`；在 `docs/superpowers/sdd/` 补一笔执行留痕（Task 5 完成：验收证据 + 分支/提交哈希）。提交留痕：
```bash
git add docs/superpowers/sdd/<progress-file>.md
git commit -m "docs: 并行治理验收留痕（ledger 演示应用 + worktree 生命周期闭环）"
```

- [ ] **Step 7: 全部完成 → dev 全量回归一次（新回归模型的门点）**

Run（主 checkout dev）: `npm test` + `npx playwright test --config=playwright.config.worktree.js` + `npm run build`
Expected: 全绿。这是迁移的最终验收门（对应「全量仅 dev→main」语义，此处 dev 作为发版候选完整回归一次）。

---

## 自审（对照新规格）

**规格覆盖：**
- §2 前缀全集 + 未知前缀 fail → Task 1
- §3 生命周期闭环 → Task 1（门禁）+ Task 5（worktree 闭环验证）
- §4 回归单点化 → Task 4 文档口径 + Task 5 Step 7 门点
- §5 worktree 布局/撞车/并行协议 → Task 5 Step 1/4/5 验证
- §6 入口抗变化（e2e 动态化 + 图标自持 a1 + glob）→ Task 2 + Task 3 + Task 5 Step 3
- §7 文档落点 → Task 4（含 src/CLAUDE.md 随 Task 2 走）
- §8 迁移顺序 → Task 1→2→3→4 顺序执行，Task 5 收尾
- §9 验收标准 → Task 5 全量覆盖（闭环/门禁/入口/并行/回归）

**占位扫描：** 无 TBD/TODO；`<仓库根同级目录>` 为环境路径占位，Step 1 已注明替换规则（非计划缺陷）。

**类型一致性：** `assessBranchChanges` 返回 `kind` 取值与 Task 1 定义一致；`icon` 第四参命名 `icons` 在 Task 2 与 Task 4 文档同步处一致；e2e 定位用 `data-id` 与 nav-wheel 渲染（`data-id="${it.id}"`）一致。
