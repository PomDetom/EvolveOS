# Task G2: 边界检查脚本（框架/应用门禁）

> 源：docs/superpowers/plans/2026-08-09-app-shell-dev-governance.md（Task G2）
> 规格：docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md（§4 边界执行，唯一需求源）

## 任务目标

提供可执行的框架/应用边界门禁：`scripts/boundary-check.js`（纯函数）+ `scripts/check-boundary.js`（CLI）+ `npm run check:boundary`。应用分支（`app/<id>/*`）改动触碰框架路径 → 失败；`ui/*` 框架分支允许触框架但标记须全量回归；未知分支按最严格处理。设计 §4.1 三层防线第一层，本地/CI 通用。

## Global Constraints（本任务绑定）

- 零运行时依赖（纯 Node 标准库）；禁止升级核心依赖；遵循项目风格。
- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- 提交前 `npm run build`；任务结束全量回归绿。
- **任务在共享 checkout（主工作目录）执行，不用 git worktree 隔离**。

## Files

- Create: `scripts/boundary-check.js`（纯函数，CLI 与单测共用）
- Create: `scripts/check-boundary.js`（CLI）
- Modify: `package.json`（加 `check:boundary` script）
- Test: `tests/unit/boundary-check.test.js`

## Interfaces

- Consumes: G1 的 `src/apps/<id>/` 目录契约
- Produces: `assessBranchChanges(branch, files) → { kind, ok, violations, note }`；npm script `npm run check:boundary [base...head]`—— 后续 git 工作流（G3 + 未来迭代）的合并前门禁

---

## 实施步骤（TDD）

### Step 1: 写失败单测（tests/unit/boundary-check.test.js，新建）

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

### Step 2: 运行确认红

Run: `npx vitest run tests/unit/boundary-check.test.js`
Expected: FAIL（`scripts/boundary-check.js` 不存在）

### Step 3: 实现纯函数（scripts/boundary-check.js，新建）

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

### Step 4: 实现 CLI（scripts/check-boundary.js，新建）

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

### Step 5: package.json 加 script

在 `scripts` 加：`"check:boundary": "node scripts/check-boundary.js",`

### Step 6: 单测确认绿 + CLI 冒烟

Run: `npx vitest run tests/unit/boundary-check.test.js` → PASS
冒烟（当前分支为 `ui/`）：`npm run check:boundary main...HEAD` —— 应输出 `✓ 框架改动：须全量回归 + 框架 owner 评审`（kind=ui，exit 0）；再用单测覆盖的样本验证 `app/<id>/` 分支语义（单测已断言）。

### Step 7: 全量回归 + 提交

Run: `npm test`（全量，含新单测）→ 全绿；`npm run build`

```bash
git add scripts/boundary-check.js scripts/check-boundary.js package.json tests/unit/boundary-check.test.js
git commit -m "feat: 框架/应用边界检查脚本（npm run check:boundary，G2）"
```

> 提交惯例：feat + docs 两枚提交。分支前缀 `ui/`（本任务触 scripts/package.json 框架）。
