import { describe, expect, test } from 'vitest';
import { evaluateNativeReadiness, formatNativeReadiness } from '../../scripts/merge-to-dev-agent-utils.js';

const head = 'b'.repeat(40);

function readyTask(overrides = {}) {
  return {
    id: 'EWP-001',
    status: 'ready',
    branch: 'chore/ewp-skeleton',
    readyHead: head,
    approval: {
      status: 'approved',
      approver: 'Codex',
      approvedAt: '2026-08-19T00:00:00.000Z',
      scopeHash: 'd'.repeat(64),
      scope: {
        planPath: '.agents/tasks/2026/EWP-001-native-workflow/plan.md',
        allowedPaths: ['scripts/agent/'],
        acceptance: ['merge-to-dev 会拒绝未获方案审批的任务'],
        productAssumptions: [],
      },
    },
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

  test('enforced 方案审批缺失时阻断', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask({ approval: null }),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
      approvalIssues: ['缺少方案审批记录'],
    });
    expect(report.ok).toBe(false);
    expect(report.issues).toContain('缺少方案审批记录');
  });

  test('enforced 方案范围变化后阻断', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask(),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
      approvalIssues: ['方案范围已变化，需重新审批'],
    });
    expect(report.ok).toBe(false);
    expect(report.issues).toContain('方案范围已变化，需重新审批');
  });

  test('enforced 过程记录缺失时阻断', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask(),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
      activityIssues: ['缺少任务过程记录: .agents/tasks/2026/EWP-001/activity.jsonl'],
    });
    expect(report.ok).toBe(false);
    expect(report.issues).toContain('缺少任务过程记录: .agents/tasks/2026/EWP-001/activity.jsonl');
  });

  test('当前 SHA、评审、evidence 和审批完整时通过', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: readyTask(),
      taskBranch: 'chore/ewp-skeleton',
      branchHead: head,
      approvalIssues: [],
    });
    expect(report).toMatchObject({ ok: true, issues: [] });
  });

  test('允许 evidence/review 之后追加 task 文档提交', () => {
    const recordHead = 'c'.repeat(40);
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: {
        ...readyTask(),
        changeHead: head,
        evidence: [{ gate: 'build', testedHead: head, result: 'success' }],
        review: { reviewedHead: head, findings: { critical: [], important: [] } },
      },
      taskBranch: 'chore/ewp-skeleton',
      branchHead: recordHead,
      changeHeadAncestor: true,
      codeChangedAfterHead: false,
      approvalIssues: [],
    });
    expect(report).toMatchObject({ ok: true, issues: [] });
  });

  test('历史 evidence 不覆盖同一 gate 的最新成功记录', () => {
    const recordHead = 'c'.repeat(40);
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: {
        ...readyTask(),
        changeHead: head,
        evidence: [
          { gate: 'build', commandId: 'build', testedHead: 'a'.repeat(40), result: 'failed' },
          { gate: 'build', commandId: 'build', testedHead: head, result: 'success' },
        ],
        review: { reviewedHead: head, findings: { critical: [], important: [] } },
      },
      taskBranch: 'chore/ewp-skeleton',
      branchHead: recordHead,
      changeHeadAncestor: true,
      codeChangedAfterHead: false,
      approvalIssues: [],
    });
    expect(report).toMatchObject({ ok: true, issues: [] });
  });

  test('代码在验证后变化时阻断', () => {
    const report = evaluateNativeReadiness({
      mode: 'enforced',
      task: {
        ...readyTask(),
        changeHead: head,
        evidence: [{ gate: 'build', testedHead: head, result: 'success' }],
        review: { reviewedHead: head, findings: { critical: [], important: [] } },
      },
      taskBranch: 'chore/ewp-skeleton',
      branchHead: 'c'.repeat(40),
      changeHeadAncestor: true,
      codeChangedAfterHead: true,
      approvalIssues: [],
    });
    expect(report.ok).toBe(false);
    expect(report.issues).toContain('验证后又发生代码改动');
  });
});
