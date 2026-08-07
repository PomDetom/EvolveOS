# SDD ledger — plan: docs/superpowers/plans/2026-08-06-app-shell-b3.md

Base: 099c3b9（branch feature/b3-settings，自 main 检出；工作树 Cargo.toml 行尾噪声未动）
交接：docs/HANDOFF-B3.md
规格：docs/superpowers/specs/2026-08-06-app-shell-product-design.md（§4 B3 部分）
计划书：docs/superpowers/plans/2026-08-06-app-shell-b3.md（唯一实施需求源）

## Pre-flight 扫描（2026-08-07，无阻塞冲突；一处计划内矛盾由交接书裁定）

- B3-1 重命名范围：计划书谓 6 组全改；「玻璃材质→表面质感」已在 B2-R5 完成 → 本计划只改其余 5 组（色彩→整体色调、排版→文字排版、圆角→边角形状、动效→动效节奏、阴影→阴影层次）+ 全部 6 组加 desc。
- B3-1 不破坏既有断言：唯一分组标题断言是 customizer.spec.js:43「表面质感」（不动）；`.cust-group` count 6（app-shell.spec.js:148 + 视觉守卫）不受影响（不新增分组）。
- B3-2 计划 Step 3 伪代码 `subscribe((cfg) => { applyConfig(cfg); updateOverview(cfg); })` 与同句「沿用现有双向同步模式」自相矛盾——现有 renderCustomizerGroups 订阅只 syncUI（变更发起方已 applyConfig，订阅不再重复应用）。交接书明确「计划 Step 3 提示沿用『订阅不重渲染、只同步局部』模式」→ 裁定：预览卡订阅只 updateOverview(cfg)，不调 applyConfig。
- B3-2 测试 `.cust-accent-card[data-accent="teal"]`：teal 在 ACCENTS（defaults.js:29）✓；默认 accent=indigo，点击 teal 后 `--preview-accent` 变化可断言。
- `.cust-overview` 加在 renderCustomizerGroups 内 → 外观分区与抽屉面板共用（计划 Step 3 字面「renderCustomizerGroups 渲染外观分区顶部」，抽屉共享实现为既有架构）。非 .cust-group，计数断言不受影响。
- customizer.test.js（jsdom）不断言分组结构，仅测订阅退订；新增预览卡不影响。jsdom 无 matchMedia，updateOverview 若读 prefersDark 已有守卫。
- P0（交接书 §5 首个任务）：概览「主题状态」卡陈旧——saveConfig 先触发 subscribe、applyConfig 后写 data-theme → 回调读 data-theme 得旧值。修法：subscribe 回调内读 getConfig().theme + prefersDark() 解析 system；桌面 + 手机（.app-main__stack-page[data-stack="overview"]）两处更新；补 e2e 断言。

## Task B3-P0: 概览「主题状态」卡陈旧修复

- **状态**：完成（2026-08-07，评审通过，0 Critical/Important，2 Minor 免修）
- **提交**：`71e55cd` `fix: 概览主题状态卡随主题切换实时更新（桌面+手机，闭环 B2 最终评审 Issue 1）` + `fe3f68c` `docs: B3-P0 实施报告`
- **验证**：桌面三态循环 1/1（含新断言）；mobile-nav 8/8（含新用例）；npm test 60/60；npm run test:e2e 98/98（视觉 24 基线零漂移）；npm run build 通过
- **实现**：app-main.js subscribe 回调改读 `getConfig().theme` + `prefersDark()` 解析 system（同 updateThemeIcon 模式，修复「saveConfig 先触发 subscribe、applyConfig 后写 data-theme → 读 data-theme 得旧值」根因）；桌面 `.app-main__theme-row` 首 span（保留 --active 守卫）+ 手机 `.app-main__stack-page[data-stack="overview"]` 内同卡（R8 未覆盖）两处更新，均空值守卫
- **必要偏差（已披露，评审独立验证正确且必要）**：brief 手机测试草稿假设初始 theme=light，但 config 默认 system、首击标题栏 system→light → 草稿断言永久红。实施者补 `theme:'light'` 种子 + reload（与桌面测试既有模式一致），断言文本/选择器/意图逐字保留
- **简报/报告**：docs/superpowers/sdd/task-B3-P0-brief.md / task-B3-P0-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor）——Minor：① system 分支仅被既有循环用例 exercise 未断言（代码正确，brief 未要求）；② app-main.js 注释密度偏重（文档化了一个真微妙的顺序根因，可接受）
- **执行状态**：Task B3-P0：✅ 完成（71e55cd，评审通过）
