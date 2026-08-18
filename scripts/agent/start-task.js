#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTasks } from './validate-task.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NOTE_KINDS = new Set(['feature', 'bug-fix', 'architecture', 'process', 'testing', 'app', 'ui', 'tauri', 'release', 'hotfix']);
const NOTE_CLASSES = new Set(['architecture', 'process', 'testing', 'feature', 'bug-fix', 'simplification']);

function value(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

export function parseStartArgs(argv) {
  const paths = value(argv, '--paths', '');
  return {
    id: value(argv, '--id'),
    title: value(argv, '--title'),
    kind: value(argv, '--kind', 'chore'),
    app: value(argv, '--app'),
    branch: value(argv, '--branch'),
    spec: value(argv, '--spec'),
    worktree: value(argv, '--worktree'),
    noteClass: value(argv, '--note-class'),
    allowedPaths: paths.split(',').map((item) => item.trim()).filter(Boolean),
  };
}

export function slugifyTitle(title) {
  const slug = String(title ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || 'task';
}

export function deriveBranchName({ kind, app, title }) {
  const slug = slugifyTitle(title);
  if (kind === 'tauri' || kind === 'ui') {
    if (!app) throw new Error('tauri/ui 任务必须提供 --app');
    return `ui/${app}/${slug}`;
  }
  if (kind === 'app') {
    if (!app) throw new Error('app 任务必须提供 --app');
    return `app/${app}/${slug}`;
  }
  const prefix = kind === 'bug-fix' ? 'fix' : kind;
  return `${prefix}/${slug}`;
}

export function nextTaskId(ids) {
  const max = ids.reduce((highest, id) => {
    const number = /^EWP-(\d+)$/.exec(id)?.[1];
    return number ? Math.max(highest, Number(number)) : highest;
  }, 0);
  return `EWP-${String(max + 1).padStart(3, '0')}`;
}

function noteClassFor(kind, explicit) {
  const candidate = explicit ?? (NOTE_CLASSES.has(kind) ? kind : 'feature');
  if (!NOTE_CLASSES.has(candidate)) throw new Error(`Note class 非法: ${candidate}`);
  return candidate;
}

function requiresNote(kind) {
  return NOTE_KINDS.has(kind);
}

export function buildStartFiles({ id, title, kind, branch, baseSha, allowedPaths, year, date, slug, noteClass, spec }) {
  const taskDirectory = `.agents/tasks/${year}/${id}-${slug}`;
  const taskPath = `${taskDirectory}/task.json`;
  const planPath = `${taskDirectory}/plan.md`;
  const note = requiresNote(kind)
    ? `.agents/notes/proposed/${noteClass}/${date}-${slug}.md`
    : null;
  const taskAllowedPaths = [
    ...new Set([
      ...allowedPaths,
      `${taskDirectory}/`,
      ...(note ? ['.agents/notes/'] : []),
    ]),
  ];
  const task = {
    schemaVersion: 1,
    id,
    title,
    status: 'planned',
    kind,
    branch,
    baseBranch: 'dev',
    baseSha,
    allowedPaths: taskAllowedPaths,
    spec: spec ?? planPath,
    notes: note ? [note] : [],
    requiredGates: 'auto',
    evidence: [],
    review: null,
    changeHead: null,
    readyHead: null,
  };
  const plan = `# ${id} ${title}\n\n## 目标\n\n<!-- 可验证的一句话目标。 -->\n\n## Scope\n\n- Branch: \`${branch}\`\n- Base: \`dev\`\n- Allowed paths: ${taskAllowedPaths.map((item) => `\`${item}\``).join(', ')}\n\n## Acceptance\n\n- [ ] 明确的可观察结果\n- [ ] 相关自动化验证通过\n- [ ] 验证证据绑定代码提交\n- [ ] 评审记录已写入\n\n## 执行记录\n\n按 \`planned → implementing → verifying → reviewing → ready\` 更新 task 状态；阻塞时写明原因和恢复条件。\n`;
  const noteContent = note ? `# ${title}\n\n**Status:** proposed\n\n**Class:** ${noteClass}\n\n## Problem\n\n<!-- 记录需要跨任务复用的现象或约束。 -->\n\n## Proposal\n\n<!-- 记录本任务的方案和边界。 -->\n\n## Alternatives\n\n- 尚未记录。\n\n## Consequences/Risks\n\n- 尚未记录。\n` : null;
  return {
    taskPath,
    planPath,
    notePath: note,
    task,
    plan,
    note: noteContent,
  };
}

