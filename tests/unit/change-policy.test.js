import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { evaluateChangePolicy, stablePolicySerialize } from '../../scripts/agent/change-policy.js';
import { buildChangeSnapshot } from '../../scripts/agent/change-scope.js';
import { selectGates } from '../../scripts/agent/select-gates.js';
import { validateTask } from '../../scripts/agent/task-schema.js';
import { assessBranchChanges } from '../../scripts/boundary-check.js';
import { runStatelessVerification } from '../../scripts/agent/verify.js';
import { nextTaskId } from '../../scripts/agent/start-task.js';
import { buildRecoveryTask } from '../../scripts/agent/start-task.js';

function snapshot(changedPaths, branch = 'chore/policy') {
  return {
    base: 'dev',
    head: 'HEAD',
    branch,
    baseSha: 'a'.repeat(40),
    headSha: 'b'.repeat(40),
    changedPaths,
    changedPathsHash: 'paths',
    changeFingerprint: 'fingerprint',
  };
}

describe('EWP v2.2 Change Policy', () => {
  test('routes docs-only changes through docs-check without task, note or review', () => {
    const policy = evaluateChangePolicy({ snapshot: snapshot(['docs/guide.md'], 'docs/guide') });

    expect(policy).toMatchObject({
      classification: expect.objectContaining({ primary: 'docs', docsOnly: true }),
      requiresTask: false,
      requiresNote: false,
      requiredChecks: ['docs-check'],
      requiresReview: false,
      requiredAttestations: [],
    });
  });

  test('routes workflow tooling through the shared checks, note and review policy', () => {
    const policy = evaluateChangePolicy({ snapshot: snapshot(['scripts/agent/change-policy.js', 'tests/unit/change-policy.test.js']) });

    expect(policy).toMatchObject({
      classification: expect.objectContaining({ primary: 'workflow' }),
      requiresTask: true,
      requiresNote: true,
      requiredChecks: ['scripts-unit', 'workflow-fixture', 'build', 'unit'],
      requiresReview: true,
      requiredAttestations: [],
    });
  });

  test('routes Tauri OS integration to desktop attestation', () => {
    const policy = evaluateChangePolicy({
      snapshot: snapshot(['src-tauri/src/window.rs', 'src-tauri/capabilities/default.json'], 'native/window'),
    });

    expect(policy).toMatchObject({
      classification: expect.objectContaining({ primary: 'tauri', desktopOnly: true }),
      requiresTask: true,
      requiresNote: true,
      requiredChecks: ['rust-check', 'web-contract', 'permission-schema-check'],
      requiresReview: true,
      requiredAttestations: ['permission-review', 'desktop-manual'],
    });
  });

  test('policy hash is stable for equivalent snapshots and changes with policy output', () => {
    const first = evaluateChangePolicy({ snapshot: snapshot(['scripts/agent/change-policy.js', 'tests/unit/change-policy.test.js']) });
    const reordered = evaluateChangePolicy({ snapshot: snapshot(['tests/unit/change-policy.test.js', 'scripts/agent/change-policy.js']) });

    expect(first.policyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.policyHash).toBe(reordered.policyHash);
    expect(stablePolicySerialize({ ...first, policyHash: undefined })).not.toContain(first.policyHash);
    expect(first.policyHash).not.toBe(evaluateChangePolicy({ snapshot: snapshot(['docs/guide.md'], 'docs/guide') }).policyHash);
  });

  test('branch taxonomy is explicit and does not become a lifecycle state', () => {
    const policy = evaluateChangePolicy({ snapshot: snapshot(['src/components/button.js'], 'framework/button') });

    expect(policy.classification.branchKind).toBe('framework');
    expect(policy).not.toHaveProperty('status');
    expect(policy).not.toHaveProperty('state');
  });

  test('checks and verify consume the same policy hash and gate list', async () => {
    const currentSnapshot = buildChangeSnapshot(process.cwd(), 'dev', 'HEAD');
    const policy = evaluateChangePolicy({ snapshot: currentSnapshot });
    const gates = selectGates({ kind: 'chore', changedPaths: currentSnapshot.changedPaths, policy, snapshot: currentSnapshot, includeBoundary: true });
    const report = await runStatelessVerification({
      rootDir: process.cwd(),
      base: 'dev',
      head: 'HEAD',
      snapshot: currentSnapshot,
      changedPaths: currentSnapshot.changedPaths,
      policy,
      gates,
      runner: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
      writeCache: false,
    });

    expect(gates.slice(1)).toEqual(policy.requiredChecks);
    expect(report.policyHash).toBe(policy.policyHash);
    expect(report.startSnapshot).toEqual(report.endSnapshot);
    expect(report.snapshotStable).toBe(true);
  });

  test('verify rejects a worktree snapshot that drifts during gate execution', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-v22-drift-'));
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'base\n');
      git(['add', '.']);
      git(['commit', '-m', 'base']);
      const start = buildChangeSnapshot(root, 'dev', 'HEAD');
      const report = await runStatelessVerification({
        rootDir: root,
        base: 'dev',
        head: 'HEAD',
        snapshot: start,
        changedPaths: [],
        policy: evaluateChangePolicy({ snapshot: start, changedPaths: [] }),
        gates: ['boundary'],
        runner: async () => {
          writeFileSync(path.join(root, 'drift.txt'), 'changed during check\n');
          return { exitCode: 0, stdout: '', stderr: '' };
        },
        writeCache: false,
      });

      expect(report.snapshotStable).toBe(false);
      expect(report.ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('verify rejects an end snapshot that cannot be read', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-v22-snapshot-error-'));
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    try {
      git(['init', '-b', 'dev']);
      git(['config', 'user.email', 'ewp@example.com']);
      git(['config', 'user.name', 'EWP Test']);
      writeFileSync(path.join(root, 'README.md'), 'base\n');
      git(['add', '.']);
      git(['commit', '-m', 'base']);
      const start = buildChangeSnapshot(root, 'dev', 'HEAD');
      const report = await runStatelessVerification({
        rootDir: root,
        base: 'dev',
        head: 'HEAD',
        snapshot: start,
        changedPaths: [],
        policy: evaluateChangePolicy({ snapshot: start, changedPaths: [] }),
        gates: ['boundary'],
        runner: async () => {
          rmSync(root, { recursive: true, force: true });
          return { exitCode: 0, stdout: '', stderr: '' };
        },
        writeCache: false,
      });

      expect(report.snapshotStable).toBe(false);
      expect(report.ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('review fingerprint is evaluated at the reviewed subject head', async () => {
    const { reviewReadiness } = await import('../../scripts/merge-to-dev-agent-utils.js');
    const subjectHead = 'b'.repeat(40);
    expect(reviewReadiness({
      review: { subjectHead, changeFingerprint: 'a'.repeat(64), result: 'approved', reviewer: 'agent', reviewTime: '2026-08-22T00:00:00Z', findings: { critical: [], important: [] } },
      headSha: 'c'.repeat(40),
      reviewFingerprint: 'a'.repeat(64),
      required: true,
      acceptedSubjectHeads: [subjectHead],
    })).toEqual({ ok: true, issues: [] });
  });

  test('new recovery manifests use createdFromSha provenance without a lifecycle state', () => {
    const result = validateTask({
      schemaVersion: 2,
      id: 'EV-024',
      title: 'Policy',
      branch: 'chore/policy',
      baseBranch: 'dev',
      createdFromSha: 'a'.repeat(40),
      intent: '统一策略',
      allowedPaths: ['scripts/'],
      acceptance: ['通过'],
      references: { spec: null, plan: null, notes: [] },
      recovery: { state: 'active', blockedReason: null },
    }, '.agents/tasks/2026/EV-024-policy');

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('native and framework branches have explicit boundary taxonomy', () => {
    expect(assessBranchChanges('native/window', ['src-tauri/src/window.rs']).kind).toBe('native');
    expect(assessBranchChanges('framework/button', ['src/components/button.js']).kind).toBe('framework');
  });

  test('new task ids use EV prefix while accounting for historical EWP ids', () => {
    expect(nextTaskId(['EWP-021', 'EV-022', 'EV-007'])).toBe('EV-023');
    expect(() => buildRecoveryTask({ id: 'EWP-023', title: 'legacy', branch: 'chore/legacy', baseBranch: 'dev', baseSha: 'a'.repeat(40), intent: 'legacy', allowedPaths: ['scripts/'] })).toThrow(/EV-000/);
  });
});
