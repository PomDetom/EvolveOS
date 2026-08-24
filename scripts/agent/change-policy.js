#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { classifyChangedPaths } from './change-scope.js';
import { classifyArtifacts } from './change-artifacts.js';

const RELEASE_PATH = /^(CHANGELOG\.md|scripts\/release\.js|src-tauri\/tauri\.conf\.json)$/;
const VISUAL_PATH = /\.css$|visual|snapshot/i;

function normalize(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

function uniqueSorted(values = []) {
  return [...new Set(values.map(normalize))].sort();
}

function addUnique(target, ...values) {
  values.forEach((value) => {
    if (value && !target.includes(value)) target.push(value);
  });
}

export function inferBranchKind(branch = '') {
  const value = normalize(branch);
  if (value.startsWith('app/')) return 'app';
  if (value.startsWith('ui/')) return 'framework';
  if (value.startsWith('native/')) return 'native';
  if (value.startsWith('framework/')) return 'framework';
  if (value.startsWith('docs/')) return 'docs';
  if (value.startsWith('hotfix/')) return 'hotfix';
  if (value.startsWith('chore/')) return 'chore';
  if (value === 'dev' || value === 'main') return 'base';
  return value ? 'unknown' : null;
}

function primarySurface(classification, paths) {
  const priority = ['governance', 'tauri', 'framework', 'workflow', 'scripts', 'app', 'build', 'tests', 'docs', 'other'];
  return priority.find((surface) => classification.surfaces.includes(surface)) ?? (paths.length ? 'other' : 'empty');
}

function buildClassification(paths, branchKind, artifacts) {
  const riskPaths = [...artifacts.subjectPaths, ...artifacts.docsPaths, ...artifacts.otherPaths];
  const base = classifyChangedPaths(riskPaths);
  const surfaces = [...new Set([
    ...(artifacts.governancePaths.length ? ['governance'] : []),
    ...base.surfaces,
  ])];
  return {
    ...base,
    surfaces,
    docsOnly: artifacts.subjectPaths.length === 0 && artifacts.governancePaths.length === 0 && artifacts.docsPaths.length > 0,
    branchKind,
    primary: primarySurface({ ...base, surfaces }, paths),
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stablePolicySerialize(value) {
  return JSON.stringify(stableValue(value));
}

export function hashPolicy(policy) {
  return createHash('sha256').update(stablePolicySerialize(policy)).digest('hex');
}

export function evaluateChangePolicy({ snapshot = {}, changedPaths = snapshot.changedPaths ?? [], branchKind = inferBranchKind(snapshot.branch) } = {}) {
  const paths = uniqueSorted(changedPaths);
  const artifacts = classifyArtifacts(paths);
  const has = (predicate) => paths.some(predicate);
  const classification = buildClassification(paths, branchKind, artifacts);
  const hasSurface = (surface) => classification.surfaces.includes(surface);
  const notesChanged = artifacts.decisionPaths.length > 0;
  const documentationChanged = artifacts.docsPaths.length > 0 || artifacts.governancePaths.length > 0 || notesChanged;
  const releaseChange = has((path) => RELEASE_PATH.test(path));
  const visualChange = has((path) => VISUAL_PATH.test(path));
  const appLocal = hasSurface('app') && classification.surfaces.every((surface) => ['app', 'tests', 'docs'].includes(surface));
  const docsOnly = classification.docsOnly;
  const governance = artifacts.governancePaths.length > 0;
  const workflow = hasSurface('workflow') || hasSurface('scripts') || governance || artifacts.otherPaths.length > 0;
  const framework = hasSurface('framework') || branchKind === 'framework' || branchKind === 'ui';
  const tauri = hasSurface('tauri') || branchKind === 'native';
  const build = hasSurface('build');
  const multiApp = classification.appIds.length > 1;

  const requiredChecks = [];
  const requiredAttestations = [];
  if (documentationChanged) addUnique(requiredChecks, 'docs-check');
  if (notesChanged) addUnique(requiredChecks, 'docs-check', 'notes-check');
  if (workflow) addUnique(requiredChecks, 'scripts-unit', 'workflow-fixture', 'build');
  if (tauri) {
    addUnique(requiredChecks, 'rust-check', 'web-contract');
    if (has((path) => /permission|capabilit/i.test(path))) {
      addUnique(requiredChecks, 'permission-schema-check');
      addUnique(requiredAttestations, 'permission-review');
    }
    if (classification.desktopOnly) addUnique(requiredAttestations, 'desktop-manual');
  }
  if (framework) {
    addUnique(requiredChecks, 'unit', 'affected-smoke', 'build');
    addUnique(requiredAttestations, 'owner-review');
  }
  if (appLocal) addUnique(requiredChecks, 'unit', 'app-e2e', 'build');
  if (build) addUnique(requiredChecks, 'build', 'shell-smoke');
  if (hasSurface('tests')) addUnique(requiredChecks, 'unit');
  if (visualChange && (framework || appLocal)) addUnique(requiredAttestations, 'visual-review');
  if (releaseChange) {
    addUnique(requiredChecks, 'unit', 'e2e', 'build', 'version-consistency');
    addUnique(requiredAttestations, 'user-confirmation');
  }
  if (!paths.length) requiredChecks.length = 0;

  const requiresTask = !docsOnly && (workflow || tauri || framework || build || multiApp);
  const requiresNote = !docsOnly && (workflow || tauri || framework || build || multiApp);
  const requiresReview = !docsOnly && (workflow || tauri || framework || build || multiApp);
  const policy = {
    policyVersion: 1,
    classification,
    artifacts,
    requiresTask,
    requiresNote,
    requiredChecks,
    requiresReview,
    requiredAttestations,
  };
  const policyArtifacts = {
    ...artifacts,
    paths: artifacts.paths.filter((path) => artifacts.roleByPath[path] !== 'sidecar'),
    sidecarPaths: [],
    roleByPath: Object.fromEntries(Object.entries(artifacts.roleByPath).filter(([, role]) => role !== 'sidecar')),
  };
  return { ...policy, policyHash: hashPolicy({ ...policy, artifacts: policyArtifacts }) };
}

// This is the canonical hand-off between Git-fact collection and every Policy
// consumer.  It deliberately keeps the source snapshot intact while exposing
// the Policy-owned views that must never be reconstructed from legacy scope
// classification by a downstream caller.
export function buildPolicySnapshot({ snapshot = {}, changedPaths = snapshot.changedPaths ?? [], branchKind = inferBranchKind(snapshot.branch) } = {}) {
  const paths = uniqueSorted(changedPaths);
  const resolvedSnapshot = { ...snapshot, changedPaths: paths };
  const policy = evaluateChangePolicy({ snapshot: resolvedSnapshot, changedPaths: paths, branchKind });
  return {
    snapshot: resolvedSnapshot,
    policy,
    policyHash: policy.policyHash,
    artifacts: policy.artifacts,
    classification: policy.classification,
  };
}

export function policyMatchesSnapshot(policy, { snapshot = {}, changedPaths = snapshot.changedPaths ?? [], branchKind = inferBranchKind(snapshot.branch) } = {}) {
  if (!policy?.policyHash) return false;
  return policy.policyHash === buildPolicySnapshot({ snapshot, changedPaths, branchKind }).policyHash;
}

export function policyGates(policy = {}) {
  return [...(policy.requiredChecks ?? [])];
}
