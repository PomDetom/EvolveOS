#!/usr/bin/env node
import { assessBranchChanges } from '../boundary-check.js';
import { findTask } from './validate-task.js';
import { getChangedPaths } from './change-scope.js';

const FRAMEWORK_PATH = /^(src\/(components|styles|config|app|scenes|demo|motion|assets)\/)/;
const RELEASE_PATH = /^(package\.json|package-lock\.json|CHANGELOG\.md|scripts\/release\.js|src-tauri\/Cargo\.toml|src-tauri\/tauri\.conf\.json)$/;

function hasPath(changedPaths, predicate) {
  return changedPaths.some(predicate);
}

export function selectGates({ kind, changedPaths = [], hasNotes = false, taskKind = 'chore' }) {
  if (kind === 'invalid') return ['boundary'];
  if (taskKind === 'release' || hasPath(changedPaths, (path) => RELEASE_PATH.test(path))) {
    return ['unit', 'e2e', 'build', 'version-consistency', 'user-confirmation'];
  }
  if (hasPath(changedPaths, (path) => path.startsWith('src-tauri/'))) {
    return ['web-regression', 'rust-check', 'permission-check', 'desktop-manual'];
  }
  if (kind === 'ui' || hasPath(changedPaths, (path) => FRAMEWORK_PATH.test(path))) {
    return ['boundary', 'unit', 'e2e', 'visual-review', 'build', 'owner-review'];
  }
  if (kind === 'app' || hasPath(changedPaths, (path) => path.startsWith('src/apps/'))) {
    return ['boundary', 'unit', 'e2e', 'shell-smoke', 'build'];
  }
  if (kind === 'docs' || hasPath(changedPaths, (path) => path.startsWith('docs/') || /^[^/]+\.md$/.test(path))) {
    return hasNotes ? ['task-check', 'notes-check', 'build'] : ['task-check', 'build'];
  }
  if (hasPath(changedPaths, (path) => path.startsWith('scripts/'))) {
    return ['scripts-unit', 'failure-paths', 'build'];
  }
  if (kind === 'chore' || kind === 'hotfix') return ['scripts-unit', 'failure-paths', 'build'];
  return ['boundary'];
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const taskIndex = argv.indexOf('--task');
  const taskId = taskIndex >= 0 ? argv[taskIndex + 1] ?? null : null;
  if (!taskId) {
    io.error('用法：npm run agent:gates -- --task EWP-003');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }
  const changedPaths = getChangedPaths(rootDir, entry.task.baseBranch, 'HEAD');
  const kind = assessBranchChanges(entry.task.branch, changedPaths).kind;
  io.log(JSON.stringify({
    taskId,
    kind,
    gates: selectGates({
      kind,
      changedPaths,
      hasNotes: entry.task.notes.length > 0,
      taskKind: entry.task.kind,
    }),
  }));
  return 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  process.exitCode = main();
}
