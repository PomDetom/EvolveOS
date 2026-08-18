// scripts/merge-to-dev-utils.js —— merge-to-dev 纯函数（无 git/CLI 副作用，可单测）。
// 按 boundary-check.js / check-boundary.js 同款拆分：纯逻辑与 CLI 分离，CLI（merge-to-dev.js）保留 shebang。

// 参数解析：<分支名> [--message "值" | --message=值] [--no-sync] [--no-cleanup]
export function parseArgs(argv) {
  let branch = null, message = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--message') message = argv[++i] ?? null;                       // --message "值"（空格形式）
    else if (a.startsWith('--message=')) message = a.slice('--message='.length); // --message=值
    else if (!branch && !a.startsWith('--')) branch = a;
  }
  return {
    branch,
    message: message || null,
    noSync: argv.includes('--no-sync'),
    noCleanup: argv.includes('--no-cleanup'),
  };
}
