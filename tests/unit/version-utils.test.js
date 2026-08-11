import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bumpVersion, parseVersion, readPkgVersion, writeManifestVersions } from '../../scripts/version-utils.js';

describe('version-utils', () => {
  it('parseVersion：解析 / 非法拒绝', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(() => parseVersion('1.2')).toThrow();
    expect(() => parseVersion('v1.2.3')).toThrow();
    expect(() => parseVersion('abc')).toThrow();
  });

  it('bumpVersion：patch/minor/major + 默认 patch', () => {
    expect(bumpVersion('0.1.0', 'patch')).toBe('0.1.1');
    expect(bumpVersion('0.1.9', 'patch')).toBe('0.1.10');
    expect(bumpVersion('0.1.0', 'minor')).toBe('0.2.0');
    expect(bumpVersion('0.1.0', 'major')).toBe('1.0.0');
    expect(bumpVersion('1.2.3')).toBe('1.2.4'); // 默认 patch
    expect(() => bumpVersion('1.2.3', 'x')).toThrow();
  });

  it('writeManifestVersions：同步 3 个 manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'evolveos-ver-'));
    mkdirSync(join(dir, 'src-tauri'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{\n  "name": "evolveos",\n  "version": "0.1.0"\n}\n');
    writeFileSync(join(dir, 'src-tauri', 'Cargo.toml'), 'version = "0.1.0"\n');
    writeFileSync(join(dir, 'src-tauri', 'tauri.conf.json'), '{\n  "version": "0.1.0"\n}\n');
    const changed = writeManifestVersions(dir, '0.2.0');
    expect(changed.sort()).toEqual(['package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json'].sort());
    expect(readPkgVersion(dir)).toBe('0.2.0');
    expect(readFileSync(join(dir, 'src-tauri', 'Cargo.toml'), 'utf-8')).toContain('version = "0.2.0"');
    expect(readFileSync(join(dir, 'src-tauri', 'tauri.conf.json'), 'utf-8')).toContain('"version": "0.2.0"');
    // 幂等：再写同版本 → 无改动
    expect(writeManifestVersions(dir, '0.2.0')).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});
