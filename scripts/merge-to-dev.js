#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from './merge-to-dev-utils.js';
import { assessBranchChanges } from './boundary-check.js';
import { buildChangeScope, getChangedPaths, hashChangedPaths } from './agent/change-scope.js';
import { listTasksAtRef } from './agent/validate-task.js';
import { selectGates } from './agent/select-gates.js';
import { readCachedEvidence } from './agent/verify.js';
import { evaluateNoteRequirement, noteLifecycleForPath } from './agent/note-gate.js';
import { evaluateNativeReadiness, formatNativeReadiness } from './merge-to-dev-agent-utils.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function sh(cwd, cmd) { return execSync(cmd, { cwd, encoding: 'utf8' }).trim(); }
function shOk(cwd, cmd) { try { sh(cwd, cmd); return true; } catch { return false; } }
const fail = (message) => { throw new Error(message); };

function mergeWithMessage(cwd, cmd, message) {
  const file = path.join(os.tmpdir(), `merge-to-dev-${process.pid}.txt`);
  writeFileSync(file, message, 'utf8');
  try { sh(cwd, `${cmd} -F "${file}"`); } finally { try { unlinkSync(file); } catch {} }
}

export function worktreesOn(branch, rootDir = ROOT) {
  return sh(rootDir, 'git worktree list --porcelain').split('\n\n')
    .filter((block) => block.includes(`branch refs/heads/${branch}`))
    .map((block) => block.split('\n')[0].replace('worktree ', '').trim());
}

function currentBranchEvidence(rootDir, branch, worktree = null) {
  const candidate = worktree ? readCachedEvidence(worktree, branch) : readCachedEvidence(rootDir, branch);
  return candidate?.evidence ?? [];
}

