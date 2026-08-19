#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const MARKER = '# EWP-COMMIT-GUARD v1';

function git(rootDir, args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

export function installHooks(rootDir = process.cwd()) {
  const hooksDir = resolve(rootDir, git(rootDir, ['rev-parse', '--git-path', 'hooks']));
  mkdirSync(hooksDir, { recursive: true });
  const hookPath = resolve(hooksDir, 'pre-commit');
  const content = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
  if (content && !content.includes(MARKER)) {
    throw new Error(`已有非 EWP pre-commit hook，拒绝覆盖：${hookPath}`);
  }
  writeFileSync(hookPath, `#!/bin/sh\n${MARKER}\nexec node "$(git rev-parse --show-toplevel)/scripts/agent/commit-guard.js"\n`, 'utf8');
  try { chmodSync(hookPath, 0o755); } catch { /* Windows does not require executable bits. */ }
  return hookPath;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    console.log(`✓ 已安装 EWP pre-commit hook：${installHooks()}`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  }
}

