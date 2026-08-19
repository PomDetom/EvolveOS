#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { assessBranchChanges } from '../boundary-check.js';
import { moveTaskToAwaitingApproval, evaluateTaskApproval, readTaskPlan } from './approval.js';
import { getChangedPaths } from './change-scope.js';
import { findTask } from './validate-task.js';
import { createEvidence, gitSha, runShellCommand, summarizeOutput } from './workflow-utils.js';
import { selectGates } from './select-gates.js';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';

const GATE_REGISTRY = {
  'task-check': { command: (taskId) => `npm run agent:task-check -- --task ${taskId}` },
  'notes-check': { command: (taskId) => `node scripts/agent/validate-notes.js --task ${taskId}` },
  boundary: { command: () => 'npm run check:boundary' },
  unit: { command: () => 'npm test' },
  e2e: { command: () => 'npm run test:e2e' },
  'shell-smoke': { command: () => 'npm run test:e2e -- --grep shell' },
  'visual-review': { command: () => 'MANUAL: 记录视觉基线判断', manual: true },
  build: { command: () => 'npm run build' },
  'owner-review': { command: () => 'MANUAL: 记录 framework owner review', manual: true },
  'scripts-unit': { command: () => 'npm test' },
  'failure-paths': { command: () => 'npm test' },
  'web-regression': { command: () => 'npm run test:e2e' },
  'rust-check': { command: () => 'cargo check --manifest-path src-tauri/Cargo.toml' },
  'permission-check': { command: () => 'MANUAL: 记录 Tauri 权限检查', manual: true },
  'desktop-manual': { command: () => 'MANUAL: 记录真实 Windows 桌面验证', manual: true },
  'version-consistency': { command: () => 'node scripts/agent/check-version.js', manual: false },
  'user-confirmation': { command: () => 'MANUAL: 记录用户发版确认', manual: true },
};

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
    const definition = GATE_REGISTRY[gate];
    if (!definition) throw new Error(`未注册 gate: ${gate}`);
    return { gate, command: definition.command(taskId), manual: definition.manual === true };
  });
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

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
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
  const evidenceResult = schemaResult.ok ? validateStartEvidence(rootDir, entry.task, `${entry.relativeDirectory}/task.json`) : { ok: true, errors: [] };
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
  const plan = makeGatePlan(taskId, gates);
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
    if (gate.manual) {
      evidence.push(createEvidence({
        gate: gate.gate,
        command: gate.command,
        baseSha,
        headSha,
        exitCode: null,
        result: 'pending',
        timestamp,
        summary: '需要人工证据',
      }));
      failed = true;
      continue;
    }
    const result = runShellCommand(rootDir, gate.command);
    evidence.push(createEvidence({
      gate: gate.gate,
      command: gate.command,
      baseSha,
      headSha,
      exitCode: result.exitCode,
      result: result.exitCode === 0 ? 'success' : 'failed',
      timestamp,
      summary: summarizeOutput(result.stdout, result.stderr),
    }));
    if (result.exitCode !== 0) failed = true;
  }
  writeTask(entry, { ...entry.task, evidence: [...(Array.isArray(entry.task.evidence) ? entry.task.evidence : []), ...evidence] });
  io.log(`写入 ${evidence.length} 条验证证据（head=${headSha}）`);
  return failed ? 1 : 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  process.exitCode = main();
}
