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

## Task B2-R3: 背景层预设柔和补色

- **状态**：完成（2026-08-06，评审通过；实施子代理两次遭 API 502 中断，控制器补完验证/归因/提交）
- **提交**：`e1cefd5` `feat: 背景层预设柔和补色（accent 光晕加 alpha 收窄，暗色不发腻）`
- **验证**：npm test 60/60；npm run test:e2e 87/87（含新「背景层预设柔和」+ 既有「背景层」切换回归）；npm run test:visual 18/18（重生成后逐像素绿）；npm run build 通过
- **实现**：app-main.css 三预设 `--backdrop-bg` 从 `--accent-200/300` 实色改 `color-mix(in srgb, var(--accent-300) X%, transparent)`（gradient 26%/18%、geo 20%、grid 14%，alpha ≤0.3）+ 范围收窄（停靠点 55%/50%→60%/55%）→ 暗色不再与近黑 `--surface-solid` 叠出大面积亮晕（闭环 B2-2 I-1）；app-shell.spec.js 弱断言「背景层预设柔和」（断言计算值含非零 alpha 颜色，比简报草稿更强；真实 gate 仍为视觉基线 + 用户验收）
- **简报/报告**：docs/superpowers/sdd/task-B2-R3-brief.md / task-B2-R3-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，4 Minor）
- **Flake 归因**：首两轮全量视觉各有一两张 shot 失败且失败集合轮间不同 → run-to-run 环境抖动（Windows GPU AA 抖动/陈旧 server）而非真实 diff；控制器隔离复跑视觉 18/18 绿 + 全量 e2e 87/87 绿确认
- **基线指纹**：18 张尺寸全部下降（光晕收窄→细节减少→压缩率升，与 R2 噪点层引入时上涨方向相反，逻辑自洽）；尺寸一致无布局位移
- **Minor 留收尾**：① 断言只守卫默认 gradient 预设（geo/grid alpha 未守卫，注释言明真实 gate 为基线+验收）；② 断言隐式耦合 Chromium color-mix 序列化（已实测对 rgb()/rgba()/color(srgb) 三种格式健壮）；③ `--surface-solid` 末层计算值序列化为 none（B2-2 既有行为，非 R3 引入）；④ flake 归因含两个正交环境理论（AA 抖动 vs server 陈旧），观测一致

## Task B2-R4: 图标选中态去光晕

- **状态**：完成（2026-08-06，评审通过）
- **提交**：`079f9d7` `feat: 图标选中态去光晕（只留衬底 + active:hover 优先）`（含 11 张基线）+ `3853a8b` `docs: R4 执行留痕`
- **验证**：npm test 60/60；npm run test:e2e 88/88（含新「图标选中态」+ B2-3 分级回归 + 零冲击）；npm run test:visual 18/18（重生成后连跑两遍绿）；npm run build 通过
- **实现**：nav-wheel.js 模板删 `.c-navwheel__glow` div（唯一改动行）；nav-wheel.css 删全部 glow 规则（radial-gradient/opacity/scale 分层/transition），补 `.c-navwheel__item--active:hover .c-navwheel__icon { background: var(--accent-100); color: var(--accent) }`（闭环 B2-3 M-3，特异性同序取胜）；保留 40px 衬底、尺寸/粗细分级、`--text-2` 提亮；setFocal/renderItemIcons 逐字不动
- **简报/报告**：docs/superpowers/sdd/task-B2-R4-brief.md / task-B2-R4-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，2 Minor）
- **必要偏离（简报草稿修正，评审验证必要正确）**：Step 1 测试 `toHaveCount(0)` 在应用壳动态 import 挂载前的空 DOM 上直接通过（形同虚设），改为先等 `.c-navwheel__item` 到 7 项再断言 → 成真门禁
- **既有基线不稳定（非本次引入，未修，升格已知风险→最终评审）**：components-partition 长截图（720×8626 拼接）run-to-run 抖动（同代码连渲两遍 dark-indigo 差 37501px；stash 证实与本次无关），根因指向 R2 `.app-main::after` feTurbulence 噪点层 × 拼接截图子像素相位；dark ≫ light（light-amber≈0），仅拼接长截图散布。当前基线稳定绿，潜在偶发 flake 风险，R-验收 时统一处理（拼接相位稳定或深色噪点对比收窄）
- **Minor 留收尾**：① 报告基线解码叙事略欠精确（light-amber「浅色不可见」应限定为左窗衬底光晕 vs 平色演示面）；② 漂移证据为自报（临时备份目录已删，事后无法独立复核像素数字，最终评审如需复算须保留一对基线 A/B）

