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

export function assessBranchChanges(branch, files) {
  const appMatch = branch.match(/^app\/([^/]+)\//); // app/<id>/<name>
  const isUi = /^ui\//.test(branch);
  const inFramework = (f) =>
    FRAMEWORK_PREFIXES.some((p) => f.startsWith(p)) || FRAMEWORK_FILE_RE.some((r) => r.test(f));

  if (appMatch) {
    const appId = appMatch[1];
    const allowed = (f) =>
      f.startsWith(`src/apps/${appId}/`) || // 本应用目录
      /^tests\/(unit|e2e)\//.test(f) ||     // 测试
      f.startsWith('docs/');                // 文档
    const violations = files.filter((f) => !allowed(f));
    return {
      kind: 'app',
      ok: violations.length === 0,
      violations,
      note: violations.length === 0 ? '应用改动，边界通过' : `应用改动触碰边界外文件 ${violations.length} 个`,
    };
  }

  if (isUi) {
    return { kind: 'ui', ok: true, violations: [], note: '框架改动：须全量回归 + 框架 owner 评审' };
  }

  const violations = files.filter((f) => inFramework(f));
  return {
    kind: 'mixed',
    ok: violations.length === 0,
    violations,
    note: violations.length === 0 ? '非应用/框架前缀分支，边界通过' : '未知分支触碰框架文件',
  };
}
