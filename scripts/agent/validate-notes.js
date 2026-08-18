#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const LIFECYCLES = ['proposed', 'implemented', 'rejected', 'archived'];
const DEFAULT_CLASSES = ['architecture', 'process', 'testing', 'feature', 'bug-fix', 'simplification'];

function metadata(content, label) {
  const match = new RegExp(`(?:\\*\\*${label}:\\*\\*|^${label}:)\\s*([^\\n]+)`, 'm').exec(content);
  return match?.[1]?.trim() ?? null;
}

function noteLifecycle(notePath) {
  const match = notePath.replaceAll('\\', '/').match(/^\.agents\/notes\/([^/]+)\/[^/]+\/[^/]+\.md$/);
  return match?.[1] ?? null;
}

function noteLinks(content) {
  return [...content.matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/g)]
    .map((match) => match[1])
    .filter((link) => !/^(?:https?:|mailto:|#)/.test(link));
}

export function validateNote({ notePath, content, existingPaths = [], protocol = {} }) {
  const errors = [];
  const lifecycle = noteLifecycle(notePath);
  const status = metadata(content, 'Status');
  const noteClass = metadata(content, 'Class');
  const classes = Array.isArray(protocol.noteClasses) ? protocol.noteClasses : DEFAULT_CLASSES;

  if (!lifecycle || !LIFECYCLES.includes(lifecycle)) errors.push(`Note 目录非法: ${notePath}`);
  if (!status || !LIFECYCLES.includes(status) || (lifecycle && status !== lifecycle)) errors.push(`Status 与生命周期目录不一致: ${status}`);
  if (!noteClass || !classes.includes(noteClass)) errors.push(`class 非法: ${noteClass}`);
  for (const heading of ['## Problem', '## Alternatives', '## Consequences/Risks']) {
    if (!content.includes(heading)) errors.push(`缺少 ${heading.replace('## ', '')}`);
  }
  if ((lifecycle === 'proposed' || lifecycle === 'rejected') && !/^## Proposal\b/m.test(content)) errors.push('缺少 Proposal');
  if ((lifecycle === 'implemented' || lifecycle === 'archived') && !/^## Decision\b/m.test(content)) errors.push('缺少 Decision');
  if (lifecycle === 'implemented' && /^## Proposal\b/m.test(content)) errors.push('implemented Note 不得保留 Proposal');

  const base = dirname(notePath.replaceAll('\\', '/'));
  for (const link of noteLinks(content)) {
    const target = resolve(process.cwd(), base, link).replaceAll('\\', '/');
    const normalizedExisting = existingPaths.map((path) => resolve(process.cwd(), path).replaceAll('\\', '/'));
    if (!existsSync(target) && !normalizedExisting.includes(target)) errors.push(`链接不存在: ${link}`);
  }
  return { ok: errors.length === 0, errors };
}

function filesUnder(rootDir) {
  const result = [];
  const notesRoot = resolve(rootDir, '.agents/notes');
  if (!existsSync(notesRoot)) return result;
  for (const lifecycle of LIFECYCLES) {
    const lifecyclePath = resolve(notesRoot, lifecycle);
    if (!existsSync(lifecyclePath)) continue;
    for (const noteClass of readdirSync(lifecyclePath, { withFileTypes: true })) {
      if (!noteClass.isDirectory()) continue;
      for (const file of readdirSync(resolve(lifecyclePath, noteClass.name))) {
        if (!file.endsWith('.md')) continue;
        const absolute = resolve(lifecyclePath, noteClass.name, file);
        result.push({
          notePath: absolute.replace(`${rootDir}\\`, '').replaceAll('\\', '/'),
          content: readFileSync(absolute, 'utf8'),
        });
      }
    }
  }
  return result;
}

export function main(rootDir = process.cwd(), io = console) {
  const files = filesUnder(rootDir);
  const existingPaths = files.map((file) => file.notePath);
  const protocol = JSON.parse(readFileSync(resolve(rootDir, '.agents/protocol.json'), 'utf8'));
  const failures = [];
  for (const file of files) {
    const result = validateNote({ ...file, existingPaths, protocol });
    if (!result.ok) failures.push({ ...file, errors: result.errors });
  }
  failures.forEach((failure) => {
    io.error(`✗ ${failure.path}`);
    failure.errors.forEach((error) => io.error(`  ${error}`));
  });
  if (failures.length) return 1;
  io.log(`✓ Notes 校验通过（${files.length} 个）`);
  return 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`✗ Notes 检查失败: ${error.message}`);
    process.exitCode = 1;
  }
}
