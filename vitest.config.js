import { defineConfig } from 'vitest/config';

// EWP v1 tests assert the retired status/approval/baseline/activity FSM.
// Keep them in-tree for historical audit; v2 gates run the repository-native
// suite and the dedicated v2 contract tests instead.
const legacyWorkflowTests = [
  'tests/unit/agent-8c.test.js',
  'tests/unit/agent-8d.test.js',
  'tests/unit/agent-activity.test.js',
  'tests/unit/agent-approve.test.js',
  'tests/unit/agent-commit-guard.test.js',
  'tests/unit/agent-finish.test.js',
  'tests/unit/agent-gates.test.js',
  'tests/unit/agent-implement.test.js',
  'tests/unit/agent-note-gate.test.js',
  'tests/unit/agent-protocol.test.js',
  'tests/unit/agent-scope.test.js',
  'tests/unit/agent-start.test.js',
  'tests/unit/agent-status.test.js',
  'tests/unit/agent-task-ref.test.js',
  'tests/unit/agent-verify.test.js',
  'tests/unit/boundary-check.test.js',
  'tests/unit/merge-to-dev-agent.test.js',
  'tests/unit/merge-to-dev-entry.test.js',
];

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    exclude: legacyWorkflowTests,
    passWithNoTests: true,
  },
});
