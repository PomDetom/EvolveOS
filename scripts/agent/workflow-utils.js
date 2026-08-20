import { execFileSync, spawn, spawnSync } from 'node:child_process';

export function gitSha(rootDir, ref = 'HEAD') {
  return execFileSync('git', ['rev-parse', '--verify', ref], { cwd: rootDir, encoding: 'utf8' }).trim();
}

function killProcessTree(pid) {
  if (process.platform === 'win32') { spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }); return; }
  try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch {} }
}

export function runShellCommand(rootDir, command, options = {}) {
  const defaultTimeoutMs = options.gate === 'e2e' ? 600_000 : ['app-e2e', 'affected-smoke', 'shell-smoke'].includes(options.gate) ? 300_000 : 120_000;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : defaultTimeoutMs;
  const child = spawn(command, { cwd: rootDir, shell: true, detached: process.platform !== 'win32', windowsHide: true, env: { ...process.env, ...(options.env ?? {}) } });
  let stdout = ''; let stderr = ''; let timedOut = false;
  child.stdout?.on('data', (chunk) => { stdout += chunk; });
  child.stderr?.on('data', (chunk) => { stderr += chunk; });
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => { timedOut = true; killProcessTree(child.pid); try { child.kill('SIGKILL'); } catch {} }, timeoutMs);
    child.on('close', (status, signal) => {
      if (settled) return; settled = true; clearTimeout(timer);
      const exitCode = typeof status === 'number' && status === 0 && !timedOut ? 0 : (typeof status === 'number' ? status : 1);
      resolve({ exitCode, stdout, stderr, timedOut, signal: signal ?? null, reason: timedOut ? `timeout after ${timeoutMs}ms` : signal ? `terminated by ${signal}` : exitCode === 0 ? '' : `exit code ${exitCode}` });
    });
    child.on('error', (error) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } });
  });
}

export function classifyGateResult(result = {}) {
  if (result.manual) return 'pending';
  if (result.skipped) return 'incomplete';
  if (['success', 'failed', 'environmentFailure', 'incomplete', 'pending'].includes(result.result)) return result.result;
  return result.exitCode === 0 && !result.timedOut ? 'success' : 'failed';
}

export function summarizeOutput(stdout = '', stderr = '', maxLength = 240) {
  const summary = `${stdout}\n${stderr}`.trim().replace(/\s+/g, ' ');
  if (!summary) return '无输出';
  return summary.length > maxLength ? `${summary.slice(0, maxLength - 1)}…` : summary;
}
