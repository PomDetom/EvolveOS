import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApprovedApproval, deriveApprovalScope } from '../../scripts/agent/approval.js';

const entryPath = path.resolve(process.cwd(), 'scripts/merge-to-dev.js');

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function createReadinessFixture(kind) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-merge-readiness-'));
  const taskDirectory = '.agents/tasks/2026/EWP-008-merge-readiness';
  const planPath = `${taskDirectory}/plan.md`;
  const planText = [
    '# EWP-008 merge readiness',
    '',
    '## Acceptance',
    '',
    '- [ ] merge readiness 会阻断未审批任务',
    '',
    '## Product Assumptions',
    '',
    '- [ ] 本任务只改变原生任务治理，不改变产品运行时行为',
  ].join('\n');
  const driftedPlanText = `${planText}\n\n追加的已审批范围外变更`;
  mkdirSync(path.join(root, '.agents'), { recursive: true });
  writeFileSync(path.join(root, '.agents/protocol.json'), JSON.stringify({
    schemaVersion: 1,
    mode: 'enforced',
    baseBranch: 'dev',
    taskRoot: '.agents/tasks',
    taskStates: ['awaiting_approval', 'planned', 'ready'],
  }));
  writeFileSync(path.join(root, 'source.txt'), 'base\n');
  git(root, ['init', '-b', 'dev']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Task 8B Test']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  git(root, ['checkout', '-b', 'chore/ewp-merge-readiness']);
  writeFileSync(path.join(root, 'source.txt'), 'branch\n');
  git(root, ['add', 'source.txt']);
  git(root, ['commit', '-m', 'implementation']);
  const changeHead = git(root, ['rev-parse', 'HEAD']);
  const task = {
    schemaVersion: 1,
    id: 'EWP-008',
    title: 'merge readiness approval',
    status: 'ready',
    kind: 'chore',
    branch: 'chore/ewp-merge-readiness',
    baseBranch: 'dev',
    baseSha: changeHead,
    allowedPaths: ['source.txt', `${taskDirectory}/`],
    spec: 'approval gate',
    notes: [],
    requiredGates: [],
    changeHead,
    evidence: [{ gate: 'unit', testedHead: changeHead, result: 'success' }],
    review: { reviewedHead: changeHead, findings: { critical: [], important: [] } },
    readyHead: null,
    startRunId: 'run-8b',
    preflight: {},
    initCommit: changeHead,
  };
  const approvalScope = deriveApprovalScope({ task, planText, planPath });
  if (kind === 'approved') {
    task.approval = buildApprovedApproval({
      approver: 'Task 8B Test',
      approvedAt: '2026-08-19T00:00:00.000Z',
      scope: approvalScope,
    });
  } else if (kind === 'drift') {
    task.approval = buildApprovedApproval({
      approver: 'Task 8B Test',
      approvedAt: '2026-08-19T00:00:00.000Z',
      scope: approvalScope,
    });
  } else if (kind === 'code-review-only') {
    task.approval = undefined;
  }
  mkdirSync(path.join(root, taskDirectory), { recursive: true });
  writeFileSync(path.join(root, planPath), kind === 'drift' ? driftedPlanText : planText);
  writeFileSync(path.join(root, `${taskDirectory}/task.json`), JSON.stringify(task));
  git(root, ['add', '.agents/tasks']);
  git(root, ['commit', '-m', 'record task evidence']);
  return { root, branch: task.branch };
}

describe('merge-to-dev 主入口', () => {
  test('主入口应能被 Node 加载检查', () => {
    expect(() => execFileSync(process.execPath, ['--check', entryPath], { encoding: 'utf8' })).not.toThrow();
  });

  test.each([
    ['未审批 task', 'unapproved', '缺少方案审批记录'],
    ['审批漂移 task', 'drift', '方案范围已变化，需重新审批'],
    ['历史 task 无 approval', 'legacy', '缺少方案审批记录'],
    ['只有 code review 无 approval', 'code-review-only', '缺少方案审批记录'],
  ])('%s 的 merge readiness 由真实主入口阻断', async (_label, kind, issue) => {
    const fixture = createReadinessFixture(kind);
    try {
      const { nativeReadinessFor } = await import('../../scripts/merge-to-dev.js');
      const report = nativeReadinessFor(fixture.branch, fixture.root);
      expect(report.mode).toBe('enforced');
      expect(report.ok).toBe(false);
      expect(report.issues).toContain(issue);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
