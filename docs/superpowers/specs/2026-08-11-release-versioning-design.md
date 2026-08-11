# 发版流程与版本治理设计规格

- **日期**: 2026-08-11
- **前置**: tokenTool 迁移完成并合并 main+dev（dev = main = 0.1.0）；远端推送准备完成（.gitignore / README / AGENTS.md / 关于页）
- **来源**: 用户「完善发版流程，现有分支合并策略并不完善，版本号也不是很完善」逐项澄清确认
- **目标**: ① 版本号单源 + 四处同步不漂移 ② 固化 feature→dev→main 分支合并策略 ③ 半自动发版流程（bump + CHANGELOG + tag）
- **仓库**: `C:\Repository\EvolveOS`（main + dev 双分支）

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 版本号方案 | **Semver**（MAJOR.MINOR.PATCH，当前 0.1.0）；package.json 为唯一版本源 |
| 版本同步 | **About 页动态读**（Vite `define: __APP_VERSION__`）+ **`npm run set-version -- X.Y.Z`** 脚本同步 3 个 manifest |
| 发版触发 | **`npm run release -- [patch|minor|major]`** 半自动脚本（bump → CHANGELOG → 快速门禁 → 提交 → 打印后续步骤） |
| 分支合并 | **feature→dev→main**（固化规范）：feature 只合 dev；dev 稳定 `--no-ff` 合 main（=一次发版）；hotfix 直合 main 再回 dev；docs 也走 dev |
| Tag 约定 | **`vX.Y.Z`**（替换治理规格里的 `ui/vX.Y.Z`）；首次基线 **`v0.1.0`**（对应当前 main 状态） |

## 2. 版本号治理

### 2.1 Semver + 单源

- 版本格式 `MAJOR.MINOR.PATCH`。package.json `version` 为**唯一事实源**。
- 当前所有版本 `0.1.0` 保持一致。

### 2.2 About 页动态化（永不漂移）

- `vite.config.js` 加：
  ```js
  import { readFileSync } from 'node:fs';
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
  // export default { ..., define: { __APP_VERSION__: JSON.stringify(pkg.version) } }
  ```
  （用 `readFileSync` 读，避免 ESM JSON import 语法在 Node 版本的差异。）
- `src/scenes/settings-window/settings-pages.js` aboutPage：`版本 0.1.0` → `版本 ${__APP_VERSION__}`。
- Vite `define` 对 dev/build/test（vitest 读 vite.config）均生效；About 页版本与 package.json 恒一致。

### 2.3 set-version 脚本

`npm run set-version -- X.Y.Z` → `scripts/set-version.js`：
- 校验入参 `^\d+\.\d+\.\d+$`。
- 写 `package.json`（`version`）、`src-tauri/Cargo.toml`（`version = "X.Y.Z"`）、`src-tauri/tauri.conf.json`（`version`）三处。
- 打印改动摘要。
- Cargo.lock 的 `app` 包版本由随后的 `cargo check`/`cargo test` 自动同步（发版流程必跑 cargo test，锁不会滞留陈旧）。

## 3. 分支合并策略（固化）

```
ui/* · app/<id>/* ──merge──▶ dev ──(--no-ff) merge──▶ main ──tag──▶ vX.Y.Z
      ▲                                ▲
      │                                └─ hotfix/* 直合 main 后再回 dev
      └─ 全部从 dev 检出；docs/CLAUDE.md/README 也走 dev
```

- **main**：稳定可发版。**只接受** dev 的 `--no-ff` 合入（=一次发版）+ `hotfix/*` 直合（紧急修复，随后同步回 dev）。
- **dev**：集成分支。feature（`ui/*`、`app/<id>/*`）从 dev 检出、只合 dev；合并前 app 分支跑 `npm run check:boundary`（dev 追平 main 后，default 范围 `dev...HEAD` 正确反映 app 分支改动）。
- **docs**（CLAUDE.md/README/规格/账本等）也经 dev 合入，main 不直接收 docs 提交（除 hotfix）——修正此前 docs 直推 main 的偏差。
- **每次 dev→main 前全量回归**（npm test + npm run test:e2e + npm run build + cargo test），合并后打 tag `vX.Y.Z`，然后删已合并的 feature 分支。
- **首次基线**：main 当前 0.1.0，打 `v0.1.0`。

