#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MARKER = '# EWP-COMMIT-GUARD v2';

function git(rootDir, args, options = {}) { return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', ...options }).trim(); }

export function worktreeGitDir(rootDir = process.cwd()) {
  return resolve(rootDir, git(rootDir, ['rev-parse', '--git-dir']));
}

export function installHooks(rootDir = process.cwd()) {
  const hooksDir = resolve(worktreeGitDir(rootDir), 'evolve-hooks');
  mkdirSync(hooksDir, { recursive: true });
  const hookPath = resolve(hooksDir, 'pre-commit');
  const existing = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
  if (existing && !existing.includes(MARKER)) throw new Error(`已有非 EWP pre-commit hook，拒绝覆盖：${hookPath}`);
  writeFileSync(hookPath, `#!/bin/sh\n${MARKER}\nexec node "$(git rev-parse --show-toplevel)/scripts/agent/commit-guard.js"\n`, 'utf8');
  try { chmodSync(hookPath, 0o755); } catch { /* Windows ignores executable bits. */ }
  // --worktree writes to the linked worktree's private config, so agents cannot
  // overwrite one another's hooks through the shared common .git/hooks path.
  git(rootDir, ['config', 'extensions.worktreeConfig', 'true']);
  git(rootDir, ['config', '--worktree', 'core.hooksPath', hooksDir]);
  return hookPath;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { console.log(`✓ 已安装 worktree-local EWP pre-commit hook：${installHooks()}`); }
  catch (error) { console.error(`✗ ${error.message}`); process.exitCode = 1; }
}
