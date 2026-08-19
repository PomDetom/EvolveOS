#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { assessBranchChanges } from '../boundary-check.js';
import { moveTaskToAwaitingApproval, evaluateTaskApproval, readTaskPlan } from './approval.js';
import { getChangedPaths } from './change-scope.js';
import { findTask } from './validate-task.js';
import { classifyBaselineComparison, classifyGateResult, createEvidence, gitSha, runShellCommand, summarizeOutput } from './workflow-utils.js';
import { GATE_REGISTRY, gateDefinition } from './gate-registry.js';
import { selectGates } from './select-gates.js';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';

export { GATE_REGISTRY };

export function parseVerifyArgs(argv) {
  const index = argv.indexOf('--task');
  return {
    taskId: index >= 0 ? argv[index + 1] ?? null : null,
    dryRun: argv.includes('--dry-run'),
  };
}

export function makeGatePlan(taskId, gates) {
  return gates.map((gate) => {
    return gateDefinition(gate, taskId);
  });
}

export function resolveRequiredGates({ requiredGates = 'auto', autoGates = [] }) {
  return requiredGates === 'auto' ? autoGates : [...requiredGates];
}

export function assessEvidence({ requiredGates = [], evidence = [] }) {
  const latestByGate = new Map();
  for (const item of evidence) latestByGate.set(item.gate ?? 'unknown', item);
  const incomplete = requiredGates.filter((gate) => {
    const latest = latestByGate.get(gate);
    return !latest || latest.result !== 'success';
  });
  return { ok: incomplete.length === 0, incomplete };
}

export async function executeGate(rootDir, command, runner = runShellCommand) {
  try {
    return { result: await runner(rootDir, command) };
  } catch (error) {
    return { result: { exitCode: 1, stdout: '', stderr: '', reason: `runner exception: ${error?.message ?? error}` } };
  }
}

export function renderDryRun(taskId, plan) {
  return [
    `task=${taskId}`,
    ...plan.map((entry, index) => `${index + 1}. ${entry.gate} | ${entry.command}`),
  ].join('\n');
}

export { createEvidence };

function writeTask(entry, task) {
  writeFileSync(entry.taskPath, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
}

function enforceApproval(rootDir, entry, io) {
  const { planPath, planText } = readTaskPlan(rootDir, entry.taskPath);
  const approvalResult = evaluateTaskApproval({ task: entry.task, planText, planPath });
  if (!approvalResult.ok) {
    const nextTask = moveTaskToAwaitingApproval(entry.task, approvalResult.scope);
    writeTask(entry, nextTask);
    approvalResult.issues.forEach((issue) => io.error(`✗ ${issue}`));
    return false;
  }
  return true;
}

export async function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console, deps = {}) {
  const { taskId, dryRun } = parseVerifyArgs(argv);
  if (!taskId) {
    io.error('用法：npm run agent:verify -- --task EWP-004 [--dry-run]');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }
  const schemaResult = validateTask(entry.task, entry.relativeDirectory, readProtocol(rootDir));
  const evidenceResult = schemaResult.ok ? validateStartEvidence(rootDir, entry.task, `${entry.relativeDirectory}/task.json`, { requireBaselines: true }) : { ok: true, errors: [] };
  if (!schemaResult.ok || !evidenceResult.ok) {
    io.error(`✗ task ${taskId} 校验失败`);
    [...schemaResult.errors, ...evidenceResult.errors].forEach((error) => io.error(`  ${error}`));
    return 1;
  }
  if (!enforceApproval(rootDir, entry, io)) return 1;

  const changedPaths = getChangedPaths(rootDir, entry.task.baseBranch, 'HEAD');
  const kind = assessBranchChanges(entry.task.branch, changedPaths).kind;
  const gates = selectGates({
    kind,
    changedPaths,
    hasNotes: entry.task.notes.length > 0,
    taskKind: entry.task.kind,
  });
  const plan = makeGatePlan(taskId, resolveRequiredGates({ requiredGates: entry.task.requiredGates, autoGates: gates }));
  if (dryRun) {
    io.log(renderDryRun(taskId, plan));
    return 0;
  }

  const baseSha = entry.task.baseSha;
  const headSha = gitSha(rootDir, 'HEAD');
  const evidence = [];
  let failed = false;
  for (const gate of plan) {
    const timestamp = new Date().toISOString();
    const baseline = (entry.task.baselines ?? []).find((item) => item.gate === gate.gate && item.command === gate.command && item.taskId === taskId && item.baseSha === baseSha);
    if (gate.manual) {
      const current = { taskId, gate: gate.gate, command: gate.command, commandId: gate.commandId, baseSha, result: 'incomplete', exitCode: null };
      const comparison = classifyBaselineComparison({ baseline, current });
      evidence.push(createEvidence({
        taskId,
        gate: gate.gate,
        command: gate.command,
        commandId: gate.commandId,
        baseSha,
        headSha,
        exitCode: null,
        result: 'pending',
        timestamp,
        summary: '需要人工证据',
        classification: comparison.classification,
      }));
      failed = true;
      continue;
    }
    const { result } = await executeGate(rootDir, gate.command, deps.runShellCommand ?? runShellCommand);
    const gateResult = classifyGateResult(result);
    const comparison = classifyBaselineComparison({
      baseline,
      current: {
        taskId,
        gate: gate.gate,
        command: gate.command,
        commandId: gate.commandId,
        initCommit: entry.task.initCommit,
        baseSha,
        result: result.environmentFailure || String(result.reason ?? '').startsWith('runner exception:') ? 'environmentFailure' : gateResult,
        exitCode: result.exitCode,
      },
    });
    evidence.push(createEvidence({
      taskId,
      gate: gate.gate,
      command: gate.command,
      commandId: gate.commandId,
      baseSha,
      headSha,
      exitCode: result.exitCode,
      result: comparison.blocked && gateResult === 'success' ? 'failed' : gateResult,
      timestamp,
      summary: summarizeOutput(result.stdout, `${result.stderr} ${result.reason ?? ''}`),
      classification: comparison.classification,
    }));
    if (gateResult !== 'success' || comparison.blocked) failed = true;
  }
  writeTask(entry, { ...entry.task, evidence: [...(Array.isArray(entry.task.evidence) ? entry.task.evidence : []), ...evidence] });
  io.log(`写入 ${evidence.length} 条验证证据（head=${headSha}）`);
  return failed ? 1 : 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  main().then((code) => { process.exitCode = code; });
}
