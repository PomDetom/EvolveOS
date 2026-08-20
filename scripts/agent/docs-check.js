#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

function filesUnder(root, predicate, result = []) {
  if (!existsSync(root)) return result;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, entry.name);
    if (entry.isDirectory()) filesUnder(file, predicate, result);
    else if (predicate(file)) result.push(file);
  }
  return result;
}

export function validateDocs(rootDir = process.cwd()) {
  const markdown = filesUnder(resolve(rootDir, 'docs'), (file) => file.endsWith('.md'))
    .concat(filesUnder(resolve(rootDir, '.agents'), (file) => file.endsWith('.md')));
  const errors = [];
  for (const file of markdown) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
      const link = match[1];
      if (/^(?:https?:|mailto:|#)/.test(link)) continue;
      if (!existsSync(resolve(dirname(file), link))) errors.push(`${file}: 链接不存在 ${link}`);
    }
  }
  for (const file of filesUnder(resolve(rootDir, '.agents'), (candidate) => candidate.endsWith('.json'))) {
    try { JSON.parse(readFileSync(file, 'utf8')); } catch (error) { errors.push(`${file}: JSON 无法解析 (${error.message})`); }
  }
  return { ok: errors.length === 0, errors, files: markdown.length };
}

export function main(rootDir = process.cwd(), io = console) {
  const result = validateDocs(rootDir);
  if (!result.ok) { result.errors.forEach((error) => io.error(`✗ ${error}`)); return 1; }
  io.log(`✓ docs check 通过（${result.files} 个 Markdown）`);
  return 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
