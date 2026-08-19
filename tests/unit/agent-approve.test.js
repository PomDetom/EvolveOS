import { describe, expect, test } from 'vitest';
import { parseApproveArgs } from '../../scripts/agent/approve-task.js';
import {
  buildApprovedApproval,
  deriveApprovalScope,
  evaluateApprovalScope,
  evaluateTaskApproval,
  hashApprovalScope,
} from '../../scripts/agent/approval.js';

function task(overrides = {}) {
  return {
    id: 'EWP-008',
    title: '方案审批门禁',
    kind: 'tauri',
    branch: 'chore/ewp-start-transaction',
    allowedPaths: ['src-tauri/src/', 'scripts/agent/', '.agents/tasks/2026/EWP-008-approval-gate/'],
    approval: null,
    ...overrides,
  };
}

const approvedPlan = [
  '# EWP-008 方案审批门禁',
  '',
  '## 目标',
  '',
  '收紧 Task 8B 的方案审批门禁。',
  '',
  '## Acceptance',
  '',
  '- [ ] agent:verify、agent:finish 和 merge-to-dev 会拒绝未获方案审批的任务',
  '- [ ] 方案范围变化后旧审批自动失效并回到 awaiting_approval',
  '',
  '## Product Assumptions',
  '',
  '- [ ] Tauri 权限与桌面行为会继续由人工 gate 兜底',
].join('\n');

describe('agent:approve 与审批 scope', () => {
  test('解析 approve 参数', () => {
    expect(parseApproveArgs(['--task', 'EWP-008', '--approver', 'Codex']))
      .toEqual({ taskId: 'EWP-008', approver: 'Codex' });
  });

  test('allowedPaths 顺序变化不会改变稳定 hash', () => {
    const first = deriveApprovalScope({
      task: task({ allowedPaths: ['scripts/agent/', 'src-tauri/src/'] }),
      planText: approvedPlan,
      planPath: '.agents/tasks/2026/EWP-008-approval-gate/plan.md',
    });
    const second = deriveApprovalScope({
      task: task({ allowedPaths: ['src-tauri/src/', 'scripts/agent/'] }),
      planText: approvedPlan,
      planPath: '.agents/tasks/2026/EWP-008-approval-gate/plan.md',
    });

    expect(hashApprovalScope(first)).toBe(hashApprovalScope(second));
  });

  test('legacy task 缺少 approval 记录时不会被误判为已批准', () => {
    const result = evaluateTaskApproval({
      task: task({ approval: null }),
      planText: approvedPlan,
      planPath: '.agents/tasks/2026/EWP-008-approval-gate/plan.md',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('缺少方案审批记录');
  });

  test('Tauri 任务缺少具体 product assumptions 时不能审批', () => {
    const result = evaluateApprovalScope({
      task: task(),
      planText: [
        '# EWP-008 方案审批门禁',
        '',
        '## Acceptance',
        '',
        '- [ ] verify 会阻断未批准任务',
        '',
        '## Product Assumptions',
        '',
        '- [ ] 如涉及 UI/Tauri/持久化/跨模块，先写明用户可见假设；否则写“不适用”',
      ].join('\n'),
      planPath: '.agents/tasks/2026/EWP-008-approval-gate/plan.md',
    });

    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('Product Assumptions');
  });

  test('approval 记录会绑定批准时的 acceptance 与 product assumptions', () => {
    const scope = deriveApprovalScope({
      task: task(),
      planText: approvedPlan,
      planPath: '.agents/tasks/2026/EWP-008-approval-gate/plan.md',
    });

    expect(buildApprovedApproval({
      approver: 'Codex',
      approvedAt: '2026-08-19T00:00:00.000Z',
      scope,
    })).toMatchObject({
      status: 'approved',
      approver: 'Codex',
      scopeHash: hashApprovalScope(scope),
      scope: {
        acceptance: [
          'agent:verify、agent:finish 和 merge-to-dev 会拒绝未获方案审批的任务',
          '方案范围变化后旧审批自动失效并回到 awaiting_approval',
        ],
        productAssumptions: ['Tauri 权限与桌面行为会继续由人工 gate 兜底'],
      },
    });
  });
});
