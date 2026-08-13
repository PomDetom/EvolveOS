#!/usr/bin/env node
// scripts/merge-to-dev.js —— 合并分支入 dev 的统一入口（方案2）+ 基线同步（方案3）。
// 治三类坑：
//   ① `git branch -d` 只判断「并入当前分支」—— 合入 dev 后站在 dev 删分支必报 not fully merged；
//   ② 基线漂移 —— 分支开自旧 dev，合前 dev 已前进，三方合并/意外冲突；
//   ③ 手工多步易漏（check:boundary / --no-ff / 祖先验证删分支 / worktree 清理）。
// 流程：基线同步（分支落后 dev 自动并入 dev）→ check:boundary → `--no-ff` 合并（`merge:` 文案）
//       → 祖先验证后删分支 + 移除 worktree。
// 分支常在独立 worktree 持有（AGENTS.md：任务在独立 worktree 执行）—— 本脚本**不 checkout 待合分支**：
// 基线同步在分支 worktree 内执行（git -C）；check:boundary 用显式 dev...<分支> <分支> 从 dev 校验。
// 用法：node scripts/merge-to-dev.js <分支名> [--message "merge: 摘要"] [--no-sync] [--no-cleanup]
// 须在主 checkout 的 dev 分支上运行（主 checkout 常驻 dev）。
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from './merge-to-dev-utils.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sh(cwd, cmd) {
  return execSync(cmd, { cwd, encoding: 'utf-8' }).trim();
}
function shOk(cwd, cmd) {
  try { sh(cwd, cmd); return true; } catch { return false; }
}
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

// 中文文案经临时文件传入 git（规避 Windows cmd.exe 代码页把 UTF-8 中文转成乱码）
function mergeWithMessage(cwd, cmd, msg) {
  const f = path.join(os.tmpdir(), `merge-to-dev-${process.pid}.txt`);
  writeFileSync(f, msg, 'utf8');
  try { sh(cwd, `${cmd} -F "${f}"`); } finally { try { unlinkSync(f); } catch { /* noop */ } }
}

// 分支上挂载的 worktree 路径（porcelain 块：worktree <path> / branch refs/heads/<name>）
function worktreesOn(branch) {
  return sh(ROOT, `git worktree list --porcelain`)
    .split('\n\n')
    .filter((b) => b.includes(`branch refs/heads/${branch}`))
    .map((b) => b.split('\n')[0].replace('worktree ', '').trim());
}

function main() {
  const { branch, message, noSync, noCleanup } = parseArgs(process.argv.slice(2));
  if (!branch) fail('用法：node scripts/merge-to-dev.js <分支名> [--message "merge: 摘要"] [--no-sync] [--no-cleanup]');
  if (branch === 'dev' || branch === 'main') fail('禁止合并 dev/main 本身');
  if (branch.startsWith('hotfix/')) console.warn('⚠ hotfix 通常先合 main 再同步回 dev，确认这是你的意图。');

  if (sh(ROOT, 'git branch --show-current') !== 'dev') fail(`须在主 checkout 的 dev 分支上运行（主 checkout 常驻 dev）。当前不在 dev。`);
  if (!shOk(ROOT, `git rev-parse --verify --quiet ${branch}`)) fail(`分支不存在：${branch}`);

  const wts = worktreesOn(branch);
  const wt = wts[0] ?? null; // 待合分支的 worktree（主 checkout 常驻 dev，正常不含该分支）

  // ① 基线同步（方案3）：分支落后 dev → 先并入 dev（或 rebase），防三方漂移
  const behind = !shOk(ROOT, `git merge-base --is-ancestor dev ${branch}`);
  if (behind) {
    if (noSync) fail(`分支 ${branch} 落后 dev，先同步再合并（--no-sync 已阻止自动并入）`);
    console.log(`→ ${branch} 落后 dev，先并入 dev（基线同步）`);
    if (wt) mergeWithMessage(wt, 'git merge dev', 'merge: 同步 dev 到分支（基线同步）');
    else {
      sh(ROOT, `git checkout ${branch}`);
      mergeWithMessage(ROOT, 'git merge dev', 'merge: 同步 dev 到分支（基线同步）');
      sh(ROOT, 'git checkout dev');
    }
  }

  // ② 边界门禁：从 dev 校验待合分支（显式范围 + 分支名，无需 checkout 分支）
  if (!shOk(ROOT, `node scripts/check-boundary.js dev...${branch} ${branch}`)) {
    fail('check:boundary 未通过，中止合并');
  }

  // ③ --no-ff 合并（merge: 文案）
  const msg = message ?? `merge: ${branch} 合入 dev`;
  mergeWithMessage(ROOT, `git merge --no-ff ${branch}`, msg);
  console.log(`✓ 已合并 ${branch} → dev（${msg}）`);

  // ④ 祖先验证后删分支 + 移除 worktree（绕过 `git branch -d` 只看当前分支的坑）
  if (noCleanup) return;
  if (!shOk(ROOT, `git merge-base --is-ancestor ${branch} dev`)) {
    console.warn(`⚠ ${branch} 未成为 dev 祖先，跳过删分支（手动检查）`);
    return;
  }
  for (const w of wts) {
    if (shOk(ROOT, `git worktree remove ${w}`)) console.log(`✓ 已移除 worktree：${w}`);
    else console.warn(`⚠ 移除 worktree 失败（可能含未提交改动）：${w}，手动处理`);
  }
  sh(ROOT, `git branch -D ${branch}`);
  console.log(`✓ 已删除分支：${branch}`);
}

// 直接执行时跑主流程；被单测 import 时不执行（parseArgs 等纯函数可测）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
