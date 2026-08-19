import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildStartFiles,
  cleanupStartArtifacts,
  listStartRecoveryArtifacts,
  main as startMain,
} from '../../scripts/agent/start-task.js';
import {
  classifyBaselineComparison,
  createBaselineEvidence,
  validateBaselineEvidence,
} from '../../scripts/agent/workflow-utils.js';
import { gateDefinition } from '../../scripts/agent/gate-registry.js';
import { validateStartEvidence } from '../../scripts/agent/task-schema.js';
import { main as approveMain } from '../../scripts/agent/approve-task.js';
import { findTask } from '../../scripts/agent/validate-task.js';
import { main as verifyMain } from '../../scripts/agent/verify.js';
import { main as finishMain } from '../../scripts/agent/finish-task.js';

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
  mkdirSync(path.join(root, '.agents'), { recursive: true });
  writeFileSync(path.join(root, '.agents', 'protocol.json'), JSON.stringify({
    schemaVersion: 1,
    taskStates: ['awaiting_approval', 'planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'],
  }));
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
      command: 'npm test', commandId: 'unit', result: 'success', exitCode: 0,
    });
    expect(validateBaselineEvidence(baseline, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), ...gateDefinition('unit', 'EWP-802') })).toEqual({ ok: true, errors: [] });
    expect(validateBaselineEvidence({ ...baseline, taskId: 'EWP-803' }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' }).ok).toBe(false);
    expect(validateBaselineEvidence({ ...baseline, baseSha: 'b'.repeat(40) }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' }).ok).toBe(false);
    expect(validateBaselineEvidence({ ...baseline, command: 'npm test -- --changed' }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), gate: 'unit', command: 'npm test' }).ok).toBe(false);
    expect(validateBaselineEvidence({ ...baseline, command: 'npm test -- --changed', commandId: 'unit' }, { taskId: 'EWP-802', baseSha: 'a'.repeat(40), ...gateDefinition('unit', 'EWP-802') }).ok).toBe(false);
  });

  test('comparison requires the same registered gate and canonical command', () => {
    const baseline = createBaselineEvidence({ taskId: 'EWP-806', gate: 'unit', baseSha: 'a'.repeat(40), command: 'npm test', commandId: 'unit', result: 'success', exitCode: 0 });
    expect(classifyBaselineComparison({ baseline, current: { taskId: 'EWP-806', gate: 'build', baseSha: 'a'.repeat(40), command: 'npm run build', result: 'success' } })).toMatchObject({ classification: 'incomplete', blocked: true });
  });

  test('baseline failure blocks a successful current gate and writes a failure classification', () => {
    const baseline = createBaselineEvidence({ taskId: 'EWP-807', gate: 'unit', baseSha: 'a'.repeat(40), command: 'npm test', commandId: 'unit', result: 'failed', exitCode: 1 });
    expect(classifyBaselineComparison({ baseline, current: { taskId: 'EWP-807', gate: 'unit', baseSha: 'a'.repeat(40), command: 'npm test', commandId: 'unit', result: 'success', exitCode: 0 } })).toMatchObject({ classification: 'baselineFailure', blocked: true });
  });

  test('真实 verify 主路径：baselineFailure 即使当前 gate 成功也写失败 evidence 并返回非零', async () => {
    const fixture = makeFixture();
    try {
      const io = { log() {}, error() {} };
      expect(startMain([
        '--id', 'EWP-809', '--title', 'Baseline blocks verify', '--kind', 'chore',
        '--paths', 'scripts/agent/', '--worktree', fixture.worktree,
      ], fixture.root, io, { baselineRunner: (_root, _command, gate) => ({ exitCode: gate.gate === 'scripts-unit' ? 1 : 0, stdout: '', stderr: '', reason: gate.gate === 'scripts-unit' ? 'baseline failed' : '' }) })).toBe(0);
      const entry = findTask(fixture.worktree, 'EWP-809');
      writeFileSync(entry.taskPath.replace('task.json', 'plan.md'), '# EWP-809 Baseline blocks verify\n\n## Acceptance\n\n- baseline failure blocks verify\n\n## Product Assumptions\n\n- 不适用\n');
      expect(approveMain(['--task', 'EWP-809', '--approver', 'Codex'], fixture.worktree, io)).toBe(0);
      expect(await verifyMain(['--task', 'EWP-809'], fixture.worktree, io, {
        runShellCommand: async () => ({ exitCode: 0, stdout: 'ok', stderr: '', reason: '' }),
      })).toBe(1);
      const refreshed = JSON.parse(readFileSync(entry.taskPath, 'utf8'));
      const evidence = refreshed.evidence.find((item) => item.gate === 'scripts-unit');
      expect(evidence).toMatchObject({ result: 'failed', classification: 'baselineFailure', taskId: 'EWP-809', baseSha: entry.task.baseSha, commandId: 'scripts-unit' });
      expect(await finishMain(['--task', 'EWP-809', '--reviewer', 'Codex', '--review-result', 'approved'], fixture.worktree, io, {
        verifyMain: (args, cwd, finishIo) => verifyMain(args, cwd, finishIo, {
          runShellCommand: async () => ({ exitCode: 0, stdout: 'ok', stderr: '', reason: '' }),
        }),
      })).toBe(1);
      expect(JSON.parse(readFileSync(entry.taskPath, 'utf8')).status).toBe('verifying');
    } finally {
      try { fixture.git(['worktree', 'remove', '--force', fixture.worktree]); } catch {}
      try { fixture.git(['branch', '-D', 'chore/baseline-blocks-verify']); } catch {}
      rmSync(fixture.root, { recursive: true, force: true });
      rmSync(fixture.worktree, { recursive: true, force: true });
    }
  }, 30000);

  test('legacy task without 8D baselines is readable but verification baseline lookup is incomplete', () => {
    expect(validateBaselineEvidence(undefined, { taskId: 'EWP-808', baseSha: 'a'.repeat(40) })).toMatchObject({ ok: false, errors: expect.arrayContaining(['缺少 baseline evidence']) });
    expect(classifyBaselineComparison({ baseline: undefined, current: { taskId: 'EWP-808', gate: 'unit', baseSha: 'a'.repeat(40), command: 'npm test', result: 'success' } })).toMatchObject({ classification: 'incomplete', blocked: true });
  });

  test('classification distinguishes baseline, introduced, environment and incomplete failures without making them green', () => {
    const identity = { taskId: 'EWP-804', gate: 'unit', baseSha: 'a'.repeat(40), command: 'npm test', commandId: 'unit' };
    const baseline = createBaselineEvidence({ ...identity, result: 'success', exitCode: 0 });
    expect(classifyBaselineComparison({ baseline, current: { ...identity, result: 'failed', exitCode: 1 } })).toMatchObject({ classification: 'introducedFailure', blocked: true });
    expect(classifyBaselineComparison({ baseline: { ...baseline, result: 'failed', exitCode: 1 }, current: { ...identity, result: 'failed', exitCode: 1 } })).toMatchObject({ classification: 'baselineFailure', blocked: true });
    expect(classifyBaselineComparison({ baseline, current: { ...identity, result: 'environmentFailure', exitCode: 1 } })).toMatchObject({ classification: 'environmentFailure', blocked: true });
    expect(classifyBaselineComparison({ baseline, current: { ...identity, result: 'incomplete', exitCode: null } })).toMatchObject({ classification: 'incomplete', blocked: true });
  });

  test('agent:start uses only the isolated fixture and finally removes its branch/worktree', () => {
    const fixture = makeFixture();
    const errors = [];
    const rootAgentsBefore = fixture.git(['ls-files', '.agents']);
    try {
      expect(startMain([
        '--id', 'EWP-805', '--title', 'Fixture start', '--kind', 'chore',
        '--paths', 'scripts/agent/', '--worktree', fixture.worktree,
      ], fixture.root, { log() {}, error(message) { errors.push(String(message)); } })).toBe(0);
      const taskPath = path.join(fixture.worktree, '.agents', 'tasks', new Date().getUTCFullYear().toString(), 'EWP-805-fixture-start', 'task.json');
      const task = JSON.parse(readFileSync(taskPath, 'utf8'));
      expect(task.baseline.taskId).toBe('EWP-805');
      expect(validateStartEvidence(fixture.worktree, task, taskPath.replace(`${fixture.worktree}${path.sep}`, '').replaceAll('\\', '/')).ok).toBe(true);
      expect(existsSync(path.join(fixture.root, '.agents', 'protocol.json'))).toBe(true);
      expect(fixture.git(['ls-files', '.agents'])).toBe(rootAgentsBefore);
      expect(fixture.git(['status', '--porcelain'])).toBe('');
    } finally {
      try { fixture.git(['worktree', 'remove', '--force', fixture.worktree]); } catch (error) { errors.push(String(error)); }
      try { fixture.git(['branch', '-D', 'chore/fixture-start']); } catch (error) { errors.push(String(error)); }
      rmSync(fixture.root, { recursive: true, force: true });
      rmSync(fixture.worktree, { recursive: true, force: true });
    }
    expect(errors).toEqual([]);
  }, 30000);

  test('fixture cleanup 异常留下机器可读 recovery，而不是静默成功', () => {
    const fixture = makeFixture();
    try {
      const result = cleanupStartArtifacts({
        rootDir: fixture.root,
        branch: 'chore/fixture-cleanup-failure',
        worktree: fixture.worktree,
        startRunId: 'run-cleanup-failure',
        code: 'TASK_WRITE_FAILED',
        message: 'fixture cleanup failure',
        deps: {
          worktreeExists: () => true,
          removeWorktree: () => { throw new Error('locked'); },
          removeWorktreeFallback: () => { throw new Error('denied'); },
          branchExists: () => true,
          removeBranch: () => { throw new Error('checked out'); },
        },
      });
      expect(result.cleanup).toEqual({ worktreeRemoved: false, branchRemoved: false });
      expect(result.recoveryPath).toBeTruthy();
      expect(listStartRecoveryArtifacts(fixture.root)).toMatchObject([{ startRunId: 'run-cleanup-failure', cleanup: { worktreeRemoved: false, branchRemoved: false } }]);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
      rmSync(fixture.worktree, { recursive: true, force: true });
    }
  });
});
