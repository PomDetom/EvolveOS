#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { recordTaskActivity, activityRelativePath } from './activity.js';
import { listTasks } from './validate-task.js';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';

function git(rootDir, args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function normalize(path) {
  return String(path ?? '').replaceAll('\\', '/');
}

function stagedPaths(rootDir) {
  const output = git(rootDir, ['diff', '--cached', '--name-only', '--diff-filter=ACMRDTUXB']);
  return output.split(/\r?\n/).map(normalize).filter(Boolean);
}

function isTaskMetadata(path) {
  const normalized = normalize(path);
  return normalized.startsWith('.agents/tasks/')
    || normalized.startsWith('.agents/start-runs/')
    || normalized.startsWith('.agents/notes/');
}

function isAllowed(path, allowedPaths) {
  return allowedPaths.some((allowed) => {
    const prefix = normalize(allowed).replace(/\/+$/, '');
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

function isMergeCommit(rootDir) {
  try {
    return existsSync(git(rootDir, ['rev-parse', '--git-path', 'MERGE_HEAD']));
  } catch {
    return false;
  }
}

export function guardCommit(rootDir = process.cwd(), io = console) {
  const branch = git(rootDir, ['branch', '--show-current']);
  if (branch === 'dev' || branch === 'main') {
    if (isMergeCommit(rootDir)) return 0;
    io.error(`EWP commit guard: 禁止直接在 ${branch} 提交；请使用 agent:start 创建任务分支`);
    return 1;
  }

  const paths = stagedPaths(rootDir);
  if (!paths.length) {
    io.error(`EWP commit guard: 禁止在 ${branch || 'detached HEAD'} 创建空提交`);
    return 1;
  }

  const entry = listTasks(rootDir).find((candidate) => candidate.task?.branch === branch);
  if (!entry || entry.parseError) {
    io.error(`EWP commit guard: 分支 ${branch} 没有关联可解析的 native task；请使用 agent:start`);
    return 1;
  }

  const task = entry.task;
  const schema = validateTask(task, entry.relativeDirectory, readProtocol(rootDir));
  if (!schema.ok) {
    io.error(`EWP commit guard: task ${task.id} 校验失败：${schema.errors.join('；')}`);
    return 1;
  }

  const codePaths = paths.filter((path) => !isTaskMetadata(path));
  if (!codePaths.length) return 0;
  if (task.approval?.status !== 'approved') {
    io.error(`EWP commit guard: task ${task.id} 尚未获得方案审批，不能提交代码`);
    return 1;
  }
  if (!['implementing', 'verifying', 'reviewing'].includes(task.status)) {
    io.error(`EWP commit guard: task ${task.id} 当前状态为 ${task.status}，不能提交代码`);
    return 1;
  }
  const evidence = validateStartEvidence(rootDir, task, `${entry.relativeDirectory}/task.json`);
  if (!evidence.ok) {
    io.error(`EWP commit guard: task ${task.id} 缺少有效 agent:start 证据：${evidence.errors.join('；')}`);
    return 1;
  }
  const outside = codePaths.filter((path) => !isAllowed(path, task.allowedPaths));
  if (outside.length) {
    io.error(`EWP commit guard: 改动超出 task.allowedPaths：${outside.join(', ')}`);
    return 1;
  }

  const activity = recordTaskActivity(rootDir, entry, {
    type: 'commit-intent',
    status: task.status,
    parentSha: git(rootDir, ['rev-parse', 'HEAD']),
    stagedPaths: paths,
  });
  execFileSync('git', ['add', '--', activityRelativePath(rootDir, entry)], { cwd: rootDir, stdio: 'ignore' });
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = guardCommit();
}
