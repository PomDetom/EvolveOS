const NOTE_ROOT = '.agents/notes/';
const TASK_ROOT = '.agents/tasks/';
const DOC_ROOT = 'docs/';
const NOTE_REQUIRED_KINDS = new Set(['feature', 'bug-fix', 'architecture', 'process', 'testing', 'app', 'ui', 'tauri', 'release', 'hotfix']);

function normalize(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function noteLifecycle(notePath) {
  const match = normalize(notePath).match(/^\.agents\/notes\/([^/]+)\//);
  return match?.[1] ?? null;
}

function isDocumentationOnly(path) {
  const normalized = normalize(path);
  return normalized.startsWith(TASK_ROOT) || normalized.startsWith(NOTE_ROOT) || normalized.startsWith(DOC_ROOT) || normalized.endsWith('.md');
}

export function evaluateNoteRequirement({ task, changedPaths = [], notePaths = [], existingNotePaths = notePaths, noteLifecycles = {}, status = task?.status }) {
  const normalizedPaths = changedPaths.map(normalize);
  const required = NOTE_REQUIRED_KINDS.has(task?.kind) && normalizedPaths.some((path) => !isDocumentationOnly(path));
  if (!required) return { ok: true, required: false, issues: [] };

  const issues = [];
  const normalizedNotes = notePaths.map(normalize);
  if (!normalizedNotes.length) issues.push('非平凡改动必须关联 Agent Note');
  const existing = new Set(existingNotePaths.map(normalize));
  normalizedNotes.filter((note) => !existing.has(note)).forEach((note) => issues.push(`Agent Note 文件不存在: ${note}`));
  if (status === 'ready' && !normalizedNotes.some((note) => noteLifecycle(note) === 'implemented')) {
    issues.push('ready 任务必须关联 implemented Agent Note');
  }
  for (const note of normalizedNotes) {
    if (noteLifecycles[note] === 'rejected') issues.push(`任务不能关联 rejected Agent Note: ${note}`);
  }
  return { ok: issues.length === 0, required: true, issues };
}

export function noteLifecycleForPath(notePath) {
  return noteLifecycle(notePath);
}
