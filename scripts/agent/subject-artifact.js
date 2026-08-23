#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { buildChangeSnapshot } from './change-scope.js';

function normalize(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function git(rootDir, args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

export function isAllowedTrailingArtifact(file, taskDirectory) {
  const path = normalize(file);
  const taskDir = normalize(taskDirectory).replace(/\/+$/, '');
  return path === `${taskDir}/review.md` || (path.startsWith(`${taskDir}/attestations/`) && path.endsWith('.json'));
}

export function resolveSubjectSnapshot(rootDir, { base = 'dev', subjectHead } = {}) {
  if (!/^[0-9a-f]{40}$/i.test(String(subjectHead ?? ''))) throw new Error(`subjectHead 不是 Git SHA: ${subjectHead}`);
  return buildChangeSnapshot(rootDir, base, subjectHead);
}

export function subjectBindingIssues(artifact, { subjectSnapshot = null, policyHash = null } = {}) {
  const issues = [];
  const subjectFingerprint = artifact?.subjectFingerprint ?? artifact?.changeFingerprint;
  if (!artifact || !subjectSnapshot) return ['缺少 subject snapshot'];
  if (artifact.subjectHead !== subjectSnapshot.headSha) issues.push('subjectHead 与 subject snapshot 不一致');
  if (subjectFingerprint !== subjectSnapshot.changeFingerprint) issues.push('subjectFingerprint 与 subject snapshot 不一致');
  if (policyHash && artifact.policyHash !== policyHash) issues.push('policyHash 与 subject policy 不一致');
  return issues;
}

export function trailingArtifactIssues(rootDir, { subjectHead, branch, taskDirectory } = {}) {
  const changes = git(rootDir, ['diff', '--name-status', `${subjectHead}..${branch}`])
    .split(/\r?\n/).filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split(/\t/);
      return { status, paths: paths.map(normalize) };
    });
  const issues = [];
  for (const change of changes) {
    const path = change.paths[0];
    if (change.status !== 'A' || !isAllowedTrailingArtifact(path, taskDirectory)) issues.push(`subject 之后存在不允许的 trailing artifact: ${path}`);
  }
  return { ok: issues.length === 0, changes, issues };
}

export function isAncestor(rootDir, subjectHead, branch) {
  try {
    git(rootDir, ['merge-base', '--is-ancestor', subjectHead, branch]);
    return true;
  } catch {
    return false;
  }
}
