import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildBaselineEvidence,
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
import { main as taskCheckMain } from '../../scripts/agent/validate-task.js';

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

  test('docs task-check 和 app e2e 在 task fixture 生成后写入可比较的初始 baseline', () => {
    for (const scenario of [
      { id: 'EWP-810', title: 'Docs task baseline', kind: 'docs', branch: 'docs/task-baseline', gate: 'task-check' },
      { id: 'EWP-811', title: 'App e2e baseline', kind: 'app', app: 'demo', branch: 'app/demo/e2e-baseline', gate: 'e2e' },
    ]) {
      const fixture = makeFixture();
      const runnerCalls = [];
      try {
        expect(startMain([
          '--id', scenario.id, '--title', scenario.title, '--kind', scenario.kind,
          ...(scenario.app ? ['--app', scenario.app] : []),
          '--branch', scenario.branch, '--paths', scenario.kind === 'app' ? 'src/apps/demo/' : 'docs/', '--worktree', fixture.worktree,
        ], fixture.root, { log() {}, error() {} }, {
          baselineRunner: (rootDir, command, gate) => {
            const taskPath = path.join(rootDir, '.agents', 'tasks', '2026', `${scenario.id}-${scenario.title.toLowerCase().replaceAll(' ', '-')}`, 'task.json');
            const taskFixture = JSON.parse(readFileSync(taskPath, 'utf8'));
            runnerCalls.push({ rootDir, command, gate, taskExists: existsSync(taskPath), initCommit: taskFixture.initCommit });
            return { exitCode: 0, stdout: 'fixture baseline', stderr: '', reason: '' };
          },
        })).toBe(0);

        const entry = findTask(fixture.worktree, scenario.id);
        const task = JSON.parse(readFileSync(entry.taskPath, 'utf8'));
        const baseline = task.baselines.find((item) => item.gate === scenario.gate);
        expect(runnerCalls.find((call) => call.gate.gate === scenario.gate)).toMatchObject({
          rootDir: fixture.worktree,
          taskExists: true,
          initCommit: expect.stringMatching(/^[0-9a-f]{40}$/),
        });
        expect(runnerCalls.find((call) => call.gate.gate === scenario.gate).initCommit).not.toBe('0'.repeat(40));
        expect(baseline).toMatchObject({
          taskId: scenario.id,
          baseSha: task.baseSha,
          gate: scenario.gate,
          command: gateDefinition(scenario.gate, scenario.id).command,
          commandId: scenario.gate,
          initCommit: task.initCommit,
          result: 'success',
          exitCode: 0,
        });
        expect(JSON.parse(readFileSync(path.join(fixture.worktree, '.agents', 'start-runs', `${task.startRunId}.json`), 'utf8')).baselines)
          .toEqual(task.baselines);
        const initialTask = JSON.parse(fixture.git(['show', `${task.initCommit}:${entry.taskPath.replace(`${fixture.worktree}${path.sep}`, '').replaceAll('\\', '/')}`]));
        expect(initialTask.baselines).not.toEqual(task.baselines);
        expect(initialTask.baselines.find((item) => item.gate === scenario.gate)).toMatchObject({ result: 'incomplete', initCommit: '0'.repeat(40) });
        const updateCommitRecord = JSON.parse(fixture.git(['show', `${task.baselineUpdate.commit}:${task.baselineUpdate.path}`]));
        expect(updateCommitRecord).toMatchObject({ taskId: scenario.id, baseSha: task.baseSha, initCommit: task.initCommit });
        expect(updateCommitRecord.baselines).toEqual(task.baselines);
        expect(validateStartEvidence(fixture.worktree, task, entry.taskPath.replace(`${fixture.worktree}${path.sep}`, '').replaceAll('\\', '/'), { requireBaselines: true })).toEqual({ ok: true, errors: [] });
        const taskCheckErrors = [];
        const taskCheckResult = taskCheckMain(['--task', scenario.id], fixture.worktree, { log() {}, error(message) { taskCheckErrors.push(String(message)); } });
        expect({ result: taskCheckResult, errors: taskCheckErrors }).toEqual({ result: 0, errors: [] });
      } finally {
        try { fixture.git(['worktree', 'remove', '--force', fixture.worktree]); } catch {}
        try { fixture.git(['branch', '-D', scenario.branch]); } catch {}
        rmSync(fixture.root, { recursive: true, force: true });
        rmSync(fixture.worktree, { recursive: true, force: true });
      }
    }
  }, 30000);

  test('baseline runner 抛错保留 environmentFailure，而不是伪造 success', () => {
    const baselines = buildBaselineEvidence({
      rootDir: 'fixture-worktree',
      taskId: 'EWP-812',
      baseSha: 'a'.repeat(40),
      branch: 'docs/baseline-runner-failure',
      taskKind: 'docs',
      runner: () => { throw new Error('runner unavailable'); },
    });
    expect(baselines.find((item) => item.gate === 'task-check')).toMatchObject({
      result: 'environmentFailure',
      exitCode: 1,
      summary: 'runner unavailable',
    });
  });

  test('requireBaselines 拒绝补录提交顺序篡改、缺失 gate 和重复 gate', () => {
    const fixture = makeFixture();
    try {
      expect(startMain([
        '--id', 'EWP-813', '--title', 'Baseline integrity', '--kind', 'docs',
        '--branch', 'docs/baseline-integrity', '--paths', 'docs/', '--worktree', fixture.worktree,
      ], fixture.root, { log() {}, error() {} }, {
        baselineRunner: () => ({ exitCode: 0, stdout: '', stderr: '', reason: '' }),
      })).toBe(0);
      const entry = findTask(fixture.worktree, 'EWP-813');
      const task = JSON.parse(readFileSync(entry.taskPath, 'utf8'));
      const taskPath = entry.taskPath.replace(`${fixture.worktree}${path.sep}`, '').replaceAll('\\', '/');
      const reordered = { ...task, baselineUpdate: { ...task.baselineUpdate, commit: task.initCommit } };
      expect(validateStartEvidence(fixture.worktree, reordered, taskPath, { requireBaselines: true })).toMatchObject({
        ok: false,
        errors: expect.arrayContaining(['baseline update commit 必须严格晚于 initCommit']),
      });
      const missing = { ...task, baselines: task.baselines.filter((item) => item.gate !== 'build') };
      expect(validateStartEvidence(fixture.worktree, missing, taskPath, { requireBaselines: true }).errors.join(' ')).toContain('缺少 baseline gate: build');
      const duplicate = { ...task, baselines: [...task.baselines, task.baselines[0]] };
      expect(validateStartEvidence(fixture.worktree, duplicate, taskPath, { requireBaselines: true }).errors.join(' ')).toContain('baseline gate 重复');
    } finally {
      try { fixture.git(['worktree', 'remove', '--force', fixture.worktree]); } catch {}
      try { fixture.git(['branch', '-D', 'docs/baseline-integrity']); } catch {}
      rmSync(fixture.root, { recursive: true, force: true });
      rmSync(fixture.worktree, { recursive: true, force: true });
    }
  }, 30000);

  test('agent:task-check 真实入口阻断缺少 baseline update 的旧 task', () => {
    const fixture = makeFixture();
    try {
      expect(startMain([
        '--id', 'EWP-814', '--title', 'Legacy baseline check', '--kind', 'docs',
        '--branch', 'docs/legacy-baseline-check', '--paths', 'docs/', '--worktree', fixture.worktree,
      ], fixture.root, { log() {}, error() {} }, {
        baselineRunner: () => ({ exitCode: 0, stdout: '', stderr: '', reason: '' }),
      })).toBe(0);
      const entry = findTask(fixture.worktree, 'EWP-814');
      const task = JSON.parse(readFileSync(entry.taskPath, 'utf8'));
      delete task.baselineUpdate;
      writeFileSync(entry.taskPath, `${JSON.stringify(task, null, 2)}\n`);
      expect(taskCheckMain(['--task', 'EWP-814'], fixture.worktree, { log() {}, error() {} })).toBe(1);
    } finally {
      try { fixture.git(['worktree', 'remove', '--force', fixture.worktree]); } catch {}
      try { fixture.git(['branch', '-D', 'docs/legacy-baseline-check']); } catch {}
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
