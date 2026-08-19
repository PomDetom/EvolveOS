import { describe, expect, test } from 'vitest';
import {
  buildWorktreePlaywrightConfig,
  createTaskE2EArgs,
  resolveTaskE2EPaths,
} from '../../scripts/agent/e2e.js';
import {
  classifyGateResult,
  createEvidence,
  runShellCommand,
} from '../../scripts/agent/workflow-utils.js';

describe('Task 8C worktree e2e', () => {
  test('配置根目录不应指向主 checkout，并使用任务端口和日志目录', () => {
    const paths = resolveTaskE2EPaths({
      rootDir: 'C:/repo/worktrees/task-8c',
      mainRoot: 'C:/repo',
      taskId: 'EWP-008',
    });
    const config = buildWorktreePlaywrightConfig(paths, { port: 5198 });

    expect(config.testDir.replaceAll('\\', '/')).toBe('C:/repo/worktrees/task-8c/tests/e2e');
    expect(config.testDir).not.toContain('C:/repo/tests/e2e');
    expect(config.webServer.url).toBe('http://127.0.0.1:5198');
    expect(config.webServer.command).toContain('5198');
    expect(config.webServer.cwd.replaceAll('\\', '/')).toBe('C:/repo/worktrees/task-8c');
    expect(config.reporter[1][1].outputFile).toContain('EWP-008');
  });

  test('agent:e2e 支持定向 spec、固定端口和任务日志', () => {
    expect(createTaskE2EArgs({ taskId: 'EWP-008', spec: 'tests/e2e/shell.spec.js', port: 5198 }))
      .toEqual(['playwright', 'test', 'tests/e2e/shell.spec.js', '--config=playwright.config.worktree.js', '--reporter=line']);
  });
});

describe('Task 8C gate process and evidence', () => {
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
});
