#!/usr/bin/env node
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findTask } from './validate-task.js';

function asPosix(value) { return String(value).replaceAll('\\', '/'); }

export function validatePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`端口必须是 1-65535 的整数: ${port}`);
  return port;
}

function isMainCheckout(root) {
  const gitPath = resolve(root, '.git');
  return existsSync(gitPath) && statSync(gitPath).isDirectory();
}

export function resolveTaskE2EPaths({ rootDir, mainRoot = null, taskId }) {
  const root = resolve(rootDir);
  const main = mainRoot ? resolve(mainRoot) : null;
  if ((main && root === main) || isMainCheckout(root)) throw new Error('任务 e2e 根目录不能是主 checkout');
  const logDir = resolve(root, '.agents', 'logs', 'e2e', taskId);
  return { rootDir: root, mainRoot: main, taskId, testDir: resolve(root, 'tests', 'e2e'), logDir };
}

export function buildWorktreePlaywrightConfig(paths, { port = 5174 } = {}) {
  validatePort(port);
  const normalizedRoot = asPosix(paths.rootDir);
  const testDir = asPosix(paths.testDir);
  const logDir = asPosix(paths.logDir);
  return {
    testDir,
    reporter: [['list'], ['json', { outputFile: `${logDir}/results.json` }]],
    use: { baseURL: `http://127.0.0.1:${port}` },
    webServer: {
      command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
      cwd: normalizedRoot,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  };
}

export function createTaskE2EArgs({ taskId, spec = null, port = 5174 }) {
  validatePort(port);
  const args = ['playwright', 'test'];
  if (spec) args.push(spec);
  args.push('--config=playwright.config.worktree.js', '--reporter=line');
  return args;
}

function parseArgs(argv) {
  const value = (name, fallback = null) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? fallback : fallback;
  };
  return { taskId: value('--task'), spec: value('--spec'), port: Number(value('--port', '5174')) };
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console, deps = {}) {
  const { taskId, spec, port } = parseArgs(argv);
  if (!taskId) { io.error('用法：npm run agent:e2e -- --task EWP-008 [--spec tests/e2e/foo.spec.js] [--port 5174]'); return 1; }
  try { validatePort(port); } catch (error) { io.error(`✗ ${error.message}`); return 1; }
  let paths;
  try { paths = resolveTaskE2EPaths({ rootDir, taskId }); } catch (error) { io.error(`✗ ${error.message}`); return 1; }
  const entry = findTask(rootDir, taskId);
  if (!entry || entry.parseError) { io.error(`✗ 无法读取 task: ${taskId}`); return 1; }
  if (spec && relative(paths.testDir, resolve(rootDir, spec)).startsWith('..')) { io.error('✗ spec 必须位于任务 checkout 的 tests/e2e 下'); return 1; }
  mkdirSync(paths.logDir, { recursive: true });
  const runner = deps.spawnSync ?? spawnSync;
  let result;
  try {
    result = runner(process.platform === 'win32' ? 'npx.cmd' : 'npx', createTaskE2EArgs({ taskId, spec, port }), {
      cwd: paths.rootDir, env: { ...process.env, EWP_TASK_ID: taskId, EWP_E2E_PORT: String(port), EWP_E2E_LOG_DIR: paths.logDir }, stdio: 'inherit', windowsHide: true,
    });
  } catch (error) {
    io.error(`✗ agent:e2e runner exception: ${error?.message ?? error}`);
    return 1;
  }
  return typeof result.status === 'number' ? result.status : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
