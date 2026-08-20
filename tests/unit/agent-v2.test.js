import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { getChangedPaths } from '../../scripts/agent/change-scope.js';
import { selectGates } from '../../scripts/agent/select-gates.js';
import { validateTask } from '../../scripts/agent/task-schema.js';
import { evaluateNativeReadiness } from '../../scripts/merge-to-dev-agent-utils.js';

describe('repository-native workflow v2', () => {
  test('protocol is constants-only', () => {
    const protocol = JSON.parse(readFileSync('.agents/protocol.json', 'utf8'));
    expect(protocol.schemaVersion).toBe(2);
    expect(protocol).not.toHaveProperty('mode');
    expect(protocol).not.toHaveProperty('taskStates');
  });

  test('recovery manifest has no lifecycle state fields', () => {
    const task = {
      schemaVersion: 2,
      id: 'EV-999',
      title: '恢复任务',
      branch: 'chore/recovery',
      baseBranch: 'dev',
      baseSha: 'a'.repeat(40),
      intent: '跨会话恢复',
      allowedPaths: ['scripts/'],
      acceptance: ['可恢复'],
      references: { spec: null, plan: null, notes: [] },
      recovery: { state: 'active', blockedReason: null },
    };
    expect(validateTask(task, '.agents/tasks/2026/EV-999-recovery')).toEqual({ ok: true, errors: [] });
    expect(task).not.toHaveProperty('status');
    expect(task).not.toHaveProperty('evidence');
  });

  test('checks route from changed paths without a task', () => {
    expect(selectGates({ changedPaths: ['docs/workflow.md'] })).toEqual(['docs-check']);
    expect(selectGates({ changedPaths: ['src/apps/notes/notes.js'] })).toEqual(['unit', 'app-e2e', 'build']);
    expect(selectGates({ changedPaths: ['scripts/agent/verify.js'] })).toEqual(['scripts-unit', 'workflow-fixture']);
    expect(selectGates({ changedPaths: ['src-tauri/src/main.rs', 'src-tauri/capabilities/default.json'] })).toEqual(['rust-check', 'web-contract', 'permission-check', 'desktop-manual']);
    expect(selectGates({ changedPaths: ['.agents/notes/proposed/process/note.md', 'scripts/agent/verify.js', 'tests/unit/agent-v2.test.js', 'package.json'] })).toEqual([
      'docs-check',
      'notes-check',
      'scripts-unit',
      'workflow-fixture',
      'build',
      'shell-smoke',
      'unit',
    ]);
  });

  test('scope includes untracked files in the current worktree', () => {
    expect(getChangedPaths(process.cwd())).toContain('tests/unit/agent-v2.test.js');
  });

  test('merge readiness binds evidence to current facts', () => {
    const baseSha = 'a'.repeat(40);
    const headSha = 'b'.repeat(40);
    const task = { schemaVersion: 2, id: 'EV-022', branch: 'chore/recovery', baseSha, recovery: { state: 'active' } };
    const result = evaluateNativeReadiness({
      task,
      taskBranch: task.branch,
      branchHead: headSha,
      baseSha,
      changedPathsHash: 'paths',
      requiredGates: ['build'],
      evidence: [{ commandId: 'build', result: 'success', baseSha, headSha, changedPathsHash: 'paths' }],
      requireReview: false,
    });
    expect(result).toMatchObject({ ok: true, issues: [] });
    expect(evaluateNativeReadiness({
      task,
      taskBranch: task.branch,
      branchHead: 'c'.repeat(40),
      baseSha,
      changedPathsHash: 'paths',
      requiredGates: ['build'],
      evidence: [{ commandId: 'build', result: 'success', baseSha, headSha, changedPathsHash: 'paths' }],
      requireReview: false,
    }).ok).toBe(false);
  });
});
