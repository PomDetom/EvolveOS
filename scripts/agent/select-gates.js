#!/usr/bin/env node
import { assessBranchChanges } from '../boundary-check.js';
import { execFileSync } from 'node:child_process';
import { buildChangeSnapshot } from './change-scope.js';
import { buildPolicySnapshot, policyGates, policyMatchesSnapshot } from './change-policy.js';
import { findTask } from './validate-task.js';

export function selectGates({ kind = null, changedPaths = [], taskKind = null, includeBoundary = false, policy = null, snapshot = null } = {}) {
  const paths = changedPaths.map((path) => String(path).replaceAll('\\', '/'));
  const policyInputSnapshot = snapshot ?? { branch: kind, changedPaths: paths };
  const branchKind = taskKind === 'release' ? 'release' : (kind ?? undefined);
  if (policy && !policyMatchesSnapshot(policy, { snapshot: policyInputSnapshot, changedPaths: paths, branchKind })) {
    throw new Error('调用方 policy 与 Change Policy snapshot 不一致');
  }
  const resolvedPolicy = policy ?? buildPolicySnapshot({
    snapshot: policyInputSnapshot,
    changedPaths: paths,
    branchKind,
  }).policy;
  const gates = [];
  const add = (...items) => items.forEach((item) => { if (!gates.includes(item)) gates.push(item); });
  if (kind === 'invalid') return ['boundary'];
  if (includeBoundary && kind !== 'base') add('boundary');
  add(...policyGates(resolvedPolicy));
  if (!gates.length) add('boundary');
  return gates;
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const taskIndex = argv.indexOf('--task');
  const taskId = taskIndex >= 0 ? argv[taskIndex + 1] ?? null : null;
  const baseIndex = argv.indexOf('--base');
  const requestedBase = baseIndex >= 0 ? argv[baseIndex + 1] ?? 'dev' : 'dev';
  const task = taskId ? findTask(rootDir, taskId)?.task ?? null : null;
  if (taskId && !task) { io.error(`✗ 无法读取 recovery task: ${taskId}`); return 1; }
  try {
    const base = task?.baseBranch ?? requestedBase;
    const snapshot = buildChangeSnapshot(rootDir, base, 'HEAD');
    const branch = execBranch(rootDir);
    const kind = assessBranchChanges(branch, snapshot.changedPaths).kind;
    const policy = buildPolicySnapshot({ snapshot, branchKind: task?.kind === 'release' ? 'release' : kind }).policy;
    io.log(JSON.stringify({ ...snapshot, taskId, kind, policy, gates: selectGates({ kind, changedPaths: snapshot.changedPaths, taskKind: task?.kind, includeBoundary: true, policy, snapshot }) }));
    return 0;
  } catch (error) {
    io.error(`✗ 无法选择 checks: ${error.message}`);
    return 1;
  }
}

function execBranch(rootDir) {
  return process.env.EWP_BRANCH || requireGitBranch(rootDir);
}

function requireGitBranch(rootDir) {
  return execFileSync('git', ['branch', '--show-current'], { cwd: rootDir, encoding: 'utf8' }).trim();
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
