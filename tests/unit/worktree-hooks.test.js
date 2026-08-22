import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { installHooks } from '../../scripts/agent/install-hooks.js';

describe('worktree hook installation', () => {
  test('installs a private pre-commit hook and enables worktree config', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-v22-hooks-'));
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    try {
      git(['init', '-b', 'chore/hooks']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'hook\n');
      git(['add', '.']);
      git(['commit', '-m', 'base']);

      const hookPath = installHooks(root);

      expect(existsSync(hookPath)).toBe(true);
      expect(git(['config', '--worktree', 'core.hooksPath'])).toBe(path.dirname(hookPath));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
