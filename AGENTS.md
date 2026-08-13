# EvolveOS — agent 指令（单源）

纯原生 Web 多应用壳（Vite + HTML/CSS/JS，**零运行时依赖**）：应用 = `src/apps/<id>/` 自持页面（壳 glob 自动发现、零侵入），设计系统（令牌/34 组件/定制器）为共享基础设施；框架与应用双轨治理，开发用 git worktree 并行。主 checkout 常驻 dev（集成分支，改动经分支测试通过后合入）；main 仅发版合并点。

## 常用命令

```bash
npm install                       # 安装依赖（Node ^20.19.0 || >=22.12.0）
npm run dev                       # 开发服务器 localhost:5173
npm test                          # Vitest 单测
npm run test:e2e                  # Playwright 交互测试
npx playwright test --config=playwright.config.worktree.js   # e2e 用 worktree 配置（端口 5174 新鲜 server）
npm run build                     # 生产构建（每次提交前必跑）
npm run check:boundary            # 分支/边界门禁（合并前跑）
npm run release -- patch|minor|major   # 半自动发版
npm run set-version -- X.Y.Z      # 同步 package.json / Cargo.toml / tauri.conf.json
```

## 代码结构

- `src/apps/<id>/`：应用（自己的页面 + 局部 CSS + 交互 + 单测）；`index.js` 导出 `module`（`id/name/icon/order/dir/render/mount`），壳零改动即发现。新图标用应用自持（`module.icons` + `icon(name,size,stroke,icons)`），禁改 `src/components/icon/icon.js`。
- `src/components|styles|config|app|scenes|demo|motion|assets/`：**框架**（设计系统 + 壳），应用禁止触碰。
- 接入契约 / 组件清单 / 设计令牌 / 页面规范：`docs/integration/app-integration.md`。
- 分层细则：`src/AGENTS.md`（组件/令牌/动画/验证）、`src-tauri/AGENTS.md`（桌面壳）、`docs/AGENTS.md`（文档体系/任务执行）。
- 模式与入口：浏览器 `/` 与 Tauri 均应用壳；`?mode=app|strip` 显式覆盖，非法/无参回落 `app`。

## 默认不同于常规

- **零运行时依赖、零框架**：不要引入任何 npm 运行时依赖，组件无抽象封装。
- **应用只能改自己的目录**（`src/apps/<id>/` + 该应用测试 + docs），禁止碰框架目录（`src/components|styles|config|app|scenes|demo|motion|assets`、`vite.config`、`package.json`）。
- **任务在独立 worktree 执行**（仓库根同级 `evolveos-<slug>`），不在主 checkout 直接改；主 checkout 常驻 dev（集成分支）。**禁止直接在 dev 上修改** —— 任何改动一律另开分支（从 dev 检出）完成，修改 + 测试全部通过后才合并入 dev。
- **测试仅 Web 环境**（Vitest + Playwright），不做 webview 真机验证。
- 界面参数修改必须走配置链路 `defaults → store → apply`，禁止绕过直接写 CSS 变量 / `data-theme` / `data-accent`。

## 工作流红线

- **分支**：前缀 `app/<id>/*` `ui/*` `docs/*` `chore/*` `hotfix/*`，一律从 dev 检出（hotfix 例外可从 main）。**禁止直接在 dev 上修改**：任何改动只在分支上完成，修改 + 测试（定向回归 + build + 壳冒烟）全部通过后才合并入 dev，随后删分支（`git branch -d` + `git worktree remove`）；main 只从 dev `--no-ff` 合并（=一次发版），hotfix 唯一直合 main 豁免随后同步回 dev；未知前缀 `check:boundary` 拒绝。
- **回归**：全量回归只在 dev→main / hotfix→main 两个点跑；dev 阶段只跑改动影响面定向测试 + build + 壳冒烟。
- **发版前必先征询用户意见**：dev→main / hotfix→main / bump / tag / push 等任一发版动作前，先列出版本号、范围、验证证据，等用户明确同意再执行（任何发版都需询问意见，不自动发版）。
- 合并前 `npm run check:boundary`（分支名 + 边界双校验）。
- 提交前 `npm run build`；逻辑改动 TDD（红→绿→提交）。
- `ui/*` 框架改动全局串行（同一时刻只一个 ui 分支）+ 框架 owner 评审。
- 多会话并行靠 git 机制协调（同分支单 worktree 持有；dev 由主 checkout 常驻持有），不靠 agent 自觉。

## 提交与语言约定

- 提交信息中文，前缀 `feat:` / `fix:` / `docs:` / `chore:` / `merge:` / `release:`。
- 子代理驱动：每任务 TDD + 独立评审；计划/工作/提交留痕入 `docs/superpowers/sdd/`（`progress-*.md` 账本为唯一权威）。
- 版本治理：package.json 为唯一版本源；发版走 `npm run release`（bump → CHANGELOG → test+build 门禁 → 提交）→ dev→main 全量回归 → tag `vX.Y.Z`。
