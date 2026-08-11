// npm run set-version -- X.Y.Z —— 同步版本号到 package.json / Cargo.toml / tauri.conf.json。
import { writeManifestVersions } from './version-utils.js';

const arg = process.argv[2];
if (!arg) {
  console.error('用法: npm run set-version -- <MAJOR.MINOR.PATCH>');
  process.exit(1);
}
try {
  const changed = writeManifestVersions(process.cwd(), arg);
  if (changed.length) console.log(`版本已同步为 ${arg}: ${changed.join(', ')}`);
  else console.log(`版本已是 ${arg}，无改动`);
} catch (err) {
  console.error(String(err.message ?? err));
  process.exit(1);
}
