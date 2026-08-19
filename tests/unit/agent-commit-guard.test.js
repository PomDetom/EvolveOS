import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { guardCommit } from '../../scripts/agent/commit-guard.js';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function setup({ approved = true, allowedPaths = ['scripts/agent/'] } = {}) {
  const root = path.join(os.tmpdir(), `ewp-guard-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const taskDirectory = '.agents/tasks/2026/EWP-001-guard';
  const taskPath = `${taskDirectory}/task.json`;
  mkdirSync(path.join(root, taskDirectory), { recursive: true });
  mkdirSync(path.join(root, '.agents/start-runs'), { recursive: true });
  git(root, ['init', '-b', 'dev']);
  git(root, ['config', 'user.email', 'ewp@example.com']);
  git(root, ['config', 'user.name', 'EWP Test']);
  writeFileSync(path.join(root, 'README.md'), 'base\n');
  writeFileSync(path.join(root, '.agents/protocol.json'), JSON.stringify({ schemaVersion: 1, mode: 'shadow', taskStates: ['awaiting_approval', 'planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'] }));
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  const actualBaseSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['switch', '-c', 'chore/guard']);
  const task = {
    schemaVersion: 1,
    id: 'EWP-001',
    title: 'guard',
    status: 'implementing',
    kind: 'chore',
    branch: 'chore/guard',
    baseBranch: 'dev',
    baseSha: actualBaseSha,
    allowedPaths,
    spec: taskPath.replace('task.json', 'plan.md'),
    notes: [],
    requiredGates: 'auto',
    evidence: [],
    review: null,
    changeHead: null,
    readyHead: null,
    startRunId: 'start-001',
    preflight: { ok: true, checks: { gitClean: true } },
    initCommit: '0'.repeat(40),
    approval: approved ? { status: 'approved', approver: 'user', approvedAt: '2026-08-19T00:00:00.000Z', scopeHash: 'a'.repeat(64), scope: { planPath: '.agents/tasks/2026/EWP-001-guard/plan.md', allowedPaths, acceptance: ['guard'], productAssumptions: [] } } : { status: 'awaiting_approval', approver: null, approvedAt: null, scopeHash: null, scope: null },
  };
  writeFileSync(path.join(root, taskPath), `${JSON.stringify(task, null, 2)}\n`);
  writeFileSync(path.join(root, `${taskDirectory}/plan.md`), '# guard\n');
  writeFileSync(path.join(root, '.agents/start-runs/start-001.json'), JSON.stringify({ startRunId: 'start-001', id: 'EWP-001', title: 'guard', branch: 'chore/guard', baseBranch: 'dev', baseSha: actualBaseSha, taskPath, preflight: task.preflight }));
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'chore: 初始化 EWP-001 任务']);
  const initCommit = git(root, ['rev-parse', 'HEAD']);
  task.initCommit = initCommit;
  writeFileSync(path.join(root, taskPath), `${JSON.stringify(task, null, 2)}\n`);
  git(root, ['add', taskPath]);
  git(root, ['commit', '-m', 'chore: 记录 EWP-001 启动证据']);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe('EWP commit guard', () => {
  test('approved implementing task records a code commit intent', () => {
    const fixture = setup();
    try {
      mkdirSync(path.join(fixture.root, 'scripts/agent'), { recursive: true });
      writeFileSync(path.join(fixture.root, 'scripts/agent/change.js'), 'export default 1;\n');
      git(fixture.root, ['add', 'scripts/agent/change.js']);
      expect(guardCommit(fixture.root, { error() {} })).toBe(0);
      expect(git(fixture.root, ['diff', '--cached', '--name-only'])).toContain('activity.jsonl');
    } finally {
      fixture.cleanup();
    }
  });

  test('unapproved task cannot commit code', () => {
    const fixture = setup({ approved: false });
    try {
      mkdirSync(path.join(fixture.root, 'scripts/agent'), { recursive: true });
      writeFileSync(path.join(fixture.root, 'scripts/agent/change.js'), 'export default 1;\n');
      git(fixture.root, ['add', 'scripts/agent/change.js']);
      expect(guardCommit(fixture.root, { error() {} })).toBe(1);
    } finally {
      fixture.cleanup();
    }
  });

  test('direct commit on dev is rejected', () => {
    const fixture = setup();
    try {
      git(fixture.root, ['switch', 'dev']);
      writeFileSync(path.join(fixture.root, 'README.md'), 'direct\n');
      git(fixture.root, ['add', 'README.md']);
      expect(guardCommit(fixture.root, { error() {} })).toBe(1);
    } finally {
      fixture.cleanup();
    }
  });
});
