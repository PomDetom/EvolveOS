#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildApprovedApproval, evaluateApprovalScope, readTaskPlan } from './approval.js';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';
import { findTask } from './validate-task.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function value(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

export function parseApproveArgs(argv) {
  return {
    taskId: value(argv, '--task'),
    approver: value(argv, '--approver', 'Codex'),
  };
}

function writeTask(entry, task) {
  writeFileSync(entry.taskPath, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
}

export function main(argv = process.argv.slice(2), rootDir = ROOT, io = console) {
  const { taskId, approver } = parseApproveArgs(argv);
  if (!taskId || !approver) {
    io.error('用法：npm run agent:approve -- --task EWP-010 [--approver Codex]');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }
  const schemaResult = validateTask(entry.task, entry.relativeDirectory, readProtocol(rootDir));
  const evidenceResult = schemaResult.ok ? validateStartEvidence(rootDir, entry.task, `${entry.relativeDirectory}/task.json`) : { ok: true, errors: [] };
  if (!schemaResult.ok || !evidenceResult.ok) {
    io.error(`✗ task ${taskId} 校验失败`);
    [...schemaResult.errors, ...evidenceResult.errors].forEach((error) => io.error(`  ${error}`));
    return 1;
  }

  const { planPath, planText } = readTaskPlan(rootDir, entry.taskPath);
  const approvalResult = evaluateApprovalScope({ task: entry.task, planText, planPath });
  if (!approvalResult.ok) {
    approvalResult.issues.forEach((issue) => io.error(`✗ ${issue}`));
    return 1;
  }

  const task = {
    ...entry.task,
    status: entry.task.status === 'awaiting_approval' ? 'planned' : entry.task.status,
    approval: buildApprovedApproval({
      approver,
      approvedAt: new Date().toISOString(),
      scope: approvalResult.scope,
    }),
  };
  writeTask(entry, task);
  io.log(`✓ task ${taskId} 已记录方案审批（scopeHash=${task.approval.scopeHash}）`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
