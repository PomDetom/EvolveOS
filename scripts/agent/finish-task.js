#!/usr/bin/env node
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getChangedPaths } from './change-scope.js';
import { evaluateNoteRequirement, noteLifecycleForPath } from './note-gate.js';
import { findTask } from './validate-task.js';
import { gitSha } from './workflow-utils.js';
import { main as verifyMain } from './verify.js';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function value(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

export function parseFinishArgs(argv) {
  return {
    taskId: value(argv, '--task'),
    reviewer: value(argv, '--reviewer'),
    reviewResult: value(argv, '--review-result'),
  };
}

export function buildReviewRecord({ reviewer, result, reviewedHead }) {
  return {
    reviewer,
    result,
    reviewedHead,
    findings: { critical: [], important: [], minor: [] },
  };
}

function writeTask(entry, task) {
  writeFileSync(entry.taskPath, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
}

function renderReview(task, review) {
  return `# ${task.id} Review\n\n**Reviewed head:** \`${review.reviewedHead}\`\n\n**Reviewer:** ${review.reviewer}\n\n**Result:** ${review.result}\n\n## Acceptance\n\n- [x] 规格/需求覆盖\n- [x] 改动范围符合 allowedPaths\n- [x] 自动化证据与 reviewed head 一致\n- [x] 必要人工证据存在\n\n## Findings\n\n### Critical\n\n无。\n\n### Important\n\n无。\n\n### Minor\n\n无。\n`;
}

function resolveNotePaths(rootDir, notes) {
  return notes.map((note) => {
    const absolute = resolve(rootDir, note);
    if (existsSync(absolute)) return note;
    const implemented = note.replace('/proposed/', '/implemented/');
    return existsSync(resolve(rootDir, implemented)) ? implemented : note;
  });
}

export function main(argv = process.argv.slice(2), rootDir = ROOT, io = console) {
  const { taskId, reviewer, reviewResult } = parseFinishArgs(argv);
  if (!taskId || !reviewer || !reviewResult) {
    io.error('用法：npm run agent:finish -- --task EWP-010 --reviewer Codex --review-result approved');
    return 1;
  }
  if (reviewResult !== 'approved') {
    io.error('✗ 只有 review-result=approved 才能进入 ready');
    return 1;
  }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) {
    io.error(`✗ 无法读取 task: ${taskId}`);
    return 1;
  }
  const schemaResult = validateTask(entry.task, entry.relativeDirectory, readProtocol(rootDir));
  const evidenceResult = schemaResult.ok ? validateStartEvidence(rootDir, entry.task) : { ok: true, errors: [] };
  if (!schemaResult.ok || !evidenceResult.ok) {
    io.error(`✗ task ${taskId} 校验失败`);
    [...schemaResult.errors, ...evidenceResult.errors].forEach((error) => io.error(`  ${error}`));
    return 1;
  }

  writeTask(entry, { ...entry.task, status: 'verifying' });
  const verifyResult = verifyMain(['--task', taskId], rootDir, io);
  if (verifyResult !== 0) {
    io.error('✗ verify 未通过，任务保持 verifying');
    return 1;
  }

  const refreshed = findTask(rootDir, taskId);
  const changedPaths = getChangedPaths(rootDir, refreshed.task.baseBranch, 'HEAD');
  const notePaths = resolveNotePaths(rootDir, refreshed.task.notes ?? []);
  const noteLifecycles = Object.fromEntries(notePaths.map((note) => [note, noteLifecycleForPath(note)]));
  const noteReport = evaluateNoteRequirement({
    task: refreshed.task,
    changedPaths,
    notePaths,
    noteLifecycles,
    status: 'ready',
  });
  if (!noteReport.ok) {
    noteReport.issues.forEach((issue) => io.error(`✗ ${issue}`));
    return 1;
  }

  const changeHead = gitSha(rootDir, 'HEAD');
  const review = buildReviewRecord({ reviewer, result: reviewResult, reviewedHead: changeHead });
  const task = {
    ...refreshed.task,
    status: 'ready',
    notes: notePaths,
    changeHead,
    readyHead: changeHead,
    review,
  };
  writeTask(refreshed, task);
  const reviewPath = resolve(dirname(refreshed.taskPath), 'review.md');
  writeFileSync(reviewPath, renderReview(task, review), 'utf8');
  io.log(`✓ task ${taskId} 已进入 ready（changeHead=${changeHead}）`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
