import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const skills = [
  'evolve-start-task',
  'evolve-plan-task',
  'evolve-implement-task',
  'evolve-verify-change',
  'evolve-review-change',
];

describe('EWP native skill layout', () => {
  test.each(skills)('%s has the required contract sections', (name) => {
    const path = resolve(process.cwd(), `.agents/skills/${name}/SKILL.md`);
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf8');
    for (const heading of ['## Trigger', '## Inputs', '## Outputs', '## Stop conditions', '## Source of truth']) {
      expect(content).toContain(heading);
    }
  });
});
