import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { attestationScopeHash, validateHumanAttestation } from '../../scripts/agent/attestation.js';
import { artifactRole, classifyArtifacts } from '../../scripts/agent/change-artifacts.js';
import { evaluateChangePolicy } from '../../scripts/agent/change-policy.js';
import { buildChangeSnapshot } from '../../scripts/agent/change-scope.js';
import { deriveBranchName } from '../../scripts/agent/start-task.js';
import { findIntegratedTask, summarizeTaskStatus } from '../../scripts/agent/status.js';
import { checkPermissionSchemas } from '../../scripts/agent/permission-schema-check.js';
import { GATE_REGISTRY } from '../../scripts/agent/gate-registry.js';
import { assessBranchChanges } from '../../scripts/boundary-check.js';
import { buildIntegrationMessage } from '../../scripts/merge-to-dev.js';
import { evaluateNativeReadiness, reviewReadiness } from '../../scripts/merge-to-dev-agent-utils.js';
import { isAncestor, isAllowedTrailingArtifact, resolveSubjectSnapshot, subjectBindingIssues, trailingArtifactIssues } from '../../scripts/agent/subject-artifact.js';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function makeFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ewp-v221-artifacts-'));
  const taskDirectory = '.agents/tasks/2026/EV-025-fixture';
  git(root, ['init', '-b', 'dev']);
  git(root, ['config', 'user.email', 'ewp@example.com']);
  git(root, ['config', 'user.name', 'EWP Test']);
  git(root, ['config', 'core.autocrlf', 'false']);
  writeFileSync(path.join(root, 'README.md'), 'base\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  git(root, ['switch', '-c', 'native/fixture']);
  mkdirSync(path.join(root, 'src-tauri', 'capabilities'), { recursive: true });
  writeFileSync(path.join(root, 'src-tauri', 'native.rs'), 'created\n');
  writeFileSync(path.join(root, 'src-tauri', 'capabilities', 'default.json'), '{"identifier":"default","permissions":["core:default"]}\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'subject code A']);
  return { root, taskDirectory };
}

function commitTrailing(root, relativePath, content) {
  const file = path.join(root, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', `trailing ${relativePath}`]);
}

describe('EWP v2.2.1 artifact semantics', () => {
  test('assigns governance, subject, decision and sidecar roles before docs suffix rules', () => {
    expect(artifactRole('AGENTS.md')).toBe('governance');
    expect(artifactRole('.agents/skills/foo/SKILL.md')).toBe('governance');
    expect(artifactRole('.agents/notes/implemented/process/note.md')).toBe('decision');
    expect(artifactRole('.agents/tasks/2026/EV-025/task.json')).toBe('sidecar');
    expect(artifactRole('.agents/tasks/2026/EV-025/evil.js')).toBe('other');
    expect(artifactRole('src/apps/notes/index.js')).toBe('subject');
    expect(classifyArtifacts(['src/apps/notes/index.js', '.agents/tasks/2026/EV-025/task.json']).subjectPaths)
      .toEqual(['src/apps/notes/index.js']);
  });

  test('app subject plus task sidecar stays app-local policy risk', () => {
    const policy = evaluateChangePolicy({ changedPaths: ['src/apps/notes/index.js', '.agents/tasks/2026/EV-025/task.json'], snapshot: { branch: 'app/notes/example' } });
    expect(policy.classification.primary).toBe('app');
    expect(policy.classification.surfaces).toEqual(['app']);
    expect(policy.requiresTask).toBe(false);
    expect(policy.requiredChecks).toEqual(['unit', 'app-e2e', 'build']);
    const subjectOnly = evaluateChangePolicy({ changedPaths: ['src/apps/notes/index.js'], snapshot: { branch: 'app/notes/example' } });
    expect(policy.policyHash).toBe(subjectOnly.policyHash);
    const unknownTaskArtifact = evaluateChangePolicy({ changedPaths: ['.agents/tasks/2026/EV-025/evil.js'], snapshot: { branch: 'chore/example' } });
    expect(unknownTaskArtifact.requiresTask).toBe(true);
  });

  test('tauri kind maps to native and legacy ui uses framework boundary', () => {
    expect(deriveBranchName({ kind: 'tauri', title: 'Native shell' })).toBe('native/native-shell');
    expect(deriveBranchName({ kind: 'ui', title: 'Framework shell' })).toBe('framework/framework-shell');
    expect(assessBranchChanges('ui/legacy-shell', ['src/components/button/button.css']).kind).toBe('framework');
    expect(assessBranchChanges('ui/legacy-shell', ['src/apps/notes/index.js']).ok).toBe(false);
    expect(isAllowedTrailingArtifact('.agents/tasks/2026/EV-025/attestations/desktop-manual.json', '.agents/tasks/2026/EV-025')).toBe(true);
    expect(isAllowedTrailingArtifact('.agents/tasks/2026/EV-025/attestations/nested/desktop-manual.json', '.agents/tasks/2026/EV-025')).toBe(false);
  });

  test('permission schema is mechanical and gate registry has no manual entries', () => {
    expect(checkPermissionSchemas(process.cwd())).toMatchObject({ ok: true });
    expect(Object.values(GATE_REGISTRY).every((gate) => gate.manual !== true)).toBe(true);
    expect(readFileSync('scripts/agent/gate-registry.js', 'utf8')).not.toMatch(/MANUAL:/);
  });

  test('review readiness binds subject fingerprint and policy hash', () => {
    const subjectHead = 'a'.repeat(40);
    const subjectFingerprint = 'b'.repeat(64);
    const policyHash = 'c'.repeat(64);
    const review = {
      subjectHead,
      subjectFingerprint,
      policyHash,
      reviewer: 'Independent reviewer',
      reviewTime: '2026-08-23T10:00:00.000Z',
      result: 'approved',
      findings: { critical: [], important: [] },
    };
    expect(reviewReadiness({ review, headSha: subjectHead, reviewFingerprint: subjectFingerprint, policyHash, required: true }))
      .toEqual({ ok: true, issues: [] });
    expect(reviewReadiness({ review: { ...review, policyHash: 'd'.repeat(64) }, headSha: subjectHead, reviewFingerprint: subjectFingerprint, policyHash, required: true }).issues)
      .toContain('review policyHash 过期或缺失');
    const staleReview = evaluateNativeReadiness({
      task: { schemaVersion: 2, id: 'EV-025', branch: 'chore/example', recovery: { state: 'active' } },
      taskBranch: 'chore/example', branchHead: subjectHead, currentHeadSha: 'd'.repeat(40),
      policy: { policyHash, requiresTask: true, requiresReview: true, requiredChecks: [] },
      policyHash, review, reviewFingerprint: subjectFingerprint, requireEvidence: false,
    });
    expect(staleReview.ok).toBe(false);
    expect(staleReview.issues).toContain('review subjectHead 不等于待合入分支 HEAD');
  });

  test('trailing attestation after subject commit is accepted, code after it is stale', () => {
    const { root, taskDirectory } = makeFixture();
    try {
      const subjectHead = git(root, ['rev-parse', 'HEAD']);
      const subjectSnapshot = resolveSubjectSnapshot(root, { base: 'dev', subjectHead });
      const policy = evaluateChangePolicy({ snapshot: subjectSnapshot });
      const attestation = {
        schemaVersion: 1,
        type: 'human',
        name: 'desktop-manual',
        subjectHead,
        subjectFingerprint: subjectSnapshot.changeFingerprint,
        policyHash: policy.policyHash,
        scopeHash: attestationScopeHash({ policyHash: policy.policyHash, snapshot: subjectSnapshot }),
        confirmedBy: 'Windows QA',
        confirmedAt: '2026-08-23T10:00:00.000Z',
      };
      const attestationPath = path.join(root, taskDirectory, 'attestations', 'desktop-manual.json');
      const directory = path.dirname(attestationPath);
      mkdirSync(directory, { recursive: true });
      writeFileSync(attestationPath, `${JSON.stringify(attestation, null, 2)}\n`);
      git(root, ['add', '.']);
      git(root, ['commit', '-m', 'trailing attestation B']);
      const currentSnapshot = buildChangeSnapshot(root, 'dev', 'HEAD');

      expect(isAncestor(root, subjectHead, 'HEAD')).toBe(true);
      expect(subjectBindingIssues(attestation, { subjectSnapshot, policyHash: policy.policyHash })).toEqual([]);
      expect(validateHumanAttestation(attestation, { policyHash: policy.policyHash, subjectSnapshot, currentSnapshot, name: 'desktop-manual' }))
        .toEqual({ ok: true, errors: [] });
      expect(trailingArtifactIssues(root, { subjectHead, branch: 'HEAD', taskDirectory })).toMatchObject({ ok: true, issues: [] });

      writeFileSync(path.join(root, 'src-tauri', 'native.rs'), 'subject code C\n');
      git(root, ['add', '.']);
      git(root, ['commit', '-m', 'subject code C']);
      expect(trailingArtifactIssues(root, { subjectHead, branch: 'HEAD', taskDirectory }).ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('current task review is an allowed trailing artifact', () => {
    const { root, taskDirectory } = makeFixture();
    try {
      const subjectHead = git(root, ['rev-parse', 'HEAD']);
      commitTrailing(root, `${taskDirectory}/review.md`, '# independent review\n');
      expect(trailingArtifactIssues(root, { subjectHead, branch: 'HEAD', taskDirectory })).toMatchObject({ ok: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test.each([
    ['task.json', '{"schemaVersion":2}\n'],
    ['plan.md', '# changed plan\n'],
    ['.agents/notes/implemented/process/decision.md', '# changed Note\n'],
    ['src-tauri/native.rs', 'changed code\n'],
    ['.agents/tasks/2026/EV-999-other/review.md', '# other task review\n'],
    ['.agents/tasks/2026/EV-025-fixture/attestations/nested/desktop-manual.json', '{}\n'],
  ])('rejects forbidden trailing change: %s', (relativePath, content) => {
    const { root, taskDirectory } = makeFixture();
    try {
      const subjectHead = git(root, ['rev-parse', 'HEAD']);
      const target = relativePath.includes('/') ? relativePath : `${taskDirectory}/${relativePath}`;
      commitTrailing(root, target, content);
      expect(trailingArtifactIssues(root, { subjectHead, branch: 'HEAD', taskDirectory }).issues)
        .toContain(`subject 之后存在不允许的 trailing artifact: ${target}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test.each([
    ['subjectHead', 'c'.repeat(40), 'subjectHead 与 subject snapshot 不一致'],
    ['subjectFingerprint', 'd'.repeat(64), 'subjectFingerprint 与 subject snapshot 不一致'],
    ['policyHash', 'e'.repeat(64), 'policyHash 与 subject policy 不一致'],
  ])('rejects drifted trailing attestation %s', (field, value, issue) => {
    const { root, taskDirectory } = makeFixture();
    try {
      const subjectHead = git(root, ['rev-parse', 'HEAD']);
      const subjectSnapshot = resolveSubjectSnapshot(root, { base: 'dev', subjectHead });
      const policy = evaluateChangePolicy({ snapshot: subjectSnapshot });
      const attestation = {
        schemaVersion: 1,
        type: 'human',
        name: 'desktop-manual',
        subjectHead,
        subjectFingerprint: subjectSnapshot.changeFingerprint,
        policyHash: policy.policyHash,
        scopeHash: attestationScopeHash({ policyHash: policy.policyHash, snapshot: subjectSnapshot }),
        confirmedBy: 'Windows QA',
        confirmedAt: '2026-08-23T10:00:00.000Z',
        [field]: value,
      };
      commitTrailing(root, `${taskDirectory}/attestations/desktop-manual.json`, `${JSON.stringify(attestation, null, 2)}\n`);
      expect(subjectBindingIssues(attestation, { subjectSnapshot, policyHash: policy.policyHash })).toContain(issue);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('merged task status is recovered from Git trailers without lifecycle state', () => {
    const { root } = makeFixture();
    try {
      const sourceHead = git(root, ['rev-parse', 'native/fixture']);
      git(root, ['switch', 'dev']);
      git(root, ['commit', '--allow-empty', '-m', `Task: EV-026\n\nSource-Branch: native/fixture\nSource-Head: ${sourceHead}`]);
      expect(findIntegratedTask(root, 'EV-026')).toBeNull();
      git(root, ['merge', '--no-ff', 'native/fixture', '-m', buildIntegrationMessage('merge: fixture 合入 dev', {
        taskId: 'EV-025', branch: 'native/fixture', sourceHead,
      })]);
      const integration = findIntegratedTask(root, 'EV-025');
      expect(integration).toMatchObject({ integrated: true, sourceBranch: 'native/fixture', sourceHead });
      expect(summarizeTaskStatus({
        task: { id: 'EV-025', branch: 'native/fixture', recovery: { state: 'active' } },
        currentBranch: 'dev',
        integration,
      })).toMatchObject({ integrated: true, merged: true, resumable: false });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
