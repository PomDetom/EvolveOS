import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { commitWorkflowRecord, recordTaskActivity } from '../../scripts/agent/activity.js';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

describe('task activity records', () => {
  test('records an append-only event and commits only workflow files', () => {
    const root = path.join(os.tmpdir(), `ewp-activity-${Date.now()}`);
    const directory = path.join(root, '.agents/tasks/2026/EWP-001-activity');
    try {
      mkdirSync(directory, { recursive: true });
      git(root, ['init', '-b', 'dev']);
      git(root, ['config', 'user.email', 'ewp@example.com']);
      git(root, ['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'base\n');
      git(root, ['add', '.']);
      git(root, ['commit', '-m', 'base']);
      git(root, ['switch', '-c', 'chore/activity']);
      const task = { id: 'EWP-001', branch: 'chore/activity' };
      const entry = { directory, task };
      writeFileSync(path.join(directory, 'task.json'), `${JSON.stringify(task)}\n`);
      const activity = recordTaskActivity(root, entry, { type: 'status', to: 'implementing' });
      const commit = commitWorkflowRecord(root, [path.relative(root, path.join(directory, 'task.json')), activity.relativePath], 'chore: record activity');
      expect(commit).toMatch(/^[0-9a-f]{40}$/);
      expect(existsSync(activity.path)).toBe(true);
      expect(JSON.parse(readFileSync(activity.path, 'utf8'))).toMatchObject({ taskId: 'EWP-001', type: 'status', to: 'implementing' });
      expect(git(root, ['show', '--stat', '--oneline', 'HEAD'])).toContain('record activity');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

