import { describe, expect, test } from 'vitest';
import { validateTask } from '../../scripts/agent/task-schema.js';

const taskDirectory = '.agents/tasks/2026/EWP-001-native-workflow';

function validTask(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'EWP-001',
    title: '建立 EWP 骨架',
    status: 'planned',
    kind: 'chore',
    branch: 'chore/ewp-skeleton',
    baseBranch: 'dev',
    baseSha: '54bea15495ca2cfdae93a7da1c971c2b38fda841',
    allowedPaths: ['.agents/', 'scripts/agent/', 'tests/unit/agent-task-schema.test.js'],
    spec: 'docs/superpowers/specs/2026-08-18-evolve-workflow-protocol-design.md',
    notes: [],
    requiredGates: 'auto',
    evidence: [],
    review: null,
    readyHead: null,
    ...overrides,
  };
}

describe('EWP task schema', () => {
  test('accepts a valid minimal task', () => {
    expect(validateTask(validTask(), taskDirectory)).toEqual({ ok: true, errors: [] });
  });

  test('rejects an unknown status', () => {
    const result = validateTask(validTask({ status: 'draft' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('status');
  });

  test('rejects a task id that does not match its directory', () => {
    const result = validateTask(validTask({ id: 'EWP-002' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('目录');
  });

  test('rejects a branch without an approved prefix', () => {
    const result = validateTask(validTask({ branch: 'feature/ewp-skeleton' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('branch');
  });

  test('rejects a task whose base branch is not dev', () => {
    const result = validateTask(validTask({ baseBranch: 'main' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('baseBranch');
  });

  test('rejects an app task without its app path', () => {
    const result = validateTask(validTask({
      kind: 'app',
      branch: 'app/ledger/report',
      allowedPaths: ['docs/ledger.md'],
    }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('src/apps/ledger/');
  });

  test('rejects a ready task without readyHead', () => {
    const result = validateTask(validTask({ status: 'ready' }), taskDirectory);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('readyHead');
  });
});
