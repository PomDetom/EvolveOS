import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildStartFiles,
  cleanupStartArtifacts,
  deriveBranchName,
  listStartRecoveryArtifacts,
  main as startMain,
  nextTaskId,
  parseStartArgs,
  slugifyTitle,
} from '../../scripts/agent/start-task.js';
import { main as finishMain } from '../../scripts/agent/finish-task.js';
import { validateStartEvidence } from '../../scripts/agent/task-schema.js';

const TODAY = new Date().toISOString().slice(0, 10);
const YEAR = TODAY.slice(0, 4);

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
    const worktree = path.join(os.tmpdir(), `ewp-worktree-${Date.now()}`);
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
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
      expect(readFileSync(path.join(worktree, `.agents/tasks/${YEAR}/EWP-010-codex-quota/task.json`), 'utf8'))
        .toContain('"status": "planned"');
      expect(readFileSync(path.join(worktree, `.agents/notes/proposed/feature/${TODAY}-codex-quota.md`), 'utf8'))
        .toContain('**Status:** proposed');
      const task = JSON.parse(readFileSync(path.join(worktree, `.agents/tasks/${YEAR}/EWP-010-codex-quota/task.json`), 'utf8'));
      expect(task.startRunId).toBeTruthy();
      expect(task.initCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(validateStartEvidence(
        worktree,
        task,
        `.agents/tasks/${YEAR}/EWP-010-codex-quota/task.json`,
      )).toEqual({ ok: true, errors: [] });
      git(['worktree', 'remove', '--force', worktree]);
      git(['branch', '-D', 'ui/token-tool/codex-quota']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  test('worktree 目录不可写时返回机器可读失败且不留下分支', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-start-ro-'));
    const worktree = path.join(os.tmpdir(), `ewp-occupied-${Date.now()}`);
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      git(['add', '.']);
      git(['commit', '-m', 'init']);
      writeFileSync(worktree, 'occupied\n');
      const errors = [];
      const io = { log() {}, error(message) { errors.push(String(message)); } };
      expect(startMain([
        '--id', 'EWP-010', '--title', 'Read only worktree', '--kind', 'chore',
        '--paths', 'scripts/agent/,tests/unit/', '--worktree', worktree,
      ], root, io)).toBe(1);
      expect(errors.join('\n')).toContain('"code":"WORKTREE_NOT_WRITABLE"');
      expect(git(['branch', '--list', 'chore/read-only-worktree']).trim()).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  test('task 文件写入失败时回滚新建 worktree 和分支', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-start-write-fail-'));
    const worktree = path.join(os.tmpdir(), `ewp-write-fail-${Date.now()}`);
    const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      writeFileSync(path.join(root, '.agents'), 'not-a-directory\n');
      git(['add', '.']);
      git(['commit', '-m', 'init']);
      const errors = [];
      const io = { log() {}, error(message) { errors.push(String(message)); } };
      expect(startMain([
        '--id', 'EWP-011', '--title', 'Write fails', '--kind', 'chore',
        '--paths', 'scripts/agent/,tests/unit/', '--worktree', worktree,
      ], root, io)).toBe(1);
      expect(errors.join('\n')).toContain('"code":"TASK_WRITE_FAILED"');
      expect(existsSync(path.join(worktree, '.git'))).toBe(false);
      expect(git(['branch', '--list', 'chore/write-fails']).trim()).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  test('后续入口会阻断缺少启动证据的伪造 task', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-start-forged-'));
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      mkdirSync(path.join(root, '.agents', 'tasks', '2026', 'EWP-012-forged-task'), { recursive: true });
      writeFileSync(path.join(root, '.agents', 'protocol.json'), JSON.stringify({
        schemaVersion: 1,
        taskStates: ['planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'],
      }, null, 2));
      writeFileSync(path.join(root, '.agents', 'tasks', '2026', 'EWP-012-forged-task', 'task.json'), `${JSON.stringify({
        schemaVersion: 1,
        id: 'EWP-012',
        title: 'Forged task',
        status: 'planned',
        kind: 'chore',
        branch: 'chore/forged-task',
        baseBranch: 'dev',
        baseSha: 'a'.repeat(40),
        allowedPaths: ['scripts/agent/'],
        spec: '.agents/tasks/2026/EWP-012-forged-task/plan.md',
        notes: [],
        requiredGates: 'auto',
        evidence: [],
        review: null,
        readyHead: null,
      }, null, 2)}\n`);
      writeFileSync(path.join(root, '.agents', 'tasks', '2026', 'EWP-012-forged-task', 'plan.md'), '# forged\n');
      git(['add', '.']);
      git(['commit', '-m', 'init']);
      const errors = [];
      const io = { log() {}, error(message) { errors.push(String(message)); } };
      expect(finishMain([
        '--task', 'EWP-012',
        '--reviewer', 'Codex',
        '--review-result', 'approved',
      ], root, io)).toBe(1);
      expect(errors.join('\n')).toContain('startRunId');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  test('预检会把 git 写权限失败标记为机器可读错误', async () => {
    const module = await import('../../scripts/agent/start-task.js');
    expect(typeof module.runStartPreflight).toBe('function');
    const result = module.runStartPreflight({
      rootDir: 'C:/repo',
      id: 'EWP-013',
      title: 'Git denied',
      kind: 'chore',
      branch: 'chore/git-denied',
      worktree: 'C:/tmp/git-denied',
      allowedPaths: ['scripts/agent/'],
      existingIds: [],
      year: YEAR,
      date: TODAY,
      deps: {
        gitBranch: () => 'dev',
        gitStatus: () => '',
        gitBaseSha: () => 'a'.repeat(40),
        gitBranchExists: () => false,
        gitWriteProbe: () => {
          throw new Error('permission denied');
        },
        ensureWorktreeWritable: () => {},
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('GIT_WRITE_FORBIDDEN');
  });

  test('worktree 和 branch 清理均失败时留下恢复记录并阻断后续入口', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-start-recovery-'));
    try {
      const result = cleanupStartArtifacts({
        rootDir: root,
        branch: 'chore/residual',
        worktree: path.join(os.tmpdir(), 'ewp-residual-worktree'),
        startRunId: 'residual-run',
        code: 'TASK_WRITE_FAILED',
        message: '模拟写入失败',
        deps: {
          worktreeExists: () => true,
          removeWorktree: () => { throw new Error('worktree locked'); },
          removeWorktreeFallback: () => { throw new Error('fallback denied'); },
          branchExists: () => true,
          removeBranch: () => { throw new Error('branch checked out'); },
        },
      });

      expect(result.cleanup).toEqual({ worktreeRemoved: false, branchRemoved: false });
      expect(result.recoveryPath.replaceAll('\\', '/')).toContain('.agents/recovery/agent-start/');
      const artifacts = listStartRecoveryArtifacts(root);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]).toMatchObject({
        startRunId: 'residual-run',
        branch: 'chore/residual',
        cleanup: { worktreeRemoved: false, branchRemoved: false },
      });
      expect(validateStartEvidence(root, { startRunId: 'residual-run' }).errors.join(' ')).toContain('后续入口已阻断');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
