#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PERMISSION_ID = /^[a-z0-9][a-z0-9_-]*(?::[a-z0-9][a-z0-9_-]*)+$/i;

export function validateCapabilityFile(file, content) {
  const errors = [];
  let capability;
  try {
    capability = JSON.parse(content);
  } catch (error) {
    return [`${file}: JSON 无法解析（${error.message}）`];
  }
  if (!capability || typeof capability !== 'object' || Array.isArray(capability)) errors.push(`${file}: capability 必须是对象`);
  if (typeof capability?.identifier !== 'string' || !capability.identifier.trim()) errors.push(`${file}: identifier 不能为空`);
  if (!Array.isArray(capability?.permissions) || capability.permissions.length === 0) errors.push(`${file}: permissions 必须为非空数组`);
  if (Array.isArray(capability?.permissions)) {
    const seen = new Set();
    for (const permission of capability.permissions) {
      if (typeof permission !== 'string' || !PERMISSION_ID.test(permission)) errors.push(`${file}: permission identifier 非法: ${permission}`);
      if (seen.has(permission)) errors.push(`${file}: permission 重复: ${permission}`);
      seen.add(permission);
    }
  }
  if (capability?.windows != null && (!Array.isArray(capability.windows) || capability.windows.some((window) => typeof window !== 'string' || !window.trim()))) {
    errors.push(`${file}: windows 必须为字符串数组`);
  }
  if (capability?.$schema != null && (typeof capability.$schema !== 'string' || !capability.$schema.startsWith('../gen/schemas/'))) errors.push(`${file}: $schema 必须引用 Tauri generated schema`);
  return errors;
}

export function checkPermissionSchemas(rootDir = process.cwd()) {
  const directory = resolve(rootDir, 'src-tauri/capabilities');
  if (!existsSync(directory)) return { ok: true, files: [], errors: [] };
  const files = readdirSync(directory).filter((file) => file.endsWith('.json')).sort();
  const errors = files.flatMap((file) => validateCapabilityFile(`src-tauri/capabilities/${file}`, readFileSync(resolve(directory, file), 'utf8')));
  return { ok: errors.length === 0, files, errors };
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  const result = checkPermissionSchemas();
  if (!result.ok) { result.errors.forEach((error) => console.error(`✗ ${error}`)); process.exitCode = 1; }
  else console.log(`✓ permission schema check 通过（${result.files.length} 个 capability 文件）`);
}
