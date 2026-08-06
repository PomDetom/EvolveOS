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
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，5 Minor）
- **一处必要偏差（已披露，评审独立验证正确且必要）**：brief Step 6 建议「重设 innerHTML」→ 改为「原地改 svg 属性」。原因：pointerup 内同步替换 innerHTML 移除 mousedown 目标 → Chromium 抑制后续 click 派发（实测 5 个 e2e 回归：mobile-nav 3 + app-shell 收起通道二/设置模式退出轮回归），破坏依赖 click 的 dock 推入/左窗 toggle。原地属性变更实现相同分级 + 相同 e2e 断言（svg width 24>20），零副作用
- **视觉基线**：app-main（6）+ components-partition（6）重生成（解码比对确认差异为左窗图标栏与组件分区 nav-wheel 演示实例的图标/衬底/光晕局部变化）；motion-partition 6 张字节不变（无全局渲染回归）
- **Minor 留收尾**：① M-1 app-shell.spec.js:371 注释称「重渲染 innerHTML」与实际「原地改 svg 属性」不符（建议改注释，避免误导）；② M-2 e2e 仅断言初始渲染分级、未断言 select 切换后尺寸互换（可补：点击非 active 项后断言原 active 变 20、新 active 变 24，brief 未要求）；③ M-3 hover 时 active 项衬底被 `:hover` 规则覆盖为 `--surface-hover`（brief 字面 CSS 的选择器优先级结果，active+hover 态观感交最终评审）；④ M-4 chip 40px 为 brief 字面硬编码、纯图标栏 item 左对齐（64px 栏宽可容纳，非新回归）；⑤ M-5 信息性：brief Interfaces 写 `.c-navwheel__icon-chips` 而 Step 7 用 `.c-navwheel__icon`，实现遵循 Step 7 正确

## 执行状态

- Task B2-1 玻璃材质两档：✅ 完成（55d0bcc，评审通过）
- Task B2-2 浏览器装饰背景层：✅ 完成（20ab435，评审通过）
- Task B2-3 导航图标四项增强：✅ 完成（670396c，评审通过）
- 最终整体评审 + 合并 main：待执行

## 最终整体评审（2026-08-06，合并前）

- **审查包**：docs/superpowers/sdd/review-b2-final.diff（0839414..6788bf0，9 commits）
- **裁决**：Ready to merge: Yes —— 0 Critical / 0 Important / 无必须合并前修项；评审独立复跑 npm test 58/58、npm run build、npm run test:e2e 85/85（含视觉 18）全绿
- **两项 Important deferred（暗色观感）—— 豁免随合并**：B2-1 I-1 表面双层层叠加深 + B2-2 I-1 背景层光晕广，均为 brief 字面 CSS 必然结果；最终用户视角判断为「克制的暗色玻璃」、可接受且有逃生口（data-glass=off / B3 滑杆调色）；改它们需改规格口径，不属本分支缺陷
- **Minors 分诊（~13 条）**：0 必须合并前修；1 条建议顺手修（B2-3 M-1 app-shell.spec.js:371 误导注释）已闭环（efb8638，scoped 复查 ADDRESSED、无新增破坏）；7 条随合并带入 B3 收尾（B2-1 M-1 标题栏/遮罩未降级、M-2 玻璃开关行结构、M-4 手机降级无 e2e；B2-2 M-1 手机无背景预设 UI、M-2 Tauri 下无意义小节；B2-3 M-2 select 互换无断言、M-3 active:hover 覆盖）；5 条豁免（B2-1 M-3 `--glass-enabled` 预留钩子、B2-2 M-3 死 CSS 溯源、M-4 文件归属、B2-3 M-4 chip 40px 字面、M-5 Interfaces 类名差异）
- **评审建议（B3 参考）**：暗色下玻璃开/关两档视觉差异近零、三表面同色——观感杠杆在暗色 `--surface-solid`/`--glass-bg-rgb`，属规格层调整须先固口径