## Task B2-R5: 自定义器调整 + 措辞同步

- **状态**：完成（2026-08-06，评审通过）
- **提交**：`2c53301` `feat: 自定义器表面质感组（亚克力开关 + 噪点强度滑杆）+ 措辞同步` + `2e72da6` `docs: R5 执行留痕`
- **验证**：npm test 60/60；npm run test:e2e 95/95（含新「表面质感」用例 + 「亚克力两档」重命名回归 + 24 张视觉基线）；npm run test:visual 24/24；npm run build 通过
- **实现**：customizer-panel.js 组名「玻璃材质」→「表面质感」、开关「玻璃磨砂」→「亚克力材质」（aria-label 同步，`data-glass-switch` 选择器不变）、预览注释去「高光」改「噪点强度」（闭环 R1 M1）；customizer.css `.cust-panel`/`.cust-glass-preview__glass` backdrop-filter 统一亚克力配方（`--acrylic-saturate`/`--acrylic-brightness`）+ box-shadow 去 `--shadow-inset-highlight`（闭环 R2 复查「裸 saturate(1.4) 属 R5」）+ `::before` 高光层改噪点层（120px 平铺 + `--noise-opacity`，实时反映噪点滑杆）；措辞全量同步（settings-pages 关于页 / component-showcase 卡片 + about 弹窗 / apply.test / app-shell.spec / customizer.spec）
- **简报/报告**：docs/superpowers/sdd/task-B2-R5-brief.md / task-B2-R5-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，4 Minor）
- **必要偏离（brief 内演进，评审验证与意图一致且必要）**：视觉基线 18→24——为覆盖被改外观分区，visual-regression.spec.js SHOTS 新增外观分区 shot（partition 1，挂载守卫断言 `.cust-group` count 6）；仅新增 6 张 appearance-partition-*，既有 18 张零字节变动（提交文件清单独立证实）；把「count 6 不破坏」固化为基线门禁
- **Minor 留收尾**：① apply.test.js:23 测试名「玻璃与动效参数…」保留「玻璃」指代 `--glass-*` 变量族（命名保留口径下可辩护）；② customizer-css.js:34 注释「玻璃/排版/…」保留（内部注释非用户可见）；③ themes.css `--glass-highlight-rgb/highlight/--shadow-inset-highlight` 定义已零消费者（spec §6 允许保留或移除，可收尾清理）；④ settings-pages.js:94 外观页头「与右侧抽屉面板共用同一份配置」提及的抽屉为死代码（mountCustomizer 无人调用，前置存在，超 R5 范围）

## Task B2-R6: 亚克力可见性调参（明显亚克力）

