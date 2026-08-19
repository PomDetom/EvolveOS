#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { readProtocol, validateStartEvidence, validateTask } from './task-schema.js';

export function parseTaskArgs(argv) {
  const index = argv.indexOf('--task');
  return { taskId: index >= 0 ? argv[index + 1] ?? null : null };
}

function taskEntries(rootDir) {
  const taskRoot = resolve(rootDir, '.agents/tasks');
  if (!existsSync(taskRoot)) return [];
  const entries = [];
  for (const year of readdirSync(taskRoot, { withFileTypes: true })) {
    if (!year.isDirectory()) continue;
    const yearPath = resolve(taskRoot, year.name);
    for (const taskDirectory of readdirSync(yearPath, { withFileTypes: true })) {
      if (!taskDirectory.isDirectory()) continue;
      const directory = resolve(yearPath, taskDirectory.name);
      entries.push({
        directory,
        relativeDirectory: relative(rootDir, directory).replaceAll('\\', '/'),
      });
    }
  }
  return entries;
}

export function findTask(rootDir, taskId) {
  for (const entry of taskEntries(rootDir)) {
    if (!entry.directory.split(/[\\/]/).pop().startsWith(`${taskId}-`)) continue;
    const taskPath = resolve(entry.directory, 'task.json');
    if (!existsSync(taskPath)) return { ...entry, taskPath, parseError: new Error('缺少 task.json') };
    try {
      return { ...entry, taskPath, task: JSON.parse(readFileSync(taskPath, 'utf8')) };
    } catch (error) {
      return { ...entry, taskPath, parseError: error };
    }
  }
  return null;
}

export function listTasks(rootDir) {
  return taskEntries(rootDir).map((entry) => {
    const taskPath = resolve(entry.directory, 'task.json');
    try {
      return { ...entry, taskPath, task: JSON.parse(readFileSync(taskPath, 'utf8')) };
    } catch (error) {
      return { ...entry, taskPath, parseError: error };
    }
  });
}

function gitFilesAtRef(rootDir, ref) {
  const output = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '.agents/tasks'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).filter((file) => file.endsWith('/task.json'));
}

export function listTasksAtRef(rootDir, ref) {
  return gitFilesAtRef(rootDir, ref).map((taskPath) => {
    const directory = taskPath.slice(0, -'/task.json'.length);
    const relativeDirectory = directory.replaceAll('\\', '/');
    try {
      const raw = execFileSync('git', ['show', `${ref}:${taskPath}`], { cwd: rootDir, encoding: 'utf8' });
      return {
        directory: resolve(rootDir, directory),
        relativeDirectory,
        taskPath: resolve(rootDir, taskPath),
        task: JSON.parse(raw),
      };
    } catch (error) {
      return {
        directory: resolve(rootDir, directory),
        relativeDirectory,
        taskPath: resolve(rootDir, taskPath),
        parseError: error,
      };
    }
  });
}

export function findTaskAtRef(rootDir, ref, taskId) {
  return listTasksAtRef(rootDir, ref).find((entry) => entry.task?.id === taskId) ?? null;
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId } = parseTaskArgs(argv);
  if (!taskId) {
    io.error('用法：npm run agent:task-check -- --task EWP-001');
    return 1;
  }

  const entry = findTask(rootDir, taskId);
  if (!entry) {
    io.error(`✗ 未找到 task: ${taskId}`);
    return 1;
  }
  if (entry.parseError) {
    io.error(`✗ ${entry.relativeDirectory}/task.json 无法解析: ${entry.parseError.message}`);
    return 1;
  }

  const result = validateTask(entry.task, entry.relativeDirectory, readProtocol(rootDir));
  const evidenceResult = result.ok ? validateStartEvidence(rootDir, entry.task) : { ok: true, errors: [] };
  if (!result.ok || !evidenceResult.ok) {
    io.error(`✗ task ${taskId} 校验失败`);
    [...result.errors, ...evidenceResult.errors].forEach((error) => io.error(`  ${error}`));
    return 1;
  }

  io.log(`✓ task ${taskId} 校验通过（${entry.task.status}）`);
  return 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  process.exitCode = main();
}
