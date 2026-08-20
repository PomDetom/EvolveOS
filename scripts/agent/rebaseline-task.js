#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildBaselineEvidence, runBaselineCommand } from './start-task.js';
import { commitWorkflowRecord } from './activity.js';
import { findTask } from './validate-task.js';

function value(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

export function parseRebaselineArgs(argv) {
  return { taskId: value(argv, '--task'), sourceRoot: value(argv, '--source-root') };
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId, sourceRoot = rootDir } = parseRebaselineArgs(argv);
  if (!taskId) {
    io.error('用法：node scripts/agent/rebaseline-task.js --task EWP-019 --source-root C:/Repository/EvolveOS');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }
  const baselines = buildBaselineEvidence({
    rootDir,
    taskId,
    baseSha: entry.task.baseSha,
    baseBranch: entry.task.baseBranch,
    branch: entry.task.branch,
    taskKind: entry.task.kind,
    hasNotes: entry.task.notes.length > 0,
    initCommit: entry.task.initCommit,
    runner: (_ignoredRoot, command, options) => runBaselineCommand(sourceRoot, command, options),
  });
  const failures = baselines.filter((baseline) => !['success', 'pending'].includes(baseline.result));
  if (failures.length) {
    io.error(`✗ baseline 重录仍有失败：${failures.map((item) => `${item.gate}=${item.result}`).join(', ')}`);
    return 1;
  }

  const recordPath = resolve(rootDir, `.agents/start-runs/${entry.task.startRunId}.json`);
  const startRecord = JSON.parse(readFileSync(recordPath, 'utf8'));
  const baselineUpdatePath = entry.task.baselineUpdate.path;
  const baselineUpdate = {
    ...entry.task.baselineUpdate,
    baselines,
    commit: '0'.repeat(40),
  };
  const task = { ...entry.task, baselines, baselineUpdate };
  const updatedRecord = { ...startRecord, baselines, baselineUpdate };
  writeFileSync(entry.taskPath, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
  writeFileSync(recordPath, `${JSON.stringify(updatedRecord, null, 2)}\n`, 'utf8');
  writeFileSync(resolve(rootDir, baselineUpdatePath), `${JSON.stringify({ ...baselineUpdate, baselines }, null, 2)}\n`, 'utf8');
  const taskRelativePath = `${entry.relativeDirectory}/task.json`;
  const recordRelativePath = `.agents/start-runs/${entry.task.startRunId}.json`;
  const firstCommit = commitWorkflowRecord(rootDir, [taskRelativePath, recordRelativePath, baselineUpdatePath], `chore: 补录 ${taskId} baseline`);
  const completedUpdate = { ...baselineUpdate, commit: firstCommit };
  writeFileSync(entry.taskPath, `${JSON.stringify({ ...task, baselineUpdate: completedUpdate }, null, 2)}\n`, 'utf8');
  writeFileSync(recordPath, `${JSON.stringify({ ...updatedRecord, baselineUpdate: completedUpdate }, null, 2)}\n`, 'utf8');
  const updateCommit = commitWorkflowRecord(rootDir, [taskRelativePath, recordRelativePath], `chore: 记录 ${taskId} baseline 更新`);
  io.log(`✓ task ${taskId} 已重录 baseline（commit=${updateCommit ?? firstCommit}）`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  }
}