- **状态**：完成（2026-08-07，评审通过）
- **提交**：`d1c7166` `feat: 亚克力可见性调参（明显亚克力：着色0.48/模糊30/噪点0.06 + 背景层增强）` + `27fd15c` `docs: R6 执行留痕` + `0663712` `test: 视觉基线重生成（明显亚克力调参后 24 张全量更新）`
- **验证**：npm test 60/60；npm run test:e2e 95/95（含「背景层」「亚克力两档」「亚克力材质」+ 其余零冲击）；npm run test:visual 24/24（强制重生成后稳定绿）；npm run build 通过
- **背景**：用户视觉验收 R1-R5 后指出 ①背景装饰无效果 ②亚克力不明显（展示板更像亚克力）③噪点只影响展示板。控制器实测（computed-style）确认结构全对，问题是可见性——表面着色 0.62 太不透明 + 背景层 alpha ≤0.3 太淡 → 模糊无物可糊
- **实现**：defaults.js `glass.opacity 0.62→0.48` / `blur 24→30` / `noise 0.04→0.06`（用户选「明显亚克力」）；app-main.css 三预设 alpha 提升 + 范围铺开（gradient 50%/30% 停靠点 60%/55%→65%/60%、geo 40%、grid 25%）——背景层成为可感知的彩色 wash，经 0.48 透明 + blur 30 呈克制彩色磨砂；apply.test.js 默认噪点断言 0.04→0.06
- **简报/报告**：docs/superpowers/sdd/task-B2-R6-brief.md / task-B2-R6-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，3 Minor）
- **基线重生成（同 R2 机制）**：`--update-snapshots` no-op（pixelmatch 阈值 ≈37 > 本次最大差异 ~15/通道，旧基线容差内通过不重写）→ 控制器删 24 张快照强制重生成 + 稳定复跑绿；基线现反映「明显亚克力」渲染（暗色 0.44%-9.96% 像素偏移、浅色 ≈0、无布局位移）
- **Minor 留收尾**：① apply.test.js:42-44 「覆盖」测试值 0.06 恰等于新默认，退化为与默认测试同义重复（建议改 0.08 恢复区分度）；② app-main.css:57 CSS 兜底 `--noise-opacity, 0.04` 与新默认 0.06 不一致（仅无配置路径生效，可后续任一并齐）；③ 评审留痕本已随提交（见上）

## Task B2-R7: Tauri 背景修复 + 关闭背景选项

- **状态**：完成（2026-08-07，评审通过）
- **提交**：`43caf2b` `feat: Tauri 桌面显示背景层（关窗口透明）+ 背景装饰「关闭背景」预设`
- **验证**：npm test 60/60；npm run test:e2e 95/95（含扩展「背景层」none 用例 + 其余零冲击）；npm run test:visual 24/24（外观分区 6 张重生成——结构性新增按钮超过阈值故非 no-op，其余 18 张零漂移）；npm run build 通过
- **背景**：用户 Tauri 目检反馈桌面端三个背景无效 + 主题颜色不正常。根因：`[data-tauri="1"] .app-main__backdrop { opacity: 0 }` 隐藏背景层 + WebView2 透明窗口下 backdrop-filter 无法模糊桌面壁纸
- **实现**：app-main.css 删 `[data-tauri="1"]` 隐藏规则 + 加 `.app-main[data-backdrop="none"] { --backdrop-bg: var(--surface-solid); }`；app-main.js `BD_LABELS` 加 `none: '关闭'`（按钮 3→4）；tauri.conf.json 窗口 `transparent: true`→`false`（背景层为不透明实底，桌面壁纸不透出，消除 WebView2 透明渲染怪癖）；e2e「背景层」用例扩展 none 断言
- **简报/报告**：docs/superpowers/sdd/task-B2-R7-brief.md / task-B2-R7-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，3 Minor）
- **Minor 留收尾**：① M1 app-main.css:25 头部块注释仍写「Tauri 背景层透明，模糊真实壁纸」「三预设」——已失实（R7 后 Tauri 同显、四预设），建议同步；② M2 `data-tauri` 探测写成为死标志（无 CSS 消费者，保留无害，可标注为未来钩子）；③ M3 e2e none 断言未在点击后复验背景层可见（稳健性增强建议）

## Task B2-R8: 导航栏割裂修复 + 深浅切换按钮

