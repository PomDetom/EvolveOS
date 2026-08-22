import { describe, expect, test } from 'vitest';
import { evaluateChangePolicy, stablePolicySerialize } from '../../scripts/agent/change-policy.js';

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
      requiredChecks: ['rust-check', 'web-contract', 'permission-check'],
      requiresReview: true,
      requiredAttestations: ['desktop-manual'],
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
});
