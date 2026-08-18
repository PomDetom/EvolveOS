import { describe, expect, test } from 'vitest';
import { validateNote } from '../../scripts/agent/validate-notes.js';

const protocol = {
  noteClasses: ['architecture', 'process', 'testing', 'feature', 'bug-fix', 'simplification'],
};

const note = (overrides = {}) => ({
  notePath: '.agents/notes/proposed/process/example.md',
  content: `# Example

**Status:** proposed

**Class:** process

## Problem

problem

## Proposal

proposal

## Alternatives

- alternative

## Consequences/Risks

- risk
`,
  existingPaths: ['docs/spec.md'],
  protocol,
  ...overrides,
});

describe('EWP Agent Notes', () => {
  test('accepts a valid proposed Note', () => {
    expect(validateNote(note())).toEqual({ ok: true, errors: [] });
  });

  test('rejects a Note in an unknown lifecycle directory', () => {
    const result = validateNote(note({ notePath: '.agents/notes/drafts/process/example.md' }));
    expect(result.errors.join(' ')).toContain('目录');
  });

  test('rejects status and class that do not match closed sets', () => {
    const result = validateNote(note({ content: note().content.replace('proposed', 'implemented').replace('process', 'unknown') }));
    expect(result.errors.join(' ')).toContain('class');
    expect(result.errors.join(' ')).toContain('Status');
  });

  test('requires Alternatives', () => {
    const result = validateNote(note({ content: note().content.replace(/## Alternatives[\s\S]*?## Consequences\/Risks/, '## Consequences/Risks') }));
    expect(result.errors.join(' ')).toContain('Alternatives');
  });

  test('implemented Note must use Decision, not Proposal', () => {
    const content = note().content.replace('proposed', 'implemented');
    const result = validateNote(note({ notePath: '.agents/notes/implemented/process/example.md', content }));
    expect(result.errors.join(' ')).toContain('Decision');
  });

  test('rejects a relative link that does not exist', () => {
    const content = `${note().content}\nSee [missing](docs/missing.md).\n`;
    const result = validateNote(note({ content }));
    expect(result.errors.join(' ')).toContain('链接');
  });
});
