# SDD ledger — plan: docs/superpowers/plans/2026-08-06-app-shell-b2.md

Base: 0839414（branch feature/b2-visual，自 main 检出，工作树 Cargo.toml 行尾噪声未动）

规格：docs/superpowers/specs/2026-08-06-app-shell-product-design.md（§3 B2 部分）
计划书：docs/superpowers/plans/2026-08-06-app-shell-b2.md
交接：docs/HANDOFF-B2-B3.md

## Pre-flight 扫描（2026-08-06，干净，无阻塞冲突）

- 无测试断言图标宽度 22 / 分组标题文案 / backdrop —— B2-3 尺寸分级、B3-1 重命名不打破既有断言。
- `.cust-group` count 6（app-shell.spec.js:148）不受影响（B2/B3 不新增分组）。
- apply.test.js 用真实 `document.documentElement` 作 root（非 mock）—— 计划 Step 1 测试代码需按既有结构适配（计划已注明）。
- B2-1 计划 Step 4 写 `--glass-enabled` 变量 + Step 6 注记写 `root.dataset.glass`（CSS 选择器用后者）；两者都写，变量由单测锁定。
- visual spec 硬编码 `toHaveCount(10)`（既有 deferred minor，本计划不触碰）。

## Task B2-1: 玻璃材质两档（磨砂/纯色不透明）

- **状态**：完成（2026-08-06，评审通过）
- **提交**：`55d0bcc` `feat: 玻璃材质两档（磨砂 backdrop-filter / 纯色不透明降级）` + `c3ad62c` `docs: B2-1 玻璃两档执行留痕（报告 + 进度台账）`
- **验证**：npm test 56/56；npm run test:e2e 83/83（含「玻璃两档」）；npm run test:visual 18/18（暗色 9 张重生成，亮色像素级不变）；npm run build 通过
- **实现**：defaults.js `glass.blurEnabled: true`；apply.js 写 `--glass-enabled` + `root.dataset.glass`；themes.css `--surface-solid`（light `#f8f9fb` / dark `#14161c`）；app-main.css 表面（nav-l/nav-r/pages/card + 手机 stack/stack-page/dock）接玻璃 + `:root[data-glass="off"]` 降级纯色；定制器「玻璃材质」组 pre 加玻璃磨砂开关（`glassSwitchRow`，saveConfig→applyConfig 链路，syncUI 同步）；apply 单测 2 新用例（真实 root 风格）+ e2e 玻璃两档（真实开关 + reload 持久化）
- **简报/报告**：docs/superpowers/sdd/task-B2-1-brief.md / task-B2-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical，1 Important deferred + 4 Minor）
- **Important deferred → B2 最终评审**：I-1 暗色表面双层层叠半透明 `--glass-bg` 明显加深（brief 字面指令的必然结果，评审判定非本任务缺陷）；B2-2 装饰背景层落地后再确认暗色观感
- **Minor 留收尾**：① M-1 `data-glass=off` 不覆盖标题栏（`.c-titlebar` backdrop-filter 与 nav-wheel 遮罩渐变仍半透明）——不在 brief 表面清单内，不构成规格违背，最终评审定边界；② M-2 玻璃开关行结构与动效开关不一致（省略 `.cust-switch-wrap` 包裹层，点整行触发）——功能正确，建议与 motion 行统一；③ M-3 `--glass-enabled` 当前无 CSS 消费者（brief 明示写入 + 测试锁定，spec §3.1 Tauri 窗口透明度可能消费）；④ M-4 手机形态降级无 e2e 覆盖——brief Step 7 未要求，最终评审补断言或豁免

## Task B2-2: 浏览器装饰背景层（模糊对象）

