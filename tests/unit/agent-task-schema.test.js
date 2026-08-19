import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { validateStartEvidence, validateTask } from '../../scripts/agent/task-schema.js';

const taskDirectory = '.agents/tasks/2026/EWP-001-native-workflow';

function validTask(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'EWP-001',
    title: '建立 EWP 骨架',
    status: 'awaiting_approval',
    kind: 'chore',
    branch: 'chore/ewp-skeleton',
    baseBranch: 'dev',
    baseSha: '54bea15495ca2cfdae93a7da1c971c2b38fda841',
    allowedPaths: ['.agents/', 'scripts/agent/', 'tests/unit/agent-task-schema.test.js'],
    spec: 'docs/superpowers/specs/2026-08-18-evolve-workflow-protocol-design.md',
    notes: [],
    requiredGates: 'auto',
    evidence: [],
    review: null,
    approval: {
      status: 'awaiting_approval',
      approver: null,
      approvedAt: null,
      scopeHash: null,
      scope: {
        planPath: '.agents/tasks/2026/EWP-001-native-workflow/plan.md',
        allowedPaths: ['.agents/', 'scripts/agent/', 'tests/unit/agent-task-schema.test.js'],
        acceptance: ['verify 会拒绝未获方案审批的任务'],
        productAssumptions: [],
      },
    },
    readyHead: null,
    startRunId: 'run-001',
    preflight: {
      ok: true,
      checkedAt: '2026-08-19T00:00:00.000Z',
      checks: { gitWritable: true, branchAvailable: true, taskIdAvailable: true, worktreeWritable: true },
    },
    initCommit: 'b'.repeat(40),
    ...overrides,
  };
}

describe('EWP task schema', () => {
  test('accepts a valid task with awaiting_approval status', () => {
    expect(validateTask(validTask(), taskDirectory)).toEqual({ ok: true, errors: [] });
  });

  test('legacy task 缺少 approval 字段仍可解析，但不会自动视为 approved', () => {
    const legacy = validTask();
    delete legacy.approval;
    expect(validateTask(legacy, taskDirectory)).toEqual({ ok: true, errors: [] });
  });

  test('rejects an unknown status', () => {
    const result = validateTask(validTask({ status: 'draft' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('status');
  });

  test('rejects a malformed approved approval record', () => {
    const result = validateTask(validTask({
      status: 'planned',
      approval: {
        status: 'approved',
        approver: 'Codex',
        approvedAt: '2026-08-19T00:00:00.000Z',
        scopeHash: 'abc',
        scope: null,
      },
    }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('scopeHash');
  });

  test('rejects a task id that does not match its directory', () => {
    const result = validateTask(validTask({ id: 'EWP-002' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('目录');
  });

  test('rejects a branch without an approved prefix', () => {
    const result = validateTask(validTask({ branch: 'feature/ewp-skeleton' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('branch');
  });

  test('accepts a task whose base branch is a recovery ref', () => {
    const result = validateTask(validTask({ baseBranch: 'recovery/validated' }), taskDirectory);
    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('rejects a malformed base branch ref', () => {
    const result = validateTask(validTask({ baseBranch: '../outside' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('baseBranch');
  });

  test('rejects an app task without its app path', () => {
    const result = validateTask(validTask({
      kind: 'app',
      branch: 'app/ledger/report',
      allowedPaths: ['docs/ledger.md'],
      approval: {
        status: 'awaiting_approval',
        approver: null,
        approvedAt: null,
        scopeHash: null,
        scope: {
          planPath: '.agents/tasks/2026/EWP-001-native-workflow/plan.md',
          allowedPaths: ['docs/ledger.md'],
          acceptance: ['verify 会拒绝未获方案审批的任务'],
          productAssumptions: [],
        },
      },
    }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('src/apps/ledger/');
  });

  test('accepts nested ui branch names used by Tauri tasks', () => {
    const result = validateTask(validTask({
      kind: 'tauri',
      branch: 'ui/token-tool/codex-quota',
      allowedPaths: ['src-tauri/src/', 'src/apps/token-tool/'],
      approval: {
        status: 'awaiting_approval',
        approver: null,
        approvedAt: null,
        scopeHash: null,
        scope: {
          planPath: '.agents/tasks/2026/EWP-001-native-workflow/plan.md',
          allowedPaths: ['src-tauri/src/', 'src/apps/token-tool/'],
          acceptance: ['verify 会拒绝未获方案审批的任务'],
          productAssumptions: ['桌面权限仍由人工 gate 兜底'],
        },
      },
    }), taskDirectory);
    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('rejects a ready task without readyHead', () => {
    const result = validateTask(validTask({ status: 'ready' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('readyHead');
  });

  test('rejects a task without start evidence', () => {
    const result = validateTask(validTask({
      startRunId: '',
      preflight: null,
      initCommit: null,
    }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('startRunId');
    expect(result.errors.join(' ')).toContain('preflight');
    expect(result.errors.join(' ')).toContain('initCommit');
  });

  test('rejects a self-consistent task json without agent:start initialization record', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-evidence-forged-'));
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      git(['add', '.']);
      git(['commit', '-m', 'init']);
      const baseSha = git(['rev-parse', 'HEAD']);
      const taskPath = '.agents/tasks/2026/EWP-099-forged/task.json';
      const task = validTask({
        id: 'EWP-099',
        branch: 'chore/forged',
        baseSha,
        startRunId: 'forged-run',
        initCommit: baseSha,
        preflight: {
          ok: true,
          checkedAt: '2026-08-19T00:00:00.000Z',
          checks: { gitWritable: true, branchAvailable: true, taskIdAvailable: true, worktreeWritable: true },
        },
      });
      mkdirSync(path.join(root, path.dirname(taskPath)), { recursive: true });
      writeFileSync(path.join(root, taskPath), `${JSON.stringify(task, null, 2)}\n`);
      git(['add', '.']);
      git(['commit', '-m', 'forge task']);

      const result = validateStartEvidence(root, task, taskPath);

      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toContain('agent:start');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});
