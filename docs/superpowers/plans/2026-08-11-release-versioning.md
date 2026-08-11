# 发版流程与版本治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立发版流程与版本治理：版本号单源 + 同步脚本、About 页版本动态化、半自动 `npm run release` 发版脚本、CHANGELOG、固化 feature→dev→main 分支策略、首个 tag v0.1.0。

**Architecture:** 纯 Node 内置模块脚本（零新依赖）：`scripts/version-utils.js`（纯函数：semver 解析/递增/manifest 读写）、`scripts/set-version.js`（CLI 同步 3 个 manifest）、`scripts/release.js`（CLI：bump→CHANGELOG→npm test+build 门禁→提交→打印后续）；About 页版本经 Vite `define.__APP_VERSION__` 动态注入；分支与发版规则固化进 CLAUDE.md。

**Tech Stack:** Node 20+（ESM，`"type": "module"`）、Vite、Vitest、Playwright、git。

## Global Constraints

- **分支**：`ui/release-process` 从 dev 检出（dev 当前 = main `b78214b`）。实施按新策略收尾：feature→dev→main。
- **main 只收 dev 合入（--no-ff）+ hotfix**；docs 也走 dev。
- **版本单源 package.json**；`npm run set-version -- X.Y.Z` 同步 package.json / Cargo.toml / tauri.conf.json；About 页版本动态读。
- **`npm run release -- [patch|minor|major]`** 半自动（**不自动 merge/tag**）。
- **Tag `vX.Y.Z`**（非 `ui/vX.Y.Z`）；首次基线 `v0.1.0`（main 当前状态）。
- 脚本只用 Node 内置模块（fs/path/child_process），**零新 npm 依赖**。
- 项目 `"type": "module"`——scripts/*.js 用 ESM。
- 测试：Vitest 单测（`tests/unit/`）；e2e 用 worktree 配置 `npx playwright test --config=playwright.config.worktree.js`。
- JS 改动提交前 `npm run build`。
- Cargo.lock 的 `app` 包版本由 `cargo check/test` 自动同步（release 门禁跑 cargo test）。

---

### Task 1: version-utils（纯函数）+ set-version CLI + 单测

**Files:**
- Create: `scripts/version-utils.js`
- Create: `scripts/set-version.js`
- Create: `tests/unit/version-utils.test.js`
- Modify: `package.json`（加 `set-version` 脚本）

**Interfaces:**
- Produces: `scripts/version-utils.js` 导出 `parseVersion(v)->{major,minor,patch}`、`formatVersion({major,minor,patch})->string`、`bumpVersion(current, kind)->string`、`readPkgVersion(rootDir)->string`、`writeManifestVersions(rootDir, version)->string[]`。Task 3 的 release.js 复用这些。

- [ ] **Step 1: 写失败单测** `tests/unit/version-utils.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bumpVersion, parseVersion, readPkgVersion, writeManifestVersions } from '../../scripts/version-utils.js';

describe('version-utils', () => {
  it('parseVersion：解析 / 非法拒绝', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(() => parseVersion('1.2')).toThrow();
    expect(() => parseVersion('v1.2.3')).toThrow();
    expect(() => parseVersion('abc')).toThrow();
  });

  it('bumpVersion：patch/minor/major + 默认 patch', () => {
    expect(bumpVersion('0.1.0', 'patch')).toBe('0.1.1');
    expect(bumpVersion('0.1.9', 'patch')).toBe('0.1.10');
    expect(bumpVersion('0.1.0', 'minor')).toBe('0.2.0');
    expect(bumpVersion('0.1.0', 'major')).toBe('1.0.0');
    expect(bumpVersion('1.2.3')).toBe('1.2.4'); // 默认 patch
    expect(() => bumpVersion('1.2.3', 'x')).toThrow();
  });

  it('writeManifestVersions：同步 3 个 manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'evolveos-ver-'));
    mkdirSync(join(dir, 'src-tauri'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{\n  "name": "evolveos",\n  "version": "0.1.0"\n}\n');
    writeFileSync(join(dir, 'src-tauri', 'Cargo.toml'), 'version = "0.1.0"\n');
    writeFileSync(join(dir, 'src-tauri', 'tauri.conf.json'), '{\n  "version": "0.1.0"\n}\n');
    const changed = writeManifestVersions(dir, '0.2.0');
    expect(changed.sort()).toEqual(['package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json'].sort());
    expect(readPkgVersion(dir)).toBe('0.2.0');
    expect(readFileSync(join(dir, 'src-tauri', 'Cargo.toml'), 'utf-8')).toContain('version = "0.2.0"');
    expect(readFileSync(join(dir, 'src-tauri', 'tauri.conf.json'), 'utf-8')).toContain('"version": "0.2.0"');
    // 幂等：再写同版本 → 无改动
    expect(writeManifestVersions(dir, '0.2.0')).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: 确认红**

```bash
cd /c/Repository/EvolveOS
npm test -- tests/unit/version-utils.test.js
```

Expected: FAIL（`../../scripts/version-utils.js` 模块不存在）。

- [ ] **Step 3: 创建 `scripts/version-utils.js`**（全文）：

```js
// 版本工具纯函数（发版与 set-version 共用）——semver 解析/递增 + 3 个 manifest 版本同步。
// 零依赖，仅用 node:fs / node:path。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  if (!m) throw new Error(`非法版本号: ${v}（应为 MAJOR.MINOR.PATCH，如 1.2.3）`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function formatVersion(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function bumpVersion(current, kind = 'patch') {
  const v = parseVersion(current);
  if (kind === 'major') { v.major += 1; v.minor = 0; v.patch = 0; }
  else if (kind === 'minor') { v.minor += 1; v.patch = 0; }
  else if (kind === 'patch') { v.patch += 1; }
  else throw new Error(`非法递增类型: ${kind}（应为 patch|minor|major）`);
  return formatVersion(v);
}

const MANIFESTS = [
  { file: 'package.json', re: /"version"\s*:\s*"[^"]*"/, to: (v) => `"version": "${v}"` },
  { file: 'src-tauri/Cargo.toml', re: /^version\s*=\s*"[^"]*"/m, to: (v) => `version = "${v}"` },
  { file: 'src-tauri/tauri.conf.json', re: /"version"\s*:\s*"[^"]*"/, to: (v) => `"version": "${v}"` },
];

export function readPkgVersion(rootDir) {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

/** 把 version 写入 3 个 manifest；返回实际改动文件相对路径列表（幂等：同版本不改写）。 */
export function writeManifestVersions(rootDir, version) {
  const v = formatVersion(parseVersion(version));
  const changed = [];
  for (const { file, re, to } of MANIFESTS) {
    const p = join(rootDir, file);
    const src = readFileSync(p, 'utf-8');
    const next = src.replace(re, () => to(v));
    if (next !== src) { writeFileSync(p, next); changed.push(file); }
  }
  return changed;
}
```

- [ ] **Step 4: 创建 `scripts/set-version.js`**（全文）：

```js
// npm run set-version -- X.Y.Z —— 同步版本号到 package.json / Cargo.toml / tauri.conf.json。
import { writeManifestVersions } from './version-utils.js';

