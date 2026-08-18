import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildStartFiles,
  deriveBranchName,
  main as startMain,
  nextTaskId,
  parseStartArgs,
  slugifyTitle,
} from '../../scripts/agent/start-task.js';

describe('agent:start', () => {
  test('解析任务启动参数', () => {
    expect(parseStartArgs([
      '--title', 'Codex 额度查询',
      '--kind', 'tauri',
      '--app', 'token-tool',
      '--paths', 'src-tauri/src/,src/apps/token-tool/,tests/',
    ])).toMatchObject({
      title: 'Codex 额度查询',
      kind: 'tauri',
      app: 'token-tool',
      allowedPaths: ['src-tauri/src/', 'src/apps/token-tool/', 'tests/'],
    });
  });

  test('从标题生成稳定 slug 和 Tauri 分支名', () => {
    expect(slugifyTitle('Codex quota')).toBe('codex-quota');
    expect(deriveBranchName({ kind: 'tauri', app: 'token-tool', title: 'Codex quota' }))
      .toBe('ui/token-tool/codex-quota');
  });

  test('任务 ID 从已有最大编号递增', () => {
    expect(nextTaskId(['EWP-001', 'EWP-009', 'EWP-003'])).toBe('EWP-010');
    expect(nextTaskId([])).toBe('EWP-001');
  });

  test('启动文件包含 task、plan 和非平凡任务 Note', () => {
    const files = buildStartFiles({
      id: 'EWP-010',
      title: 'Codex quota',
      kind: 'tauri',
      branch: 'ui/token-tool/codex-quota',
      baseSha: 'a'.repeat(40),
      allowedPaths: ['src-tauri/src/', 'src/apps/token-tool/', 'tests/'],
      year: '2026',
      date: '2026-08-18',
      slug: 'codex-quota',
      noteClass: 'feature',
    });
    expect(files.taskPath).toBe('.agents/tasks/2026/EWP-010-codex-quota/task.json');
    expect(files.planPath).toBe('.agents/tasks/2026/EWP-010-codex-quota/plan.md');
    expect(files.notePath).toBe('.agents/notes/proposed/feature/2026-08-18-codex-quota.md');
    expect(files.task).toMatchObject({ id: 'EWP-010', status: 'planned', baseSha: 'a'.repeat(40) });
  });

  test('实际启动命令创建独立 worktree、task 和 Note', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-start-'));
    const worktree = path.join(root, 'worktree');
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'ignore' });
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      git(['add', '.']);
      git(['commit', '-m', 'init']);
      const io = { log() {}, error() {} };
      expect(startMain([
        '--id', 'EWP-010', '--title', 'Codex quota', '--kind', 'tauri', '--app', 'token-tool',
        '--paths', 'src-tauri/src/,src/apps/token-tool/,tests/', '--worktree', worktree,
      ], root, io)).toBe(0);
      expect(readFileSync(path.join(worktree, '.agents/tasks/2026/EWP-010-codex-quota/task.json'), 'utf8'))
        .toContain('"status": "planned"');
      expect(readFileSync(path.join(worktree, '.agents/notes/proposed/feature/2026-08-18-codex-quota.md'), 'utf8'))
        .toContain('**Status:** proposed');
      git(['worktree', 'remove', '--force', worktree]);
      git(['branch', '-D', 'ui/token-tool/codex-quota']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});
