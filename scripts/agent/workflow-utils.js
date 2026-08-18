import { execFileSync, spawnSync } from 'node:child_process';

export function gitSha(rootDir, ref = 'HEAD') {
  return execFileSync('git', ['rev-parse', '--verify', ref], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
}

export function runShellCommand(rootDir, command) {
  const result = spawnSync(command, {
    cwd: rootDir,
    shell: true,
    encoding: 'utf8',
  });
  return {
    exitCode: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? result.error?.message ?? '',
  };
}

export function summarizeOutput(stdout = '', stderr = '', maxLength = 240) {
  const summary = `${stdout}\n${stderr}`.trim().replace(/\s+/g, ' ');
  if (!summary) return '无输出';
  return summary.length > maxLength ? `${summary.slice(0, maxLength - 1)}…` : summary;
}

export function createEvidence({ gate, command, baseSha, headSha, exitCode, result, timestamp, summary }) {
  return { gate, command, baseSha, headSha, exitCode, result, timestamp, summary };
}
