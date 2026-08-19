#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { accessSync, constants, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTasks } from './validate-task.js';
import { listStartRecoveryArtifacts, writeStartRecoveryArtifact } from './start-recovery.js';
import { buildAwaitingApproval, deriveApprovalScope } from './approval.js';
import { classifyGateResult, createBaselineEvidence } from './workflow-utils.js';
import { gateDefinition } from './gate-registry.js';
import { assessBranchChanges } from '../boundary-check.js';
import { selectGates } from './select-gates.js';

export { listStartRecoveryArtifacts } from './start-recovery.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NOTE_KINDS = new Set(['feature', 'bug-fix', 'architecture', 'process', 'testing', 'app', 'ui', 'tauri', 'release', 'hotfix']);
const NOTE_CLASSES = new Set(['architecture', 'process', 'testing', 'feature', 'bug-fix', 'simplification']);
const BRANCH_RE = /^(app\/[^/]+\/.+|ui\/.+|docs\/.+|chore\/.+|hotfix\/.+)$/;

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

function startError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function noteClassFor(kind, explicit) {
  const candidate = explicit ?? (NOTE_CLASSES.has(kind) ? kind : 'feature');
  if (!NOTE_CLASSES.has(candidate)) throw new Error(`Note class 非法: ${candidate}`);
  return candidate;
}

function requiresNote(kind) {
  return NOTE_KINDS.has(kind);
}

export function buildStartFiles({ id, title, kind, branch, baseSha, allowedPaths, year, date, slug, noteClass, spec, startRunId, preflight, baselines = [], initCommit = '0'.repeat(40) }) {
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
    status: 'awaiting_approval',
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
    startRunId,
    preflight,
    initCommit,
  };
  task.baseline = createBaselineEvidence({
    taskId: id,
    gate: 'start-preflight',
    baseSha,
    command: 'agent:start preflight',
    exitCode: preflight?.ok === true ? 0 : 1,
    result: preflight?.ok === true ? 'success' : 'failed',
    summary: preflight?.ok === true ? 'agent:start preflight passed' : 'agent:start preflight failed',
  });
  task.baselines = baselines;
  const startRecordPath = `.agents/start-runs/${startRunId}.json`;
  const startRecord = {
    schemaVersion: 1,
    id,
    title,
    branch,
    baseBranch: 'dev',
    baseSha,
    startRunId,
    taskPath,
    preflight,
    baseline: task.baseline,
    baselines,
  };
  const plan = `# ${id} ${title}\n\n## 目标\n\n<!-- 可验证的一句话目标。 -->\n\n## Scope\n\n- Branch: \`${branch}\`\n- Base: \`dev\`\n- Allowed paths: ${taskAllowedPaths.map((item) => `\`${item}\``).join(', ')}\n\n## Acceptance\n\n- [ ] 明确的可观察结果\n- [ ] 相关自动化验证通过\n- [ ] 验证证据绑定代码提交\n- [ ] 评审记录已写入\n\n## 执行记录\n\n按 \`planned → implementing → verifying → reviewing → ready\` 更新 task 状态；阻塞时写明原因和恢复条件。\n`;
  task.approval = buildAwaitingApproval({ scope: deriveApprovalScope({ task, planText: plan, planPath }) });
  const noteContent = note ? `# ${title}\n\n**Status:** proposed\n\n**Class:** ${noteClass}\n\n## Problem\n\n<!-- 记录需要跨任务复用的现象或约束。 -->\n\n## Proposal\n\n<!-- 记录本任务的方案和边界。 -->\n\n## Alternatives\n\n- 尚未记录。\n\n## Consequences/Risks\n\n- 尚未记录。\n` : null;
  return {
    taskPath,
    planPath,
    notePath: note,
    task,
    startRecordPath,
    startRecord,
    plan,
    note: noteContent,
  };
}

