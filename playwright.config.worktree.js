import { defineConfig } from '@playwright/test';
import { buildWorktreePlaywrightConfig, resolveTaskE2EPaths } from './scripts/agent/e2e.js';

const rootDir = process.cwd();
const taskId = process.env.EWP_TASK_ID || 'adhoc';
const port = Number(process.env.EWP_E2E_PORT || 5174);
const paths = resolveTaskE2EPaths({ rootDir, taskId });

export default defineConfig(buildWorktreePlaywrightConfig(paths, { port }));
