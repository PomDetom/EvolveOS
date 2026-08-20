#!/usr/bin/env node
export function parseImplementArgs(argv) { return { taskId: argv[argv.indexOf('--task') + 1] ?? null, dryRun: argv.includes('--dry-run') }; }
export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  io.error('✗ agent:implement 已退出；实现是普通 Git 工作，不是 workflow state transition');
  return 1;
}
if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
