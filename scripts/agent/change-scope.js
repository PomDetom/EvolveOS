#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { findTask } from './validate-task.js';

export function parseScopeArgs(argv) {
  const value = (name, fallback = null) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? fallback : fallback;
  };
  return {
    taskId: value('--task'),
    base: value('--base', 'dev'),
    head: value('--head', 'HEAD'),
  };
}

export function getChangedPaths(rootDir, base, head) {
  const output = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function pathAllowed(file, allowedPaths) {
  return allowedPaths.some((allowed) => allowed.endsWith('/') ? file.startsWith(allowed) : file === allowed);
}

export function buildChangeScope({ task, base, head, changedPaths }) {
  const paths = [...new Set(changedPaths)].sort();
  const allowedPaths = Array.isArray(task.allowedPaths) ? task.allowedPaths : [];
  const violations = paths.filter((file) => !pathAllowed(file, allowedPaths));
  return {
    taskId: task.id,
    branch: task.branch,
    base,
    head,
    changedPaths: paths,
    violations,
    ok: violations.length === 0,
  };
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId, base, head } = parseScopeArgs(argv);
  if (!taskId) {
    io.error('用法：npm run agent:scope -- --task EWP-003 --base dev --head HEAD');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }
  const scope = buildChangeScope({
    task: entry.task,
    base,
    head,
    changedPaths: getChangedPaths(rootDir, base, head),
  });
  io.log(JSON.stringify(scope));
  return scope.ok ? 0 : 1;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  process.exitCode = main();
}
