#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { assessBranchChanges } from '../boundary-check.js';
import { readProtocol, validateTask } from './task-schema.js';
import { listTasks } from './validate-task.js';

function git(rootDir, args, options = {}) { return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...options }).trim(); }
function normalize(value) { return String(value ?? '').replaceAll('\\', '/'); }

export function stagedPaths(rootDir) {
  return git(rootDir, ['diff', '--cached', '--name-only', '--diff-filter=ACMRDTUXB']).split(/\r?\n/).map(normalize).filter(Boolean);
}

function isMergeCommit(rootDir) {
  try { return existsSync(git(rootDir, ['rev-parse', '--git-path', 'MERGE_HEAD'])); } catch { return false; }
}

function pathAllowed(file, allowedPaths = []) {
  if (file.startsWith('.agents/tasks/') || file.startsWith('.agents/notes/')) return true;
  return allowedPaths.some((allowed) => {
    const prefix = normalize(allowed).replace(/\/+$/, '');
    return file === prefix || file.startsWith(`${prefix}/`);
  });
}

export function guardCommit(rootDir = process.cwd(), io = console) {
  const branch = git(rootDir, ['branch', '--show-current']);
  if (branch === 'dev' || branch === 'main') {
    if (isMergeCommit(rootDir)) return 0;
    io.error(`EWP commit guard: 禁止直接在 ${branch} 提交；请从 dev 创建工作分支`);
    return 1;
  }
  const paths = stagedPaths(rootDir);
  if (!paths.length) { io.error(`EWP commit guard: 禁止在 ${branch || 'detached HEAD'} 创建空提交`); return 1; }
  try { execFileSync('git', ['diff', '--cached', '--check'], { cwd: rootDir, stdio: 'ignore' }); } catch { io.error('EWP commit guard: staged diff 存在 whitespace 错误'); return 1; }

  const boundary = assessBranchChanges(branch, paths);
  if (!boundary.ok) { io.error(`EWP commit guard: ${boundary.note}`); boundary.violations.forEach((file) => io.error(`  ${file}`)); return 1; }

  const tasks = (() => {
    try {
      const candidate = listTasks(rootDir).find((entry) => entry.task?.branch === branch);
      return candidate?.task?.branch === branch ? candidate : null;
    } catch { return null; }
  })();
  if (tasks?.task) {
    const schema = validateTask(tasks.task, tasks.relativeDirectory, readProtocol(rootDir));
    if (!schema.ok) { io.error(`EWP commit guard: recovery task 校验失败：${schema.errors.join('；')}`); return 1; }
    const outside = paths.filter((file) => !pathAllowed(file, tasks.task.allowedPaths));
    if (outside.length) { io.error(`EWP commit guard: 改动超出 task.allowedPaths：${outside.join(', ')}`); return 1; }
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exitCode = guardCommit();
