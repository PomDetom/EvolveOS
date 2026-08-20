#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { findTask, listTasks, parseTaskArgs } from './validate-task.js';

function git(rootDir, args) { return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim(); }

export function summarizeTaskStatus({ task, currentBranch, sourceIsDevAncestor = false, changedPaths = [] }) {
  const recoveryState = task?.recovery?.state ?? 'unknown';
  return {
    id: task?.id ?? null,
    branch: task?.branch ?? null,
    currentBranch,
    recoveryState,
    merged: Boolean(sourceIsDevAncestor),
    changedPaths: changedPaths.length,
    resumable: recoveryState === 'active' || recoveryState === 'blocked',
    next: recoveryState === 'blocked' ? 'resolve blockedReason' : recoveryState === 'active' ? 'inspect Git diff and continue' : null,
  };
}

function sourceIsDevAncestor(rootDir, branch) {
  try {
    const branchHead = git(rootDir, ['rev-parse', '--verify', branch]);
    const devHead = git(rootDir, ['rev-parse', '--verify', 'dev']);
    if (branchHead === devHead) return false;
    execFileSync('git', ['merge-base', '--is-ancestor', branch, 'dev'], { cwd: rootDir, stdio: 'ignore' });
    return true;
  } catch { return false; }
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId } = parseTaskArgs(argv);
  const entries = taskId ? [findTask(rootDir, taskId)].filter(Boolean) : listTasks(rootDir);
  if (taskId && !entries.length) { io.error(`✗ 未找到 task: ${taskId}`); return 1; }
  const currentBranch = git(rootDir, ['branch', '--show-current']);
  if (!entries.length) { io.log(JSON.stringify({ id: null, currentBranch, recoveryState: 'none', resumable: false })); return 0; }
  entries.forEach((entry) => {
    if (entry.parseError) io.log(JSON.stringify({ id: null, error: entry.parseError.message }));
    else io.log(JSON.stringify(summarizeTaskStatus({ task: entry.task, currentBranch, sourceIsDevAncestor: sourceIsDevAncestor(rootDir, entry.task.branch) })));
  });
  return entries.some((entry) => entry.parseError) ? 1 : 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