- **状态**：完成（2026-08-07，评审通过）
- **提交**：`556c936` `feat: 导航栏遮罩改内容遮罩（消除顶部色带）+ 标题栏快捷深浅切换按钮` + `cc5c34d` `docs: R8 执行留痕`
- **验证**：npm test 60/60；npm run test:e2e 97/97（含 2 新用例：遮罩守卫 + 深浅切换，其余零冲击）；npm run test:visual 24/24（仅 app-main 6 张重生成，其余 18 张零漂移）；npm run build 通过
- **背景**：用户反馈两个导航栏顶部背景与整体割裂。控制器像素采样实证：`.c-navwheel__mask` 叠加渐变 `--glass-bg`（0.48）叠导航栏 0.48 背景 = 顶部 48px 双倍着色色带（标题栏 235 vs 导航栏顶 242，更亮更白）。R6 降透明度后更明显
- **实现**：Part A nav-wheel.js 删叠加渐变遮罩 div 插入；nav-wheel.css 删渐变规则 + `data-glass="off"` 覆盖，改 `.c-navwheel__list:not(--horizontal)` mask-image 内容遮罩（`linear-gradient(transparent, black 48px, black calc(100% - 48px), transparent)`，顶/底 48px 淡出滚动内容、无叠加色带；横向 dock 排除）；app-main.css 删 2 条死规则。Part B title-bar.js `renderTitleBar` 加 `themeToggle` 选项（默认 false，按钮插设置按钮左缘）；app-main.js 传 themeToggle:true + 补 import（saveConfig/subscribe/prefersDark）+ 点击经 saveConfig→applyConfig 翻转深浅 + subscribe 同步图标（深显 sun/浅显 moon）
- **简报/报告**：docs/superpowers/sdd/task-B2-R8-brief.md / task-B2-R8-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，3 Minor）
- **基线说明**：仅 app-main 6 张重生成（标题栏按钮 + 顶部色带消除 + 底部遮罩机制变化 + mask 强制列表入合成层引起图标字形亚像素 AA 位移）；components/motion/appearance 18 张零漂移（组件分区演示实例首项 padTop≈115px > 48px 淡出带、静止帧像素全落在 mask 不透明区 → 与旧叠加在无玻璃叠加上下文像素级等价）
- **Minor 留收尾**：① app-main.js:147 `themeUnsub` 死变量（声明未退订，桌面单次挂载无泄漏，建议直接 subscribe 或补注释）；② 概览页「主题状态」卡在快捷切换后显示陈旧主题（卡片挂载时按 data-theme 渲染，点按钮不触发重渲——设置分区路径因变更时卡片不可见故此前无此问题，新按钮首次从主页触发，可在 click 内同步或重渲）；③ `subscribe(() => updateThemeIcon())` 每次 saveConfig 都重渲按钮 SVG（成本极小，可短路）

## Task B2-R9: 标题栏主题按钮三态循环 + 设置同步

- **状态**：完成（2026-08-07，评审通过；1 Important 修复闭环）
- **提交**：`4e4fda5` `feat: 标题栏主题按钮三态循环（浅/深/跟随系统）+ 与设置分区双向同步` + `7d9ddfe` `fix: 标题栏主题按钮冷启动图标未初始化（R8 回归）+ 深色基线重生成`
- **验证**：npm test 60/60；npm run test:e2e 97/97（含三态+双向同步、dark 冷启动防回归断言、R8 遮罩守卫）；npm run test:visual 24/24（app-main 6 张重生成：light 3 图标 moon→sun + dark 3 图标 sun→moon，解码比对确认=按钮图标）；npm run build 通过
- **实现**：`THEME_CYCLE = ['light','dark','system']` 循环（indexOf+1 % 3）；`THEME_ICONS = { light:'sun', dark:'moon', system:'monitor' }` 按当前主题显示（与设置 THEME_MODES 图标语义对齐）；`syncSettingsThemeModes` 遍历 `.csettings__mode` 同步 active/aria-pressed；`subscribe(() => { updateThemeIcon(); syncSettingsThemeModes(); })` 双向同步（标题栏↔设置分区三态选择器）
- **简报/报告**：docs/superpowers/sdd/task-B2-R9-brief.md / task-B2-R9-report.md
- **评审**：规格 ✅ / Needs changes → 修复轮 R1/5 闭环 → Approved（1 Important：I1 冷启动图标未初始化，R9 按简报字面删了 R8 挂载期 updateThemeIcon + 无启动 notify → 已存 dark/system 冷启动时标题栏静态 sun 与设置失同步，dark 基线恰编码 bug 态；修复=补挂载期调用 + 重生成 dark 3 张 + 防回归断言；4 Minor：M1 冗余 updateThemeIcon 已删、M2 themeUnsub 死变量、M3 报告 dark 零漂移叙事勘误、M4 waitForTimeout→断言）
- **brief 勘误**：简报 Step 6「R8 light 初始显示 sun」前提与实测不符（R8 浅色态显示 moon，「点切目标」语义），已由实施者正确纠偏

