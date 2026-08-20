#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { evaluateTaskApproval, readTaskPlan } from './approval.js';
import { commitWorkflowRecord, recordTaskActivity } from './activity.js';
import { findTask } from './validate-task.js';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';

function value(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

export function parseImplementArgs(argv) {
  return { taskId: value(argv, '--task'), dryRun: argv.includes('--dry-run') };
}

function writeTask(entry, task) {
  writeFileSync(entry.taskPath, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
}

function reportErrors(io, errors) {
  errors.forEach((error) => io.error(`  ${error}`));
  return 1;
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId, dryRun } = parseImplementArgs(argv);
  if (!taskId) {
    io.error('用法：npm run agent:implement -- --task EWP-020 [--dry-run]');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }

  const schemaResult = validateTask(entry.task, entry.relativeDirectory, readProtocol(rootDir));
  if (!schemaResult.ok) {
    io.error(`✗ task ${taskId} 校验失败`);
    return reportErrors(io, schemaResult.errors);
  }
  const evidenceResult = validateStartEvidence(rootDir, entry.task, `${entry.relativeDirectory}/task.json`);
  if (!evidenceResult.ok) {
    io.error(`✗ task ${taskId} 缺少成功的 agent:start 启动证据`);
    return reportErrors(io, evidenceResult.errors);
  }

  let approvalResult;
  try {
    const plan = readTaskPlan(rootDir, entry.taskPath);
    approvalResult = evaluateTaskApproval({ task: entry.task, ...plan });
  } catch (error) {
    io.error(`✗ 无法读取 task ${taskId} 的方案：${error.message}`);
    return 1;
  }
  if (!approvalResult.ok) {
    io.error(`✗ task ${taskId} 不能进入 implementing`);
    return reportErrors(io, approvalResult.issues);
  }
  if (!['planned', 'implementing'].includes(entry.task.status)) {
    io.error(`✗ task ${taskId} 当前状态不是 planned：${entry.task.status}`);
    return 1;
  }

  if (dryRun) {
    io.log(`task=${taskId}`);
    io.log('planned -> implementing');
    io.log('dry-run：不执行实现代码动作，也不写入 task');
    return 0;
  }
  if (entry.task.status !== 'implementing') {
    const task = { ...entry.task, status: 'implementing' };
    writeTask(entry, task);
    entry.task = task;
    const activity = recordTaskActivity(rootDir, entry, {
      type: 'status',
      from: 'planned',
      to: 'implementing',
      checkpoint: 'implementation-start',
    });
    const commit = commitWorkflowRecord(rootDir, [entry.taskPath, activity.relativePath], `chore: ${taskId} 进入实现阶段`);
    io.log(`✓ task ${taskId} 已进入 implementing（checkpoint=${commit ?? '已有记录'}）；本入口不执行实现代码动作`);
    return 0;
  }
  io.log(`✓ task ${taskId} 已处于 implementing；本入口不执行实现代码动作`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
