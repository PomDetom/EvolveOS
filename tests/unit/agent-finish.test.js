import { describe, expect, test } from 'vitest';
import { parseFinishArgs, buildReviewRecord } from '../../scripts/agent/finish-task.js';

describe('agent:finish', () => {
  test('解析 finish 参数', () => {
    expect(parseFinishArgs([
      '--task', 'EWP-010',
      '--reviewer', 'Codex',
      '--review-result', 'approved',
    ])).toEqual({ taskId: 'EWP-010', reviewer: 'Codex', reviewResult: 'approved' });
  });

  test('生成绑定 testedHead 的 Review 记录', () => {
    expect(buildReviewRecord({
      reviewer: 'Codex',
      result: 'approved',
      reviewedHead: 'b'.repeat(40),
    })).toEqual({
      reviewer: 'Codex',
      result: 'approved',
      reviewedHead: 'b'.repeat(40),
      findings: { critical: [], important: [], minor: [] },
    });
  });
});
