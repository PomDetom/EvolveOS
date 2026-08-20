import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function recoveryRoot(rootDir) {
  const gitPath = execFileSync('git', ['rev-parse', '--git-path', 'evolve-agent/recovery'], { cwd: rootDir, encoding: 'utf8' }).trim();
  return resolve(rootDir, gitPath);
}

export function listStartRecoveryArtifacts(rootDir = process.cwd()) {
  try { const root = recoveryRoot(rootDir); return readdirSync(root).filter((file) => file.endsWith('.json')).map((file) => ({ path: resolve(root, file), ...JSON.parse(requireRead(resolve(root, file))) })); } catch { return []; }
}

function requireRead(path) { return readFileSync(path, 'utf8'); }

export function writeStartRecoveryArtifact(rootDir, record) {
  const root = recoveryRoot(rootDir); mkdirSync(root, { recursive: true });
  const file = resolve(root, `${Date.now()}-recovery.json`); writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8'); return file;
}
