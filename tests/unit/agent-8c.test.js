import { describe, expect, test, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
  buildWorktreePlaywrightConfig,
  createTaskE2EArgs,
  main as e2eMain,
  resolveTaskE2EPaths,
} from '../../scripts/agent/e2e.js';
import {
  classifyGateResult,
  createEvidence,
  runShellCommand,
} from '../../scripts/agent/workflow-utils.js';
import { assessEvidence, executeGate, makeGatePlan, resolveRequiredGates } from '../../scripts/agent/verify.js';
import { main as approveMain } from '../../scripts/agent/approve-task.js';
import { main as finishMain } from '../../scripts/agent/finish-task.js';
import { main as startMain } from '../../scripts/agent/start-task.js';
import { findTask } from '../../scripts/agent/validate-task.js';
import { main as verifyMain } from '../../scripts/agent/verify.js';

function makeWorktreeFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-git-main-'));
  const worktree = path.join(os.tmpdir(), `ewp-git-worktree-${Date.now()}`);
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  git(['init', '-b', 'dev']);
  git(['config', 'user.email', 'ewp@example.com']);
  git(['config', 'user.name', 'EWP Test']);
  mkdirSync(path.join(root, '.agents', 'tasks', '2026', 'EWP-008-e2e'), { recursive: true });
  writeFileSync(path.join(root, '.agents', 'tasks', '2026', 'EWP-008-e2e', 'task.json'), JSON.stringify({ id: 'EWP-008', branch: 'chore/ewp-008-e2e' }));
  git(['add', '.']);
  git(['commit', '-m', 'fixture']);
  git(['worktree', 'add', '-b', 'chore/ewp-008-e2e', worktree, 'dev']);
  return { root, worktree, git };
}

describe('Task 8C worktree e2e', () => {
  test('从主 checkout 真实入口运行时拒绝，合法 worktree 不误拒绝', () => {
    const { root: mainRoot, worktree: worktreeRoot, git } = makeWorktreeFixture();
    try {
      expect(() => resolveTaskE2EPaths({ rootDir: mainRoot, taskId: 'EWP-008' })).toThrow(/主 checkout/);
      expect(resolveTaskE2EPaths({ rootDir: worktreeRoot, taskId: 'EWP-008' }).rootDir).toBe(worktreeRoot);
      const errors = [];
      expect(e2eMain(['--task', 'EWP-008'], mainRoot, { error: (message) => errors.push(message) })).toBe(1);
      expect(errors.join('\n')).toContain('主 checkout');
      expect(e2eMain(['--task', 'EWP-008', '--port', '65536'], worktreeRoot, { error: (message) => errors.push(message) })).toBe(1);
      expect(errors.join('\n')).toContain('端口');
      expect(() => resolveTaskE2EPaths({ rootDir: mainRoot, taskId: 'EWP-009' })).toThrow(/主 checkout/);
      const ordinaryRoot = mkdtempSync(path.join(os.tmpdir(), 'ewp-ordinary-'));
      expect(() => resolveTaskE2EPaths({ rootDir: ordinaryRoot, taskId: 'EWP-008' })).toThrow(/Git worktree/);
      rmSync(ordinaryRoot, { recursive: true, force: true });
      writeFileSync(path.join(worktreeRoot, '.agents', 'tasks', '2026', 'EWP-008-e2e', 'task.json'), JSON.stringify({ id: 'EWP-008', branch: 'chore/wrong-branch' }));
      expect(() => resolveTaskE2EPaths({ rootDir: worktreeRoot, taskId: 'EWP-008' })).toThrow(/task.*branch|关联/);
    } finally {
      try { git(['worktree', 'remove', '--force', worktreeRoot]); } catch {}
      try { git(['branch', '-D', 'chore/ewp-008-e2e']); } catch {}
      rmSync(mainRoot, { recursive: true, force: true });
      rmSync(worktreeRoot, { recursive: true, force: true });
    }
  }, 30000);

  test('配置根目录不应指向主 checkout，并使用任务端口和日志目录', () => {
    const paths = {
      rootDir: 'C:/repo/worktrees/task-8c',
      mainRoot: 'C:/repo',
      taskId: 'EWP-008',
      testDir: 'C:/repo/worktrees/task-8c/tests/e2e',
      logDir: 'C:/repo/worktrees/task-8c/.agents/logs/e2e/EWP-008',
    };
    const config = buildWorktreePlaywrightConfig(paths, { port: 5198 });

    expect(config.testDir.replaceAll('\\', '/')).toBe('C:/repo/worktrees/task-8c/tests/e2e');
    expect(config.testDir).not.toContain('C:/repo/tests/e2e');
    expect(config.webServer.url).toBe('http://127.0.0.1:5198');
    expect(config.webServer.command).toContain('5198');
    expect(config.webServer.cwd.replaceAll('\\', '/')).toBe('C:/repo/worktrees/task-8c');
    expect(config.reporter[1][1].outputFile).toContain('EWP-008');
    expect(config.webServer.reuseExistingServer).toBe(false);
  });

  test('agent:e2e 支持定向 spec、固定端口和任务日志', () => {
    expect(createTaskE2EArgs({ taskId: 'EWP-008', spec: 'tests/e2e/shell.spec.js', port: 5198 }))
      .toEqual(['playwright', 'test', 'tests/e2e/shell.spec.js', '--config=playwright.config.worktree.js', '--reporter=line']);
  });

  test('端口必须是 1-65535 的整数', () => {
    for (const port of [0, 65536, 5174.5, '5174x']) {
      expect(() => createTaskE2EArgs({ taskId: 'EWP-008', port })).toThrow(/端口/);
    }
    expect(createTaskE2EArgs({ taskId: 'EWP-008', port: 1 })).toBeTruthy();
    expect(createTaskE2EArgs({ taskId: 'EWP-008', port: 65535 })).toBeTruthy();
  });
});

