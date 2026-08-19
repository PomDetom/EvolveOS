import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const protocolPath = resolve(process.cwd(), '.agents/protocol.json');

function readProtocol() {
  return JSON.parse(readFileSync(protocolPath, 'utf8'));
}

describe('EWP protocol', () => {
  test('defines the fixed protocol schema and shadow mode', () => {
    expect(existsSync(protocolPath)).toBe(true);

    const protocol = readProtocol();
    expect(protocol).toMatchObject({
      schemaVersion: 1,
      mode: 'shadow',
      baseBranch: 'dev',
      taskRoot: '.agents/tasks',
      legacySddRoot: 'docs/superpowers/sdd',
    });
    expect(protocol.taskStates).toEqual([
      'awaiting_approval',
      'planned',
      'implementing',
      'verifying',
      'reviewing',
      'ready',
      'blocked',
      'cancelled',
    ]);
    expect(protocol.noteClasses).toEqual([
      'architecture',
      'process',
      'testing',
      'feature',
      'bug-fix',
      'simplification',
    ]);
  });
});
