#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { readProtocol, validateTask } from './task-schema.js';

export function parseTaskArgs(argv) {
  const index = argv.indexOf('--task');
  return { taskId: index >= 0 ? argv[index + 1] ?? null : null };
}

function taskEntries(rootDir) {
  const taskRoot = resolve(rootDir, '.agents/tasks');
  if (!existsSync(taskRoot)) return [];
  const entries = [];
  for (const year of readdirSync(taskRoot, { withFileTypes: true })) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    for (const taskDirectory of readdirSync(resolve(taskRoot, year.name), { withFileTypes: true })) {
      if (!taskDirectory.isDirectory()) continue;
      const directory = resolve(taskRoot, year.name, taskDirectory.name);
      const taskPath = resolve(directory, 'task.json');
      if (!existsSync(taskPath)) continue;
      try {
        entries.push({ directory, relativeDirectory: relative(rootDir, directory).replaceAll('\\', '/'), taskPath, task: JSON.parse(readFileSync(taskPath, 'utf8')) });
      } catch (error) {
        entries.push({ directory, relativeDirectory: relative(rootDir, directory).replaceAll('\\', '/'), taskPath, parseError: error });
      }
    }
  }
  return entries;
}

export function findTask(rootDir, taskId) {
  return taskEntries(rootDir).find((entry) => [1, 2].includes(entry.task?.schemaVersion)
    && (entry.task?.id === taskId || entry.directory.split(/[\\/]/).pop().startsWith(`${taskId}-`))) ?? null;
}

export function listTasks(rootDir) {
  return taskEntries(rootDir).filter((entry) => entry.task?.schemaVersion === 2 || entry.parseError);
}

function gitFilesAtRef(rootDir, ref) {
  try {
    return execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '.agents/tasks'], { cwd: rootDir, encoding: 'utf8' })
      .split(/\r?\n/).filter((file) => file.endsWith('/task.json'));
  } catch {
    return [];
  }
}

export function listTasksAtRef(rootDir, ref) {
  return gitFilesAtRef(rootDir, ref).map((taskPath) => {
    const directory = taskPath.slice(0, -'/task.json'.length);
    try {
      const task = JSON.parse(execFileSync('git', ['show', `${ref}:${taskPath}`], { cwd: rootDir, encoding: 'utf8' }));
      return { directory: resolve(rootDir, directory), relativeDirectory: directory.replaceAll('\\', '/'), taskPath: resolve(rootDir, taskPath), task };
    } catch (error) {
      return { directory: resolve(rootDir, directory), relativeDirectory: directory.replaceAll('\\', '/'), taskPath: resolve(rootDir, taskPath), parseError: error };
    }
  }).filter((entry) => entry.task?.schemaVersion === 2 || entry.parseError);
}

export function findTaskAtRef(rootDir, ref, taskId) {
  return listTasksAtRef(rootDir, ref).find((entry) => entry.task?.schemaVersion === 2 && entry.task?.id === taskId) ?? null;
}

export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  const { taskId } = parseTaskArgs(argv);
  const entries = taskId ? [findTask(rootDir, taskId)].filter(Boolean) : listTasks(rootDir);
  if (taskId && !entries.length) { io.error(`✗ 未找到 task: ${taskId}`); return 1; }
  if (!entries.length) { io.log('暂无 recovery task'); return 0; }
  const protocol = readProtocol(rootDir);
  const failures = [];
  for (const entry of entries) {
    if (entry.parseError) { failures.push(`${entry.relativeDirectory}/task.json 无法解析: ${entry.parseError.message}`); continue; }
    const result = validateTask(entry.task, entry.relativeDirectory, protocol);
    if (!result.ok) failures.push(...result.errors.map((error) => `${entry.task.id}: ${error}`));
  }
  if (failures.length) { failures.forEach((error) => io.error(`✗ ${error}`)); return 1; }
  io.log(`✓ recovery task 校验通过（${entries.length} 个）`);
  return 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
