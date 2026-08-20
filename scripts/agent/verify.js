#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getChangedPaths, hashChangedPaths } from './change-scope.js';
import { gateDefinition } from './gate-registry.js';
import { selectGates } from './select-gates.js';
import { findTask } from './validate-task.js';
import { classifyGateResult, runShellCommand, summarizeOutput, gitSha } from './workflow-utils.js';

export function parseVerifyArgs(argv) {
  const value = (name, fallback = null) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? fallback : fallback;
  };
  return {
    taskId: value('--task'),
    base: value('--base', 'dev'),
    head: value('--head', 'HEAD'),
    dryRun: argv.includes('--dry-run'),
    noCache: argv.includes('--no-cache'),
  };
}

export function makeGatePlan(taskIdOrGates, maybeGates, context = {}) {
  const gates = Array.isArray(taskIdOrGates) ? taskIdOrGates : maybeGates;
  const taskId = Array.isArray(taskIdOrGates) ? null : taskIdOrGates;
  return (gates ?? []).map((gate) => gateDefinition(gate, { ...context, taskId }));
}

export function renderDryRun(taskIdOrPlan, maybePlan) {
  const plan = Array.isArray(taskIdOrPlan) ? taskIdOrPlan : maybePlan;
  const taskId = Array.isArray(taskIdOrPlan) ? null : taskIdOrPlan;
  return [
    ...(taskId ? [`task=${taskId}`] : []),
    ...plan.map((entry, index) => `${index + 1}. ${entry.gate} | ${entry.command}`),
  ].join('\n');
}

export function createEvidence({ taskId = null, gate, command, commandId, baseSha, headSha, changedPathsHash, exitCode = null, result, timestamp = new Date().toISOString(), summary = '' }) {
  return { schemaVersion: 2, taskId, gate, command, commandId: commandId ?? gate, baseSha, headSha, changedPathsHash, exitCode, result, timestamp, summary };
}

export function assessEvidence({ requiredGates = [], evidence = [], headSha = null, changedPathsHash = null }) {
  const latest = new Map();
  for (const item of evidence) latest.set(item.commandId ?? item.gate, item);
  const incomplete = requiredGates.filter((gate) => {
    const item = latest.get(gate);
    return !item || item.result !== 'success' || (headSha && item.headSha !== headSha) || (changedPathsHash && item.changedPathsHash !== changedPathsHash);
  });
  return { ok: incomplete.length === 0, incomplete };
}

// Migration compatibility: v2 callers pass the gates selected from Git, while
// old callers may still use the former requiredGates='auto' helper.
export function resolveRequiredGates({ requiredGates = 'auto', autoGates = [] } = {}) {
  return requiredGates === 'auto' ? [...autoGates] : [...requiredGates];
}

export async function executeGate(rootDir, command, runner = runShellCommand, options = {}) {
  try {
    const result = await runner(rootDir, command, options);
    return { result };
  } catch (error) {
    return { result: { exitCode: 1, stdout: '', stderr: '', reason: `runner exception: ${error?.message ?? error}`, environmentFailure: true } };
  }
}

function evidenceDirectory(rootDir) {
  const gitPath = execFileSync('git', ['rev-parse', '--git-path', 'evolve-agent/evidence'], { cwd: rootDir, encoding: 'utf8' }).trim();
  return resolve(rootDir, gitPath);
}

export function evidenceCachePath(rootDir, branch = 'current') {
  return resolve(evidenceDirectory(rootDir), `${branch.replace(/[^A-Za-z0-9._-]+/g, '_')}.json`);
}

export function readCachedEvidence(rootDir, branch = 'current') {
  const path = evidenceCachePath(rootDir, branch);
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null; } catch { return null; }
}

export async function runStatelessVerification({ rootDir = process.cwd(), taskId = null, base = 'dev', head = 'HEAD', changedPaths = null, gates = null, runner = runShellCommand, writeCache = true } = {}) {
  const paths = changedPaths ?? getChangedPaths(rootDir, base, head);
  const selectedGates = gates ?? selectGates({ changedPaths: paths });
  const plan = makeGatePlan(taskId, selectedGates, { rootDir, base, head, changedPaths: paths });
  const baseSha = gitSha(rootDir, base);
  const headSha = gitSha(rootDir, head);
  const changedPathsHash = hashChangedPaths(paths);
  const evidence = [];
  for (const gate of plan) {
    if (gate.manual) {
      evidence.push(createEvidence({ taskId, gate: gate.gate, command: gate.command, commandId: gate.commandId, baseSha, headSha, changedPathsHash, result: 'pending', summary: '需要人工 evidence' }));
      continue;
    }
    const { result } = await executeGate(rootDir, gate.command, runner, { gate: gate.gate, baseBranch: base });
    const resultName = classifyGateResult(result);
    evidence.push(createEvidence({ taskId, gate: gate.gate, command: gate.command, commandId: gate.commandId, baseSha, headSha, changedPathsHash, exitCode: result.exitCode, result: resultName, summary: summarizeOutput(result.stdout, `${result.stderr ?? ''} ${result.reason ?? ''}`) }));
  }
  const report = { schemaVersion: 2, taskId, base, head, baseSha, headSha, changedPathsHash, changedPaths: paths, gates: selectedGates, evidence, ok: evidence.every((item) => item.result === 'success') };
  if (writeCache) {
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: rootDir, encoding: 'utf8' }).trim() || 'detached';
    const path = evidenceCachePath(rootDir, branch);
    mkdirSync(resolve(path, '..'), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.cachePath = path;
  }
  return report;
}

export async function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console, deps = {}) {
  const args = parseVerifyArgs(argv);
  const task = args.taskId ? findTask(rootDir, args.taskId)?.task ?? null : null;
  if (args.taskId && !task) { io.error(`✗ 无法读取 recovery task: ${args.taskId}`); return 1; }
  const base = task?.baseBranch ?? args.base;
  let paths;
  try { paths = getChangedPaths(rootDir, base, args.head); } catch (error) { io.error(`✗ 无法读取 Git diff: ${error.message}`); return 1; }
  const gates = selectGates({ changedPaths: paths, taskKind: task?.taskKind });
  const plan = makeGatePlan(args.taskId, gates, { rootDir, base, head: args.head, changedPaths: paths });
  if (args.dryRun) { io.log(renderDryRun(args.taskId, plan)); return 0; }
  const report = await runStatelessVerification({ rootDir, taskId: args.taskId, base, head: args.head, changedPaths: paths, gates, runner: deps.runShellCommand ?? runShellCommand, writeCache: !args.noCache });
  io.log(JSON.stringify(report, null, 2));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) Promise.resolve(main()).then((code) => { process.exitCode = code; });
