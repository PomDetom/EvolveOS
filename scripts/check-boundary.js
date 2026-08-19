#!/usr/bin/env node
// 边界检查 CLI（Task G2）：检查改动是否越界（框架/应用）。
// 用法：node scripts/check-boundary.js [base...head] [分支名]
// 默认范围：EWP_BOUNDARY_BASE 有值时使用 <base>...HEAD，否则 dev 存在则 dev...HEAD，否则 main...HEAD。
// 分支名缺省读当前 HEAD（正常在分支上跑）；显式传分支名可从不持有该分支的 checkout 校验
// （scripts/merge-to-dev.js 在 dev 上校验待合分支时使用：node scripts/check-boundary.js dev...<分支> <分支>）。
import { execSync } from 'node:child_process';
import { assessBranchChanges } from './boundary-check.js';

function defaultRange() {
  const baseRef = process.env.EWP_BOUNDARY_BASE?.trim();
  if (baseRef) return `${baseRef}...HEAD`;
  try {
    execSync('git rev-parse --verify dev', { stdio: 'ignore' });
    return 'dev...HEAD';
  } catch {
    return 'main...HEAD';
  }
}

const branch = process.argv[3] || execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const range = process.argv[2] || defaultRange();
const files = execSync(`git diff --name-only ${range}`).toString().trim().split('\n').filter(Boolean);
const result = assessBranchChanges(branch, files);

if (result.ok) {
  console.log(`[${branch}] ✓ ${result.note}`);
} else {
  console.error(`[${branch}] ✗ ${result.note}`);
  result.violations.forEach((f) => console.error('  ' + f));
  process.exit(1);
}
