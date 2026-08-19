import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildApprovedApproval, buildAwaitingApproval, deriveApprovalScope } from '../../scripts/agent/approval.js';
import { main as implementMain, parseImplementArgs } from '../../scripts/agent/implement-task.js';

function fixture({ approval = 'none', mutatePlan = false, missingStartEvidence = false } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-implement-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const taskDirectory = '.agents/tasks/2026/EWP-020-implement-gate';
  const taskPath = `${taskDirectory}/task.json`;
  const planPath = `${taskDirectory}/plan.md`;
  const plan = [
    '# EWP-020 implement gate',
    '',
    '## Acceptance',
    '',
    '- [ ] agent:implement 只把已审批 task 置为 implementing',
  ].join('\n');
  try {
    git(['init', '-b', 'dev']);
    git(['config', 'user.email', 'ewp@example.com']);
    git(['config', 'user.name', 'EWP Test']);
    writeFileSync(path.join(root, 'README.md'), 'dev\n');
    git(['add', '.']);
    git(['commit', '-m', 'base']);
    const baseSha = git(['rev-parse', 'HEAD']);
    git(['checkout', '-b', 'chore/implement-gate']);
    mkdirSync(path.join(root, taskDirectory), { recursive: true });
    writeFileSync(path.join(root, planPath), plan);
    const preflight = { ok: true, checks: { branch: 'dev', status: 'clean' } };
    const initialTask = {
      schemaVersion: 1,
      id: 'EWP-020',
      title: 'implement gate',
      status: 'awaiting_approval',
      kind: 'chore',
      branch: 'chore/implement-gate',
      baseBranch: 'dev',
      baseSha,
      allowedPaths: ['scripts/agent/', `${taskDirectory}/`],
      spec: planPath,
      notes: [],
      requiredGates: 'auto',
      evidence: [],
      review: null,
      changeHead: null,
      readyHead: null,
      startRunId: 'start-implement-020',
      preflight,
      initCommit: '0'.repeat(40),
    };
    const scope = deriveApprovalScope({ task: initialTask, planText: plan, planPath });
    initialTask.approval = buildAwaitingApproval({ scope });
    if (approval === 'approved') {
      initialTask.status = 'planned';
      initialTask.approval = buildApprovedApproval({
        approver: 'Codex',
        approvedAt: '2026-08-19T00:00:00.000Z',
        scope,
      });
    } else {
      delete initialTask.approval;
    }
    if (missingStartEvidence) {
      delete initialTask.startRunId;
      delete initialTask.preflight;
      delete initialTask.initCommit;
    }
    writeFileSync(path.join(root, taskPath), `${JSON.stringify(initialTask, null, 2)}\n`);
    mkdirSync(path.join(root, '.agents/start-runs'), { recursive: true });
    writeFileSync(path.join(root, `.agents/start-runs/${initialTask.startRunId ?? 'missing'}.json`), JSON.stringify({
      startRunId: initialTask.startRunId,
      id: initialTask.id,
      title: initialTask.title,
      branch: initialTask.branch,
      baseBranch: initialTask.baseBranch,
      baseSha,
      taskPath,
      preflight,
    }));
    writeFileSync(path.join(root, '.agents/protocol.json'), JSON.stringify({
      schemaVersion: 1,
      taskStates: ['awaiting_approval', 'planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'],
    }));
    git(['add', '.']);
    git(['commit', '-m', 'chore: 初始化 EWP-020 任务']);
    const initCommit = git(['rev-parse', 'HEAD']);
    const currentTask = JSON.parse(readFileSync(path.join(root, taskPath), 'utf8'));
    currentTask.initCommit = initCommit;
    if (missingStartEvidence) currentTask.initCommit = '0'.repeat(40);
    if (mutatePlan) writeFileSync(path.join(root, planPath), `${plan}\n\n范围已扩大\n`);
    writeFileSync(path.join(root, taskPath), `${JSON.stringify(currentTask, null, 2)}\n`);
    return { root, taskPath, readTask: () => readFileSync(path.join(root, taskPath), 'utf8') };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function io() {
  return { logs: [], errors: [], log(message) { this.logs.push(String(message)); }, error(message) { this.errors.push(String(message)); } };
}

describe('agent:implement', () => {
  test('解析 task 与 dry-run', () => {
    expect(parseImplementArgs(['--task', 'EWP-020', '--dry-run']))
      .toEqual({ taskId: 'EWP-020', dryRun: true });
  });

  test.each([
    ['未审批', { approval: 'none' }, '方案审批'],
    ['历史 task 无 approval', { approval: 'legacy' }, '方案审批'],
    ['审批 scope 漂移', { approval: 'approved', mutatePlan: true }, '范围已变化'],
    ['启动证据缺失', { approval: 'approved', missingStartEvidence: true }, 'startRunId'],
  ])('%s 退出 1 且不写 task', (_name, options, message) => {
    const fixtureData = fixture(options);
    try {
      const before = fixtureData.readTask();
      const output = io();
      expect(implementMain(['--task', 'EWP-020'], fixtureData.root, output)).toBe(1);
      expect(output.errors.join('\n')).toContain(message);
      expect(fixtureData.readTask()).toBe(before);
    } finally {
      rmSync(fixtureData.root, { recursive: true, force: true });
    }
  }, 30000);

  test('已批准 task 的 dry-run 不执行实现动作且保持可实施状态', () => {
    const fixtureData = fixture({ approval: 'approved' });
    try {
      const output = io();
      expect(implementMain(['--task', 'EWP-020', '--dry-run'], fixtureData.root, output)).toBe(0);
      expect(output.logs.join('\n')).toContain('planned -> implementing');
      expect(JSON.parse(fixtureData.readTask()).status).toBe('planned');
    } finally {
      rmSync(fixtureData.root, { recursive: true, force: true });
    }
  }, 30000);

  test('已批准 task 的正常入口只更新状态为 implementing', () => {
    const fixtureData = fixture({ approval: 'approved' });
    try {
      const output = io();
      expect(implementMain(['--task', 'EWP-020'], fixtureData.root, output)).toBe(0);
      expect(JSON.parse(fixtureData.readTask()).status).toBe('implementing');
      expect(output.logs.join('\n')).toContain('不执行实现代码动作');
    } finally {
      rmSync(fixtureData.root, { recursive: true, force: true });
    }
  }, 30000);
});
