#!/usr/bin/env node
export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  io.error('✗ rebaseline 已退出；v2 不保存 baseline evidence');
  return 1;
}
if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
