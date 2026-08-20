#!/usr/bin/env node
export function parseFinishArgs(argv) { return { taskId: argv[argv.indexOf('--task') + 1] ?? null, reviewer: null, reviewResult: null }; }
export function buildReviewRecord({ reviewer, result, reviewedHead }) { return { reviewer, result, subjectHead: reviewedHead, findings: { critical: [], important: [], minor: [] } }; }
export function main(argv = process.argv.slice(2), rootDir = process.cwd(), io = console) {
  io.error('✗ agent:finish 已退出；请使用 agent:verify、真实 semantic review 和 merge-to-dev');
  return 1;
}
if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) process.exitCode = main();
