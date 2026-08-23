import { describe, expect, test } from 'vitest';
import { attestationScopeHash, validateHumanAttestation } from '../../scripts/agent/attestation.js';

const policyHash = 'a'.repeat(64);
const snapshot = {
  baseSha: 'b'.repeat(40),
  headSha: 'c'.repeat(40),
  changedPathsHash: 'd'.repeat(64),
  changeFingerprint: 'e'.repeat(64),
};

function validAttestation(overrides = {}) {
  return {
    schemaVersion: 1,
    type: 'human',
    name: 'desktop-manual',
    scopeHash: attestationScopeHash({ policyHash, snapshot }),
    policyHash,
    subjectHead: snapshot.headSha,
    subjectFingerprint: snapshot.changeFingerprint,
    confirmedBy: 'Windows QA',
    confirmedAt: '2026-08-22T10:00:00.000Z',
    ...overrides,
  };
}

describe('human attestation', () => {
  test('accepts a policy- and snapshot-bound human attestation', () => {
    expect(validateHumanAttestation(validAttestation(), { policyHash, snapshot, name: 'desktop-manual' }))
      .toEqual({ ok: true, errors: [] });
  });

  test('rejects a stale policy, subject head or scope', () => {
    const result = validateHumanAttestation(validAttestation({ policyHash: 'f'.repeat(64) }), { policyHash, snapshot, name: 'desktop-manual' });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('policyHash');
  });

  test('rejects non-human and incomplete records', () => {
    const result = validateHumanAttestation(validAttestation({ type: 'automated', confirmedBy: '' }), { policyHash, snapshot, name: 'desktop-manual' });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('type');
    expect(result.errors.join(' ')).toContain('confirmedBy');
  });
});