## 执行状态

- Task B2-1 玻璃材质两档：✅ 完成（55d0bcc，评审通过）
- Task B2-2 浏览器装饰背景层：✅ 完成（20ab435，评审通过）
- Task B2-3 导航图标四项增强：✅ 完成（670396c，评审通过）
- 最终整体评审 + 合并 main：✅ 最终评审 Ready to merge（0 Critical/Important，唯一建议修复已闭环）→ 待合并 main

## 返工：玻璃 → 亚克力（2026-08-06，用户验收不合格后重启）

- **原因**：B2 效果用户验收不合格——① 材质语言要 Windows 11 亚克力（非玻璃质感，整个材质体系换）；② 图标选中态光晕与 icon 叠加看不清，去光晕只留衬底。
- **规格**：docs/superpowers/specs/2026-08-06-app-shell-b2-acrylic-rework-design.md（用户确认）
- **计划书**：docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md（提交 cd92afa）
- **返工 BASE**：cd92afa（分支 feature/b2-visual，未合并 main；B2-1/2/3 原交付保留在分支历史中，返工叠加其上）
- **任务**：R1 材质令牌+噪点链路 → R2 表面应用+去高光+闭环M-1 → R3 背景层柔和补色 → R4 图标去光晕 → R5 自定义器+措辞 → 用户视觉验收 → 最终评审 → merge main
- **命名边界**：--glass-*/data-glass/--glass-enabled 保留原名（仅换材质值与 UI 措辞）

## Task B2-R1: 亚克力材质令牌 + 噪点配置链路

- **状态**：完成（2026-08-06，评审通过）
- **提交**：`e5b1ed9` `feat: 亚克力材质令牌与噪点配置链路（--acrylic-* 配方 + glass.noise → --noise-opacity）`
- **验证**：npm test 60/60（apply 15 含 2 新用例，store/customizer 不破）；npm run test:e2e 85/85（R1 无基线漂移）；npm run build 通过
- **实现**：themes.css `--acrylic-saturate: 1.8` / `--acrylic-brightness`（1.1/0.92）/ `--acrylic-noise`（SVG feTurbulence data-URI）/ `--noise-opacity: 0.04` 兜底 + `--glass-border-opacity` 0.45/0.07 + dark `--surface-solid: #16181f`；defaults `glass.highlight`→`glass.noise: 0.04`（RANGES `[0,0.12,0.01]`）；apply.js 写 `--noise-opacity` 替代 `--glass-highlight-opacity`（`--glass-enabled`/`data-glass` 逐字不动）；customizer-css.js 导出同步；apply.test.js 2 新用例 + 第 24 行 fixture `highlight`→`noise`
- **简报/报告**：docs/superpowers/sdd/task-B2-R1-brief.md / task-B2-R1-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，4 Minor）
- **必要偏差（已披露，评审独立验证必要且原子完整）**：RANGES 删 `highlight` 令定制器 `renderSlider`（解构 `RANGES[spec.key]`）抛 TypeError，故 CFG_PATH 与 GROUPS 第三滑杆键/标签同步换 `noise`（「噪点强度」）——本属 R5 的该项提前完成；R5 仍需组名「表面质感」/开关「亚克力材质」/预览去高光/措辞
- **Minor 留收尾**：① M1 customizer-panel.js:166/174 注释「高光」过时（预览重做属 R5，一并更新）；② M2 存量 localStorage 死键 `glass.highlight`（deepMerge 拷贝残留，apply 不读，无功能影响）；③ M3 apply.js 无条件写 `--noise-opacity`（R2 噪点层落地时决策 data-glass=off 是否抑制噪点）；④ M4 border 0.45 视觉基线未漂移（R2 重生成 18 张时复核）

## Task B2-R2: 表面应用亚克力 + 去高光 + 噪点层 + 闭环 M-1

