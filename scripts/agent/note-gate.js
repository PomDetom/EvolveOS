const NOTE_ROOT = '.agents/notes/';
const DOC_ROOT = 'docs/';

function normalize(value) { return String(value ?? '').replaceAll('\\', '/'); }
function noteLifecycle(notePath) { return normalize(notePath).match(/^\.agents\/notes\/([^/]+)\//)?.[1] ?? null; }
function documentationOnly(path) { const file = normalize(path); return file.startsWith(DOC_ROOT) || file.startsWith(NOTE_ROOT) || file.endsWith('.md'); }

export function noteRequiredForPaths(changedPaths = []) {
  const paths = changedPaths.map(normalize).filter((path) => !documentationOnly(path));
  const appIds = new Set(paths.map((path) => /^src\/apps\/([^/]+)\//.exec(path)?.[1]).filter(Boolean));
  return paths.some((path) =>
    /^src\/(components|styles|config|app|scenes|demo|motion|assets)\//.test(path)
    || path.startsWith('src-tauri/')
    || path.startsWith('scripts/agent/')
    || path.startsWith('.github/')
    || /^(package\.json|package-lock\.json|vite\.config|vitest\.config|playwright\.config)/.test(path),
  ) || appIds.size > 1;
}

export function evaluateNoteRequirement({ task = null, changedPaths = [], notePaths = null, existingNotePaths = [], noteLifecycles = {}, requireImplemented = false } = {}) {
  const required = noteRequiredForPaths(changedPaths);
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
