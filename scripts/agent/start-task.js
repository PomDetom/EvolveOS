#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTasks } from './validate-task.js';
import { installHooks } from './install-hooks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BRANCH_RE = /^(?:app\/[^/]+\/.+|ui\/.+|native\/.+|framework\/.+|docs\/.+|chore\/.+|hotfix\/.+)$/;

function git(rootDir, args, options = {}) { return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', ...options }).trim(); }
function gitOk(rootDir, args) { try { git(rootDir, args, { stdio: 'ignore' }); return true; } catch { return false; } }
function value(argv, name, fallback = null) { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] ?? fallback : fallback; }

export function runBaselineCommand(rootDir, command, options = {}) {
  try { return { exitCode: 0, stdout: execFileSync(command, { cwd: rootDir, encoding: 'utf8', shell: true, env: { ...process.env, ...(options.env ?? {}) } }), stderr: '', reason: '' }; }
  catch (error) { return { exitCode: error.status ?? 1, stdout: error.stdout?.toString?.() ?? '', stderr: error.stderr?.toString?.() ?? '', reason: error.message }; }
}

// v2 deliberately does not create or persist baseline evidence. The export is
// retained only so old migration utilities fail closed instead of crashing on import.
export function buildBaselineEvidence() { return []; }

export function parseStartArgs(argv) {
  return {
    id: value(argv, '--id'), title: value(argv, '--title'), kind: value(argv, '--kind', 'chore'), app: value(argv, '--app'),
    branch: value(argv, '--branch'), worktree: value(argv, '--worktree'), baseRef: value(argv, '--base-ref', 'dev'),
    allowedPaths: (value(argv, '--paths', '') ?? '').split(',').map((item) => item.trim()).filter(Boolean),
    acceptance: (value(argv, '--acceptance', '') ?? '').split('|').map((item) => item.trim()).filter(Boolean),
    spec: value(argv, '--spec'), plan: value(argv, '--plan'), noTask: argv.includes('--no-task'),
  };
}

export function slugifyTitle(title) {
  const slug = String(title ?? '').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return slug || 'task';
}

export function deriveBranchName({ kind = 'chore', app = null, title }) {
  const slug = slugifyTitle(title);
  if (kind === 'app') { if (!app) throw new Error('app 任务必须提供 --app'); return `app/${app}/${slug}`; }
  if (kind === 'ui' || kind === 'tauri') return `ui/${slug}`;
  if (kind === 'native') return `native/${slug}`;
  if (kind === 'framework') return `framework/${slug}`;
  if (kind === 'docs') return `docs/${slug}`;
  if (kind === 'hotfix') return `hotfix/${slug}`;
  return `chore/${slug}`;
}

export function nextTaskId(ids) {
  const max = ids.reduce((highest, id) => Math.max(highest, Number(/^(?:EV|EWP)-(\d+)$/.exec(id)?.[1] ?? 0)), 0);
  return `EV-${String(max + 1).padStart(3, '0')}`;
}

function nearestExistingParent(target) {
  let current = path.resolve(target);
  while (!existsSync(current)) { const parent = path.dirname(current); if (parent === current) break; current = parent; }
  return current;
}

export function ensureWorktreeWritable(worktree) {
  const absolute = path.resolve(worktree);
  if (existsSync(absolute)) {
    if (!readdirSync(absolute).length) { accessSync(absolute, constants.W_OK); return absolute; }
    throw new Error(`worktree 目录必须为空: ${absolute}`);
  }
  accessSync(nearestExistingParent(path.dirname(absolute)), constants.W_OK);
  return absolute;
}

export function runStartPreflight({ rootDir, id, branch, worktree, baseRef = 'dev', deps = {} }) {
  const d = {
    branch: deps.gitBranch ?? (() => git(rootDir, ['branch', '--show-current'])),
    status: deps.gitStatus ?? (() => git(rootDir, ['status', '--porcelain'])),
    baseExists: deps.gitBaseRefExists ?? ((ref) => gitOk(rootDir, ['show-ref', '--verify', '--quiet', `refs/heads/${ref}`])),
    branchExists: deps.gitBranchExists ?? ((candidate) => gitOk(rootDir, ['show-ref', '--verify', '--quiet', `refs/heads/${candidate}`])),
    baseSha: deps.gitBaseSha ?? (() => git(rootDir, ['rev-parse', '--verify', `refs/heads/${baseRef}`])),
    writable: deps.ensureWorktreeWritable ?? ensureWorktreeWritable,
  };
  const errors = [];
  if (d.branch() !== 'dev') errors.push('必须从 dev 启动任务');
  if (d.status()) errors.push('dev 工作区必须干净');
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(baseRef) || baseRef.includes('..') || baseRef.startsWith('/') || baseRef.endsWith('/') || !d.baseExists(baseRef)) errors.push(`base ref 不存在或非法: ${baseRef}`);
  if (!/^(?:EWP|EV)-\d{3,}$/.test(id)) errors.push(`task ID 非法: ${id}`);
  if (!BRANCH_RE.test(branch)) errors.push(`分支前缀非法: ${branch}`);
  if (d.branchExists(branch)) errors.push(`分支已存在: ${branch}`);
  try { d.writable(worktree); } catch (error) { errors.push(`worktree 不可写: ${error.message}`); }
  if (errors.length) return { ok: false, errors };
  return { ok: true, baseBranch: baseRef, baseSha: d.baseSha(), checkedAt: new Date().toISOString() };
}