export function runBaselineCommand(rootDir, command) {
  try {
    const stdout = execFileSync(command, { cwd: rootDir, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    return { exitCode: 0, stdout, stderr: '', reason: '' };
  } catch (error) {
    return {
      exitCode: typeof error.status === 'number' ? error.status : 1,
      stdout: error.stdout?.toString?.() ?? '',
      stderr: error.stderr?.toString?.() ?? '',
      reason: error.message ?? 'baseline command failed',
    };
  }
}

export function buildBaselineEvidence({ rootDir, taskId, baseSha, branch, taskKind, hasNotes, runner = runBaselineCommand }) {
  const kind = assessBranchChanges(branch, []).kind;
  const gates = selectGates({ kind, changedPaths: [], hasNotes, taskKind });
  return gates.map((gateName) => {
    const gate = gateDefinition(gateName, taskId);
    let result;
    if (gate.manual) {
      result = { manual: true, exitCode: null, stdout: '', stderr: '', reason: 'manual baseline deferred' };
    } else {
      try {
        result = runner(rootDir, gate.command, gate);
      } catch (error) {
        result = {
          result: 'environmentFailure',
          exitCode: 1,
          stdout: '',
          stderr: '',
          reason: error?.message ?? 'baseline runner failed',
        };
      }
    }
    return createBaselineEvidence({
      taskId,
      gate: gate.gate,
      baseSha,
      command: gate.command,
      commandId: gate.commandId,
      exitCode: result.exitCode,
      result: classifyGateResult(result),
      summary: result.reason ?? '',
    });
  });
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

function nearestExistingParent(target) {
  let current = path.resolve(target);
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

export function ensureWorktreeWritable(worktree) {
  const absolute = path.resolve(worktree);
  if (existsSync(absolute)) {
    const stat = statSync(absolute);
    if (!stat.isDirectory()) {
      throw startError('WORKTREE_NOT_WRITABLE', `worktree 路径不是目录: ${absolute}`, { worktree: absolute });
    }
    if (readdirSync(absolute).length) {
      throw startError('WORKTREE_NOT_WRITABLE', `worktree 目录非空: ${absolute}`, { worktree: absolute });
    }
    accessSync(absolute, constants.W_OK);
    return absolute;
  }
  const parent = nearestExistingParent(path.dirname(absolute));
  if (!statSync(parent).isDirectory()) {
    throw startError('WORKTREE_NOT_WRITABLE', `worktree 父目录不是目录: ${parent}`, { worktree: absolute, parent });
  }
  accessSync(parent, constants.W_OK);
  return absolute;
}

function gitWriteProbe(rootDir) {
  const headsPath = git(rootDir, ['rev-parse', '--git-path', 'refs/heads']);
  const absolute = path.resolve(rootDir, headsPath);
  accessSync(absolute, constants.W_OK);
}

function normalizePreflightError(error) {
  if (error?.code && error?.details) return error;
  if (error?.code === 'EACCES' || error?.code === 'EPERM') {
    return startError('WORKTREE_NOT_WRITABLE', error.message, { systemCode: error.code });
  }
  return startError('START_PREFLIGHT_FAILED', error?.message ?? '预检失败');
}

export function runStartPreflight({
  rootDir,
  id,
  title,
  kind,
  branch,
  worktree,
  allowedPaths,
  existingIds,
  year,
  date,
  deps = {},
}) {
  const preflightDeps = {
    gitBranch: deps.gitBranch ?? (() => git(rootDir, ['branch', '--show-current'])),
    gitStatus: deps.gitStatus ?? (() => git(rootDir, ['status', '--porcelain'])),
    gitBaseSha: deps.gitBaseSha ?? (() => git(rootDir, ['rev-parse', 'dev'])),
    gitBranchExists: deps.gitBranchExists ?? ((candidate) => gitOk(rootDir, ['show-ref', '--verify', '--quiet', `refs/heads/${candidate}`])),
    gitWriteProbe: deps.gitWriteProbe ?? (() => gitWriteProbe(rootDir)),
    ensureWorktreeWritable: deps.ensureWorktreeWritable ?? ensureWorktreeWritable,
  };

  try {
    if (preflightDeps.gitBranch() !== 'dev') throw startError('NOT_ON_DEV', '必须从 dev 启动任务');
    if (preflightDeps.gitStatus()) throw startError('DIRTY_DEV', 'dev 工作区必须干净');
    if (listStartRecoveryArtifacts(rootDir).length) throw startError('START_RECOVERY_BLOCKED', '存在未恢复的 agent:start 清理记录');
    if (!/^EWP-\d{3}$/.test(id)) throw startError('TASK_ID_INVALID', `task ID 非法: ${id}`, { id });
    if (existingIds.includes(id)) throw startError('TASK_ID_CONFLICT', `task 已存在: ${id}`, { id });
    if (!BRANCH_RE.test(branch)) throw startError('INVALID_BRANCH', `分支前缀非法: ${branch}`, { branch });
    if (preflightDeps.gitBranchExists(branch)) throw startError('BRANCH_EXISTS', `分支已存在: ${branch}`, { branch });
    try {
      preflightDeps.gitWriteProbe();
    } catch (error) {
      throw startError('GIT_WRITE_FORBIDDEN', `Git 写权限检查失败: ${error.message}`, { branch });
    }
    try {
      preflightDeps.ensureWorktreeWritable(worktree);
    } catch (error) {
      throw normalizePreflightError(error);
    }
    return {
      ok: true,
      baseSha: preflightDeps.gitBaseSha(),
      preflight: {
        ok: true,
        checkedAt: new Date().toISOString(),
        checks: {
          gitBranch: 'dev',
          gitClean: true,
          gitWritable: true,
          taskIdAvailable: true,
          branchAvailable: true,
          worktreeWritable: true,
        },
        inputs: {
          id,
          title,
          kind,
          branch,
          worktree: path.resolve(worktree),
          allowedPaths,
          year,
          date,
        },
      },
    };
  } catch (error) {
    const normalized = normalizePreflightError(error);
    return { ok: false, error: normalized };
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
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
  write(files.startRecordPath, `${JSON.stringify(files.startRecord, null, 2)}\n`);
}

export function cleanupStartArtifacts({ rootDir, branch, worktree, startRunId, code, message, details = {}, deps = {} }) {
  const cleanup = { worktreeRemoved: !worktree, branchRemoved: !branch };
  const worktreeExists = deps.worktreeExists ?? ((target) => existsSync(target));
  const removeWorktree = deps.removeWorktree ?? (() => git(rootDir, ['worktree', 'remove', '--force', worktree], { stdio: 'ignore' }));
  const removeWorktreeFallback = deps.removeWorktreeFallback ?? (() => rmSync(worktree, { recursive: true, force: true }));
  const branchExists = deps.branchExists ?? (() => gitOk(rootDir, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]));
  const removeBranch = deps.removeBranch ?? (() => git(rootDir, ['branch', '-D', branch], { stdio: 'ignore' }));

  if (worktree && worktreeExists(worktree)) {
    try {
      removeWorktree();
      cleanup.worktreeRemoved = true;
    } catch {
      try {
        removeWorktreeFallback();
        cleanup.worktreeRemoved = true;
      } catch {
        cleanup.worktreeRemoved = false;
      }
    }
  }
  if (branch && branchExists()) {
    try {
      removeBranch();
      cleanup.branchRemoved = true;
    } catch {
      cleanup.branchRemoved = false;
    }
  }
  let recoveryPath = null;
  if ((worktree || branch) && (!cleanup.worktreeRemoved || !cleanup.branchRemoved)) {
    recoveryPath = writeStartRecoveryArtifact(rootDir, {
      schemaVersion: 1,
      kind: 'agent-start-cleanup',
      startRunId,
      branch,
      worktree,
      code,
      message,
      details,
      cleanup,
      createdAt: new Date().toISOString(),
    });
  }
  return { cleanup, recoveryPath };
}

export function main(argv = process.argv.slice(2), rootDir = ROOT, io = console, deps = {}) {
  const args = parseStartArgs(argv);
  if (!args.title) {
    io.error('用法：npm run agent:start -- --title "任务标题" --kind feature --paths src/apps/example/');
    return 1;
  }
  if (!args.allowedPaths.length) {
    io.error('✗ 必须提供 --paths，启动任务时明确 allowedPaths');
    return 1;
  }
  const startRunId = randomUUID();
  let branch = null;
  let worktree = null;
  let createdBranch = false;
  let createdWorktree = false;
  try {
    const existingIds = listTasks(rootDir).map((entry) => entry.task?.id).filter(Boolean);
    const id = args.id ?? nextTaskId(existingIds);
    const slug = slugifyTitle(args.title);
    branch = args.branch ?? deriveBranchName({ kind: args.kind, app: args.app, title: args.title });
    const year = today().slice(0, 4);
    const noteClass = noteClassFor(args.kind, args.noteClass);
    worktree = args.worktree ?? path.resolve(rootDir, '..', `evolveos-${slug}`);
    const preflightResult = runStartPreflight({
      rootDir,
      id,
      title: args.title,
      kind: args.kind,
      branch,
      worktree,
      allowedPaths: args.allowedPaths,
      existingIds,
      year,
      date: today(),
    });
    if (!preflightResult.ok) throw preflightResult.error;
    const files = buildStartFiles({
      id,
      title: args.title,
      kind: args.kind,
      branch,
      baseSha: preflightResult.baseSha,
      allowedPaths: args.allowedPaths,
      year,
      date: today(),
      slug,
      noteClass,
      spec: args.spec,
      startRunId,
      preflight: preflightResult.preflight,
      baselines: [],
    });
    git(rootDir, ['worktree', 'add', '-b', branch, worktree, 'dev'], { stdio: 'inherit' });
    createdBranch = true;
    createdWorktree = true;
    try {
      writeFiles(worktree, files);
    } catch (error) {
      throw startError('TASK_WRITE_FAILED', `写入启动文件失败: ${error.message}`, {
        taskPath: files.taskPath,
        notePath: files.notePath,
      });
    }

    const baselines = buildBaselineEvidence({
      rootDir: worktree,
      taskId: id,
      baseSha: preflightResult.baseSha,
      branch,
      taskKind: args.kind,
      hasNotes: requiresNote(args.kind),
      runner: deps.baselineRunner,
    });
    files.task.baselines = baselines;
    files.startRecord.baselines = baselines;
    try {
      writeFiles(worktree, files);
    } catch (error) {
      throw startError('TASK_WRITE_FAILED', `写入启动证据失败: ${error.message}`, {
        taskPath: files.taskPath,
        notePath: files.notePath,
      });
    }
    git(worktree, ['add', '--', files.taskPath, files.planPath, files.startRecordPath, ...(files.notePath ? [files.notePath] : [])], { stdio: 'inherit' });
    git(worktree, ['commit', '-m', `chore: 初始化 ${id} 任务`], { stdio: 'inherit' });
    const initCommit = git(worktree, ['rev-parse', 'HEAD']);
    files.task.initCommit = initCommit;
    try {
      writeFiles(worktree, files);
    } catch (error) {
      throw startError('TASK_WRITE_FAILED', `写入启动证据失败: ${error.message}`, {
        taskPath: files.taskPath,
        initCommit,
      });
    }
    git(worktree, ['add', '--', files.taskPath], { stdio: 'inherit' });
    git(worktree, ['commit', '-m', `chore: 记录 ${id} 启动证据`], { stdio: 'inherit' });
    io.log(JSON.stringify({
      id,
      branch,
      worktree,
      baseSha: preflightResult.baseSha,
      startRunId,
      initCommit,
      taskPath: files.taskPath,
      notePath: files.notePath,
    }, null, 2));
    return 0;
  } catch (error) {
    const cleanupResult = cleanupStartArtifacts({
      rootDir,
      branch: createdBranch ? branch : null,
      worktree: createdWorktree ? worktree : null,
      startRunId,
      code: error.code ?? 'AGENT_START_FAILED',
      message: error.message,
      details: error.details ?? {},
    });
    io.error(JSON.stringify({
      ok: false,
      code: error.code ?? 'AGENT_START_FAILED',
      message: error.message,
      startRunId,
      branch,
      worktree,
      cleanup: cleanupResult.cleanup,
      recoveryPath: cleanupResult.recoveryPath,
      details: error.details ?? {},
    }));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
