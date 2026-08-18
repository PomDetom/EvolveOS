import { describe, expect, test } from 'vitest';
import { buildChangeScope, parseScopeArgs } from '../../scripts/agent/change-scope.js';

describe('agent:scope', () => {
  test('解析 task、base、head 参数', () => {
    expect(parseScopeArgs(['--task', 'EWP-003', '--base', 'dev', '--head', 'HEAD']))
      .toEqual({ taskId: 'EWP-003', base: 'dev', head: 'HEAD' });
  });

  test('输出排序去重后的稳定路径与越界结果', () => {
    expect(buildChangeScope({
      task: { id: 'EWP-003', branch: 'docs/ewp-scope-gates', allowedPaths: ['docs/', 'tests/unit/'] },
      base: 'dev',
      head: 'HEAD',
      changedPaths: ['tests/unit/z.test.js', 'docs/a.md', 'docs/a.md', 'src/app.js'],
    })).toEqual({
      taskId: 'EWP-003',
      branch: 'docs/ewp-scope-gates',
      base: 'dev',
      head: 'HEAD',
      changedPaths: ['docs/a.md', 'src/app.js', 'tests/unit/z.test.js'],
      violations: ['src/app.js'],
      ok: false,
    });
  });
});
