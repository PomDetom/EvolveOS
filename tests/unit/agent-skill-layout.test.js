import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const legacySkills = [
  'evolve-start-task',
  'evolve-plan-task',
  'evolve-implement-task',
  'evolve-verify-change',
  'evolve-review-change',
];
const operationSkills = [
  'evolve-worktree',
  'evolve-pre-push-checks',
  'evolve-code-review',
  'evolve-agent-note',
  'evolve-merge-to-dev',
  'evolve-release',
];

describe('EWP v2.2 native skill layout', () => {
  test.each(legacySkills)('%s is no longer an active skill', (name) => {
    const path = resolve(process.cwd(), `.agents/skills/${name}/SKILL.md`);
    expect(existsSync(path)).toBe(false);
  });

  test.each(operationSkills)('%s remains an operation skill', (name) => {
    const path = resolve(process.cwd(), `.agents/skills/${name}/SKILL.md`);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8')).toContain('# ');
  });

  test('active skills do not define the legacy lifecycle vocabulary', () => {
    const root = resolve(process.cwd(), '.agents/skills');
    const activeContent = operationSkills
      .map((name) => readFileSync(resolve(root, name, 'SKILL.md'), 'utf8'))
      .join('\n');

    expect(activeContent).not.toMatch(/\b(?:planned|implementing|verifying|reviewing|ready)\b/i);
  });
});
