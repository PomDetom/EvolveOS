import { buildPolicySnapshot } from './change-policy.js';

function normalize(value) { return String(value ?? '').replaceAll('\\', '/'); }
function noteLifecycle(notePath) { return normalize(notePath).match(/^\.agents\/notes\/([^/]+)\//)?.[1] ?? null; }

export function noteRequiredForPaths(changedPaths = [], options = {}) {
  return buildPolicySnapshot({ snapshot: options.snapshot, changedPaths, branchKind: options.branchKind }).policy.requiresNote;
}

export function evaluateNoteRequirement({ task = null, changedPaths = [], notePaths = null, existingNotePaths = [], noteLifecycles = {}, requireImplemented = false, policy = null, snapshot = null, branchKind = null } = {}) {
  // Merge and verify pass their canonical Policy directly.  The fallback is
  // only for standalone callers; this gate never falls back to legacy paths.
  const resolvedPolicy = policy ?? buildPolicySnapshot({ snapshot, changedPaths, branchKind }).policy;
  const required = resolvedPolicy.requiresNote;
  const normalizedNotes = (notePaths ?? task?.references?.notes ?? []).map(normalize);
  if (!required) return { ok: true, required: false, issues: [], notePaths: normalizedNotes };
  const issues = [];
  if (!normalizedNotes.length) issues.push('该变更面需要 Agent Note（shared framework / Tauri / workflow / build policy）');
  const existing = new Set(existingNotePaths.map(normalize));
  normalizedNotes.filter((note) => !existing.has(note)).forEach((note) => issues.push(`Agent Note 文件不存在: ${note}`));
  for (const note of normalizedNotes) {
    const lifecycle = noteLifecycles[note] ?? noteLifecycle(note);
    if (lifecycle === 'rejected' || lifecycle === 'archived') issues.push(`不能关联 ${lifecycle} Agent Note: ${note}`);
    if (requireImplemented && lifecycle !== 'implemented') issues.push(`merge 前 Note 必须位于 implemented: ${note}`);
  }
  return { ok: issues.length === 0, required: true, issues, notePaths: normalizedNotes };
}

export function noteLifecycleForPath(notePath) { return noteLifecycle(notePath); }
