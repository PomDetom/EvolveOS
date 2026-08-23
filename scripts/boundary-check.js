// 框架/应用边界评估纯函数（Task G2）—— CLI（scripts/check-boundary.js）与单测共用。
// 框架路径（应用禁止触碰）：壳 + 组件 + 样式 + 配置 + 场景 + 展示 + 动效 + 资产 + 构建配置。
export const FRAMEWORK_PREFIXES = [
  'src/components/', 'src/styles/', 'src/config/', 'src/app/',
  'src/scenes/', 'src/demo/', 'src/motion/', 'src/assets/',
];
// 仓库根框架文件：构建/入口/锁文件（应用禁止触碰）。
export const FRAMEWORK_FILE_RE = [
  /^vite\.config/, /^vitest\.config/, /^index\.html/,
  /^package\.json/, /^package-lock\.json/, /^playwright\.config/,
];
// —— 并行治理（2026-08-12）：前缀全集 + 分支名校验 + 基分支跳过 ——
// 文档分支允许：docs/ 目录 + 仓库根 *.md（README/CHANGELOG/CLAUDE）。
const ROOT_MD_RE = /^[^/]+\.md$/;
// 维护分支允许：scripts/ tests/ src-tauri/ + 锁文件/.gitignore/package.json/构建配置（不碰 src/）。
const CHORE_PREFIXES = ['scripts/', 'tests/', 'src-tauri/', '.agents/', '.github/'];
const CHORE_FILE_RE = [
  /\.lock$/, /^package-lock\.json$/, /^\.gitignore$/, /^package\.json$/,
  /^vite\.config/, /^vitest\.config/, /^playwright\.config/,
  /^AGENTS\.md$/, /^README\.md$/, /^CHANGELOG\.md$/, /^CLAUDE\.md$/,
  /^docs\/AGENTS\.md$/, /^src\/AGENTS\.md$/,
];

export function assessBranchChanges(branch, files) {
  // 基分支（dev/main）不是特性分支，跳过门禁
  if (branch === 'dev' || branch === 'main') {
    return { kind: 'base', ok: true, violations: [], note: '基分支，跳过门禁' };
  }
  const appMatch = branch.match(/^app\/([^/]+)\//); // app/<id>/<name>
  if (appMatch) {
    const appId = appMatch[1];
    const allowed = (f) =>
      f.startsWith(`src/apps/${appId}/`) || // 本应用目录
      /^tests\/(unit|e2e)\//.test(f) ||     // 测试
      f.startsWith('docs/') ||              // 文档
      f.startsWith('.agents/tasks/') ||     // recovery manifest
      f.startsWith('.agents/notes/');      // shared decisions
    const violations = files.filter((f) => !allowed(f));
    return {
      kind: 'app',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '应用改动，边界通过' : `应用改动触碰边界外文件 ${violations.length} 个`,
    };
  }

  if (/^(?:ui|framework)\//.test(branch)) {
    const allowed = (f) => FRAMEWORK_PREFIXES.some((prefix) => f.startsWith(prefix))
      || /^tests\/(unit|e2e)\//.test(f) || f.startsWith('docs/') || f.startsWith('.agents/tasks/') || f.startsWith('.agents/notes/') || f === 'AGENTS.md' || f === 'docs/AGENTS.md';
    const violations = files.filter((f) => !allowed(f));
    return { kind: 'framework', ok: violations.length === 0, violations, note: violations.length === 0 ? '框架改动，边界通过' : `框架分支触碰边界外文件 ${violations.length} 个` };
  }

  if (/^native\//.test(branch)) {
    const allowed = (f) => f.startsWith('src-tauri/') || /^tests\/(unit|e2e)\//.test(f)
      || f.startsWith('docs/') || f.startsWith('.agents/tasks/') || f.startsWith('.agents/notes/') || f === 'AGENTS.md' || f === 'src-tauri/AGENTS.md';
    const violations = files.filter((f) => !allowed(f));
    return { kind: 'native', ok: violations.length === 0, violations, note: violations.length === 0 ? 'native 改动，边界通过' : `native 分支触碰边界外文件 ${violations.length} 个` };
  }

  if (/^docs\//.test(branch)) {
    const violations = files.filter((f) => !(f.startsWith('docs/') || ROOT_MD_RE.test(f)));
    return {
      kind: 'docs',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '文档改动，边界通过' : `文档分支触碰非文档文件 ${violations.length} 个`,
    };
  }

  if (/^chore\//.test(branch)) {
    const inChore = (f) =>
      CHORE_PREFIXES.some((p) => f.startsWith(p)) || CHORE_FILE_RE.some((r) => r.test(f));
    const violations = files.filter((f) => !inChore(f));
    return {
      kind: 'chore',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '维护改动，边界通过' : `维护分支触碰非维护文件 ${violations.length} 个`,
    };
  }

  if (/^hotfix\//.test(branch)) {
    return { kind: 'hotfix', ok: true, violations: [], note: '紧急修复：合并 main 后必须同步回 dev + main 全量回归' };
  }

  // 未知前缀：分支名不合规（不再按 mixed 检查文件，直接 fail 给示例）
  return {
    kind: 'invalid',
    ok: false,
    violations: [branch],
    note: '分支名不合规，须用 app/<id>/<name> | ui/<name> | native/<name> | framework/<name> | docs/<name> | chore/<name> | hotfix/<name>',
  };
}