- **状态**：完成（2026-08-06，待评审）
- **提交**：见 task-B2-2-report.md 文末
- **验证**：npm test 56/56；npm run test:e2e 84/84（含「背景层」用例；首轮 smoke 冷启动超时偶发，非因果，复跑 84/84）；npm run test:visual 18/18（18 张重生成）；npm run build 通过
- **实现**：app-main.css `.app-main__backdrop`（`position:fixed; inset:0; z-index:-1; pointer-events:none`，画在 canvas 之上、壳内容之下，玻璃表面模糊到它）+ 三预设 `data-backdrop="gradient|geo|grid"`（`--backdrop-bg`，brief 字面）+ `[data-tauri="1"]` 透明；app-main.js 模板设默认 gradient + 首个子元素 backdrop + Tauri 探测写 data-tauri + 外观分区挂载注入「背景装饰」3 预设按钮（会话内纯 UI 态，不进 store；`.cust-group` count 6 不受影响）；partitions.css 分段按钮样式（paint-only 过渡）。一处必要偏差：`background-size` 不继承，网格平铺尺寸补在 `.app-main__backdrop` 上（brief 原行保留）
- **简报/报告**：docs/superpowers/sdd/task-B2-2-brief.md / task-B2-2-report.md
- **评审**：规格 ✅ / Approved（0 Critical，1 Important deferred + 4 Minor）
- **Important deferred → B2 最终评审**：I-1 暗色主题背景层光晕覆盖广（`--accent-200/300` 浅档 + `--surface-solid` 近黑，max 通道差 ≤52）——brief 字面 CSS 必然结果，与 B2-1 I-1 同题，最终评审确认观感
- **Minor 留收尾**：① M-1 手机形态无背景装饰选择 UI（桌面挂载注入，手机页面栈重建未注入；背景层默认 gradient 仍渲染）——brief 未要求，最终评审补断言或豁免；② M-2 Tauri 下背景层透明但「背景装饰」小节仍可见（功能无意义 UI，brief 未要求隐藏）；③ M-3 `background-size: 40px 40px` 在 `.app-main` 上为死 CSS（保留仅溯源，功能由 `.app-main__backdrop` 承担）；④ M-4 选择器样式落 partitions.css（brief 指定该文件，文件归属略偏）
- **评审独立验证**：paint 层级成立（html 无背景规则、body `--glass-bg` 传播为 canvas 背景、`.app-main` 不建 stacking context → backdrop z-index:-1 画 canvas 之上/壳内容之下，玻璃表面确会模糊到它）；`overflow:hidden` 不裁剪 fixed；两处声明偏差（grid background-size 补子元素、手机无切换 UI）均合理且已披露

## Task B2-3: 导航图标四项增强

- **状态**：完成（2026-08-06，待评审）
- **提交**：见 task-B2-3-report.md 文末
- **验证**：npm test 58/58；npm run test:e2e 85/85（含「图标分级」用例；首轮/中间轮若干冷启动与 data-display 超时偶发，隔离复跑与终跑全绿，非因果）；npm run test:visual 18/18；npm run build 通过
- **实现**：icon.js `icon(name, size = 18, stroke = 1.8)` 第三参（默认 1.8 向后兼容）；nav-wheel.js 模板 item0 初始 active + 24px/2.2，其余 20px/1.8，select 捕获 prev 并对前后两项重渲染（`renderItemIcons` 原地改 svg width/height/stroke-width 属性）；nav-wheel.css brief Step 7 字面（40px 圆角衬底 hover/active 显、`--text-3`→`--text-2` 提亮、active accent + accent-100 衬底、glow scale(.8)→(1) 分层，过渡仅 color/background 与 transform/opacity）；setFocal 逐字不动
- **简报/报告**：docs/superpowers/sdd/task-B2-3-brief.md / task-B2-3-report.md
- **评审**：待评审
- **一处必要偏差（已披露）**：brief Step 6 建议「重设 innerHTML」→ 改为「原地改 svg 属性」。原因：pointerup 内同步替换 innerHTML 移除 mousedown 目标 → Chromium 抑制后续 click 派发（实测 5 个 e2e 回归：mobile-nav 3 + app-shell 收起通道二/设置模式退出轮回归），破坏依赖 click 的 dock 推入/左窗 toggle。原地属性变更实现相同分级 + 相同 e2e 断言（svg width 24>20），零副作用
- **视觉基线**：app-main（6）+ components-partition（6）重生成（解码比对确认差异为左窗图标栏与组件分区 nav-wheel 演示实例的图标/衬底/光晕局部变化）；motion-partition 6 张字节不变（无全局渲染回归）
- **Minor 留收尾（初评候选）**：① nav-wheel 挂载起 item0 即 `--active`（组件分区演示实例初始即高亮，基线随之变化——brief 预期，观感交最终评审）；② hover 时 active 项衬底被 `:hover` 规则覆盖为 `--surface-hover`（brief 字面 CSS 的选择器优先级结果，active+hover 态观感交最终评审）

## 执行状态

- Task B2-1 玻璃材质两档：✅ 完成（55d0bcc，评审通过）
- Task B2-2 浏览器装饰背景层：✅ 完成（20ab435，评审通过）
- Task B2-3 导航图标四项增强：✅ 完成（待评审）
- 最终整体评审 + 合并 main：待执行
