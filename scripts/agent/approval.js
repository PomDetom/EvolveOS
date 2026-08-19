import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

export const APPROVAL_STATUSES = ['awaiting_approval', 'approved'];

const TEMPLATE_ACCEPTANCE = new Set([
  '明确的可观察结果',
  '相关自动化验证通过',
  '验证证据绑定代码提交',
  '评审记录已写入',
]);

const TEMPLATE_ASSUMPTION_PATTERNS = [
  /^如涉及 UI\/Tauri\/持久化\/跨模块/i,
  /^尚未记录。?$/,
  /^不适用$/,
];

function asPosixPath(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => asPosixPath(value).trim()).filter(Boolean))].sort();
}

function parsePlanSections(markdown) {
  const sections = new Map();
  let current = null;
  for (const line of String(markdown ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      current = match[1].trim();
      sections.set(current, []);
      continue;
    }
    if (current) sections.get(current).push(line);
  }
  return sections;
}

function extractListItems(lines = []) {
  return lines
    .map((line) => /^-\s+(?:\[[ xX]\]\s*)?(.*)$/.exec(line)?.[1]?.trim() ?? null)
    .filter(Boolean);
}

function topLevelProductArea(file) {
  const normalized = asPosixPath(file);
  if (normalized.startsWith('src/apps/')) return normalized.split('/').slice(0, 3).join('/');
  if (normalized.startsWith('src-tauri/')) return 'src-tauri';
  if (normalized.startsWith('src/components/')) return 'src/components';
  if (normalized.startsWith('src/styles/')) return 'src/styles';
  if (normalized.startsWith('src/config/')) return 'src/config';
  if (normalized.startsWith('src/app/')) return 'src/app';
  if (normalized.startsWith('src/scenes/')) return 'src/scenes';
  if (normalized.startsWith('src/demo/')) return 'src/demo';
  if (normalized.startsWith('src/motion/')) return 'src/motion';
  if (normalized.startsWith('src/assets/')) return 'src/assets';
  return null;
}

function requiresProductAssumptions(task, allowedPaths) {
  if (task?.kind === 'tauri' || task?.kind === 'ui') return true;
  if (allowedPaths.some((item) => item.startsWith('src-tauri/'))) return true;
  if (allowedPaths.some((item) => /(persist|storage|store|vault|sqlite|db)/i.test(item))) return true;
  const productAreas = new Set(allowedPaths.map(topLevelProductArea).filter(Boolean));
  return productAreas.size > 1;
}

function meaningfulAcceptance(items) {
  return items.filter((item) => !TEMPLATE_ACCEPTANCE.has(item));
}

function meaningfulProductAssumptions(items) {
  return items.filter((item) => !TEMPLATE_ASSUMPTION_PATTERNS.some((pattern) => pattern.test(item)));
}

function approvalScopeForStorage(scope) {
  return {
    planPath: scope.planPath,
    allowedPaths: [...scope.allowedPaths],
    acceptance: [...scope.acceptance],
    productAssumptions: [...scope.productAssumptions],
  };
}

export function deriveApprovalScope({ task, planText, planPath }) {
  const sections = parsePlanSections(planText);
  const acceptance = extractListItems(sections.get('Acceptance'));
  const productAssumptions = extractListItems(sections.get('Product Assumptions'));
  const allowedPaths = uniqueSorted(task?.allowedPaths ?? []);
  return {
    planPath: asPosixPath(planPath),
    allowedPaths,
    acceptance,
    productAssumptions,
    meaningfulAcceptance: meaningfulAcceptance(acceptance),
    meaningfulProductAssumptions: meaningfulProductAssumptions(productAssumptions),
    requiresProductAssumptions: requiresProductAssumptions(task, allowedPaths),
    normalizedPlan: String(planText ?? '').replace(/\r\n/g, '\n').trim(),
  };
}

export function hashApprovalScope(scope) {
  return createHash('sha256').update(JSON.stringify({
    plan: scope.normalizedPlan,
    planPath: scope.planPath,
    allowedPaths: scope.allowedPaths,
    acceptance: scope.acceptance,
    productAssumptions: scope.productAssumptions,
  })).digest('hex');
}

export function buildAwaitingApproval({ scope }) {
  return {
    status: 'awaiting_approval',
    approver: null,
    approvedAt: null,
    scopeHash: null,
    scope: approvalScopeForStorage(scope),
  };
}

export function buildApprovedApproval({ approver, approvedAt, scope }) {
  return {
    status: 'approved',
    approver,
    approvedAt,
    scopeHash: hashApprovalScope(scope),
    scope: approvalScopeForStorage(scope),
  };
}

export function evaluateApprovalScope({ task, planText, planPath }) {
  const scope = deriveApprovalScope({ task, planText, planPath });
  const issues = [];
  if (scope.meaningfulAcceptance.length === 0) issues.push('计划缺少可审批的 Acceptance 条目');
  if (scope.requiresProductAssumptions && scope.meaningfulProductAssumptions.length === 0) {
    issues.push('当前任务必须在 Product Assumptions 中记录具体产品假设');
  }
  return {
    ok: issues.length === 0,
    issues,
    scope,
    currentScopeHash: hashApprovalScope(scope),
  };
}

export function evaluateTaskApproval({ task, planText, planPath }) {
  const scopeResult = evaluateApprovalScope({ task, planText, planPath });
  const issues = [...scopeResult.issues];
  const approval = task?.approval ?? null;
  if (!approval) {
    issues.push('缺少方案审批记录');
  } else if (approval.status !== 'approved') {
    issues.push('任务尚未获得方案审批');
  } else {
    if (!approval.approver || !approval.approvedAt) issues.push('方案审批记录不完整');
    if (approval.scopeHash !== scopeResult.currentScopeHash) issues.push('方案范围已变化，需重新审批');
  }
  return {
    ok: issues.length === 0,
    issues,
    scope: scopeResult.scope,
    currentScopeHash: scopeResult.currentScopeHash,
  };
}

export function moveTaskToAwaitingApproval(task, scope) {
  return {
    ...task,
    status: 'awaiting_approval',
    approval: buildAwaitingApproval({ scope }),
    evidence: [],
    review: null,
    changeHead: null,
    readyHead: null,
  };
}

export function planPathForTask(rootDir, taskPath) {
  return asPosixPath(relative(rootDir, resolve(dirname(taskPath), 'plan.md')));
}

export function readTaskPlan(rootDir, taskPath) {
  const absolute = resolve(dirname(taskPath), 'plan.md');
  return {
    planPath: planPathForTask(rootDir, taskPath),
    planText: readFileSync(absolute, 'utf8'),
  };
}
