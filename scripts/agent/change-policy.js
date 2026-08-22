#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { classifyChangedPaths } from './change-scope.js';

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
  if (value.startsWith('ui/')) return 'ui';
  if (value.startsWith('native/')) return 'native';
  if (value.startsWith('framework/')) return 'framework';
  if (value.startsWith('docs/')) return 'docs';
  if (value.startsWith('hotfix/')) return 'hotfix';
  if (value.startsWith('chore/')) return 'chore';
  return value ? 'unknown' : null;
}

function primarySurface(classification, paths) {
  const priority = ['tauri', 'framework', 'workflow', 'scripts', 'app', 'build', 'tests', 'docs', 'other'];
  return priority.find((surface) => classification.surfaces.includes(surface)) ?? (paths.length ? 'other' : 'empty');
}

function buildClassification(paths, branchKind) {
  const base = classifyChangedPaths(paths);
  return {
    ...base,
    branchKind,
    primary: primarySurface(base, paths),
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
  const classification = buildClassification(paths, branchKind);
  const has = (predicate) => paths.some(predicate);
  const hasSurface = (surface) => classification.surfaces.includes(surface);
  const notesChanged = has((path) => path.startsWith('.agents/notes/'));
  const documentationChanged = has((path) => path.startsWith('docs/') || path.startsWith('.agents/') || path.endsWith('.md'));
  const releaseChange = has((path) => RELEASE_PATH.test(path));
  const visualChange = has((path) => VISUAL_PATH.test(path));
  const appLocal = hasSurface('app') && classification.surfaces.every((surface) => ['app', 'tests', 'docs'].includes(surface));
  const docsOnly = classification.docsOnly;
  const workflow = hasSurface('workflow') || hasSurface('scripts');
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
    if (has((path) => /permission|capabilit/i.test(path))) addUnique(requiredChecks, 'permission-check');
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
    requiresTask,
    requiresNote,
    requiredChecks,
    requiresReview,
    requiredAttestations,
  };
  return { ...policy, policyHash: hashPolicy(policy) };
}

export function policyGates(policy = {}) {
  return [...(policy.requiredChecks ?? [])];
}
