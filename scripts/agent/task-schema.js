import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_PROTOCOL = {
  schemaVersion: 1,
  taskStates: ['planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'],
};

const BRANCH_RE = /^(app\/[^/]+\/.+|ui\/.+|docs\/.+|chore\/.+|hotfix\/.+)$/;

function asPosixPath(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function taskDirectoryName(taskDirectory) {
  const normalized = asPosixPath(taskDirectory).replace(/\/+$/, '');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function appIdFromBranch(branch) {
  const match = /^app\/([^/]+)\//.exec(branch);
  return match?.[1] ?? null;
}

export function readProtocol(rootDir = process.cwd()) {
  return JSON.parse(readFileSync(resolve(rootDir, '.agents/protocol.json'), 'utf8'));
}

export function validateTask(task, taskDirectory, protocol = DEFAULT_PROTOCOL) {
  const errors = [];
  const requiredFields = [
    'schemaVersion', 'id', 'title', 'status', 'kind', 'branch', 'baseBranch',
    'baseSha', 'allowedPaths', 'spec', 'notes', 'requiredGates', 'evidence', 'review', 'readyHead',
  ];

  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return { ok: false, errors: ['task 必须是 JSON 对象'] };
  }

  for (const field of requiredFields) {
    if (!(field in task)) errors.push(`缺少字段: ${field}`);
  }

  if (task.schemaVersion !== 1) errors.push('schemaVersion 必须为 1');
  if (typeof task.id !== 'string' || !/^EWP-\d{3}$/.test(task.id)) errors.push('id 必须匹配 EWP-000 格式');
  if (typeof task.title !== 'string' || !task.title.trim()) errors.push('title 不能为空');

  const states = Array.isArray(protocol.taskStates) ? protocol.taskStates : DEFAULT_PROTOCOL.taskStates;
  if (!states.includes(task.status)) errors.push(`status 非法: ${task.status}`);
  if (typeof task.kind !== 'string' || !task.kind.trim()) errors.push('kind 不能为空');
  if (typeof task.branch !== 'string' || !BRANCH_RE.test(task.branch)) {
    errors.push(`branch 不符合允许前缀: ${task.branch}`);
  }
  if (task.baseBranch !== 'dev') errors.push('baseBranch 必须为 dev');
  if (typeof task.baseSha !== 'string' || !/^[0-9a-f]{40}$/i.test(task.baseSha)) errors.push('baseSha 必须为 40 位 Git SHA');
  if (!Array.isArray(task.allowedPaths) || task.allowedPaths.some((path) => typeof path !== 'string' || !path.trim())) {
    errors.push('allowedPaths 必须为非空字符串数组');
  }
  if (typeof task.spec !== 'string' || !task.spec.trim()) errors.push('spec 不能为空');
  if (!Array.isArray(task.notes)) errors.push('notes 必须为数组');
  if (!(task.requiredGates === 'auto' || Array.isArray(task.requiredGates))) errors.push('requiredGates 必须为 auto 或数组');
  if (!Array.isArray(task.evidence)) errors.push('evidence 必须为数组');
  if (task.review !== null && (typeof task.review !== 'object' || Array.isArray(task.review))) errors.push('review 必须为 null 或对象');

  if (typeof task.id === 'string' && taskDirectoryName(taskDirectory) && !taskDirectoryName(taskDirectory).startsWith(`${task.id}-`)) {
    errors.push(`task id 与目录不一致: ${task.id} / ${taskDirectory}`);
  }

  const appId = appIdFromBranch(task.branch);
  if ((task.kind === 'app' || appId) && Array.isArray(task.allowedPaths)) {
    const appPath = `src/apps/${appId}/`;
    if (!task.allowedPaths.some((path) => asPosixPath(path).startsWith(appPath))) {
      errors.push(`app task 必须包含允许路径: ${appPath}`);
    }
  }

  if (task.status === 'ready' && (typeof task.readyHead !== 'string' || !/^[0-9a-f]{40}$/i.test(task.readyHead))) {
    errors.push('ready task 必须包含 40 位 readyHead');
  }

  return { ok: errors.length === 0, errors };
}
