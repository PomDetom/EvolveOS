const GATES = {
  boundary: { command: () => 'npm run check:boundary', description: '分支边界检查' },
  'docs-check': { command: () => 'node scripts/agent/docs-check.js', description: 'Markdown/JSON 文档链接和结构检查' },
  'notes-check': { command: () => 'npm run agent:notes-check', description: 'Agent Notes 格式检查' },
  unit: { command: () => 'npm test -- --configLoader runner --maxWorkers=1', description: '受影响单测（当前仓库 canonical runner）' },
  'app-e2e': { command: () => 'npm run test:e2e -- --grep shell', description: '应用壳/应用交互 smoke' },
  e2e: { command: () => 'npm run test:e2e', description: '完整 Playwright 矩阵' },
  'affected-smoke': { command: () => 'npm run test:e2e -- --grep shell', description: '受影响框架 smoke' },
  'shell-smoke': { command: () => 'npm run test:e2e -- --grep shell', description: '应用壳 smoke' },
  build: { command: () => 'npm run build', description: '生产构建' },
  'scripts-unit': { command: () => 'npm test -- --configLoader runner --maxWorkers=1', description: '脚本单测' },
  'workflow-fixture': { command: () => 'npm test -- --configLoader runner --maxWorkers=1', description: 'workflow fixture 单测' },
  'rust-check': { command: () => 'cargo check --manifest-path src-tauri/Cargo.toml', description: 'Tauri Rust check' },
  'web-contract': { command: () => 'npm test -- --configLoader runner --maxWorkers=1', description: '前端/Rust contract check' },
  'permission-schema-check': { command: () => 'node scripts/agent/permission-schema-check.js', description: 'Tauri capability JSON/schema 机械检查' },
  'version-consistency': { command: () => 'node scripts/agent/check-version.js', description: '版本一致性' },
};

export const GATE_REGISTRY = Object.fromEntries(Object.entries(GATES).map(([gate, definition]) => [gate, { ...definition, commandId: gate }]));

export function gateDefinition(gate, context = {}) {
  const definition = GATE_REGISTRY[gate];
  if (!definition) throw new Error(`未注册 gate: ${gate}`);
  const command = typeof definition.command === 'function' ? definition.command(context) : definition.command;
  return { gate, command, commandId: definition.commandId, manual: definition.manual === true, description: definition.description };
}

export function listGates() { return Object.keys(GATE_REGISTRY); }
