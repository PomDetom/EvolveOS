import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

export function canonicalApprovalScope({ intent, allowedPaths = [], acceptance = [], references = {} } = {}) {
  return stable({ intent, allowedPaths: [...allowedPaths].sort(), acceptance, references });
}

export function scopeHash(scope) {
  return createHash('sha256').update(JSON.stringify(stable(scope))).digest('hex');
}

export function buildApprovalRecord({ scope, approvedBy, approvedAt = new Date().toISOString() }) {
  return { required: true, scopeHash: scopeHash(scope), approvedBy, approvedAt };
}

export function validateApprovalScope({ task, currentScope } = {}) {
  if (!task?.approval?.required) return { ok: true, issues: [] };
  const expected = scopeHash(currentScope);
  return task.approval.scopeHash === expected
    ? { ok: true, issues: [] }
    : { ok: false, issues: ['方案 scope 已变化，需重新记录 approval'] };
}

// Compatibility helpers intentionally do not write task state.
export function readTaskPlan(rootDir, taskPath) {
  const planPath = resolve(rootDir, taskPath.replace(/task\.json$/, 'plan.md'));
  return { planPath: planPath.replaceAll('\\', '/'), planText: existsSync(planPath) ? readFileSync(planPath, 'utf8') : '' };
}
export function evaluateTaskApproval() { return { ok: true, issues: [] }; }
export function evaluateApprovalScope() { return { ok: true, issues: [], scope: null }; }
export function moveTaskToAwaitingApproval(task) { return task; }
export const APPROVAL_STATUSES = [];
