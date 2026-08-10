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
  it('应用分支触碰仓库根入口/锁文件/测试配置 → 失败（index.html / package-lock.json / vitest.config）', () => {
    const r = assessBranchChanges('app/ledger/report',
      ['index.html', 'package-lock.json', 'vitest.config.js']);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(['index.html', 'package-lock.json', 'vitest.config.js']);
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