const arg = process.argv[2];
if (!arg) {
  console.error('用法: npm run set-version -- <MAJOR.MINOR.PATCH>');
  process.exit(1);
}
try {
  const changed = writeManifestVersions(process.cwd(), arg);
  if (changed.length) console.log(`版本已同步为 ${arg}: ${changed.join(', ')}`);
  else console.log(`版本已是 ${arg}，无改动`);
} catch (err) {
  console.error(String(err.message ?? err));
  process.exit(1);
}
```

- [ ] **Step 5: `package.json` scripts 加** `"set-version": "node scripts/set-version.js",`（放在 `check:boundary` 之后，`"tauri"` 之前）。

- [ ] **Step 6: 确认绿**

```bash
cd /c/Repository/EvolveOS
npm test -- tests/unit/version-utils.test.js
node scripts/set-version.js 0.1.0   # 幂等烟雾测试：应为「版本已是 0.1.0，无改动」
```

Expected: 3 用例 PASS；set-version 烟雾输出「版本已是 0.1.0，无改动」。（真实 0.1.0 → 更高版本的发版由 release 脚本负责，不在本任务。）

- [ ] **Step 7: 提交**

```bash
cd /c/Repository/EvolveOS
npm run build
git add scripts/version-utils.js scripts/set-version.js tests/unit/version-utils.test.js package.json
git commit -m "feat: 版本治理——version-utils 纯函数 + set-version 同步脚本（单测）"
```

---

### Task 2: vite define __APP_VERSION__ + About 页动态版本 + e2e 断言

**Files:**
- Modify: `vite.config.js`
- Modify: `src/scenes/settings-window/settings-pages.js`（aboutPage 的 `.csettings__ver`）
- Modify: `tests/e2e/app-shell.spec.js`（加 About 分区断言）

**Interfaces:**
- Consumes: package.json `version`（Task 1 保持单源）。
- Produces: 全局标识 `__APP_VERSION__`（字符串字面量），About 页渲染 `版本 X.Y.Z`；Task 3 无需依赖。

- [ ] **Step 1: 改 `vite.config.js`**（全文替换，加 `define`）：

```js
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  server: { port: 5173, strictPort: true },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
```

- [ ] **Step 2: 改 `src/scenes/settings-window/settings-pages.js`** aboutPage 内 `.csettings__ver`（约 L186）：

```js
      <div class="csettings__ver">版本 ${__APP_VERSION__}</div>