## 4. 发版流程（npm run release）

`npm run release -- [patch|minor|major]`（默认 patch）→ `scripts/release.js`：

1. **bump**：读 package.json 当前版本 → semver 递增（patch/minor/major）→ 调 set-version 逻辑同步 3 manifest。
2. **CHANGELOG**：根目录 `CHANGELOG.md`（Keep a Changelog 风格）追加 `## [X.Y.Z] - YYYY-MM-DD` 条目；自动从 `git log <上次tag>..dev --oneline` 取提交作草稿条目（`- <commit subject>`），并加分类占位（Added/Changed/Fixed）供人工整理；无上次 tag 时用 `git log` 首个提交到 dev。
3. **快速门禁**：`npm test` + `npm run build`；任一失败则中止发版并回显错误（版本已 bump、CHANGELOG 已写——提示回滚或修复后继续）。
4. **提交** `chore: release vX.Y.Z`（含 3 manifest + CHANGELOG）。
5. **打印后续步骤**（不自动执行）：
   ```
   ① npm run test:e2e（全量 e2e）
   ② 确认后：git checkout main && git merge dev --no-ff -m "release: vX.Y.Z"
   ③ git tag vX.Y.Z
   ④ git push origin main --tags && git push origin dev
   ```

**脚本不自动 merge/tag**（发版是人工/控制器确认动作）。`npm run set-version` 独立可用。

## 5. 落地清单

| 类别 | 文件 | 内容 |
|---|---|---|
| 脚本 | `scripts/set-version.js` | 同步 3 manifest 版本 |
| 脚本 | `scripts/release.js` | bump + CHANGELOG + 快速门禁 + 提交 + 打印步骤 |
| 框架 | `vite.config.js` | `define.__APP_VERSION__` |
| 框架 | `src/scenes/settings-window/settings-pages.js` | About 页 `版本 ${__APP_VERSION__}` |
| 新文档 | `CHANGELOG.md` | `[0.1.0]` 条目（当前里程碑：tokenTool 迁移 + 推送准备） |
| 新文档 | `docs/superpowers/specs/2026-08-11-release-versioning-design.md` | 本规格 |
| 文档更新 | `CLAUDE.md` | 铁律补：分支策略、发版流程、版本单源、set-version/release 命令 |
| 文档更新 | `docs/CLAUDE.md` | SDD 流程补发版步骤（dev→main 全量回归 + tag） |
| 文档更新 | `docs/superpowers/specs/2026-08-09-app-shell-dev-governance-design.md` | tag 约定 `ui/vX.Y.Z`→`vX.Y.Z`、合并流对齐 |
| 文档更新 | `README.md` | 命令表补 `release`/`set-version` |
| git | main | 打 tag `v0.1.0` |

## 6. 验证

- 脚本单测：`scripts/set-version.js` / `release.js` 的纯函数（semver 递增、manifest 读写）用 node 直测或拆分纯函数。
- `npm run build` + `npm test`（vite define 生效、About 页版本渲染）。
- e2e：app-shell（设置→关于页显示版本）、token-tool 不回归。
- 演练：在发版分支真实执行 `npm run release -- patch`（0.1.0 → 0.1.1），确认 bump/CHANGELOG/门禁/提交链路，然后作为首次发版流程基准（具体 0.1.1 是否保留由用户定，设计默认保留为下次发版基线）。

## 7. 范围外（YAGNI）

- CI/CD（无远端，暂不引入）。
- 自动生成 CHANGELOG 完整文案（草稿 + 人工整理）。
- 版本号注入 Tauri 窗口标题 / 安装包元数据（tauri.conf.json productName/identifier 不动，仅 version 同步）。
- 自动 merge/tag（保持人工确认）。
