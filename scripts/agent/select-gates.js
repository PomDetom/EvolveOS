#!/usr/bin/env node
import { assessBranchChanges } from '../boundary-check.js';
import { execFileSync } from 'node:child_process';
import { getChangedPaths, classifyChangedPaths } from './change-scope.js';
import { findTask } from './validate-task.js';

const RELEASE_PATH = /^(CHANGELOG\.md|scripts\/release\.js|src-tauri\/tauri\.conf\.json)$/;

function hasPath(paths, predicate) { return paths.some(predicate); }

export function selectGates({ kind = null, changedPaths = [], taskKind = null, includeBoundary = false } = {}) {
  const paths = changedPaths.map((path) => String(path).replaceAll('\\', '/'));
  const classification = classifyChangedPaths(paths);
  const gates = [];
  const add = (...items) => items.forEach((item) => { if (!gates.includes(item)) gates.push(item); });
  if (kind === 'invalid') return ['boundary'];
  if (includeBoundary && kind !== 'docs') add('boundary');

  if (taskKind === 'release' || hasPath(paths, (path) => RELEASE_PATH.test(path))) return [...(includeBoundary ? ['boundary'] : []), 'unit', 'e2e', 'build', 'version-consistency', 'user-confirmation'];
  if (hasPath(paths, (path) => path.startsWith('docs/') || path.startsWith('.agents/') || path.endsWith('.md'))) add('docs-check');
  if (hasPath(paths, (path) => path.startsWith('.agents/notes/'))) add('notes-check');
  if (classification.surfaces.includes('tauri')) {
    add('rust-check', 'web-contract');
    if (hasPath(paths, (path) => /permission|capabilit/i.test(path))) add('permission-check');
    if (classification.desktopOnly) add('desktop-manual');
  }
  if (classification.surfaces.includes('workflow') || classification.surfaces.includes('scripts')) {
    add('scripts-unit', 'workflow-fixture');
  }
  if (classification.surfaces.includes('framework') || kind === 'ui') {
    add('unit', 'affected-smoke', 'build', 'owner-review');
    if (hasPath(paths, (path) => /\.css$|visual|snapshot/i.test(path))) add('visual-review');
  }
  if (classification.surfaces.includes('app') || kind === 'app') {
    add('unit', 'app-e2e', 'build');
    if (hasPath(paths, (path) => /\.css$|visual|snapshot/i.test(path))) add('visual-review');
  }
  if (classification.surfaces.includes('build')) {
    add('build', 'shell-smoke');
  }
  if (classification.surfaces.includes('tests')) add('unit');
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
    const changedPaths = getChangedPaths(rootDir, base, 'HEAD');
    const branch = execBranch(rootDir);
    const kind = assessBranchChanges(branch, changedPaths).kind;
    io.log(JSON.stringify({ taskId, base, head: 'HEAD', kind, classification: classifyChangedPaths(changedPaths), changedPaths, gates: selectGates({ kind, changedPaths, taskKind: task?.kind }) }));
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