```

（原为 `版本 0.1.0`；`__APP_VERSION__` 是 Vite define 的全局标识，dev/build/test 均被替换为 package.json 版本字面量。）

- [ ] **Step 3: 加 e2e 断言** `tests/e2e/app-shell.spec.js` 末尾追加（断言「关于」分区渲染应用名 + 动态版本号，版本号用正则不写死，避免发版后用例失效）：

```js
test('设置→关于：应用信息卡渲染（版本号动态读 package.json）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(7).click(); // 关于（APP_SECTIONS index 7）
  const about = page.locator('.app-main__settings [data-page="about"]');
  await expect(about).toBeVisible();
  await expect(about.locator('.csettings__name')).toHaveText('EvolveOS');
  await expect(about.locator('.csettings__ver')).toHaveText(/版本 \d+\.\d+\.\d+/);
});
```

- [ ] **Step 4: 验证**

```bash
cd /c/Repository/EvolveOS
npm run build
npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js -g "设置→关于"
```

Expected: build 成功；新用例 PASS（`__APP_VERSION__` 被替换为 0.1.0，About 卡显示 EvolveOS + 版本 0.1.0）。

- [ ] **Step 5: 提交**

```bash
cd /c/Repository/EvolveOS
git add vite.config.js src/scenes/settings-window/settings-pages.js tests/e2e/app-shell.spec.js
git commit -m "feat: About 页版本动态读 package.json（vite define __APP_VERSION__）"
```

---

### Task 3: release.js + CHANGELOG.md + 单测

**Files:**
- Create: `scripts/release.js`
- Create: `CHANGELOG.md`
- Create: `tests/unit/release.test.js`
- Modify: `package.json`（加 `release` 脚本）

**Interfaces:**
- Consumes: `scripts/version-utils.js`（`bumpVersion`/`readPkgVersion`/`writeManifestVersions`，Task 1）。
- Produces: `npm run release -- [patch|minor|major]`（半自动：bump → CHANGELOG → npm test+build 门禁 → `chore: release vX.Y.Z` 提交 → 打印后续步骤）；导出纯函数 `collectCommits`/`formatChangelogEntry` 供测试。Task 5 用它做发版演练。

- [ ] **Step 1: 写失败单测** `tests/unit/release.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { collectCommits, formatChangelogEntry } from '../../scripts/release.js';

