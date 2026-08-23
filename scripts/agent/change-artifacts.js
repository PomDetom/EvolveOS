#!/usr/bin/env node

function normalize(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function uniqueSorted(values = []) {
  return [...new Set(values.map(normalize))].sort();
}

export function artifactRole(file) {
  const path = normalize(file);
  if (path === 'AGENTS.md' || path.endsWith('/AGENTS.md')
    || path === '.agents/protocol.json' || path === '.agents/README.md'
    || path.startsWith('.agents/skills/')) return 'governance';
  if (/^\.agents\/tasks\/[^/]+\/[^/]+\/(?:task\.json|plan\.md|review\.md)$/.test(path)
    || /^\.agents\/tasks\/[^/]+\/[^/]+\/attestations\/[^/]+\.json$/.test(path)) return 'sidecar';
  if (path.startsWith('.agents/tasks/')) return 'other';
  if (path.startsWith('.agents/notes/')) return 'decision';
  if (/^(?:src|src-tauri|scripts|tests)\//.test(path)
    || /^(?:package(?:-lock)?\.json|vite\.config\.[^/]+|vitest\.config\.[^/]+|playwright\.config\.[^/]+|index\.html)$/.test(path)
    || path.startsWith('.github/')) return 'subject';
  if (path.startsWith('docs/') || path.endsWith('.md')) return 'docs';
  return 'other';
}

export function classifyArtifacts(changedPaths = []) {
  const paths = uniqueSorted(changedPaths);
  const roleByPath = Object.fromEntries(paths.map((path) => [path, artifactRole(path)]));
  const result = {
    paths,
    subjectPaths: [],
    governancePaths: [],
    decisionPaths: [],
    sidecarPaths: [],
    docsPaths: [],
    otherPaths: [],
    roleByPath,
  };
  for (const path of paths) result[`${roleByPath[path]}Paths`].push(path);
  return result;
}

export function isTaskSidecarPath(file) {
  return artifactRole(file) === 'sidecar';
}
