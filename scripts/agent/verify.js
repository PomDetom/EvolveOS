#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChangeSnapshot, hashChangeFingerprint, hashChangedPaths } from './change-scope.js';
import { evaluateChangePolicy } from './change-policy.js';
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

export function snapshotEvidenceFacts(snapshot = {}) {
  return {
    baseSha: snapshot.baseSha ?? null,
    headSha: snapshot.headSha ?? null,
    changedPathsHash: snapshot.changedPathsHash ?? null,
    changeFingerprint: snapshot.changeFingerprint ?? null,
    snapshotError: snapshot.snapshotError ?? null,
  };
}

export function snapshotsMatch(startSnapshot, endSnapshot) {
  const start = snapshotEvidenceFacts(startSnapshot);
  const end = snapshotEvidenceFacts(endSnapshot);
  return start.baseSha === end.baseSha
    && start.headSha === end.headSha
    && start.changedPathsHash === end.changedPathsHash
    && start.changeFingerprint === end.changeFingerprint
    && start.snapshotError === end.snapshotError;
}

export function createEvidence({ taskId = null, gate, command, commandId, baseSha, headSha, changedPathsHash, changeFingerprint = null, policyHash = null, startSnapshot = null, endSnapshot = null, exitCode = null, result, timestamp = new Date().toISOString(), summary = '' }) {
  return { schemaVersion: 2, taskId, gate, command, commandId: commandId ?? gate, baseSha, headSha, changedPathsHash, changeFingerprint, policyHash, startSnapshot, endSnapshot, exitCode, result, timestamp, summary };
}

export function assessEvidence({ requiredGates = [], evidence = [], baseSha = null, headSha = null, changedPathsHash = null, changeFingerprint = null, policyHash = null, startSnapshot = null, endSnapshot = null }) {
  const latest = new Map();
  for (const item of evidence) latest.set(item.commandId ?? item.gate, item);
  const incomplete = requiredGates.filter((gate) => {
    const item = latest.get(gate);
    return !item || item.result !== 'success' || (baseSha && item.baseSha !== baseSha) || (headSha && item.headSha !== headSha) || (changedPathsHash && item.changedPathsHash !== changedPathsHash) || (changeFingerprint && item.changeFingerprint !== changeFingerprint) || (policyHash && item.policyHash !== policyHash) || (startSnapshot && !snapshotsMatch(startSnapshot, item.startSnapshot)) || (endSnapshot && !snapshotsMatch(endSnapshot, item.endSnapshot));
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

export async function runStatelessVerification({ rootDir = process.cwd(), taskId = null, base = 'dev', head = 'HEAD', changedPaths = null, gates = null, snapshot = null, policy = null, runner = runShellCommand, writeCache = true } = {}) {
  const initialFacts = snapshot ?? buildChangeSnapshot(rootDir, base, head);
  const paths = changedPaths ?? initialFacts.changedPaths;
  const facts = changedPaths
    ? { ...initialFacts, changedPaths: paths, changedPathsHash: hashChangedPaths(paths), changeFingerprint: hashChangeFingerprint(rootDir, base, head, paths) }
    : initialFacts;
  const resolvedPolicy = policy ?? evaluateChangePolicy({ snapshot: facts, changedPaths: paths });
  const canonicalGates = selectGates({ changedPaths: paths, includeBoundary: true, policy: resolvedPolicy, snapshot: facts });
  if (gates && JSON.stringify(gates) !== JSON.stringify(canonicalGates)) throw new Error('调用方 gates 与 Change Policy 不一致');
  const selectedGates = canonicalGates;
  const plan = makeGatePlan(taskId, selectedGates, { rootDir, base, head, changedPaths: paths, snapshot: facts });
  const baseSha = facts.baseSha ?? gitSha(rootDir, base);
  const headSha = facts.headSha ?? gitSha(rootDir, head);
  const changedPathsHash = facts.changedPathsHash ?? hashChangedPaths(paths);
  const startSnapshot = snapshotEvidenceFacts(facts);
  const evidence = [];
  for (const gate of plan) {
    if (gate.manual) {
      evidence.push(createEvidence({ taskId, gate: gate.gate, command: gate.command, commandId: gate.commandId, baseSha, headSha, changedPathsHash, changeFingerprint: facts.changeFingerprint, policyHash: resolvedPolicy.policyHash, startSnapshot, result: 'pending', summary: '需要人工 evidence' }));
      continue;
    }
    const { result } = await executeGate(rootDir, gate.command, runner, { gate: gate.gate, baseBranch: base });
    const resultName = classifyGateResult(result);
    evidence.push(createEvidence({ taskId, gate: gate.gate, command: gate.command, commandId: gate.commandId, baseSha, headSha, changedPathsHash, changeFingerprint: facts.changeFingerprint, policyHash: resolvedPolicy.policyHash, startSnapshot, exitCode: result.exitCode, result: resultName, summary: summarizeOutput(result.stdout, `${result.stderr ?? ''} ${result.reason ?? ''}`) }));
  }
  let endFacts;
  try {
    endFacts = buildChangeSnapshot(rootDir, base, head);
  } catch (error) {
    endFacts = { ...facts, snapshotError: error.message };
  }
  const endSnapshot = snapshotEvidenceFacts(endFacts);
  const snapshotStable = snapshotsMatch(startSnapshot, endSnapshot);
  const finalizedEvidence = evidence.map((item) => ({ ...item, endSnapshot }));
  const report = { schemaVersion: 2, taskId, base, head, baseSha, headSha, changedPathsHash, changeFingerprint: facts.changeFingerprint, policyHash: resolvedPolicy.policyHash, policy: resolvedPolicy, requiredAttestations: resolvedPolicy.requiredAttestations, startSnapshot, endSnapshot, snapshotStable, changedPaths: paths, gates: selectedGates, evidence: finalizedEvidence, snapshot: { baseSha, headSha, changedPathsHash, changeFingerprint: facts.changeFingerprint }, ok: snapshotStable && finalizedEvidence.every((item) => item.result === 'success') };
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
  let snapshot;
  try { snapshot = buildChangeSnapshot(rootDir, base, args.head); } catch (error) { io.error(`✗ 无法读取 Git diff: ${error.message}`); return 1; }
  const paths = snapshot.changedPaths;
  const policy = evaluateChangePolicy({ snapshot, branchKind: task?.kind === 'release' ? 'release' : undefined });
  const gates = selectGates({ changedPaths: paths, taskKind: task?.kind, includeBoundary: true, policy, snapshot });
  const plan = makeGatePlan(args.taskId, gates, { rootDir, base, head: args.head, changedPaths: paths, snapshot, policy });
  if (args.dryRun) { io.log(renderDryRun(args.taskId, plan)); return 0; }
  const report = await runStatelessVerification({ rootDir, taskId: args.taskId, base, head: args.head, changedPaths: paths, gates, snapshot, policy, runner: deps.runShellCommand ?? runShellCommand, writeCache: !args.noCache });
  io.log(JSON.stringify(report, null, 2));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) Promise.resolve(main()).then((code) => { process.exitCode = code; });
