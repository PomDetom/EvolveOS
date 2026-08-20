import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { relative, resolve } from 'node:path';

export const ACTIVITY_FILE = 'activity.jsonl';

function normalize(path) {
  return String(path ?? '').replaceAll('\\', '/');
}

export function activityPath(entry) {
  return resolve(entry.directory, ACTIVITY_FILE);
}

export function activityRelativePath(rootDir, entry) {
  return normalize(relative(rootDir, activityPath(entry)));
}

export function recordTaskActivity(rootDir, entry, event) {
  const path = activityPath(entry);
  const record = {
    schemaVersion: 1,
    eventId: randomUUID(),
    taskId: entry.task.id,
    branch: entry.task.branch,
    createdAt: new Date().toISOString(),
    ...event,
  };
  appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf8');
  return { path, relativePath: activityRelativePath(rootDir, entry), record };
}

export function readTaskActivity(entry) {
  const path = activityPath(entry);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      return { invalid: true, line: index + 1 };
    }
  });
}

export function commitWorkflowRecord(rootDir, paths, message) {
  const normalizedPaths = [...new Set(paths.map(normalize))];
  if (!normalizedPaths.length) return null;
  execFileSync('git', ['add', '--', ...normalizedPaths], { cwd: rootDir, stdio: 'ignore' });
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--', ...normalizedPaths], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
  if (!staged) return null;
  execFileSync('git', ['commit', '--only', '-m', message, '--', ...normalizedPaths], {
    cwd: rootDir,
    stdio: 'ignore',
  });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim();
}

