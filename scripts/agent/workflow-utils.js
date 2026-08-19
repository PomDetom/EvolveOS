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
  const result = new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);
    child.on('close', (status, signal) => {
      if (settled) return;
      settled = true;
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
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
  return result;
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

export function createEvidence({ taskId, gate, command, commandId, baseSha, headSha, exitCode, result, timestamp, summary, classification }) {
  return {
    taskId,
    gate,
    command,
    commandId: commandId ?? command,
    baseSha,
    headSha,
    testedHead: headSha,
    exitCode,
    result,
    classification: classification ?? result,
    timestamp,
    summary,
  };
}

export function createBaselineEvidence({ taskId, gate, baseSha, command, commandId, initCommit, exitCode, result, timestamp = new Date().toISOString(), summary = '' }) {
  return {
    taskId,
    gate,
    command,
    commandId: commandId ?? command,
    baseSha,
    ...(initCommit ? { initCommit } : {}),
    exitCode,
    result,
    timestamp,
    summary,
  };
}

export function validateBaselineEvidence(baseline, expected = {}) {
  const errors = [];
  if (!baseline || typeof baseline !== 'object') return { ok: false, errors: ['缺少 baseline evidence'] };
  const requiredFields = [['taskId', 'taskId'], ['baseSha', 'baseSha'], ['gate', 'baseline gate'], ['command', 'baseline command'], ['commandId', 'baseline command identity'], ['result', 'baseline result']];
  if (expected.initCommit != null) requiredFields.push(['initCommit', 'baseline initCommit']);
  for (const [field, label] of requiredFields) {
    if (typeof baseline[field] !== 'string' || !baseline[field].trim()) errors.push(`缺少 ${label}`);
  }
  if (typeof baseline.baseSha === 'string' && !/^[0-9a-f]{40}$/i.test(baseline.baseSha)) errors.push('baseline baseSha 必须为 40 位 Git SHA');
  if (baseline.commandId !== baseline.command && !expected.commandId) errors.push('baseline command identity 与 command 不一致');
  for (const field of ['taskId', 'baseSha', 'gate', 'command', 'commandId', 'initCommit']) {
    if (expected[field] != null && baseline[field] !== expected[field]) errors.push(`baseline ${field} 不匹配`);
  }
  if (!['success', 'failed', 'environmentFailure', 'incomplete', 'pending'].includes(baseline.result)) errors.push(`baseline result 非法: ${baseline.result}`);
  return { ok: errors.length === 0, errors };
}

export function classifyBaselineComparison({ baseline, current }) {
  const baselineCheck = validateBaselineEvidence(baseline, {
    taskId: current?.taskId,
    baseSha: current?.baseSha,
    gate: current?.gate,
    command: current?.command,
    commandId: current?.commandId,
    initCommit: current?.initCommit,
  });
  if (!baselineCheck.ok) return { classification: 'incomplete', blocked: true, errors: baselineCheck.errors };
  if (current?.result === 'environmentFailure') return { classification: 'environmentFailure', blocked: true, errors: [] };
  if (current?.result === 'incomplete' || current?.result === 'pending') return { classification: 'incomplete', blocked: true, errors: [] };
  if (baseline.result === 'environmentFailure') return { classification: 'environmentFailure', blocked: true, errors: [] };
  if (baseline.result === 'incomplete' || baseline.result === 'pending') return { classification: 'incomplete', blocked: true, errors: [] };
  if (baseline.result !== 'success') return { classification: 'baselineFailure', blocked: true, errors: [] };
  if (current?.result !== 'success') return { classification: 'introducedFailure', blocked: true, errors: [] };
  return { classification: 'success', blocked: false, errors: [] };
}
