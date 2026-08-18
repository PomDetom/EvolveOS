import { describe, expect, test } from 'vitest';
import { parseTaskArgs } from '../../scripts/agent/validate-task.js';

describe('agent:task-check 参数', () => {
  test('读取 --task 的任务 ID', () => {
    expect(parseTaskArgs(['--task', 'EWP-001'])).toEqual({ taskId: 'EWP-001' });
  });

  test('缺少 --task 时返回空 ID', () => {
    expect(parseTaskArgs([])).toEqual({ taskId: null });
  });
});