export function buildRecoveryTask({ id, title, branch, baseBranch, baseSha, intent, allowedPaths, acceptance = [], spec = null, plan = null, notes = [] }) {
  return {
    schemaVersion: 2, id, title, branch, baseBranch, createdFromSha: baseSha, intent, allowedPaths, acceptance,
    references: { spec, plan, notes }, recovery: { state: 'active', blockedReason: null },
  };
}

function writeRecoveryMarker(rootDir, data) {
  try {
    const markerRoot = path.resolve(rootDir, git(rootDir, ['rev-parse', '--git-path', 'evolve-agent/recovery']));
    mkdirSync(markerRoot, { recursive: true });
    const marker = path.resolve(markerRoot, `${Date.now()}-${data.branch.replaceAll('/', '_')}.json`);
    writeFileSync(marker, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return marker;
  } catch { return null; }
}

export function main(argv = process.argv.slice(2), rootDir = ROOT, io = console, deps = {}) {
  const args = parseStartArgs(argv);
  if (!args.title) { io.error('用法：npm run agent:start -- --title "任务标题" [--kind app --app notes] [--paths src/apps/notes/]'); return 1; }
  const ids = listTasks(rootDir).map((entry) => entry.task?.id).filter(Boolean);
  const id = args.id ?? nextTaskId(ids);
  const branch = args.branch ?? deriveBranchName({ kind: args.kind, app: args.app, title: args.title });
  const worktree = path.resolve(args.worktree ?? path.resolve(rootDir, '..', `evolveos-${slugifyTitle(args.title)}`));
  const preflight = runStartPreflight({ rootDir, id, branch, worktree, baseRef: args.baseRef, deps });
  if (!preflight.ok) { preflight.errors.forEach((error) => io.error(`✗ ${error}`)); return 1; }
  let created = false;
  let hookPath = null;
  try {
    git(rootDir, ['worktree', 'add', '-b', branch, worktree, preflight.baseBranch], { stdio: 'inherit' });
    created = true;
    hookPath = installHooks(worktree);
    let taskPath = null;
    if (!args.noTask) {
      if (!args.allowedPaths.length) throw new Error('创建 recovery task 必须提供 --paths；简单修改可使用 --no-task');
      const slug = slugifyTitle(args.title);
      taskPath = `.agents/tasks/${new Date().getUTCFullYear()}/${id}-${slug}/task.json`;
      const task = buildRecoveryTask({ id, title: args.title, branch, baseBranch: preflight.baseBranch, baseSha: preflight.baseSha, intent: args.title, allowedPaths: args.allowedPaths, acceptance: args.acceptance, spec: args.spec, plan: args.plan });
      const absolute = path.resolve(worktree, taskPath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
      if (args.plan) {
        const planPath = path.resolve(worktree, args.plan);
        mkdirSync(path.dirname(planPath), { recursive: true });
        if (!existsSync(planPath)) writeFileSync(planPath, `# ${id} ${args.title}\n\n## Goal\n\n${args.title}\n\n## Scope\n\n${args.allowedPaths.map((item) => `- ${item}`).join('\n')}\n\n## Implementation approach\n\n\n## Acceptance\n\n${args.acceptance.map((item) => `- ${item}`).join('\n')}\n\n## Risks / open questions\n\n`, 'utf8');
      }
    }
    io.log(JSON.stringify({ ok: true, id: args.noTask ? null : id, branch, worktree, createdFromSha: preflight.baseSha, taskPath, hookPath, note: '未运行 baseline；未创建 Note；不写入 workflow lifecycle state' }, null, 2));
    return 0;
  } catch (error) {
    if (created) {
      try { git(rootDir, ['worktree', 'remove', '--force', worktree], { stdio: 'ignore' }); } catch { try { rmSync(worktree, { recursive: true, force: true }); } catch {} }
      try { git(rootDir, ['branch', '-D', branch], { stdio: 'ignore' }); } catch {}
      writeRecoveryMarker(rootDir, { schemaVersion: 2, type: 'start-cleanup', branch, worktree, reason: error.message, createdAt: new Date().toISOString() });
    }
    io.error(`✗ agent:start 失败: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exitCode = main();
