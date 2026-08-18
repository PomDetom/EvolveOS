import { describe, expect, test } from 'vitest';
import { createEvidence, parseVerifyArgs, renderDryRun } from '../../scripts/agent/verify.js';

describe('agent:verify', () => {
  test('解析 task 与 dry-run 参数', () => {
    expect(parseVerifyArgs(['--task', 'EWP-004', '--dry-run']))
      .toEqual({ taskId: 'EWP-004', dryRun: true });
  });

  test('dry-run 按稳定顺序输出命令，不执行命令', () => {
    expect(renderDryRun('EWP-004', [
      { gate: 'task-check', command: 'npm run agent:task-check -- --task EWP-004', manual: false },
      { gate: 'desktop-manual', command: 'MANUAL: 记录真实 Windows 桌面验证', manual: true },
    ])).toBe([
      'task=EWP-004',
      '1. task-check | npm run agent:task-check -- --task EWP-004',
      '2. desktop-manual | MANUAL: 记录真实 Windows 桌面验证',
    ].join('\n'));
  });

  test('失败命令证据的 result 不是 success', () => {
    const evidence = createEvidence({
      gate: 'build',
      command: 'npm run build',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      exitCode: 1,
      result: 'failed',
      summary: 'build failed',
      timestamp: '2026-08-18T00:00:00.000Z',
    });
    expect(evidence).toMatchObject({ gate: 'build', exitCode: 1, result: 'failed' });
    expect(evidence.result).not.toBe('success');
  });
});