describe('release changelog', () => {
  it('collectCommits：去掉短哈希前缀取 subject', () => {
    expect(collectCommits('a1b2c3d feat: x\ne4f5g6h fix: y\n')).toEqual(['feat: x', 'fix: y']);
    expect(collectCommits('')).toEqual([]);
  });

  it('formatChangelogEntry：渲染版本条目（含分类占位 + 草稿提交列表）', () => {
    const entry = formatChangelogEntry({ version: '0.1.1', date: '2026-08-11', commits: ['feat: a', 'fix: b'] });
    expect(entry).toContain('## [0.1.1] - 2026-08-11');
    expect(entry).toContain('### Added');
    expect(entry).toContain('- feat: a');
    expect(entry).toContain('- fix: b');
  });

  it('formatChangelogEntry：无提交时给占位提示', () => {
    const entry = formatChangelogEntry({ version: '0.1.1', date: '2026-08-11', commits: [] });
    expect(entry).toContain('本版本变更待整理');
  });
});
```

- [ ] **Step 2: 确认红**

```bash
cd /c/Repository/EvolveOS
npm test -- tests/unit/release.test.js
```

Expected: FAIL（`../../scripts/release.js` 模块不存在）。

- [ ] **Step 3: 创建 `scripts/release.js`**（全文）：

```js
// npm run release -- [patch|minor|major] —— 半自动发版脚本。
// 1) semver bump + 同步 3 manifest  2) CHANGELOG 追加条目（git log 提交草稿）
// 3) npm test + npm run build 门禁  4) 提交 chore: release vX.Y.Z  5) 打印后续步骤。
// 不自动 merge/tag（发版是人工/控制器确认动作）。
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bumpVersion, readPkgVersion, writeManifestVersions } from './version-utils.js';

/** 从 `git log --oneline` 输出提取提交 subject（去掉短哈希前缀）。 */
export function collectCommits(gitLogOutput) {
  return gitLogOutput.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\S+\s+/, ''));
}

/** 渲染一条 Keep-a-Changelog 风格版本条目（分类占位 + 草稿提交列表，供人工整理）。 */
export function formatChangelogEntry({ version, date, commits }) {
  const bullets = commits.length
    ? commits.map((c) => `- ${c}`).join('\n')
    : '- （本版本变更待整理）';
  return `## [${version}] - ${date}\n\n### Added\n\n### Changed\n\n### Fixed\n\n${bullets}\n`;
}

