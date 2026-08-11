// npm run release -- [patch|minor|major] —— 半自动发版脚本。
// 1) semver bump + 同步 3 manifest  2) CHANGELOG 追加条目（git log 提交草稿）
// 3) npm test + npm run build 门禁  4) 提交 chore: release vX.Y.Z  5) 打印后续步骤。
// 不自动 merge/tag（发版是人工/控制器确认动作）。
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bumpVersion, readPkgVersion, writeManifestVersions } from './version-utils.js';

/** 从 `git log --oneline` 输出提取提交 subject（去掉短哈希前缀）。 */
export function collectCommits(gitLogOutput) {
  return gitLogOutput.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\S+\s+/, ''));
}

/** 渲染一条 Keep-a-Changelog 风格版本条目（分类占位 + 草稿提交列表，供人工整理）。 */
export function formatChangelogEntry({ version, date, commits }) {
  const bullets = commits.length
    ? commits.map((c) => `- ${c}`).join('\n')
    : '- （本版本变更待整理）';
  return `## [${version}] - ${date}\n\n### Added\n\n### Changed\n\n### Fixed\n\n${bullets}\n`;
}

/** 把新条目插到现有 changelog 顶部。 */
export function prependChangelog(existing, entry) {
  return `${entry}\n${existing.trimStart()}`;
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function lastTagOrEmpty() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

export function main() {
  const kind = process.argv[2] ?? 'patch';
  const root = process.cwd();
  const current = readPkgVersion(root);
  const next = bumpVersion(current, kind);

  // 1. 同步 3 manifest
  const changed = writeManifestVersions(root, next);

  // 2. CHANGELOG 追加条目
  const changelogPath = join(root, 'CHANGELOG.md');
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf-8')
    : '# Changelog\n\n';
  let commits = [];
  try {
    const lastTag = lastTagOrEmpty();
    const log = lastTag
      ? execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf-8' })
      : execSync('git log --oneline | tail -n +2', { encoding: 'utf-8' });
    commits = collectCommits(log);
  } catch {
    commits = [];
  }
  const entry = formatChangelogEntry({ version: next, date: today(), commits });
  writeFileSync(changelogPath, prependChangelog(existing, entry));

  // 3. 快速门禁（红则中止，版本与 CHANGELOG 已写）
  run('npm test');
  run('npm run build');

  // 4. 提交
  run(`git add ${changed.join(' ')} CHANGELOG.md`);
  run(`git commit -m "chore: release v${next}"`);

  // 5. 打印后续步骤（不自动执行）
  console.log(`
✅ release v${next} 已提交（版本 ${current} → ${next}）
后续步骤：
  ① npm run test:e2e（全量 e2e）
  ② git checkout main && git merge dev --no-ff -m "release: v${next}"
  ③ git tag v${next}
  ④ git push origin main --tags && git push origin dev`);
}

// CLI 守卫：直接运行脚本时执行 main；被测试 import 时跳过。
const isMain = process.argv[1] && new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href === import.meta.url;
if (isMain) {
  try { main(); } catch (err) { console.error(String(err.message ?? err)); process.exit(1); }
}