function readReviewAtRef(rootDir, branch, relativeDirectory) {
  try {
    const content = sh(rootDir, `git show ${branch}:${relativeDirectory}/review.md`);
    const subjectHead = /(?:Subject|Reviewed) head:\s*`?([0-9a-f]{40})`?/i.exec(content)?.[1] ?? null;
    const result = /\*\*Result:\*\*\s*`?([^\n`]+)`?/i.exec(content)?.[1]?.trim() ?? null;
    const criticalSection = /### Critical\s+([\s\S]*?)(?=### Important|### Minor|$)/i.exec(content)?.[1] ?? '';
    const importantSection = /### Important\s+([\s\S]*?)(?=### Minor|$)/i.exec(content)?.[1] ?? '';
    const findings = (section) => section && !/^\s*(?:无|none|没有)[。.．]?\s*$/i.test(section.trim()) ? ['review finding'] : [];
    return { subjectHead, result, findings: { critical: findings(criticalSection), important: findings(importantSection) } };
  } catch { return null; }
}

function acceptedReviewSubjectHeads(rootDir, branch, branchHead, review, relativeDirectory) {
  const subjectHead = review?.subjectHead;
  if (!subjectHead || subjectHead === branchHead || !shOk(rootDir, `git merge-base --is-ancestor ${subjectHead} ${branch}`)) return [];
  const changedAfterReview = sh(rootDir, `git diff --name-only ${subjectHead}..${branch}`)
    .split(/\r?\n/).filter(Boolean);
  const reviewPath = `${relativeDirectory}/review.md`;
  const metadataOnly = changedAfterReview.length > 0 && changedAfterReview.every((file) =>
    file === reviewPath || file.startsWith('.agents/tasks/') || file.startsWith('.agents/notes/'),
  );
  return metadataOnly ? [subjectHead] : [];
}

function requiresRecoveryTask(changedPaths) {
  return changedPaths.some((file) =>
    file.startsWith('src-tauri/') || file.startsWith('scripts/agent/') || file.startsWith('.agents/')
    || /^src\/(components|styles|config|app|scenes|demo|motion|assets)\//.test(file)
    || /^(package\.json|package-lock\.json|vite\.config|vitest\.config|playwright\.config)/.test(file),
  );
}

function requiresReview(changedPaths) {
  return requiresRecoveryTask(changedPaths) || changedPaths.some((file) => file.startsWith('scripts/') || file.startsWith('src-tauri/'));
}

export function nativeReadinessFor(branch, rootDir = ROOT) {
  const changedPaths = getChangedPaths(rootDir, 'dev', branch);
  const boundary = assessBranchChanges(branch, changedPaths);
  const entry = listTasksAtRef(rootDir, branch).find((candidate) => candidate.task?.branch === branch) ?? null;
  const task = entry?.task ?? null;
  const scope = buildChangeScope({ task, base: 'dev', head: branch, branch, changedPaths });
  const gates = selectGates({ changedPaths });
  const worktree = worktreesOn(branch, rootDir)[0] ?? null;
  const evidence = currentBranchEvidence(rootDir, branch, worktree);
  const headSha = sh(rootDir, `git rev-parse --verify ${branch}`);
  const baseSha = sh(rootDir, 'git rev-parse --verify dev');
  const review = entry ? readReviewAtRef(rootDir, branch, entry.relativeDirectory) : null;
  const reviewSubjectHeads = entry ? acceptedReviewSubjectHeads(rootDir, branch, headSha, review, entry.relativeDirectory) : [];
  const notePaths = task?.references?.notes ?? [];
  const existingNotePaths = notePaths.filter((note) => shOk(rootDir, `git cat-file -e ${branch}:${note}`));
  const noteReport = evaluateNoteRequirement({
    task, changedPaths, notePaths, existingNotePaths,
    noteLifecycles: Object.fromEntries(notePaths.map((note) => [note, noteLifecycleForPath(note)])),
    requireImplemented: requiresReview(changedPaths),
  });
  const readiness = evaluateNativeReadiness({
    task, taskBranch: branch, branchHead: headSha, baseSha,
    changedPathsHash: hashChangedPaths(changedPaths), requiredGates: gates, evidence, review,
    boundaryOk: boundary.ok, boundaryIssues: boundary.violations.map((file) => `boundary violation: ${file}`),
    scopeIssues: scope.violations.map((file) => `task allowedPaths violation: ${file}`),
    noteIssues: noteReport.issues, requireTask: requiresRecoveryTask(changedPaths),
    requireReview: requiresReview(changedPaths), reviewSubjectHeads, requireEvidence: gates.length > 0,
  });
  return { ...readiness, changedPaths, gates, boundary, taskId: task?.id ?? null };
}

export function main({ argv = process.argv.slice(2), rootDir = ROOT, dryRun = false } = {}) {
  const { branch, message, noSync, noCleanup } = parseArgs(argv);
  if (!branch) fail('用法：node scripts/merge-to-dev.js <分支名> [--message "merge: 摘要"] [--no-sync] [--no-cleanup]');
  if (branch === 'dev' || branch === 'main') fail('禁止合并 dev/main 本身');
  if (sh(rootDir, 'git branch --show-current') !== 'dev') fail('须在主 checkout 的 dev 分支上运行（主 checkout 常驻 dev）');
  if (!shOk(rootDir, `git rev-parse --verify --quiet ${branch}`)) fail(`分支不存在：${branch}`);

  const wts = worktreesOn(branch, rootDir);
  const wt = wts[0] ?? null;
  if (!shOk(rootDir, `git merge-base --is-ancestor dev ${branch}`)) {
    if (noSync) fail(`分支 ${branch} 落后 dev，先同步再合并（--no-sync 已阻止自动并入）`);
    if (wt) mergeWithMessage(wt, 'git merge dev', 'merge: 同步 dev 到分支（基线同步）');
    else { sh(rootDir, `git checkout ${branch}`); mergeWithMessage(rootDir, 'git merge dev', 'merge: 同步 dev 到分支（基线同步）'); sh(rootDir, 'git checkout dev'); }
  }
  const boundaryPaths = getChangedPaths(rootDir, 'dev', branch);
  const boundary = assessBranchChanges(branch, boundaryPaths);
  if (!boundary.ok) fail(`check:boundary 未通过，中止合并: ${boundary.violations.join(', ')}`);
  const readiness = nativeReadinessFor(branch, rootDir);
  console.log(formatNativeReadiness(readiness));
  if (!readiness.ok) fail(`live readiness 未通过，中止合并\n${readiness.issues.join('\n')}`);
  if (dryRun) return { ok: true, branch, readiness };

  const mergeMessage = message ?? `merge: ${branch} 合入 dev`;
  mergeWithMessage(rootDir, `git merge --no-ff ${branch}`, mergeMessage);
  console.log(`✓ 已合并 ${branch} → dev（${mergeMessage}）`);
  if (noCleanup || !shOk(rootDir, `git merge-base --is-ancestor ${branch} dev`)) return;
  for (const worktree of wts) if (shOk(rootDir, `git worktree remove ${worktree}`)) console.log(`✓ 已移除 worktree：${worktree}`);
  sh(rootDir, `git branch -D ${branch}`);
  console.log(`✓ 已删除分支：${branch}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { main(); } catch (error) { console.error(`✗ ${error.message}`); process.exitCode = 1; }
}
