const GATES = {
  'task-check': { command: (taskId) => `npm run agent:task-check -- --task ${taskId}` },
  'notes-check': { command: (taskId) => `node scripts/agent/validate-notes.js --task ${taskId}` },
  boundary: { command: () => 'npm run check:boundary' },
  unit: { command: () => 'npm test' },
  e2e: { command: (taskId) => `npm run agent:e2e -- --task ${taskId}` },
  'shell-smoke': { command: () => 'npm run test:e2e -- --grep shell' },
  'visual-review': { command: () => 'MANUAL: 记录视觉基线判断', manual: true },
  build: { command: () => 'npm run build' },
  'owner-review': { command: () => 'MANUAL: 记录 framework owner review', manual: true },
  'scripts-unit': { command: () => 'npm test' },
  'failure-paths': { command: () => 'npm test' },
  'web-regression': { command: () => 'npm run test:e2e' },
  'rust-check': { command: () => 'cargo check --manifest-path src-tauri/Cargo.toml' },
  'permission-check': { command: () => 'MANUAL: 记录 Tauri 权限检查', manual: true },
  'desktop-manual': { command: () => 'MANUAL: 记录真实 Windows 桌面验证', manual: true },
  'version-consistency': { command: () => 'node scripts/agent/check-version.js' },
  'user-confirmation': { command: () => 'MANUAL: 记录用户发版确认', manual: true },
};

export const GATE_REGISTRY = Object.fromEntries(
  Object.entries(GATES).map(([gate, definition]) => [gate, { ...definition, commandId: gate }]),
);

export function gateDefinition(gate, taskId) {
  const definition = GATE_REGISTRY[gate];
  if (!definition) throw new Error(`未注册 gate: ${gate}`);
  return {
    gate,
    command: definition.command(taskId),
    commandId: definition.commandId,
    manual: definition.manual === true,
  };
}
