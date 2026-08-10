#!/usr/bin/env node
// 边界检查 CLI（Task G2）：检查当前分支改动是否越界（框架/应用）。
// 用法：node scripts/check-boundary.js [base...head]
// 默认范围：dev 存在则 dev...HEAD，否则 main...HEAD。
import { execSync } from 'node:child_process';
import { assessBranchChanges } from './boundary-check.js';

function defaultRange() {
  try {
    execSync('git rev-parse --verify dev', { stdio: 'ignore' });
    return 'dev...HEAD';
  } catch {
    return 'main...HEAD';
  }
}

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
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
