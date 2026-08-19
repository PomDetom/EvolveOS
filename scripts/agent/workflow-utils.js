import { execFileSync, spawn, spawnSync } from 'node:child_process';

export function gitSha(rootDir, ref = 'HEAD') {
  return execFileSync('git', ['rev-parse', '--verify', ref], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
}

function killProcessTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
    return;
  }
  try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch {} }
}

export function runShellCommand(rootDir, command, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 120_000;
  const child = spawn(command, { cwd: rootDir, shell: true, detached: process.platform !== 'win32', windowsHide: true });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  child.stdout?.on('data', (chunk) => { stdout += chunk; });
  child.stderr?.on('data', (chunk) => { stderr += chunk; });
  const result = new Promise((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      const exitCode = typeof status === 'number' && status === 0 && !timedOut ? 0 : (typeof status === 'number' ? status : 1);
      resolve({
        exitCode,
        stdout,
        stderr,
        timedOut,
        signal: signal ?? null,
        reason: timedOut ? `timeout after ${timeoutMs}ms` : (signal ? `terminated by ${signal}` : (exitCode === 0 ? '' : `exit code ${exitCode}`)),
      });
    });
  });
  return result;
}

export function classifyGateResult(result = {}) {
  if (result.manual) return 'pending';
  if (result.skipped) return 'incomplete';
  return result.exitCode === 0 && !result.timedOut ? 'success' : 'failed';
}

export function summarizeOutput(stdout = '', stderr = '', maxLength = 240) {
  const summary = `${stdout}\n${stderr}`.trim().replace(/\s+/g, ' ');
  if (!summary) return '无输出';
  return summary.length > maxLength ? `${summary.slice(0, maxLength - 1)}…` : summary;
}

export function createEvidence({ gate, command, baseSha, headSha, exitCode, result, timestamp, summary }) {
  return { gate, command, baseSha, headSha, testedHead: headSha, exitCode, result, timestamp, summary };
}
