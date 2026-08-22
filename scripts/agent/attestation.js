#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { stablePolicySerialize } from './change-policy.js';

function snapshotFacts(snapshot = {}) {
  return {
    baseSha: snapshot.baseSha ?? null,
    headSha: snapshot.headSha ?? null,
    changedPathsHash: snapshot.changedPathsHash ?? null,
    changeFingerprint: snapshot.changeFingerprint ?? null,
  };
}

export function attestationScopeHash({ policyHash, snapshot } = {}) {
  return createHash('sha256').update(stablePolicySerialize({ policyHash, snapshot: snapshotFacts(snapshot) })).digest('hex');
}

export function validateHumanAttestation(attestation, { policyHash = null, snapshot = null, name = null } = {}) {
  const errors = [];
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) return { ok: false, errors: ['attestation 必须是 JSON 对象'] };
  if (attestation.type !== 'human') errors.push('attestation.type 必须为 human');
  if (name && attestation.name !== name) errors.push(`attestation.name 不一致: ${attestation.name}`);
  if (typeof attestation.scopeHash !== 'string' || !/^[0-9a-f]{64}$/i.test(attestation.scopeHash)) errors.push('attestation.scopeHash 必须为 64 位哈希');
  if (policyHash && attestation.policyHash !== policyHash) errors.push('attestation policyHash 与当前 Policy 不一致');
  if (policyHash && attestation.scopeHash !== attestationScopeHash({ policyHash, snapshot })) errors.push('attestation scopeHash 与当前 snapshot 不一致');
  if (snapshot?.headSha && attestation.subjectHead !== snapshot.headSha) errors.push('attestation subjectHead 与当前 HEAD 不一致');
  if (typeof attestation.confirmedBy !== 'string' || !attestation.confirmedBy.trim()) errors.push('attestation.confirmedBy 不能为空');
  if (typeof attestation.confirmedAt !== 'string' || !attestation.confirmedAt.trim()) errors.push('attestation.confirmedAt 不能为空');
  return { ok: errors.length === 0, errors };
}