function git(rootDir, args, options = {}) {
  const output = execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', ...options });
  return typeof output === 'string' ? output.trim() : '';
}

function gitOk(rootDir, args) {
  try {
    git(rootDir, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ensureEmptyOrMissing(directory) {
  if (!existsSync(directory)) return;
  if (readdirSync(directory).length) throw new Error(`worktree 目录非空: ${directory}`);
}

function writeFiles(worktree, files) {
  const write = (relative, content) => {
    const absolute = path.resolve(worktree, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, 'utf8');
  };
  write(files.taskPath, `${JSON.stringify(files.task, null, 2)}\n`);
  write(files.planPath, files.plan);
  if (files.notePath) write(files.notePath, files.note);
}

export function main(argv = process.argv.slice(2), rootDir = ROOT, io = console) {
  const args = parseStartArgs(argv);
  if (!args.title) {
    io.error('用法：npm run agent:start -- --title "任务标题" --kind feature --paths src/apps/example/');
    return 1;
  }
  if (!args.allowedPaths.length) {
    io.error('✗ 必须提供 --paths，启动任务时明确 allowedPaths');
    return 1;
  }
  try {
    if (git(rootDir, ['branch', '--show-current']) !== 'dev') throw new Error('必须从 dev 启动任务');
    if (git(rootDir, ['status', '--porcelain'])) throw new Error('dev 工作区必须干净');
    const existingIds = listTasks(rootDir).map((entry) => entry.task?.id).filter(Boolean);
    const id = args.id ?? nextTaskId(existingIds);
    if (!/^EWP-\d{3}$/.test(id)) throw new Error(`task ID 非法: ${id}`);
    if (existingIds.includes(id)) throw new Error(`task 已存在: ${id}`);
    const slug = slugifyTitle(args.title);
    const branch = args.branch ?? deriveBranchName({ kind: args.kind, app: args.app, title: args.title });
    if (!/^(app\/[^/]+\/.+|ui\/.+|docs\/.+|chore\/.+|hotfix\/.+)$/.test(branch)) {
      throw new Error(`分支前缀非法: ${branch}`);
    }
    const baseSha = git(rootDir, ['rev-parse', 'dev']);
    const year = today().slice(0, 4);
    const noteClass = noteClassFor(args.kind, args.noteClass);
    const worktree = args.worktree ?? path.resolve(rootDir, '..', `evolveos-${slug}`);
    ensureEmptyOrMissing(worktree);
    const files = buildStartFiles({
      id,
      title: args.title,
      kind: args.kind,
      branch,
      baseSha,
      allowedPaths: args.allowedPaths,
      year,
      date: today(),
      slug,
      noteClass,
      spec: args.spec,
    });
    if (gitOk(rootDir, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`])) {
      throw new Error(`分支已存在: ${branch}`);
    }
    git(rootDir, ['worktree', 'add', '-b', branch, worktree, 'dev'], { stdio: 'inherit' });
    writeFiles(worktree, files);
    git(worktree, ['add', '--', files.taskPath, files.planPath, ...(files.notePath ? [files.notePath] : [])], { stdio: 'inherit' });
    git(worktree, ['commit', '-m', `chore: 初始化 ${id} 任务`], { stdio: 'inherit' });
    io.log(JSON.stringify({ id, branch, worktree, baseSha, taskPath: files.taskPath, notePath: files.notePath }, null, 2));
    return 0;
  } catch (error) {
    io.error(`✗ agent:start 失败: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
