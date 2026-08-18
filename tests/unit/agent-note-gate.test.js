import { describe, expect, test } from 'vitest';
import { evaluateNoteRequirement } from '../../scripts/agent/note-gate.js';

describe('Agent Note requirement', () => {
  test('feature code without Note is blocked', () => {
    const report = evaluateNoteRequirement({
      task: { kind: 'feature', notes: [] },
      changedPaths: ['src/apps/token-tool/index.js'],
      notePaths: [],
      status: 'ready',
    });
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toContain('Agent Note');
  });

  test('task and Note-only changes are exempt from a second Note', () => {
    const report = evaluateNoteRequirement({
      task: { kind: 'chore', notes: [] },
      changedPaths: ['.agents/tasks/2026/EWP-010-demo/task.json', '.agents/notes/implemented/process/example.md'],
      notePaths: [],
      status: 'ready',
    });
    expect(report).toMatchObject({ ok: true, required: false, issues: [] });
  });

  test('ready feature requires implemented Note', () => {
    const report = evaluateNoteRequirement({
      task: { kind: 'feature', notes: ['.agents/notes/proposed/feature/example.md'] },
      changedPaths: ['src/apps/token-tool/index.js'],
      notePaths: ['.agents/notes/proposed/feature/example.md'],
      noteLifecycles: { '.agents/notes/proposed/feature/example.md': 'proposed' },
      status: 'ready',
    });
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toContain('implemented');
  });

  test('implemented Note satisfies ready feature', () => {
    const report = evaluateNoteRequirement({
      task: { kind: 'tauri', notes: ['.agents/notes/implemented/feature/example.md'] },
      changedPaths: ['src-tauri/src/adapters/codex.rs'],
      notePaths: ['.agents/notes/implemented/feature/example.md'],
      noteLifecycles: { '.agents/notes/implemented/feature/example.md': 'implemented' },
      status: 'ready',
    });
    expect(report).toMatchObject({ ok: true, required: true, issues: [] });
  });

  test('任务引用了不存在的 Note 时阻断', () => {
    const report = evaluateNoteRequirement({
      task: { kind: 'feature', notes: ['.agents/notes/implemented/feature/missing.md'] },
      changedPaths: ['src/apps/token-tool/index.js'],
      notePaths: ['.agents/notes/implemented/feature/missing.md'],
      existingNotePaths: [],
      noteLifecycles: { '.agents/notes/implemented/feature/missing.md': 'implemented' },
      status: 'ready',
    });
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toContain('文件不存在');
  });
});
