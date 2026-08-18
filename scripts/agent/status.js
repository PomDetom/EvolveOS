#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { parseTaskArgs, findTask, listTasks } from './validate-task.js';

export function summarizeTaskStatus({ task, currentBranch, sourceIsDevAncestor }) {
  const blocked = task.status === 'blocked';
  const ready = task.status === 'ready';
  const merged = Boolean(sourceIsDevAncestor);
  let next = task.status;
  if (merged) next = 'merged';
  else if (blocked) next = 'blocked';
  else if (ready) next = 'ready';
  else if (task.status === 'planned') next = 'implementing';
  else if (task.status === 'implementing') next = 'verifying';
  else if (task.status === 'verifying') next = 'reviewing';

  return {
    id: task.id,
    status: task.status,
    branch: task.branch,
    currentBranch,
    blocked,
    ready,
    merged,
    next,
  };
}

function git(rootDir, args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

function sourceIsDevAncestor(rootDir, branch) {
  try {
    const sourceHead = git(rootDir, ['rev-parse', '--verify', branch]);
    execFileSync('git', ['merge-base', '--is-ancestor', sourceHead, 'dev'], { cwd: rootDir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function inspectTask(rootDir, entry) {
  if (entry.parseError) return { id: entry.directory.split(/[\\/]/).pop(), error: entry.parseError.message };
  return summarizeTaskStatus({
    task: entry.task,
    currentBranch: git(rootDir, ['branch', '--show-current']),
    sourceIsDevAncestor: sourceIsDevAncestor(rootDir, entry.task.branch),
  });
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId } = parseTaskArgs(argv);
  const entries = taskId ? [findTask(rootDir, taskId)].filter(Boolean) : listTasks(rootDir);
  if (taskId && entries.length === 0) {
    io.error(`✗ 未找到 task: ${taskId}`);
    return 1;
  }
  if (entries.length === 0) {
    io.log('暂无 native task');
    return 0;
  }
  entries.map((entry) => inspectTask(rootDir, entry)).forEach((status) => io.log(JSON.stringify(status)));
  return entries.some((entry) => entry.parseError) ? 1 : 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  process.exitCode = main();
}