- **状态**：完成（2026-08-06，评审通过；1 Important 修复闭环）
- **提交**：`1d45bd4` `feat: 表面应用亚克力材质（去高光反光 + 噪点层 + 标题栏/遮罩降级闭环）` + `bbfbe62` `fix: 亚克力材质一致化其余 --glass-* 消费者 + 视觉基线重生成（评审 R1/5）`
- **验证**：npm test 60/60；npm run test:e2e 86/86（含「亚克力材质」+「玻璃两档」回归；首轮 smoke 冷启动超时偶发，隔离复跑绿，非因果）；npm run test:visual 18/18（**删除陈旧基线强制重生成后的 fresh 基线**，逐像素全绿）；npm run build 通过
- **实现**：app-main.css 全部表面 backdrop-filter 消费亚克力配方（nav-l/nav-r/pages/card + 手机 stack/stack-page/dock，card 与手机表面由 B2-1 的「仅着色」补为完整亚克力模糊）+ `.app-main::after` 噪点覆盖层（`--acrylic-noise` 120px 平铺，`z-index: var(--z-float)`，pointer-events:none，`data-glass=off` 时 opacity 0）；base.css `.glass` 去 inset-highlight 用亚克力配方；card/dialog/floating-window 去 `--shadow-inset-highlight` 反光用亚克力配方；titlebar 亚克力 + `data-glass=off` 纯色降级；nav-wheel 遮罩 `data-glass=off` 渐变底色换 `--surface-solid`（闭环 B2-1 M-1）
- **简报/报告**：docs/superpowers/sdd/task-B2-R2-brief.md / task-B2-R2-report.md
- **评审**：规格 ✅ / Needs changes → 修复轮 R1/5 闭环 → 最终 Approved（1 Important：视觉基线陈旧 → 删除强制重生成 18 张新字节 + 解码比对确认材质差异/无布局位移；Minor：其余 `--glass-*` 消费者一致化 toast/float-strip/settings-window(.csettings)/motion-lab(.ml-pop) 换亚克力配方，layout.css `.topbar` docs 死规则未碰）
- **一处字面差异（已披露）**：brief Step 3 谓 card/手机表面已有 backdrop-filter——实测仅着色无模糊（git show 55d0bcc 复核），按 brief「全部表面用亚克力配方」意图补全新增
- **视觉基线更正**：初版「重生成=no-op」结论错误——Playwright `--update-snapshots` 只为失败用例重写，亚克力 vs 玻璃像素差（mean≈2-4/通道）低于 toHaveScreenshot 默认容差 → 陈旧基线容差内通过、快照未被重写。评审独立验证 + 实施者复核一致：SwiftShader 会合成 backdrop-filter/噪点层；删除陈旧基线强制重生成 → 18 张全新字节（解码比对 meanΔ 0.16-4.01/通道、>30 级差异 0%、无布局位移）
- **性能注记（不改动）**：手机 stack/stack-page 嵌套双全屏 blur——spec §3.3 两者均在清单内、合规，冗余留待后续优化

## 执行状态

- Task B2-1 玻璃材质两档：✅ 完成（55d0bcc，评审通过）→ **返工 R2 覆盖表面应用**
- Task B2-2 浏览器装饰背景层：✅ 完成（20ab435，评审通过）→ **返工 R3 重调预设**
- Task B2-3 导航图标四项增强：✅ 完成（670396c，评审通过）→ **返工 R4 去光晕**
- 最终整体评审（首轮）：✅ Ready to merge → 用户验收否决，进入返工
- Task R1 亚克力材质令牌 + 噪点链路：✅ 完成（e5b1ed9，评审通过）
- Task R2 表面应用亚克力 + 去高光 + 闭环 M-1：✅ 完成（1d45bd4 + bbfbe62，评审通过）
- Task R3 背景层预设柔和补色：待执行
- Task R4 图标选中态去光晕：待执行
- Task R5 自定义器调整 + 措辞同步：待执行
- R-验收 用户视觉验收 + 最终评审 + 合并：待执行
