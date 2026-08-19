import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildStartFiles,
  main as startMain,
} from '../../scripts/agent/start-task.js';
import {
  classifyBaselineComparison,
  createBaselineEvidence,
  validateBaselineEvidence,
} from '../../scripts/agent/workflow-utils.js';
import { validateStartEvidence } from '../../scripts/agent/task-schema.js';

function makeFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-8d-fixture-'));
  const worktree = path.join(os.tmpdir(), `ewp-8d-worktree-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const git = (args, cwd = root) => execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  git(['init', '-b', 'dev']);
  git(['config', 'user.email', 'ewp@example.com']);
  git(['config', 'user.name', 'EWP Test']);
  writeFileSync(path.join(root, 'README.md'), 'fixture\n');
  git(['add', '.']);
  git(['commit', '-m', 'fixture']);
  return { root, worktree, git };
}

describe('Task 8D baseline evidence', () => {
  test('start snapshot records a comparable baseline gate, SHA, command identity and result', () => {
    const files = buildStartFiles({
      id: 'EWP-801',
      title: 'Baseline evidence',
      kind: 'chore',
      branch: 'chore/baseline-evidence',
      baseSha: 'a'.repeat(40),
      allowedPaths: ['scripts/agent/'],
      year: '2026',
      date: '2026-08-19',
      slug: 'baseline-evidence',
      noteClass: 'process',
      startRunId: 'run-801',
      preflight: { ok: true, checks: {} },
    });

    expect(files.task.baseline).toMatchObject({
      taskId: 'EWP-801',
      gate: 'start-preflight',
      baseSha: 'a'.repeat(40),
      command: 'agent:start preflight',
      commandId: 'agent:start preflight',
      result: 'success',
    });
    expect(files.startRecord.baseline).toEqual(files.task.baseline);
  });

  test('comparison rejects cross-task, cross-SHA and command-tampered baseline evidence', () => {
    const baseline = createBaselineEvidence({
      taskId: 'EWP-802', gate: 'unit', baseSha: 'a'.repeat(40),
      command: 'npm test', result: 'success', exitCode: 0,
    });
    expect(validateBaselineEvidence(baseline, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' })).toEqual({ ok: true, errors: [] });
    expect(validateBaselineEvidence({ ...baseline, taskId: 'EWP-803' }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' }).ok).toBe(false);
    expect(validateBaselineEvidence({ ...baseline, baseSha: 'b'.repeat(40) }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' }).ok).toBe(false);
    expect(validateBaselineEvidence({ ...baseline, command: 'npm test -- --changed' }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' }).ok).toBe(false);
  });

  test('classification distinguishes baseline, introduced, environment and incomplete failures without making them green', () => {
    const identity = { taskId: 'EWP-804', gate: 'unit', baseSha: 'a'.repeat(40), command: 'npm test' };
    const baseline = createBaselineEvidence({ ...identity, result: 'success', exitCode: 0 });
    expect(classifyBaselineComparison({ baseline, current: { ...identity, result: 'failed', exitCode: 1 } })).toMatchObject({ classification: 'introducedFailure', blocked: true });
    expect(classifyBaselineComparison({ baseline: { ...baseline, result: 'failed', exitCode: 1 }, current: { ...identity, result: 'failed', exitCode: 1 } })).toMatchObject({ classification: 'baselineFailure', blocked: true });
    expect(classifyBaselineComparison({ baseline, current: { ...identity, result: 'environmentFailure', exitCode: 1 } })).toMatchObject({ classification: 'environmentFailure', blocked: true });
    expect(classifyBaselineComparison({ baseline, current: { ...identity, result: 'incomplete', exitCode: null } })).toMatchObject({ classification: 'incomplete', blocked: true });
  });

  test('agent:start uses only the isolated fixture and finally removes its branch/worktree', () => {
    const fixture = makeFixture();
    const errors = [];
    try {
      expect(startMain([
        '--id', 'EWP-805', '--title', 'Fixture start', '--kind', 'chore',
        '--paths', 'scripts/agent/', '--worktree', fixture.worktree,
      ], fixture.root, { log() {}, error(message) { errors.push(String(message)); } })).toBe(0);
      const taskPath = path.join(fixture.worktree, '.agents', 'tasks', new Date().getUTCFullYear().toString(), 'EWP-805-fixture-start', 'task.json');
      const task = JSON.parse(readFileSync(taskPath, 'utf8'));
      expect(task.baseline.taskId).toBe('EWP-805');
      expect(validateStartEvidence(fixture.worktree, task, taskPath.replace(`${fixture.worktree}${path.sep}`, '').replaceAll('\\', '/')).ok).toBe(true);
      expect(existsSync(path.join(fixture.root, '.agents'))).toBe(false);
    } finally {
      try { fixture.git(['worktree', 'remove', '--force', fixture.worktree]); } catch (error) { errors.push(String(error)); }
      try { fixture.git(['branch', '-D', 'chore/fixture-start']); } catch (error) { errors.push(String(error)); }
      rmSync(fixture.root, { recursive: true, force: true });
      rmSync(fixture.worktree, { recursive: true, force: true });
    }
    expect(errors).toEqual([]);
  }, 30000);
});
