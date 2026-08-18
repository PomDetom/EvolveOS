#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readManifestVersions(rootDir = process.cwd()) {
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  const cargoText = readFileSync(resolve(rootDir, 'src-tauri/Cargo.toml'), 'utf8');
  const tauriJson = JSON.parse(readFileSync(resolve(rootDir, 'src-tauri/tauri.conf.json'), 'utf8'));
  const cargoMatch = /^version\s*=\s*"([^"]+)"/m.exec(cargoText);
  if (!cargoMatch) throw new Error('src-tauri/Cargo.toml 缺少 package version');
  return { package: packageJson.version, cargo: cargoMatch[1], tauri: tauriJson.version };
}

export function main(rootDir = process.cwd(), io = console) {
  const versions = readManifestVersions(rootDir);
  const unique = new Set(Object.values(versions));
  if (unique.size !== 1) {
    io.error(`✗ 版本不一致: ${JSON.stringify(versions)}`);
    return 1;
  }
  io.log(`✓ 版本一致: ${versions.package}`);
  return 0;
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`✗ 版本检查失败: ${error.message}`);
    process.exitCode = 1;
  }
}
