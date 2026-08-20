#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { assessBranchChanges } from '../boundary-check.js';
import { findTask } from './validate-task.js';

function normalize(value) { return String(value ?? '').replaceAll('\\', '/'); }

export function parseScopeArgs(argv) {
  const value = (name, fallback = null) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? fallback : fallback;
  };
  return { taskId: value('--task'), base: value('--base', 'dev'), head: value('--head', 'HEAD'), json: argv.includes('--json') };
}

export function getChangedPaths(rootDir, base = 'dev', head = 'HEAD') {
  const output = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { cwd: rootDir, encoding: 'utf8' });
  const paths = output.split(/\r?\n/).map(normalize).filter(Boolean);
  // During implementation HEAD is the last commit while the real change can
  // still be staged/unstaged. Merge/read-at-ref callers pass an explicit branch
  // ref and therefore only inspect committed facts.
  if (head === 'HEAD') {
    for (const args of [['diff', '--name-only'], ['diff', '--cached', '--name-only']]) {
      const working = execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' });
      paths.push(...working.split(/\r?\n/).map(normalize).filter(Boolean));
    }
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: rootDir, encoding: 'utf8' });
    paths.push(...untracked.split(/\r?\n/).map(normalize).filter(Boolean));
  }
  return [...new Set(paths)].sort();
}

export function hashChangedPaths(changedPaths = []) {
  return createHash('sha256').update([...new Set(changedPaths.map(normalize))].sort().join('\n')).digest('hex');
}

export function classifyPath(path) {
  const file = normalize(path);
  if (file.startsWith('docs/') || file.startsWith('.agents/notes/') || file.endsWith('.md')) return 'docs';
  if (file.startsWith('src/apps/')) return 'app';
  if (/^src\/(components|styles|config|app|scenes|demo|motion|assets)\//.test(file)) return 'framework';
  if (file.startsWith('src-tauri/')) return 'tauri';
  if (file.startsWith('scripts/agent/') || file.startsWith('.agents/')) return 'workflow';
  if (file.startsWith('scripts/')) return 'scripts';
  if (/^(package\.json|package-lock\.json|vite\.config|vitest\.config|playwright\.config|index\.html)$/.test(file)) return 'build';
  if (file.startsWith('tests/')) return 'tests';
  return 'other';
}

export function classifyChangedPaths(changedPaths = []) {
  const surfaces = [...new Set(changedPaths.map(classifyPath))];
  const appIds = [...new Set(changedPaths.map((path) => /^src\/apps\/([^/]+)\//.exec(normalize(path))?.[1]).filter(Boolean))];
  const desktopOnly = changedPaths.some((path) => classifyPath(path) === 'tauri' && /(?:window|tray|permission|filesystem|process|os|tauri\.conf|capabilities)/i.test(normalize(path)));
  return { surfaces, appIds, desktopOnly, docsOnly: surfaces.length > 0 && surfaces.every((surface) => surface === 'docs'), empty: changedPaths.length === 0 };
}

function pathAllowed(file, allowedPaths = []) {
  if (file.startsWith('.agents/tasks/') || file.startsWith('.agents/notes/')) return true;
  return allowedPaths.some((allowed) => {
    const prefix = normalize(allowed).replace(/\/+$/, '');
    return file === prefix || file.startsWith(`${prefix}/`);
  });
}

export function buildChangeScope({ task = null, base = 'dev', head = 'HEAD', changedPaths = [], branch = task?.branch ?? null }) {
  const paths = [...new Set(changedPaths.map(normalize))].sort();
  const allowedPaths = Array.isArray(task?.allowedPaths) ? task.allowedPaths : [];
  const violations = task ? paths.filter((file) => !pathAllowed(file, allowedPaths)) : [];
  const classification = classifyChangedPaths(paths);
  return {
    taskId: task?.id ?? null,
    branch,
    base,
    head,
    changedPaths: paths,
    changedPathsHash: hashChangedPaths(paths),
    violations,
    ok: violations.length === 0,
    ...classification,
  };
}

export function inspectChangeScope({ rootDir = process.cwd(), base = 'dev', head = 'HEAD', task = null } = {}) {
  const changedPaths = getChangedPaths(rootDir, base, head);
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: rootDir, encoding: 'utf8' }).trim();
  const boundary = assessBranchChanges(branch, changedPaths);
  return { ...buildChangeScope({ task, base, head, branch, changedPaths }), boundary };
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId, base, head } = parseScopeArgs(argv);
  const task = taskId ? findTask(rootDir, taskId)?.task ?? null : null;
  if (taskId && !task) { io.error(`✗ 无法读取 recovery task: ${taskId}`); return 1; }
  try {
    const scope = inspectChangeScope({ rootDir, base: task?.baseBranch ?? base, head, task });
    io.log(JSON.stringify(scope));
    return scope.ok && scope.boundary.ok ? 0 : 1;
  } catch (error) {
    io.error(`✗ 无法读取 change scope: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
