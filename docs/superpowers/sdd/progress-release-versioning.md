# SDD 账本 — plan: docs/superpowers/plans/2026-08-11-release-versioning.md

> 执行留痕（唯一权威进度来源）。每任务：计划 / 工作内容 / 提交哈希 / 评审结论。
> 分支：`ui/release-process`（自 dev `b78214b` 检出）。设计规格：`docs/superpowers/specs/2026-08-11-release-versioning-design.md`。

## Global Constraints（执行期恒约束）

- 分支 `ui/release-process`；`check:boundary` 预期「框架改动：须全量回归 + 框架 owner 评审」。
- main 只收 dev 合入 + hotfix；docs 也走 dev；tag `vX.Y.Z`。
- 版本单源 package.json；`set-version` 同步 3 manifest；About 页动态读。
- `release` 半自动（不自动 merge/tag）。
- 脚本只用 Node 内置模块，零新 npm 依赖；`"type": "module"`。
- e2e 用 worktree 配置；JS 提交前 `npm run build`。

## Task 1: version-utils + set-version 脚本 + 单测

**计划**: 见 plan Task 1。version-utils.js 纯函数（parse/bump/manifest 读写）+ set-version.js CLI + 单测 + package.json `set-version` 脚本。

**工作内容**: version-utils.js 纯函数（parse/bump/manifest 读写）+ set-version.js CLI + 3 用例单测 + package.json `set-version` 脚本。TDD 红→绿；幂等烟雾 `node scripts/set-version.js 0.1.0` →「无改动」；真实 Cargo.toml/tauri.conf.json 版本未动。

**提交**: `a7dfa4a feat: 版本治理——version-utils 纯函数 + set-version 同步脚本（单测）`

**评审**: ✅ Approved（spec 合规，逐字节符合 brief，无 Critical/Important）。
- Task 1: minor (deferred): ① `writeManifestVersions` 对不匹配的 manifest 静默跳过（regex 未命中时只同步 2/3，靠 CLI 打印改动列表兜底——当前 3 个 regex 均正确命中，健壮性改进留待后续）。② `parseVersion` 接受前导零（`01.2.3`→`1.2.3`，装饰性）。

## Task 2: vite define __APP_VERSION__ + About 页动态版本

**计划**: 见 plan Task 2。vite.config 加 define + settings-pages aboutPage 版本动态化 + app-shell e2e 断言。

**工作内容**: vite.config.js 加 `readFileSync` 读 package.json + `define.__APP_VERSION__`；aboutPage `.csettings__ver` 改 `版本 ${__APP_VERSION__}`；app-shell.spec.js 末尾加「设置→关于」e2e（正则断言版本号）。build OK（bundle 无 `__APP_VERSION__` 残留）；新 e2e 通过。

**提交**: `2152147 feat: About 页版本动态读 package.json（vite define __APP_VERSION__）`

**评审**: ✅ Approved（spec 合规，3 文件逐字节符合 brief，nth(7)=about 经 APP_SECTIONS 核验）。无 Critical/Important/Minor。

## Task 3: release.js + CHANGELOG + 单测

**计划**: 见 plan Task 3。release.js（bump→CHANGELOG→门禁→提交→打印后续）+ CHANGELOG.md（[0.1.0]）+ 单测 + package.json `release` 脚本。

**工作内容**: release.js 全文落地（含 `isMain` CLI 守卫、collectCommits/formatChangelogEntry 纯函数导出）；CHANGELOG.md [0.1.0] 条目；3 用例单测（TDD 红→绿）；`release` 脚本加在 `set-version` 后。未实际运行 release（演练在 Task 5）。

**提交**: `848f783 feat: 半自动发版脚本 release.js + CHANGELOG（单测）`

**评审**: ✅ Approved（diff 与 brief 逐字一致，spec 合规）。评审子代理中途停止，两个 named-risk 项由控制器核实：
- ① `isMain` CLI 守卫在 Windows 相对路径调用下成立（Node v24 将 `process.argv[1]` 解析为绝对路径，URL 归一化后与 `import.meta.url` 匹配——探针实测 true）。
- ② `writeManifestVersions` 返回的相对路径（package.json / src-tauri/Cargo.toml / src-tauri/tauri.conf.json）可直接用于 `git add`。
无 Critical/Important/Minor。

