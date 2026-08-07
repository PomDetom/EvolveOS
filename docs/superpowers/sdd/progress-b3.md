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

## Task B3-1: 外观分组重命名（全局语义 + desc）

- **状态**：完成（2026-08-07，评审通过，0 Critical/Important，1 Minor 免修）
- **提交**：`352398a` `feat: 外观分组重命名（整体色调/表面质感/文字排版/边角形状/动效节奏/阴影层次）+ desc` + `115aa4b` `docs: B3-1 实施报告`
- **验证**：TDD 红→绿（新用例实测收到旧标题）；customizer.spec 5/5；npm run test:e2e 99/99（含视觉 24）；npm test 60/60；npm run build 通过
- **实现**：customizer-panel.js GROUPS 重命名 5 组（色彩→整体色调、排版→文字排版、圆角→边角形状、动效→动效节奏、阴影→阴影层次；表面质感 B2-R5 已完成不动）+ 全部 6 组加 desc（整体色调「主题色/色相/饱和度/色温」、表面质感「透明度/模糊/噪点强度/亚克力材质」、文字排版「基准字号/缩放」、边角形状「圆角比例」、动效节奏「时长缩放/弹性强度」、阴影层次「阴影强度」）；组模板 title 后渲染 `.cust-group__desc`；customizer.css `.cust-group__desc`（text-3 小字）+ title 下边距 space-3→space-1 收紧（desc 贴标题，依赖 base.css 全局 margin reset）
- **视觉基线**：仅 appearance-partition 6 张重生成（解码比对：差异 = 标题改字 + 6 行 desc +120px 整、y680-1492 逐像素一致、group2 内容 +20px 干净下移 99.99% 匹配、无布局位移）；其余 18 张零漂移；复跑 24 全绿
- **简报/报告**：docs/superpowers/sdd/task-B3-1-brief.md / task-B3-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，1 Minor）——Minor：暗色 3 张 appearance 顶部 y1-143 有 ~184px 的 1-3px 色带（非标题/desc 区域，评审判定与交接书 P2 已知风险「分区长截图 run-to-shot 抖动」同源，重生成后复跑绿即确定性噪音，勿归因产品改动）
- **⚠️ 已裁决（控制器）**：评审 ⚠️ 暗色 top-band —— 交接书 §5 P2 明示「components-partition 长截图 run-to-shot 抖动…勿归因产品改动」，appearance 同为长分区截图；复跑全绿，判定为确定性 AA 抖动噪音，非真实 gap
- **执行状态**：Task B3-1：✅ 完成（352398a，评审通过）

## Task B3-2: 外观分区实时整体预览卡

- **状态**：完成（2026-08-08，见 task-B3-2-report.md）
- **提交**：`2514d41` `feat: 外观分区实时整体预览卡（主题/强调色/玻璃/圆角/图标实时联动）`
- **验证**：TDD 红→绿（`.cust-overview` 不存在实测红，实现后绿）；customizer.spec 6/6；npm test 60/60；npm run test:e2e 98 passed（2 例既有 flake 与本任务无关，隔离复跑 app-shell+floatstrip 33/33 绿）；视觉 24（重生成 6 张 appearance-partition 后零漂移）；npm run build 通过
- **实现**：customizer-panel.js 新增 `renderOverviewCard(cfg)` + `updateOverview(container, cfg)`，`renderCustomizerGroups` 顶部渲染 `.cust-overview`，订阅回调与初始同步都调 `updateOverview`（只读写容器局部 `--preview-*`，不调 applyConfig —— 预飞检已裁定）；`--preview-theme` 经 prefersDark 解析 system（jsdom 无 matchMedia 由 apply.js 守卫）、`--preview-accent` 复用 `tintHsl(cfg)`（与色相 swatch 同源）；customizer.css `.cust-overview` 卡片样式（`--surface-1` 底 / `--glass-border` 边 / `calc(var(--radius-*) * var(--radius-scale))` 圆角，全部静态背景无动画，玻璃层 backdrop-filter 静态声明）
- **视觉基线**：仅 appearance-partition 6 张重生成。解码比对（System.Drawing 逐像素 + 当前代码复拍对照）：基线 PNG == 当前代码隐藏预览卡后的复拍（md5 逐字节一致 e08c38b6…）；失败 actual == 当前代码完整复拍（md5 逐字节一致 a99968bb…）→ 差异完全由预览卡引入（卡 100px + 24px 外边距 = +124px 元素增高，下方内容干净下移；y720-1559 零差异区为长分区截图既存空白底，基线/actual 一致）；其余 18 张零漂移；复跑 24 全绿
- **简报/报告**：docs/superpowers/sdd/task-B3-2-brief.md / task-B3-2-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor：① `--preview-theme` 已写但 CSS 未消费（主题色块走 `--preview-theme-bg`，CSS 无法按字符串变量分支，功能等价，已披露）；② 主题色块 JS 硬编码 `#16181f`/`#f8f9fb` 复刻 themes.css `--surface-solid`（若令牌变更会静默发散，报告已加注释钉住来源）
- **⚠️ 已裁决（控制器）**：评审 ⚠️ 基线 md5 复拍证据为报告声称不可从 diff 复现——实施者用「解码逐像素 + 双向复拍 md5」双法自证，视觉 24 复跑全绿、仅 appearance-partition 重生成，判定可信
- **执行状态**：Task B3-2：✅ 完成（2514d41，评审通过）

## 最终整体评审（2026-08-08，合并前）

- **审查包**：docs/superpowers/sdd/review-B3-final.diff（099c3b9..28ade38，10 commits，22 文件）
- **裁决**：Ready to merge: Yes —— 0 Critical / 0 Important / 无必须合并前修项；评审独立复跑 npm test 60/60 绿，逐条核验报告声明（P0 顺序根因、--preview-theme-bg 载荷、基线 md5 复拍、Cargo.toml 纯行尾噪声）
- **Minors 分诊（5 条，全部免修随合并）**：① customizer-panel.js:307 `renderOverviewCard(cfg)` 参数未用（静态 HTML + updateOverview 承载值，建议删参）；② :346 `--preview-theme` 写了无 CSS 消费（仅 `--preview-theme-bg` 被读，死数据，cosmetic）；③ customizer.css 若干硬编码装饰值（rgba 阴影/渐变停靠点/gap，沿用 glassPreview 既有先例，风格一致）；④ 覆盖广度：B3-2 e2e 未断言主题/玻璃联动、P0 system 分支未断言（同机制，低风险）；⑤ 保真度：玻璃微缩块 blurEnabled=off 仍显示模糊（brief 范围只要求 opacity+噪点，非偏差，下轮补）
- **评审亮点**：`--preview-theme-bg` 非简单间接——subscribe 回调先于 applyConfig 执行，根 `--surface-solid` 在回调内还是旧主题，JS 计算色使预览反映新配置（正确且必要）；box-shadow: var(--shadow-inset-highlight) 意外「复活」了交接书 §5 R5③ 死令牌清理候选（正向小加分）
- **执行状态**：全部任务完成 → 待合并 main + 合并后全量回归
