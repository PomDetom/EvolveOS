import { describe, expect, test } from 'vitest';
import { selectGates } from '../../scripts/agent/select-gates.js';

describe('agent:gates', () => {
  test('docs 无 Note 只选择 task-check 与 build', () => {
    expect(selectGates({ kind: 'docs', changedPaths: ['docs/spec.md'], hasNotes: false }))
      .toEqual(['task-check', 'build']);
  });

  test('docs 有 Note 增加 notes-check', () => {
    expect(selectGates({ kind: 'docs', changedPaths: ['docs/spec.md'], hasNotes: true }))
      .toEqual(['task-check', 'notes-check', 'build']);
  });

  test('单应用选择 boundary、相关 unit/e2e、shell smoke、build', () => {
    expect(selectGates({ kind: 'app', changedPaths: ['src/apps/notes/index.js', 'tests/unit/notes.test.js'] }))
      .toEqual(['boundary', 'unit', 'e2e', 'shell-smoke', 'build']);
  });

  test('framework 选择视觉判断和 owner review', () => {
    expect(selectGates({ kind: 'ui', changedPaths: ['src/components/button/button.css'] }))
      .toEqual(['boundary', 'unit', 'e2e', 'visual-review', 'build', 'owner-review']);
  });

  test('scripts、Tauri、release 各自选择专属 gate', () => {
    expect(selectGates({ kind: 'chore', changedPaths: ['scripts/agent/status.js'] }))
      .toEqual(['scripts-unit', 'failure-paths', 'build']);
    expect(selectGates({ kind: 'chore', changedPaths: ['src-tauri/src/main.rs'] }))
      .toEqual(['web-regression', 'rust-check', 'permission-check', 'desktop-manual']);
    expect(selectGates({ kind: 'chore', changedPaths: ['package.json', 'scripts/release.js'], taskKind: 'release' }))
      .toEqual(['unit', 'e2e', 'build', 'version-consistency', 'user-confirmation']);
  });

  test('非法分支分类返回 boundary gate，阻止自由猜测', () => {
    expect(selectGates({ kind: 'invalid', changedPaths: ['src/app.js'] })).toEqual(['boundary']);
  });
});
