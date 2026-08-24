import { describe, expect, test } from 'vitest';
import { buildChangeScope, parseScopeArgs } from '../../scripts/agent/change-scope.js';

describe('agent:scope', () => {
  test('解析 task、base、head 参数', () => {
    expect(parseScopeArgs(['--task', 'EWP-003', '--base', 'dev', '--head', 'HEAD']))
      .toEqual({ taskId: 'EWP-003', base: 'dev', head: 'HEAD', json: false });
  });

  test('输出排序去重后的稳定路径与越界结果', () => {
    expect(buildChangeScope({
      task: { id: 'EWP-003', branch: 'docs/ewp-scope-gates', allowedPaths: ['docs/', 'tests/unit/'] },
      base: 'dev',
      head: 'HEAD',
      changedPaths: ['tests/unit/z.test.js', 'docs/a.md', 'docs/a.md', 'src/app.js'],
    })).toMatchObject({
      taskId: 'EWP-003',
      branch: 'docs/ewp-scope-gates',
      base: 'dev',
      head: 'HEAD',
      changedPaths: ['docs/a.md', 'src/app.js', 'tests/unit/z.test.js'],
      violations: ['src/app.js'],
      ok: false,
      policyHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      policy: expect.objectContaining({ policyHash: expect.any(String) }),
      artifacts: expect.any(Object),
      classification: expect.objectContaining({ primary: expect.any(String) }),
    });
  });

  test('app 加 task sidecar 使用 Policy 的 artifact-aware classification', () => {
    const scope = buildChangeScope({
      branch: 'app/notes/scope',
      changedPaths: ['src/apps/notes/index.js', '.agents/tasks/2026/EV-026/task.json'],
    });

    expect(scope.classification).toMatchObject({ primary: 'app', surfaces: ['app'] });
    expect(scope.artifacts.sidecarPaths).toEqual(['.agents/tasks/2026/EV-026/task.json']);
    expect(scope.policyHash).toBe(scope.policy.policyHash);
    expect(scope.policy.requiresTask).toBe(false);
  });
});
