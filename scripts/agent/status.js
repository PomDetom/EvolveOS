#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { findTask, listTasks, parseTaskArgs } from './validate-task.js';

function git(rootDir, args) { return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim(); }

function trailer(body, name) {
  return body.split(/\r?\n/).find((line) => new RegExp(`^${name}:\\s*`, 'i').test(line))?.replace(new RegExp(`^${name}:\\s*`, 'i'), '').trim() ?? null;
}

export function findIntegratedTask(rootDir, taskId) {
  if (!taskId) return null;
  try {
    const log = git(rootDir, ['log', 'dev', '--format=%H%x1f%B%x1e']);
    for (const record of log.split('\x1e')) {
      const separator = record.indexOf('\x1f');
      if (separator < 0) continue;
      const commit = record.slice(0, separator).trim();
      const body = record.slice(separator + 1);
      if (trailer(body, 'Task') !== taskId) continue;
      return {
        integrated: true,
        commit,
        sourceBranch: trailer(body, 'Source-Branch'),
        sourceHead: trailer(body, 'Source-Head'),
      };
    }
  } catch { /* dev may not exist in a minimal fixture */ }
  return null;
}

export function summarizeTaskStatus({ task, currentBranch, sourceIsDevAncestor = false, changedPaths = [], integration = null }) {
  const recoveryState = task?.recovery?.state ?? 'unknown';
  if (integration?.integrated) {
    return {
      id: task?.id ?? null,
      branch: task?.branch ?? null,
      currentBranch,
      recoveryState,
      merged: true,
      integrated: true,
      integrationCommit: integration.commit,
      sourceHead: integration.sourceHead,
      sourceBranch: integration.sourceBranch,
      changedPaths: changedPaths.length,
      resumable: false,
      next: null,
    };
  }
  return {
    id: task?.id ?? null,
    branch: task?.branch ?? null,
    currentBranch,
    recoveryState,
    merged: Boolean(sourceIsDevAncestor),
    integrated: false,
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
    else io.log(JSON.stringify(summarizeTaskStatus({
      task: entry.task,
      currentBranch,
      sourceIsDevAncestor: sourceIsDevAncestor(rootDir, entry.task.branch),
      integration: findIntegratedTask(rootDir, entry.task.id),
    })));
  });
  return entries.some((entry) => entry.parseError) ? 1 : 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
