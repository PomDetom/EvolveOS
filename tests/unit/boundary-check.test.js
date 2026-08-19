import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { assessBranchChanges } from '../../scripts/boundary-check.js';

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

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
  // —— 并行治理（2026-08-12）：前缀全集 + 分支名校验 + 基分支跳过 ——
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
  it('EWP chore 分支允许 native workflow 基础设施路径', () => {
    const r = assessBranchChanges('chore/ewp-skeleton', [
      '.agents/protocol.json',
      '.agents/templates/task.json',
      'AGENTS.md',
      'docs/AGENTS.md',
      'tests/unit/agent-protocol.test.js',
    ]);
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

  it('check-boundary 使用 EWP_BOUNDARY_BASE 指向的本地 ref 作为默认范围', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-boundary-base-'));
    const script = path.resolve('scripts/check-boundary.js');
    try {
      git(root, ['init', '-b', 'dev']);
      git(root, ['config', 'user.email', 'ewp@example.com']);
      git(root, ['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      git(root, ['add', '.']);
      git(root, ['commit', '-m', 'dev']);
      git(root, ['switch', '-c', 'recovery-base']);
      writeFileSync(path.join(root, 'src-recovery.js'), 'recovery\n');
      git(root, ['add', '.']);
      git(root, ['commit', '-m', 'recovery base']);
      git(root, ['switch', '-c', 'chore/boundary-base']);
      mkdirSync(path.join(root, 'scripts'));
      writeFileSync(path.join(root, 'scripts', 'change.js'), 'current\n');
      git(root, ['add', '.']);
      git(root, ['commit', '-m', 'current change']);

      expect(() => execFileSync(process.execPath, [script], {
        cwd: root,
        env: { ...process.env, EWP_BOUNDARY_BASE: 'recovery-base' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })).not.toThrow();
      expect(() => execFileSync(process.execPath, [script], {
        cwd: root,
        env: { ...process.env, EWP_BOUNDARY_BASE: '' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
