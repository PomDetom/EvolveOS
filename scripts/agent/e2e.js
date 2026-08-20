#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validatePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`端口必须是 1-65535 的整数: ${port}`);
  return port;
}

export function createTaskE2EArgs({ spec = null, port = 5174 } = {}) {
  validatePort(port);
  return ['playwright', 'test', ...(spec ? [spec] : []), '--config=playwright.config.worktree.js', '--reporter=line'];
}

export function resolveTaskE2ESpec({ cliSpec = null, taskSpec = null } = {}) {
  const candidate = cliSpec ?? taskSpec;
  return candidate && String(candidate).replace(/^\.\//, '').startsWith('tests/e2e/') ? String(candidate).replace(/^\.\//, '') : null;
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console, deps = {}) {
  const value = (name, fallback = null) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] ?? fallback : fallback; };
  const spec = resolveTaskE2ESpec({ cliSpec: value('--spec') });
  const port = Number(value('--port', '5174'));
  try { validatePort(port); } catch (error) { io.error(`✗ ${error.message}`); return 1; }
  const runner = deps.spawnSync ?? spawnSync;
  const result = runner(process.platform === 'win32' ? 'npx.cmd' : 'npx', createTaskE2EArgs({ spec, port }), { cwd: resolve(rootDir), env: { ...process.env, EWP_E2E_PORT: String(port) }, stdio: 'inherit', windowsHide: true, ...(process.platform === 'win32' ? { shell: true } : {}) });
  if (result?.error) { io.error(`✗ e2e runner error: ${result.error.message}`); return 1; }
  return typeof result?.status === 'number' ? result.status : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
