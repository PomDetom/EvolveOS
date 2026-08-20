#!/usr/bin/env node
export function parseApproveArgs(argv) {
  const index = argv.indexOf('--task');
  return { taskId: index >= 0 ? argv[index + 1] ?? null : null, approver: 'deprecated' };
}
export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  io.error('✗ agent:approve 已退出；重大设计请通过 proposed Agent Note 记录并由 maintainer 接受');
  return 1;
}
if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