## 执行状态

- Task B2-1 玻璃材质两档：✅ 完成（55d0bcc，评审通过）→ 返工 R2 覆盖表面应用
- Task B2-2 浏览器装饰背景层：✅ 完成（20ab435，评审通过）→ 返工 R3 重调预设
- Task B2-3 导航图标四项增强：✅ 完成（670396c，评审通过）→ 返工 R4 去光晕
- 最终整体评审（首轮）：✅ Ready to merge → 用户验收否决，进入返工
- Task R1 亚克力材质令牌 + 噪点链路：✅ 完成（e5b1ed9，评审通过）
- Task R2 表面应用亚克力 + 去高光 + 闭环 M-1：✅ 完成（1d45bd4 + bbfbe62，评审通过）
- Task R3 背景层预设柔和补色：✅ 完成（e1cefd5，评审通过）
- Task R4 图标选中态去光晕：✅ 完成（079f9d7，评审通过）
- Task R5 自定义器调整 + 措辞同步：✅ 完成（2c53301，评审通过）
- Task R6 亚克力可见性调参：✅ 完成（d1c7166，评审通过）
- Task R7 Tauri 背景修复 + 关闭背景：✅ 完成（43caf2b，评审通过）
- Task R8 导航栏割裂修复 + 深浅切换按钮：✅ 完成（556c936，评审通过）
- Task R9 标题栏主题按钮三态循环 + 设置同步：✅ 完成（4e4fda5 + 7d9ddfe，评审通过）
- R-验收 用户视觉验收（最终复验）+ 最终评审 + 合并：待执行

## 最终整体评审（返工后，2026-08-07，合并前）

- **审查包**：docs/superpowers/sdd/review-b2-rework-final.diff（0839414..HEAD，39 commits）
- **裁决**：Ready to merge: Yes —— 0 Critical / 0 Important；评审独立复跑 npm test 60/60、npm run build、npm run test:e2e 97/97（含视觉 24）全绿；用户验收已通过
- **5 Minor → 最终修复波（efad983）**：①概览页「主题状态」卡陈旧 ②app-main.css 头部注释失实 ③themeUnsub 死变量 ④噪点覆盖测试同义 ⑤噪点兜底 0.04。修复波复查：2-5 闭环；**① 修复无效（parked）**——saveConfig 先触发 subscribe（写 data-theme 前），回调读 data-theme 得旧值 → 概览卡陈旧依旧；正确修法=读 `getConfig().theme` + `prefersDark()` 解析（同 updateThemeIcon 模式），移交 B3 收尾
- **deferred Minors 分诊**：~25 条；1 条随修复波闭环 4 条；8 条随合并带入 B3 收尾（B2-1 M-2 开关行结构 / B2-2 M-1 手机背景预设 UI / R3① 弱断言补强等）；9 条豁免（--glass-enabled 钩子、R7② data-tauri 死标志、R5③ 死令牌清理等）
- **已知风险（随合并，不 gate）**：components-partition 长截图 run-to-run 抖动（噪点层 × 拼接相位，当前基线稳定绿，本轮全过）
- **残留跟进（B3 优先）**：Issue 1 概览卡正确修法 + 移动端概览卡同病（选择器仅桌面）+ customizer.css:175 兜底 0.04 未对齐（报告路径笔误 src/demo→src/styles）

## 执行状态

- Task B2-1 玻璃材质两档：✅ 完成（55d0bcc）→ 返工 R2 覆盖
- Task B2-2 浏览器装饰背景层：✅ 完成（20ab435）→ 返工 R3 重调
- Task B2-3 导航图标四项增强：✅ 完成（670396c）→ 返工 R4 去光晕
- Task R1-R9 亚克力返工：✅ 全部完成（评审通过）
- 最终整体评审（返工后）：✅ Ready to merge: Yes（0 Critical/Important，Issue 1 parked 移交 B3）
- 合并 main + B3：待用户决定（本会话 or 下一对话）
