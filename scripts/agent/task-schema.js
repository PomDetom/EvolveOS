import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listStartRecoveryArtifacts } from './start-recovery.js';
import { APPROVAL_STATUSES } from './approval.js';
import { validateBaselineEvidence } from './workflow-utils.js';
import { gateDefinition } from './gate-registry.js';
import { assessBranchChanges } from '../boundary-check.js';
import { selectGates } from './select-gates.js';

const DEFAULT_PROTOCOL = {
  schemaVersion: 1,
  taskStates: ['awaiting_approval', 'planned', 'implementing', 'verifying', 'reviewing', 'ready', 'blocked', 'cancelled'],
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

function validateApproval(approval, errors) {
  if (approval == null) return;
  if (typeof approval !== 'object' || Array.isArray(approval)) {
    errors.push('approval 必须为 null 或对象');
    return;
  }
  if (!APPROVAL_STATUSES.includes(approval.status)) errors.push(`approval.status 非法: ${approval.status}`);
  if (approval.approver !== null && (typeof approval.approver !== 'string' || !approval.approver.trim())) {
    errors.push('approval.approver 必须为 null 或非空字符串');
  }
  if (approval.approvedAt !== null && (typeof approval.approvedAt !== 'string' || !approval.approvedAt.trim())) {
    errors.push('approval.approvedAt 必须为 null 或时间字符串');
  }
  if (approval.scopeHash !== null && !/^[0-9a-f]{64}$/i.test(approval.scopeHash)) {
    errors.push('approval.scopeHash 必须为 null 或 64 位哈希');
  }
  if (approval.scope !== null) {
    if (typeof approval.scope !== 'object' || Array.isArray(approval.scope)) {
      errors.push('approval.scope 必须为 null 或对象');
    } else {
      if (typeof approval.scope.planPath !== 'string' || !approval.scope.planPath.trim()) errors.push('approval.scope.planPath 不能为空');
      if (!Array.isArray(approval.scope.allowedPaths)) errors.push('approval.scope.allowedPaths 必须为数组');
      if (!Array.isArray(approval.scope.acceptance)) errors.push('approval.scope.acceptance 必须为数组');
      if (!Array.isArray(approval.scope.productAssumptions)) errors.push('approval.scope.productAssumptions 必须为数组');
    }
  }
  if (approval.status === 'approved') {
    if (!approval.approver) errors.push('approved approval 必须包含 approver');
    if (!approval.approvedAt) errors.push('approved approval 必须包含 approvedAt');
    if (!approval.scopeHash) errors.push('approved approval 必须包含 scopeHash');
    if (!approval.scope) errors.push('approved approval 必须包含 scope');
  }
}

export function readProtocol(rootDir = process.cwd()) {
  return JSON.parse(readFileSync(resolve(rootDir, '.agents/protocol.json'), 'utf8'));
}

export function validateTask(task, taskDirectory, protocol = DEFAULT_PROTOCOL) {
  const errors = [];
  const requiredFields = [
    'schemaVersion', 'id', 'title', 'status', 'kind', 'branch', 'baseBranch',
    'baseSha', 'allowedPaths', 'spec', 'notes', 'requiredGates', 'evidence', 'review', 'readyHead',
    'startRunId', 'preflight', 'initCommit',
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
  if (typeof task.startRunId !== 'string' || !task.startRunId.trim()) errors.push('startRunId 不能为空');
  if (!task.preflight || typeof task.preflight !== 'object' || Array.isArray(task.preflight)) errors.push('preflight 必须为对象');
  if (typeof task.initCommit !== 'string' || !/^[0-9a-f]{40}$/i.test(task.initCommit)) errors.push('initCommit 必须为 40 位 Git SHA');
  if (task.baseline != null && typeof task.baseline !== 'object') errors.push('baseline 必须为对象');
  if (task.baselines != null && !Array.isArray(task.baselines)) errors.push('baselines 必须为数组');

  validateApproval(task.approval, errors);

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

function gitText(rootDir, args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

export function validateStartEvidence(rootDir, task, taskPath = null, options = {}) {
  const errors = [];
  if (!task || typeof task !== 'object') return { ok: false, errors: ['task 必须是 JSON 对象'] };
  if (listStartRecoveryArtifacts(rootDir).length) errors.push('存在未恢复的 agent:start 清理记录，后续入口已阻断');
  if (!task.startRunId) errors.push('缺少 startRunId，任务不是通过 agent:start 初始化');
  if (!task.preflight || task.preflight.ok !== true) errors.push('缺少成功的 preflight 记录');
  if (!task.preflight?.checks || typeof task.preflight.checks !== 'object') errors.push('preflight.checks 缺失');
  if (options.requireBaselines === true) {
    const baselineResult = validateBaselineEvidence(task.baseline, { taskId: task.id, baseSha: task.baseSha });
    if (!baselineResult.ok) errors.push(...baselineResult.errors);
    if (!/^[0-9a-f]{40}$/i.test(task.initCommit ?? '') || task.initCommit === '0'.repeat(40)) {
      errors.push('baseline 补录要求 task 包含合法的非零 initCommit');
    }
  }
  if (options.requireBaselines === true && !Array.isArray(task.baselines)) {
    errors.push('缺少 per-gate baselines；旧 schema 任务不可直接验证，需补录基线');
  } else if (Array.isArray(task.baselines)) {
    for (const [index, baseline] of task.baselines.entries()) {
      let expected;
      try { expected = gateDefinition(baseline?.gate, task.id); } catch (error) {
        errors.push(`baselines[${index}] gate 非法: ${baseline?.gate}`);
        continue;
      }
      const result = validateBaselineEvidence(baseline, {
        taskId: task.id,
        baseSha: task.baseSha,
        gate: expected.gate,
        command: expected.command,
        commandId: expected.commandId,
        initCommit: task.initCommit,
      });
      if (!result.ok) errors.push(...result.errors.map((item) => `baselines[${index}] ${item}`));
    }
  }
  if (options.requireBaselines === true) {
    const expectedGates = task.requiredGates === 'auto'
      ? selectGates({
        kind: assessBranchChanges(task.branch, []).kind,
        changedPaths: [],
        hasNotes: Array.isArray(task.notes) && task.notes.length > 0,
        taskKind: task.kind,
      })
      : task.requiredGates;
    const actualGates = Array.isArray(task.baselines) ? task.baselines.map((baseline) => baseline?.gate) : [];
    const duplicateGates = actualGates.filter((gate, index) => actualGates.indexOf(gate) !== index);
    const missingGates = expectedGates.filter((gate) => !actualGates.includes(gate));
    const unexpectedGates = actualGates.filter((gate) => !expectedGates.includes(gate));
    if (duplicateGates.length) errors.push(`baseline gate 重复: ${[...new Set(duplicateGates)].join(', ')}`);
    if (missingGates.length) errors.push(`缺少 baseline gate: ${missingGates.join(', ')}`);
    if (unexpectedGates.length) errors.push(`存在非启动 gate baseline: ${[...new Set(unexpectedGates)].join(', ')}`);
    const update = task.baselineUpdate;
    if (!update || typeof update !== 'object') {
      errors.push('缺少 baseline update record；旧任务需补录基线');
    } else {
      if (update.taskId !== task.id || update.id !== task.id) errors.push('baseline update record taskId 与 task 不匹配');
      if (update.baseSha !== task.baseSha) errors.push('baseline update record baseSha 与 task 不匹配');
      if (update.initCommit !== task.initCommit) errors.push('baseline update record initCommit 与 task 不匹配');
      if (typeof update.path !== 'string' || !update.path) errors.push('缺少 baseline update record 路径');
      if (typeof update.commit !== 'string' || !/^[0-9a-f]{40}$/i.test(update.commit) || update.commit === '0'.repeat(40)) {
        errors.push('缺少合法的 baseline update commit');
      } else {
        try {
          execFileSync('git', ['merge-base', '--is-ancestor', task.initCommit, update.commit], { cwd: rootDir, stdio: 'ignore' });
          execFileSync('git', ['merge-base', '--is-ancestor', update.commit, 'HEAD'], { cwd: rootDir, stdio: 'ignore' });
          const subject = gitText(rootDir, ['show', '-s', '--format=%s', update.commit]);
          if (subject !== `chore: 补录 ${task.id} baseline`) errors.push('baseline update commit 提交信息非法');
          const record = JSON.parse(gitText(rootDir, ['show', `${update.commit}:${asPosixPath(update.path)}`]));
          if (record.taskId !== task.id || record.id !== task.id || record.baseSha !== task.baseSha || record.initCommit !== task.initCommit || JSON.stringify(record.baselines) !== JSON.stringify(task.baselines)) {
            errors.push('baseline update record 与 task 不匹配');
          }
          for (const [index, baseline] of (Array.isArray(record.baselines) ? record.baselines : []).entries()) {
            const expected = gateDefinition(baseline?.gate, task.id);
            const result = validateBaselineEvidence(baseline, {
              taskId: task.id,
              baseSha: task.baseSha,
              gate: expected.gate,
              command: expected.command,
              commandId: expected.commandId,
              initCommit: task.initCommit,
            });
            if (!result.ok) errors.push(...result.errors.map((item) => `baseline update baselines[${index}] ${item}`));
          }
        } catch {
          errors.push('baseline update record 不存在或不可解析');
        }
      }
      try {
        const currentRecord = JSON.parse(readFileSync(resolve(rootDir, `.agents/start-runs/${task.startRunId}.json`), 'utf8'));
        if (JSON.stringify(currentRecord.baselines) !== JSON.stringify(task.baselines) || JSON.stringify(currentRecord.baselineUpdate) !== JSON.stringify(task.baselineUpdate)) {
          errors.push('当前 agent:start record 与 task baseline 补录不匹配');
        }
      } catch {
        errors.push('当前 agent:start record 不存在或不可解析');
      }
    }
  }
  if (typeof task.initCommit !== 'string' || !/^[0-9a-f]{40}$/i.test(task.initCommit)) {
    errors.push('缺少合法的 initCommit');
  } else {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', task.initCommit, 'HEAD'], {
        cwd: rootDir,
        stdio: 'ignore',
      });
      if (!taskPath) {
        errors.push('缺少 task 路径，无法核验 agent:start 初始化记录');
      } else {
        const recordPath = `.agents/start-runs/${task.startRunId}.json`;
        const record = JSON.parse(gitText(rootDir, ['show', `${task.initCommit}:${recordPath}`]));
        const initialTask = JSON.parse(gitText(rootDir, ['show', `${task.initCommit}:${taskPath}`]));
        const parentLine = gitText(rootDir, ['rev-list', '--parents', '-n', '1', task.initCommit]).split(/\s+/);
        const subject = gitText(rootDir, ['show', '-s', '--format=%s', task.initCommit]);
        if (parentLine.length !== 2 || parentLine[1] !== task.baseSha) errors.push('initCommit 必须直接基于 task.baseSha 初始化');
        if (subject !== `chore: 初始化 ${task.id} 任务`) errors.push('initCommit 不是 agent:start 初始化提交');
        if (record.startRunId !== task.startRunId || record.id !== task.id || record.title !== task.title || record.branch !== task.branch || record.baseSha !== task.baseSha || record.taskPath !== taskPath || JSON.stringify(record.preflight) !== JSON.stringify(task.preflight) || JSON.stringify(record.baseline) !== JSON.stringify(task.baseline) || record.baselineUpdate != null) {
          errors.push('agent:start 启动记录与 task 不匹配');
        }
        if (initialTask.id !== task.id || initialTask.branch !== task.branch || initialTask.baseSha !== task.baseSha || initialTask.startRunId !== task.startRunId || JSON.stringify(initialTask.preflight) !== JSON.stringify(task.preflight) || JSON.stringify(initialTask.baseline) !== JSON.stringify(task.baseline) || JSON.stringify(initialTask.baselines) !== JSON.stringify(record.baselines) || initialTask.baselineUpdate != null || initialTask.initCommit !== '0'.repeat(40)) {
          errors.push('initCommit 中缺少真实的初始 task 快照');
        }
      }
    } catch {
      errors.push(`agent:start 初始化记录不存在或不可解析: ${task.startRunId}`);
      errors.push(`initCommit 不在当前分支历史中: ${task.initCommit}`);
    }
  }
  for (const [index, evidence] of (Array.isArray(task.evidence) ? task.evidence : []).entries()) {
    if (evidence?.taskId !== task.id) errors.push(`evidence[${index}] taskId 与 task 不匹配`);
    if (evidence?.baseSha !== task.baseSha) errors.push(`evidence[${index}] baseSha 与 task 不匹配`);
    try {
      const expected = gateDefinition(evidence?.gate, task.id);
      if (evidence?.command !== expected.command) errors.push(`evidence[${index}] command 不是 gate registry canonical command`);
      if (evidence?.commandId != null && evidence.commandId !== expected.commandId) errors.push(`evidence[${index}] commandId 不是 gate registry canonical identity`);
    } catch {
      errors.push(`evidence[${index}] gate 未注册: ${evidence?.gate}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
