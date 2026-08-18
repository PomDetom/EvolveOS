import { describe, expect, test } from 'vitest';
import { summarizeTaskStatus } from '../../scripts/agent/status.js';

const task = (status) => ({
  id: 'EWP-001',
  branch: 'chore/ewp-skeleton',
  status,
});

describe('EWP task status', () => {
  test('reports blocked task before merge', () => {
    expect(summarizeTaskStatus({
      task: task('blocked'),
      currentBranch: 'chore/ewp-task-schema',
      sourceIsDevAncestor: false,
    })).toMatchObject({ blocked: true, ready: false, merged: false });
  });

  test('reports ready task before merge', () => {
    expect(summarizeTaskStatus({
      task: task('ready'),
      currentBranch: 'chore/ewp-skeleton',
      sourceIsDevAncestor: false,
    })).toMatchObject({ blocked: false, ready: true, merged: false });
  });

  test('reports merged when source head is a dev ancestor', () => {
    expect(summarizeTaskStatus({
      task: task('ready'),
      currentBranch: 'dev',
      sourceIsDevAncestor: true,
    })).toMatchObject({ blocked: false, ready: true, merged: true });
  });
});