## Task 4: 文档更新（CLAUDE.md / docs/CLAUDE.md / 治理规格 / README）

**计划**: 见 plan Task 4。CLAUDE.md（发版治理节 + 常用命令行）、docs/CLAUDE.md（发版步骤条）、治理规格（tag 约定 + main/hotfix 句）、README（命令表两行）。

**工作内容**: 4 文件逐字落地 brief。实现者适配：README 命令表无 `check:boundary` 行（brief 锚点错），两行改追加到表尾（tauri:build 之后）；治理规格 parenthetical 按 brief verbatim 追加（双括号，可读）。npm run build PASS。

**提交**: `789a329 docs: 固化分支/发版/版本治理规则（feature→dev→main + release/set-version）`

**评审**: ✅ Approved（spec 合规，4 文件逐字符合 brief、位置正确；README 锚点偏离为合理适配）。Minor（信息性）：治理规格双括号密度、README 命令表缺 `check:boundary` 行（brief 锚点过时，非本次缺陷）。

## Task 5: 收尾——tag v0.1.0 + 发版演练 + 全量回归 + 合并

**计划**: 见 plan Task 5。tag v0.1.0 → 演练 release -- patch → 全量回归 → 合并 dev/main。

**工作内容**（控制器执行）:
- 全量回归（分支）：npm test 91/91（含新 6 用例）、build、cargo test 11/11、全量 e2e 129/130（1 确认 flake：components-basic 按钮材质，隔离单跑通过）。
- 打首次基线 tag `v0.1.0`（main `3d6f4db`，当前 0.1.0 状态）。
- 发版演练 `node scripts/release.js patch`：版本 0.1.0 → 0.1.1（3 manifest），npm test+build 门禁通过，提交 `4aa9c4a chore: release v0.1.1`，脚本打印后续步骤。**演练中发现 2 个问题**：
  - ① CHANGELOG 草稿膨胀（328 行）：tag v0.1.0 在 main（含 main 独有 spec/plan 提交）对分支不可达 → `git describe` 失败 → release.js 回退「全历史」→ 手动收敛 [0.1.1] 条目（`86e3031`）。
  - ② release.js 门禁只跑 npm test+build，不跑 cargo → Cargo.lock 未随 bump 同步 → 手动 `cargo check` 同步（`57697ac`）。
- 合并：ui/release-process → dev（`30842eb` --no-ff）→ main（`deeb210` release --no-ff）；分支删除。
- main 定向门禁：npm test 91/91、build 通过（按用户反馈收敛验证，不再全量 e2e）。
- **验证策略改进**（用户反馈）：小改动不触碰共享逻辑时，验证收敛到定向测试 + build + cargo，全量回归仅用于框架/壳/共享逻辑变更——已记入项目 memory。

**提交**: `4aa9c4a`（release 演练）、`86e3031`（CHANGELOG 收敛）、`57697ac`（Cargo.lock 同步）、`30842eb`（merge dev）、`deeb210`（merge main release）

**评审**: 演练即真实运行，门禁通过；遗留 2 个 deferred 改进（见下）。

**Task 5: complete（commits 4aa9c4a..deeb210，tag v0.1.0 + 0.1.1 为下次发版基线）**

## 分支汇总（ui/release-process，b78214b..57697ac）

| Commit | 内容 |
|---|---|
| a7dfa4a | version-utils 纯函数 + set-version 同步脚本（单测） |
| 2152147 | About 页版本动态读 package.json（vite define __APP_VERSION__） |
| 848f783 | 半自动发版脚本 release.js + CHANGELOG（单测） |
| 789a329 | 固化分支/发版/版本治理规则（4 docs） |
| 4aa9c4a | release 演练：chore: release v0.1.1 |
| 86e3031 | CHANGELOG 0.1.1 条目收敛 |
| 57697ac | Cargo.lock 同步 0.1.1 |

## Deferred 改进（后续发版流程迭代）

- release.js 门禁加 `cargo check`（或直接更新 Cargo.lock），避免 bump 后锁滞留。
- release.js 在 tag 不可达时：改为报错提示「先打 tag」或限制 git log 范围（当前回退全历史导致 CHANGELOG 膨胀）。
- `writeManifestVersions` 对不匹配 manifest 静默跳过（Task 1 minor）——可改为校验三处都改到。
