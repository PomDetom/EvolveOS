import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildChangeSnapshot, hashChangeFingerprint } from '../../scripts/agent/change-scope.js';
import { assessEvidence, createEvidence } from '../../scripts/agent/verify.js';
import { validateTask } from '../../scripts/agent/task-schema.js';
import { evaluateNativeReadiness } from '../../scripts/merge-to-dev-agent-utils.js';
import { selectGates } from '../../scripts/agent/select-gates.js';

describe('repository-native workflow v2.1', () => {
  test('exposes one immutable change snapshot for downstream gates', () => {
    const snapshot = buildChangeSnapshot(process.cwd(), 'dev', 'HEAD');

    expect(snapshot).toMatchObject({
      base: 'dev',
      head: 'HEAD',
      baseSha: expect.stringMatching(/^[0-9a-f]{40}$/),
      headSha: expect.stringMatching(/^[0-9a-f]{40}$/),
      changedPathsHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      changeFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
      changedPaths: expect.any(Array),
      classification: expect.any(Object),
    });
    expect(snapshot.changedPaths).toEqual([...snapshot.changedPaths].sort());
  });

  test('fingerprint changes when content changes under the same path', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-v21-fingerprint-'));
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      git(['config', 'core.autocrlf', 'false']);
      writeFileSync(path.join(root, 'tracked.txt'), 'base\n');
      git(['add', '.']);
      git(['commit', '-m', 'base']);
      writeFileSync(path.join(root, 'tracked.txt'), 'first\n');
      const first = hashChangeFingerprint(root);
      git(['add', 'tracked.txt']);
      expect(hashChangeFingerprint(root)).toBe(first);
      writeFileSync(path.join(root, 'tracked.txt'), 'second\n');

      expect(hashChangeFingerprint(root)).not.toBe(first);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects unknown fields in a v2 recovery manifest', () => {
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
      workflowStage: 'implementing',
    };

    const result = validateTask(task, '.agents/tasks/2026/EV-999-recovery');

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('workflowStage');
  });

  test('workflow tooling always carries the build gate', () => {
    expect(selectGates({ changedPaths: ['scripts/agent/change-scope.js'] })).toEqual([
      'scripts-unit', 'workflow-fixture', 'build',
    ]);
  });

  test('evidence is stale when the base ref changes even if head and paths match', () => {
    const evidence = createEvidence({
      gate: 'build',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      changedPathsHash: 'paths',
      result: 'success',
    });

    expect(assessEvidence({
      requiredGates: ['build'],
      evidence: [evidence],
      baseSha: 'c'.repeat(40),
      headSha: 'b'.repeat(40),
      changedPathsHash: 'paths',
    })).toEqual({ ok: false, incomplete: ['build'] });
  });

  test('merge readiness rejects an evidence content fingerprint mismatch', () => {
    const result = evaluateNativeReadiness({
      task: { schemaVersion: 2, id: 'EV-999', branch: 'chore/recovery', baseSha: 'a'.repeat(40), recovery: { state: 'active' } },
      taskBranch: 'chore/recovery',
      branchHead: 'b'.repeat(40),
      baseSha: 'a'.repeat(40),
      changedPathsHash: 'paths',
      changeFingerprint: 'current-content',
      requiredGates: ['build'],
      evidence: [{ commandId: 'build', result: 'success', baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40), changedPathsHash: 'paths', changeFingerprint: 'old-content' }],
      requireReview: false,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('evidence changeFingerprint 过期: build');
  });

  test('v2.1 task is recorded as a recovery manifest, not an FSM record', () => {
    const task = JSON.parse(readFileSync('.agents/tasks/2026/EV-023-ewp-v2-1/task.json', 'utf8'));
    expect(task).toMatchObject({ schemaVersion: 2, recovery: { state: 'active' } });
    expect(task).not.toHaveProperty('status');
    expect(task).not.toHaveProperty('evidence');
  });
});
