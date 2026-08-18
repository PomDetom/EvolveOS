import { describe, expect, test } from 'vitest';
import { evaluateNativeReadiness, formatNativeReadiness } from '../../scripts/merge-to-dev-agent-utils.js';

const head = 'b'.repeat(40);

function readyTask(overrides = {}) {
  return {
    id: 'EWP-001',
    status: 'ready',
    branch: 'chore/ewp-skeleton',
    readyHead: head,
    evidence: [{ gate: 'build', headSha: head, result: 'success' }],
    review: { reviewedHead: head, findings: { critical: [], important: [] } },
    ...overrides,
  };
}

describe('merge-to-dev native readiness', () => {
  test('shadow 缺 task 只报告 warning，不阻断', () => {
    const report = evaluateNativeReadiness({ mode: 'shadow', task: null, taskBranch: null, branchHead: head });
    expect(report.ok).toBe(true);
    expect(report.issues).toContain('未找到对应 native task');
    expect(formatNativeReadiness(report)).toContain('result=warning');
  });

  test('shadow 旧 evidence/缺评审只报告 issues', () => {
    const report = evaluateNativeReadiness({
      mode: 'shadow',
      task: readyTask({ readyHead: 'a'.repeat(40), review: null }),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
    });
    expect(report.ok).toBe(true);
    expect(report.issues.join(' ')).toContain('readyHead');
    expect(report.issues.join(' ')).toContain('评审');
  });

  test('enforced 拒绝 branch 不一致和未解决 Important', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask({ review: { reviewedHead: head, findings: { critical: [], important: ['问题'] } } }),
      taskBranch: 'chore/other',
      branchHead: head,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toContain('branch');
    expect(report.issues.join(' ')).toContain('Important');
  });

  test('enforced 找不到 task 时阻断', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: null,
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
    });
    expect(report.ok).toBe(false);
    expect(report.issues).toContain('未找到对应 native task');
  });

  test('enforced 拒绝过期 evidence 和评审', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask({
        evidence: [{ gate: 'build', headSha: 'a'.repeat(40), result: 'success' }],
        review: null,
      }),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toContain('evidence headSha');
    expect(report.issues.join(' ')).toContain('评审');
  });

  test('当前 SHA、评审和 evidence 完整时通过', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask(),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
    });
    expect(report).toMatchObject({ ok: true, issues: [] });
  });
});