describe('Task 8C gate process and evidence', () => {
  test('runner error 会 reject，并保留异常原因供 verify 写入 failed evidence', async () => {
    await expect(runShellCommand(path.join(os.tmpdir(), 'missing-ewp-root'), 'node -e "0"'))
      .rejects.toThrow();
    const gate = await executeGate(process.cwd(), 'fake', async () => { throw new Error('fake runner unavailable'); });
    expect(gate.result).toMatchObject({ exitCode: 1, reason: 'runner exception: fake runner unavailable' });
    expect(classifyGateResult(gate.result)).toBe('failed');
  });
  test('超时递归清理并释放测试进程，异常原因进入失败 evidence', async () => {
    const result = await runShellCommand(process.cwd(), 'node -e "setTimeout(() => {}, 1000)"', { timeoutMs: 20 });
    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(true);
    expect(result.reason).toContain('timeout');
    expect(classifyGateResult(result)).toBe('failed');
    expect(createEvidence({
      gate: 'e2e', command: 'agent:e2e', baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40),
      result: classifyGateResult(result), exitCode: result.exitCode, timestamp: '2026-08-19T00:00:00.000Z',
      summary: result.reason,
    })).toMatchObject({ result: 'failed', exitCode: expect.any(Number), summary: expect.stringContaining('timeout') });
  });

  test('人工 gate 是 pending，未执行 gate 是 incomplete，均不能成功', () => {
    expect(classifyGateResult({ manual: true })).toBe('pending');
    expect(classifyGateResult({ skipped: true })).toBe('incomplete');
  });

  test('requiredGates 进入 gate 计划，finish 对所有 gate evidence 做完整判定', () => {
    expect(resolveRequiredGates({ requiredGates: ['unit', 'e2e'], autoGates: ['scripts-unit', 'build'] }))
      .toEqual(['unit', 'e2e']);
    expect(makeGatePlan('EWP-008', ['unit', 'e2e']).map((gate) => gate.gate)).toEqual(['unit', 'e2e']);
    expect(assessEvidence({ requiredGates: ['unit', 'e2e'], evidence: [
      { gate: 'unit', result: 'success' }, { gate: 'e2e', result: 'pending' },
    ]})).toMatchObject({ ok: false, incomplete: ['e2e'] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [{ gate: 'unit', result: 'success' }] }))
      .toEqual({ ok: true, incomplete: [] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [
      { gate: 'unit', result: 'success' }, { gate: 'legacy-build', result: 'failed' },
    ]})).toEqual({ ok: true, incomplete: [] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [
      { gate: 'unit', result: 'success' }, { gate: 'legacy-e2e', result: 'pending' },
    ]})).toEqual({ ok: true, incomplete: [] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [
      { gate: 'unit', result: 'failed' }, { gate: 'unit', result: 'success' },
    ]})).toEqual({ ok: true, incomplete: [] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [
      { gate: 'unit', result: 'pending' }, { gate: 'unit', result: 'success' },
    ]})).toEqual({ ok: true, incomplete: [] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [
      { gate: 'unit', result: 'success' }, { gate: 'unit', result: 'failed' },
    ]})).toMatchObject({ ok: false, incomplete: ['unit'] });
    expect(assessEvidence({ requiredGates: ['unit'], evidence: [] }))
      .toEqual({ ok: false, incomplete: ['unit'] });
  });

  test('真实 verify -> writeTask -> finish 主路径阻断 pending evidence', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-finish-'));
    const worktree = path.join(os.tmpdir(), `ewp-finish-worktree-${Date.now()}`);
    const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const io = { log() {}, error() {} };
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      mkdirSync(path.join(root, '.agents'), { recursive: true });
      writeFileSync(path.join(root, '.agents', 'protocol.json'), JSON.stringify({
        schemaVersion: 1,
        taskStates: ['awaiting_approval', 'planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'],
      }));
      writeFileSync(path.join(root, 'README.md'), 'dev\n');
      git(['add', '.']);
      git(['commit', '-m', 'init']);
      expect(startMain([
        '--id', 'EWP-088', '--title', 'Finish evidence', '--kind', 'chore',
        '--paths', 'scripts/agent/,tests/unit/', '--worktree', worktree,
      ], root, io)).toBe(0);
      const started = findTask(worktree, 'EWP-088');
      writeFileSync(started.taskPath.replace('task.json', 'plan.md'), [
        '# EWP-088 Finish evidence', '', '## Acceptance', '',
        '- verify evidence 会完整阻断未完成 gate', '', '## Product Assumptions', '',
        '- 不适用',
      ].join('\n'));
      expect(approveMain(['--task', 'EWP-088', '--approver', 'Codex'], worktree, io)).toBe(0);

      expect(await verifyMain(['--task', 'EWP-088'], worktree, io, {
        runShellCommand: async () => { throw new Error('fake runner unavailable'); },
      })).toBe(1);
      const failedEvidence = JSON.parse(readFileSync(findTask(worktree, 'EWP-088').taskPath, 'utf8')).evidence;
      expect(failedEvidence).toHaveLength(3);
      expect(failedEvidence.every((item) => item.result === 'failed')).toBe(true);
      expect(failedEvidence[0].summary).toContain('runner exception: fake runner unavailable');

      const fakeVerify = async (args, cwd) => {
        const entry = findTask(cwd, args[1]);
        const task = JSON.parse(readFileSync(entry.taskPath, 'utf8'));
        writeFileSync(entry.taskPath, `${JSON.stringify({ ...task, evidence: [
          { gate: 'scripts-unit', result: 'pending' },
          { gate: 'failure-paths', result: 'success' },
          { gate: 'build', result: 'success' },
        ] }, null, 2)}\n`);
        return 0;
      };
      expect(await finishMain([
        '--task', 'EWP-088', '--reviewer', 'Codex', '--review-result', 'approved',
      ], worktree, io, { verifyMain: fakeVerify })).toBe(1);
      expect(JSON.parse(readFileSync(findTask(worktree, 'EWP-088').taskPath, 'utf8')).status).toBe('verifying');
    } finally {
      try { git(['worktree', 'remove', '--force', worktree]); } catch {}
      try { git(['branch', '-D', 'chore/finish-evidence']); } catch {}
      rmSync(root, { recursive: true, force: true });
      rmSync(worktree, { recursive: true, force: true });
    }
  }, 30000);
});
