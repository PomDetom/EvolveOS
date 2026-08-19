import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RECOVERY_ROOT = '.agents/recovery/agent-start';

export function recoveryDirectory(rootDir) {
  return resolve(rootDir, RECOVERY_ROOT);
}

export function recoveryFile(rootDir, startRunId) {
  return resolve(recoveryDirectory(rootDir), `${startRunId}.json`);
}

export function listStartRecoveryArtifacts(rootDir) {
  const directory = recoveryDirectory(rootDir);
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => JSON.parse(readFileSync(resolve(directory, entry.name), 'utf8')));
  } catch {
    return [];
  }
}

export function writeStartRecoveryArtifact(rootDir, artifact) {
  mkdirSync(recoveryDirectory(rootDir), { recursive: true });
  const target = recoveryFile(rootDir, artifact.startRunId);
  writeFileSync(target, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return target;
}
