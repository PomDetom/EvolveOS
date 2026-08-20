import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_PROTOCOL = {
  schemaVersion: 2,
  baseBranch: 'dev',
  taskRoot: '.agents/tasks',
  legacySddRoot: 'docs/superpowers/sdd',
  noteClasses: ['architecture', 'process', 'testing', 'feature', 'bug-fix', 'simplification'],
};

const BRANCH_RE = /^(?:app\/[^/]+\/.+|ui\/.+|docs\/.+|chore\/.+|hotfix\/.+)$/;
const BASE_REF_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const RECOVERY_STATES = ['active', 'blocked', 'cancelled', 'closed'];
const LEGACY_FIELDS = [
  'status', 'kind', 'spec', 'notes', 'requiredGates', 'evidence', 'review',
  'changeHead', 'readyHead', 'baseline', 'baselines', 'baselineUpdate',
  'preflight', 'startRunId', 'initCommit',
];

function asPosixPath(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function taskDirectoryName(taskDirectory) {
  const normalized = asPosixPath(taskDirectory).replace(/\/+$/, '');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function validRelativePath(value) {
  const path = asPosixPath(value).trim();
  return Boolean(path) && !path.startsWith('/') && !path.includes('..') && !path.includes('\\');
}

function validateApproval(approval, errors) {
  if (approval == null) return;
  if (typeof approval !== 'object' || Array.isArray(approval)) {
    errors.push('approval 必须为 null 或对象');
    return;
  }
  if (typeof approval.required !== 'boolean') errors.push('approval.required 必须为布尔值');
  if (approval.required === true) {
    if (typeof approval.scopeHash !== 'string' || !/^[0-9a-f]{64}$/i.test(approval.scopeHash)) errors.push('required approval 必须包含 64 位 scopeHash');
    if (typeof approval.approvedBy !== 'string' || !approval.approvedBy.trim()) errors.push('required approval 必须包含 approvedBy');
    if (typeof approval.approvedAt !== 'string' || !approval.approvedAt.trim()) errors.push('required approval 必须包含 approvedAt');
  }
}

function validateLegacyTask(task, taskDirectory) {
  const errors = [];
  const states = ['awaiting_approval', 'planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'];
  if (task.schemaVersion !== 1) errors.push('schemaVersion 必须为 1');
  if (typeof task.id !== 'string' || !/^EWP-\d{3,}$/.test(task.id)) errors.push('id 必须匹配 EWP-000 格式');
  if (typeof task.title !== 'string' || !task.title.trim()) errors.push('title 不能为空');
  if (!states.includes(task.status)) errors.push(`status 非法: ${task.status}`);
  if (typeof task.branch !== 'string' || !BRANCH_RE.test(task.branch)) errors.push(`branch 不符合允许前缀: ${task.branch}`);
  if (typeof task.baseBranch !== 'string' || !BASE_REF_RE.test(task.baseBranch) || task.baseBranch.includes('..')) errors.push(`baseBranch 不是合法的本地 ref: ${task.baseBranch}`);
  if (typeof task.baseSha !== 'string' || !/^[0-9a-f]{40}$/i.test(task.baseSha)) errors.push('baseSha 必须为 40 位 Git SHA');
  if (!Array.isArray(task.allowedPaths) || task.allowedPaths.some((item) => typeof item !== 'string' || !item.trim())) errors.push('allowedPaths 必须为字符串数组');
  if (typeof task.startRunId !== 'string' || !task.startRunId.trim()) errors.push('startRunId 不能为空');
  if (!task.preflight || typeof task.preflight !== 'object') errors.push('preflight 必须为对象');
  if (typeof task.initCommit !== 'string' || !/^[0-9a-f]{40}$/i.test(task.initCommit)) errors.push('initCommit 必须为 40 位 Git SHA');
  if (task.status === 'ready' && (typeof task.readyHead !== 'string' || !/^[0-9a-f]{40}$/i.test(task.readyHead))) errors.push('ready task 必须包含 40 位 readyHead');
  if (task.approval?.status === 'approved') {
    if (!/^[0-9a-f]{64}$/i.test(task.approval.scopeHash ?? '')) errors.push('scopeHash 必须为 64 位哈希');
    if (!task.approval.scope) errors.push('approved approval 必须包含 scope');
  }
  const directoryName = taskDirectoryName(taskDirectory);
  if (directoryName && !directoryName.startsWith(`${task.id}-`)) errors.push(`task id 与目录不一致: ${task.id} / ${taskDirectory}`);
  const appId = /^app\/([^/]+)\//.exec(task.branch)?.[1] ?? null;
  if (appId && !task.allowedPaths?.some((item) => asPosixPath(item).startsWith(`src/apps/${appId}/`))) errors.push(`app task 必须包含允许路径: src/apps/${appId}/`);
  return { ok: errors.length === 0, errors };
}

export function readProtocol(rootDir = process.cwd()) {
  try {
    return JSON.parse(readFileSync(resolve(rootDir, '.agents/protocol.json'), 'utf8'));
  } catch {
    return DEFAULT_PROTOCOL;
  }
}

export function validateTask(task, taskDirectory = '', protocol) {
  const errors = [];
  if (!task || typeof task !== 'object' || Array.isArray(task)) return { ok: false, errors: ['task 必须是 JSON 对象'] };
  if (task.schemaVersion === 1 && protocol === undefined) return validateLegacyTask(task, taskDirectory);
  protocol ??= DEFAULT_PROTOCOL;

  const requiredFields = [
    'schemaVersion', 'id', 'title', 'branch', 'baseBranch', 'baseSha',
    'intent', 'allowedPaths', 'acceptance', 'references', 'recovery',
  ];
  for (const field of requiredFields) if (!(field in task)) errors.push(`缺少字段: ${field}`);

  if (task.schemaVersion !== 2) errors.push('schemaVersion 必须为 2');
  if (typeof task.id !== 'string' || !/^(?:EWP|EV)-\d{3,}$/.test(task.id)) errors.push('id 必须匹配 EWP-000 或 EV-000 格式');
  if (typeof task.title !== 'string' || !task.title.trim()) errors.push('title 不能为空');
  if (typeof task.branch !== 'string' || !BRANCH_RE.test(task.branch)) errors.push(`branch 不符合允许前缀: ${task.branch}`);
  if (typeof task.baseBranch !== 'string' || !BASE_REF_RE.test(task.baseBranch) || task.baseBranch.includes('..') || task.baseBranch.startsWith('/') || task.baseBranch.endsWith('/')) {
    errors.push(`baseBranch 不是合法的本地 ref: ${task.baseBranch}`);
  }
  if (typeof task.baseSha !== 'string' || !/^[0-9a-f]{40}$/i.test(task.baseSha)) errors.push('baseSha 必须为 40 位 Git SHA');
  if (typeof task.intent !== 'string' || !task.intent.trim()) errors.push('intent 不能为空');
  if (!Array.isArray(task.allowedPaths) || task.allowedPaths.length === 0 || task.allowedPaths.some((path) => !validRelativePath(path))) errors.push('allowedPaths 必须为非空的安全相对路径数组');
  if (!Array.isArray(task.acceptance) || task.acceptance.some((item) => typeof item !== 'string' || !item.trim())) errors.push('acceptance 必须为字符串数组');

  const references = task.references;
  if (!references || typeof references !== 'object' || Array.isArray(references)) {
    errors.push('references 必须为对象');
  } else {
    for (const field of ['spec', 'plan']) {
      if (references[field] != null && (typeof references[field] !== 'string' || !validRelativePath(references[field]))) errors.push(`references.${field} 必须为 null 或安全相对路径`);
    }
    if (!Array.isArray(references.notes) || references.notes.some((note) => typeof note !== 'string' || !validRelativePath(note))) errors.push('references.notes 必须为安全相对路径数组');
  }

  const recovery = task.recovery;
  if (!recovery || typeof recovery !== 'object' || Array.isArray(recovery)) {
    errors.push('recovery 必须为对象');
  } else {
    if (!RECOVERY_STATES.includes(recovery.state)) errors.push(`recovery.state 非法: ${recovery.state}`);
    if (recovery.blockedReason !== null && (typeof recovery.blockedReason !== 'string' || !recovery.blockedReason.trim())) errors.push('recovery.blockedReason 必须为 null 或非空字符串');
    if (recovery.state === 'blocked' && !recovery.blockedReason) errors.push('blocked task 必须包含 blockedReason');
  }

  validateApproval(task.approval, errors);
  for (const field of LEGACY_FIELDS) if (field in task) errors.push(`v2 task 不得包含旧 workflow 字段: ${field}`);

  const directoryName = taskDirectoryName(taskDirectory);
  if (directoryName && !directoryName.startsWith(`${task.id}-`)) errors.push(`task id 与目录不一致: ${task.id} / ${taskDirectory}`);

  const appId = /^app\/([^/]+)\//.exec(task.branch)?.[1] ?? null;
  if (appId && Array.isArray(task.allowedPaths)) {
    const appPath = `src/apps/${appId}/`;
    if (!task.allowedPaths.some((path) => asPosixPath(path).startsWith(appPath))) errors.push(`app task 必须包含允许路径: ${appPath}`);
  }

  if (protocol?.schemaVersion != null && protocol.schemaVersion !== 2) errors.push('protocol.schemaVersion 必须为 2');
  return { ok: errors.length === 0, errors };
}

// v2 不再有 tracked start evidence。保留导出名让迁移期旧工具可以安全调用，
// 但新任务验证只检查 schema 和 Git 实时事实。
export function validateStartEvidence(rootDir, task, taskPath = null) {
  if (task?.schemaVersion === 2) return { ok: true, errors: [] };
  return { ok: false, errors: ['旧 task schema 不再支持 agent:start evidence，请迁移为 schemaVersion 2'] };
}

// 兼容旧模块的纯结构导出；v2 不使用 baseline evidence。
export function validateBaselineEvidence() {
  return { ok: false, errors: ['v2 不保存 baseline evidence'] };
}

export { BRANCH_RE, RECOVERY_STATES };
