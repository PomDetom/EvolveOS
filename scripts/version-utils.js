// 版本工具纯函数（发版与 set-version 共用）——semver 解析/递增 + 3 个 manifest 版本同步。
// 零依赖，仅用 node:fs / node:path。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  if (!m) throw new Error(`非法版本号: ${v}（应为 MAJOR.MINOR.PATCH，如 1.2.3）`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function formatVersion(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function bumpVersion(current, kind = 'patch') {
  const v = parseVersion(current);
  if (kind === 'major') { v.major += 1; v.minor = 0; v.patch = 0; }
  else if (kind === 'minor') { v.minor += 1; v.patch = 0; }
  else if (kind === 'patch') { v.patch += 1; }
  else throw new Error(`非法递增类型: ${kind}（应为 patch|minor|major）`);
  return formatVersion(v);
}

const MANIFESTS = [
  { file: 'package.json', re: /"version"\s*:\s*"[^"]*"/, to: (v) => `"version": "${v}"` },
  { file: 'src-tauri/Cargo.toml', re: /^version\s*=\s*"[^"]*"/m, to: (v) => `version = "${v}"` },
  { file: 'src-tauri/tauri.conf.json', re: /"version"\s*:\s*"[^"]*"/, to: (v) => `"version": "${v}"` },
];

export function readPkgVersion(rootDir) {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

/** 把 version 写入 3 个 manifest；返回实际改动文件相对路径列表（幂等：同版本不改写）。 */
export function writeManifestVersions(rootDir, version) {
  const v = formatVersion(parseVersion(version));
  const changed = [];
  for (const { file, re, to } of MANIFESTS) {
    const p = join(rootDir, file);
    const src = readFileSync(p, 'utf-8');
    const next = src.replace(re, () => to(v));
    if (next !== src) { writeFileSync(p, next); changed.push(file); }
  }
  return changed;
}
