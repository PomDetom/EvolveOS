import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { findTaskAtRef } from '../../scripts/agent/validate-task.js';

const tempRoots = [];

afterEach(() => {
  while (tempRoots.length) rmSync(tempRoots.pop(), { recursive: true, force: true });
});

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

describe('branch task reader', () => {
  test('从尚未合入 dev 的分支读取 task.json', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-task-ref-'));
    tempRoots.push(root);
    git(root, ['init', '-b', 'dev']);
    git(root, ['config', 'user.email', 'ewp@example.com']);
    git(root, ['config', 'user.name', 'EWP Test']);
    writeFileSync(path.join(root, 'README.md'), 'dev\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'init']);
    git(root, ['switch', '-c', 'ui/token-tool/codex-quota']);
    const taskDirectory = path.join(root, '.agents/tasks/2026/EWP-010-codex-quota');
    mkdirSync(taskDirectory, { recursive: true });
    writeFileSync(path.join(taskDirectory, 'task.json'), JSON.stringify({ id: 'EWP-010', branch: 'ui/token-tool/codex-quota' }));
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'chore: task']);

    const entry = findTaskAtRef(root, 'ui/token-tool/codex-quota', 'EWP-010');
    expect(entry.task).toEqual({ id: 'EWP-010', branch: 'ui/token-tool/codex-quota' });
    expect(entry.relativeDirectory).toBe('.agents/tasks/2026/EWP-010-codex-quota');
  }, 30000);
});