/** 把新条目插到现有 changelog 顶部。 */
export function prependChangelog(existing, entry) {
  return `${entry}\n${existing.trimStart()}`;
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function lastTagOrEmpty() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

export function main() {
  const kind = process.argv[2] ?? 'patch';
  const root = process.cwd();
  const current = readPkgVersion(root);
  const next = bumpVersion(current, kind);

  // 1. 同步 3 manifest
  const changed = writeManifestVersions(root, next);

  // 2. CHANGELOG 追加条目
  const changelogPath = join(root, 'CHANGELOG.md');
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf-8')
    : '# Changelog\n\n';
  let commits = [];
  try {
    const lastTag = lastTagOrEmpty();
    const log = lastTag
      ? execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf-8' })
      : execSync('git log --oneline | tail -n +2', { encoding: 'utf-8' });
    commits = collectCommits(log);
  } catch {
    commits = [];
  }
  const entry = formatChangelogEntry({ version: next, date: today(), commits });
  writeFileSync(changelogPath, prependChangelog(existing, entry));

  // 3. 快速门禁（红则中止，版本与 CHANGELOG 已写）
  run('npm test');
  run('npm run build');

  // 4. 提交
  run(`git add ${changed.join(' ')} CHANGELOG.md`);
  run(`git commit -m "chore: release v${next}"`);

  // 5. 打印后续步骤（不自动执行）
  console.log(`
✅ release v${next} 已提交（版本 ${current} → ${next}）
后续步骤：
  ① npm run test:e2e（全量 e2e）
  ② git checkout main && git merge dev --no-ff -m "release: v${next}"
  ③ git tag v${next}
  ④ git push origin main --tags && git push origin dev`);
}

// CLI 守卫：直接运行脚本时执行 main；被测试 import 时跳过。
const isMain = process.argv[1] && new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href === import.meta.url;
if (isMain) {
  try { main(); } catch (err) { console.error(String(err.message ?? err)); process.exit(1); }
}
```

- [ ] **Step 4: 创建 `CHANGELOG.md`**（当前里程碑 [0.1.0]；随后 release 脚本会把新版本条目 prepend 到顶部）：

```markdown
# Changelog

## [0.1.0] - 2026-08-11

### Added
- tokenTool 应用：DeepSeek 官方余额 / OpenCode Go 三窗口用量监测（复用 Tauri Rust 后端 + EvolveOS 组件，桌面优先/浏览器优雅降级）
- 应用壳 `mod.mount` 挂载钩子（应用交互接线契约）
- 发版流程与版本治理（`set-version` / `release` 脚本 + 本文件）

### Changed
- 应用壳模块计数 7→8（tokenTool 接入）
- 设计语言措辞「克制的玻璃质感」→「亚克力质感」
- 编辑器对话框材质改实底不透明（与主页面一致）

### Fixed
- tokenTool 新增账户选 OpenCode 不带出 workspace/cookie 字段
- tokenTool 编辑对话框表单值转义（防属性突破自 XSS）
- tokenTool 空状态「添加账户」CTA 失灵
```

- [ ] **Step 5: `package.json` scripts 加** `"release": "node scripts/release.js",`（放 `set-version` 之后）。

- [ ] **Step 6: 确认绿**

```bash
cd /c/Repository/EvolveOS
npm test -- tests/unit/release.test.js
npm run build
```

Expected: 3 用例 PASS；build 成功。

- [ ] **Step 7: 提交**

```bash
cd /c/Repository/EvolveOS
git add scripts/release.js CHANGELOG.md tests/unit/release.test.js package.json
git commit -m "feat: 半自动发版脚本 release.js + CHANGELOG（单测）"
```

---

### Task 4: 文档更新（分支/发版/版本治理固化）

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`
- Modify: `README.md`

- [ ] **Step 1: `CLAUDE.md`** 在「常用命令」之后、新增一节：

```markdown
## 发版与版本治理

- **分支**：feature（`ui/*`、`app/<id>/*`）从 dev 检出、**只合入 dev**；dev 稳定后 `--no-ff` 合入 main（=一次发版）；**main 只接受 dev 合入 + `hotfix/*` 直合**（随后回 dev）；docs 也走 dev。
- **版本**：package.json 为唯一版本源；`npm run set-version -- X.Y.Z` 同步 3 个 manifest（package.json / Cargo.toml / tauri.conf.json）；设置「关于」页版本号动态读 package.json。
- **发版**：`npm run release -- [patch|minor|major]`（bump → CHANGELOG → npm test+build 门禁 → 提交 → 打印后续）；dev→main 前全量回归（npm test + test:e2e + build + cargo test）；合并后打 tag `vX.Y.Z`。
```

并把「常用命令」一节末尾追加一行：`npm run release / npm run set-version`（发版与版本同步，见下节）。

- [ ] **Step 2: `docs/CLAUDE.md`** 在「任务执行规范（子代理驱动开发）」末尾追加一条：

```markdown
- **发版步骤**：dev 稳定 → `npm run release -- <patch|minor|major>`（bump+CHANGELOG+门禁）→ dev→main `--no-ff` 全量回归 → tag `vX.Y.Z`。main 只收 dev 合入 + hotfix；docs 也走 dev。
```

- [ ] **Step 3: 治理规格 `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md`**：把「里程碑打 tag：`ui/vX.Y.Z`」改为「里程碑打 tag：`vX.Y.Z`」；并把第 5 条「dev 稳定 → 合 main」后补一句「（main 只收 dev 合入 + hotfix，docs 也走 dev）」。

- [ ] **Step 4: `README.md`** 命令表（`npm run check:boundary` 行之后）加两行：

```markdown
| `npm run set-version -- 1.2.3` | 同步版本号到 package.json / Cargo.toml / tauri.conf.json |
| `npm run release -- patch` | 半自动发版（bump + CHANGELOG + 门禁 + 提交；随后 dev→main + tag vX.Y.Z） |
```

- [ ] **Step 5: 验证 + 提交**

```bash
cd /c/Repository/EvolveOS
npm run build
git add CLAUDE.md docs/CLAUDE.md docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md README.md
git commit -m "docs: 固化分支/发版/版本治理规则（feature→dev→main + release/set-version）"
```

---

### Task 5: 收尾——首次基线 tag v0.1.0 + 发版演练 + 全量回归 + 合并

**Files:**
- 无新增文件。控制器执行：tag、演练、回归、合并、留痕。

**Interfaces:**
- 依赖 Task 1-4 全部落地。

- [ ] **Step 1: 全量回归**（实施分支上）

```bash
cd /c/Repository/EvolveOS
npm test
npx playwright test --config=playwright.config.worktree.js
npm run build
export PATH="$USERPROFILE/.cargo/bin:$PATH"; cd src-tauri && cargo test && cd ..
```

Expected: 单测（含新 version-utils/release 用例）全绿；全量 e2e 绿（app-shell 现含「设置→关于」用例）；build 绿；cargo test 绿。

- [ ] **Step 2: 打首次基线 tag `v0.1.0`（main 当前状态）**

```bash
cd /c/Repository/EvolveOS
git checkout main
git tag v0.1.0
```

- [ ] **Step 3: 发版演练（在实施分支上真实跑 release 脚本）**

```bash
cd /c/Repository/EvolveOS
git checkout ui/release-process
npm run release -- patch
```

Expected: 版本 0.1.0 → 0.1.1（3 manifest 同步）；CHANGELOG 顶部 prepend `## [0.1.1] - 2026-08-11`（含自 v0.1.0 起的实施提交草稿）；npm test + build 门禁通过；生成提交 `chore: release v0.1.1`；打印后续步骤。

> **用户决策点**：0.1.1 按设计默认**保留为下次发版基线**（main 版本领先最新 tag，符合「发版后即 bump」模型）。若想保持 main 版本 = 最新 tag，则 `git reset --hard HEAD~1` 回退演练提交再继续——默认保留。

- [ ] **Step 4: 合并实施分支 → dev → main（按新分支策略）**

```bash
cd /c/Repository/EvolveOS
git checkout dev && git merge ui/release-process --no-ff -m "merge: 发版流程与版本治理（release/set-version + 分支规则）"
git checkout main && git merge dev --no-ff -m "release: 发版流程与版本治理"
```

Expected: 无冲突；dev 与 main 均含全部实施 + 0.1.1 bump。

- [ ] **Step 5: main 全量回归 + 删分支 + 留痕**

```bash
cd /c/Repository/EvolveOS
git checkout main
npm test && npm run build   # 合并后 quick 门禁
npx playwright test --config=playwright.config.worktree.js   # 全量 e2e（后台亦可）
git branch -d ui/release-process
```

Expected: 全绿；分支删除；`git log --oneline` 与 `git tag` 确认：main 顶部为 release 合并、tag `v0.1.0` 存在。
最后在 `docs/superpowers/sdd/progress-tokentool.md`（或新建 `progress-release-versioning.md`）追加留痕：分支、提交哈希、tag、演练结论。

- [ ] **Step 6: 汇报交付**（控制器）——分支、提交、tag `v0.1.0`、0.1.1 基线、验证结论、需用户确认项（是否保留 0.1.1、后续真实发版时按流程走）。

---

## Self-Review

- **Spec 覆盖**：版本单源+About 动态（spec §2）→ Task 1-2；set-version（§2.3）→ Task 1；release 脚本+CHANGELOG（§4）→ Task 3；分支固化+docs（§3/§5）→ Task 4；首次基线 v0.1.0 + 演练（§6）→ Task 5。
- **占位扫描**：所有脚本/测试/文档给出完整内容；无 TBD/TODO。
- **类型一致性**：`parseVersion/formatVersion/bumpVersion/readPkgVersion/writeManifestVersions`（version-utils）与 `bumpVersion/readPkgVersion/writeManifestVersions`（release 引用）、`collectCommits/formatChangelogEntry/prependChangelog`（release 导出）签名在 Task 1/3 与单测间一致；`__APP_VERSION__` 在 vite.config define 与 settings-pages 使用一致。
