#!/usr/bin/env node
// scripts/merge-to-dev.js —— 合并分支入 dev 的统一入口（方案2）+ 基线同步（方案3）。
// 治三类坑：
//   ① `git branch -d` 只判断「并入当前分支」—— 合入 dev 后站在 dev 删分支必报 not fully merged；
//   ② 基线漂移 —— 分支开自旧 dev，合前 dev 已前进，三方合并/意外冲突；
//   ③ 手工多步易漏（check:boundary / --no-ff / 祖先验证删分支 / worktree 清理）。
// 流程：基线同步（分支落后 dev 自动并入 dev）→ check:boundary → `--no-ff` 合并（`merge:` 文案）
//       → 祖先验证后删分支 + 移除 worktree。
// 用法：node scripts/merge-to-dev.js <分支名> [--message "merge: 摘要"] [--no-sync] [--no-cleanup]
// 须在主 checkout 的 dev 分支上运行（主 checkout 常驻 dev）。
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8' }).trim();
}
function shOk(cmd) {
  try { sh(cmd); return true; } catch { return false; }
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  return {
    branch: argv.find((a) => !a.startsWith('--')),
    message: (argv.find((a) => a.startsWith('--message=')) ?? '').slice('--message='.length) || null,
    noSync: argv.includes('--no-sync'),
    noCleanup: argv.includes('--no-cleanup'),
  };
}

// 当前分支上挂载的 worktree 路径（porcelain 块：worktree <path> / branch refs/heads/<name>）
function worktreesOn(branch) {
  return sh(`git worktree list --porcelain`)
    .split('\n\n')
    .filter((b) => b.includes(`branch refs/heads/${branch}`))
    .map((b) => b.split('\n')[0].replace('worktree ', ''));
}

function main() {
  const { branch, message, noSync, noCleanup } = parseArgs(process.argv.slice(2));
  if (!branch) fail('用法：node scripts/merge-to-dev.js <分支名> [--message "merge: 摘要"] [--no-sync] [--no-cleanup]');
  if (branch === 'dev' || branch === 'main') fail('禁止合并 dev/main 本身');
  if (branch.startsWith('hotfix/')) console.warn('⚠ hotfix 通常先合 main 再同步回 dev，确认这是你的意图。');

  const current = sh(`git branch --show-current`);
  if (current !== 'dev') fail(`须在主 checkout 的 dev 分支上运行（当前分支：${current}）。主 checkout 常驻 dev。`);
  if (!shOk(`git rev-parse --verify --quiet ${branch}`)) fail(`分支不存在：${branch}`);

  // ① 基线同步（方案3）：分支落后 dev → 先并入 dev（或 rebase），防三方漂移
  const behind = !shOk(`git merge-base --is-ancestor dev ${branch}`);
  if (behind) {
    if (noSync) fail(`分支 ${branch} 落后 dev，先同步再合并：git checkout ${branch} && git merge dev`);
    console.log(`→ ${branch} 落后 dev，先并入 dev（基线同步）`);
    sh(`git checkout ${branch}`);
    sh(`git merge dev -m "merge: 同步 dev 到分支（基线同步）"`);
  } else {
    sh(`git checkout ${branch}`);
  }

  // ② 边界门禁（在分支上跑：check:boundary 默认范围 dev...HEAD = 分支改动）
  if (!shOk(`node scripts/check-boundary.js`)) fail('check:boundary 未通过，中止合并');

  // ③ --no-ff 合并（merge: 文案）
  const msg = message ?? `merge: ${branch} 合入 dev`;
  sh(`git checkout dev`);
  sh(`git merge --no-ff ${branch} -m "${msg}"`);
  console.log(`✓ 已合并 ${branch} → dev（${msg}）`);

  // ④ 祖先验证后删分支 + 移除 worktree（绕过 `git branch -d` 只看当前分支的坑）
  if (noCleanup) return;
  if (!shOk(`git merge-base --is-ancestor ${branch} dev`)) {
    console.warn(`⚠ ${branch} 未成为 dev 祖先，跳过删分支（手动检查）`);
    return;
  }
  for (const wt of worktreesOn(branch)) {
    if (shOk(`git worktree remove ${wt}`)) console.log(`✓ 已移除 worktree：${wt}`);
    else console.warn(`⚠ 移除 worktree 失败（可能含未提交改动）：${wt}，手动处理`);
  }
  sh(`git branch -D ${branch}`);
  console.log(`✓ 已删除分支：${branch}`);
}

main();
