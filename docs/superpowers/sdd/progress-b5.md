# SDD ledger — plan: docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md

Base: 6d57299（branch feature/b5-design-language，自 main 检出）
交接：docs/HANDOFF-B5.md（B5 由上一轮对话产出规格 62ad138 + 计划书 94546ed + 交接文档 6d57299）
规格：docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md（唯一需求源）
计划书：docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md（唯一实施需求源）

## Pre-flight 扫描（2026-08-09，干净，无阻塞冲突）

- 无任务间矛盾；无「测试断言空洞/逻辑块逐字重复」的计划强制造缺陷。
- B5-1 字体基线全量重生成（预期内）；截图前须等 document.fonts.ready（CJK 5MB+）。
- B5-2 红信号定位在集成层（slider.test.js 签名契约守卫可能全绿，以 .cust-range/.ml-slider 归零为准）。
- B5-2 ml-slider 保留双类（视觉 .c-slider + 定位 .ml-slider，motion-lab.js 156/177/178）。
- B5-3 badge 混色计算值 Chromium 为 color(srgb ...) 格式（B2-R3 先例）。
- B5-4 设置页整体 data-layout=fluid，表单靠 .csettings__field 420px 自限宽。
- B5-5 默认最小改动（customizer.css 为主，settings-window.css 仅观感偏差时微调）。
- 环境：共享 checkout 陈旧 5173 server（PID 11964）运行中——e2e 一律 playwright.config.worktree.js（5174 新鲜 server）。本 worktree 已创建该配置（不提交）。

## 基线确认（2026-08-09）

- npm test：62/62 绿（13 files，含 B5-1 font-assets 4）
- e2e（worktree 配置 5174）：107 用例并集全绿（106 passed + 1 例 `.csg` 超时 flake → 单独复跑 app-shell.spec.js 30/30 绿；含视觉基线 24 全量重生成）
- npm run build：通过（860ms；两 WOFF2 5.2/5.6MB 入 dist）

## Task B5-1: 字体全局替换（阿里普惠体 55/85）

- **状态**：DONE（2026-08-09）
- **简报**：docs/superpowers/sdd/task-B5-1-brief.md
- **报告**：docs/superpowers/sdd/task-B5-1-report.md
- **提交**：feat `b07e603`（阿里普惠体全局替换）+ docs 一枚（本台账/简报/报告）
- **内容**：`src/styles/fonts.css` 两档 @font-face（55 Regular 400 / 85 Bold 700，font-display swap）+ `--font-sans` 加 `"Alibaba PuHuiTi"` 前缀 + base.css 顶部 @import + 两 WOFF2 入 `src/assets/fonts/` + 单测/e2e/视觉 24 基线重生成。`--font-mono` 不动。
- **偏离**：brief 的 `document.fonts.ready`+`check` e2e 序列实测竞态（ready 先 settle、字体未触发加载），适配为 `document.fonts.load()` 显式强制加载（断言原样）。详见报告「verbatim 适配说明」。
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，3 Minor 免修）——Minor：① font-assets 单测 weight↔file 配对未断言（brief 逐字，可接受）；② tokens e2e 仅断言 400 face 加载（brief 逐字）；③ 字体资产 10.4MB 大（计划强制官方包）。⚠️ 项已核实：e2e 计数（106+flake 重跑 30/30 并集 107）控制器从实施者前台输出确认；PIL 解码比对以报告方法学（0.17-1.65% 稀疏变化 + 色板 top 色集合不变 + 大 delta 全为文字 AA 中间色 → 纯字形替换）接受。
- **执行状态**：Task B5-1：✅ 完成（b07e603 + 1104492，评审通过）

## Task B5-2: 统一 Slider 组件（胶囊形，三处接入）

- **状态**：DONE（2026-08-09）
- **简报**：docs/superpowers/sdd/task-B5-2-brief.md
- **报告**：docs/superpowers/sdd/task-B5-2-report.md
- **提交**：feat（胶囊滑杆）+ docs 一枚（本台账/简报/报告）
- **内容**：三处滑杆（组件 `.c-slider` 原生 accent / 动效 `.ml-slider` 原生 accent / 外观 `.cust-range` 圆形拇指）统一为单一 `.c-slider` 胶囊自绘（8px 圆角轨道 + 20px 胶囊拇指 + track 填充经 `--fill` 变量）。slider.css 逐字替换；customizer-panel.js 三处 `.cust-range`→`.c-slider`（syncUI `--fill` setProperty 保留）；motion-lab.js 模板双类 `c-slider ml-slider`（JS :156/177/178 语义定位保留）；customizer.css / motion-lab.css 删独立规则；新增 slider.test.js 签名契约守卫；e2e/单测选择器更新；视觉基线 12 张重生成。
- **偏离**：① `tests/e2e/form-controls.spec.js`「滑杆使用主题强调色」断言重写（brief Files 未列此文件但 Step 7 要求全绿）：Chromium 151 起 `getComputedStyle` 对 `::-webkit-slider-*` 伪元素样式反射失效（返回原生默认值），原生 accentColor 断言随胶囊 appearance:none 移除机制而失效，改为「渲染像素随 `--accent` 变化」截图比对（像素验证胶囊渲染正确，仅 computed 反射失效）。② 基线仅 12 张重生成（appearance 6 + motion 6；components 滑杆组在捕获 fold 之下字节不变，比 brief 预期小）。③ `.ml-control .c-slider { min-width:0 }` 未应用（实测 flex 行无溢出）。
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，5 Minor 免修）——Minor：① **plan-mandated**：非 customizer 滑杆（动效/组件）track 填充退化为静态 50%（`var(--fill, 50%)` 兜底；仅 customizer syncUI 设 `--fill`），旧原生 accent-color 三处都按值填充——brief verbatim CSS 既定后果，评审建议 **B5-5 确认或给 motion-lab input 补 `--fill` 同步**（供最终评审分诊）；② moz 端保真低（thumb 16px 无填充无 scale，brief verbatim，Chromium-only 测试不覆盖）；③ focus outline-offset 丢失（旧 .cust-range 有 4px，新无，纯外观）；④ `.ml-slider` 的 flex:1;min-width:0 移除（极窄容器边角，实测无溢出）；⑤ form-controls 断言间接性（像素验证无法区分 fill vs thumb 边框，语义等价）。⚠️ 项已核实：Chromium 151 伪元素反射失效为报告+probe 佐证（合理，评审接受）；解码比对/测试计数以报告方法学接受。
- **执行状态**：Task B5-2：✅ 完成（5810365 + e51f579，评审通过）

## Task B5-3: iOS 风格组件（徽标 / 按钮 / 悬浮球）

- **状态**：DONE（2026-08-09）
- **简报**：docs/superpowers/sdd/task-B5-3-brief.md
- **报告**：docs/superpowers/sdd/task-B5-3-report.md
- **提交**：feat（徽标/按钮/悬浮球 iOS 化）+ docs 一枚（本台账/简报/报告）
- **内容**：三组件 iOS 化（材质/层次/透明度，非色彩浓度）——徽标 `color-mix` 12% tint 底 + 22% 细描边 + 语义色文字（六变体全保留）；按钮 primary 顶部内高光 + 柔和彩影（`linear-gradient(180deg, hover, accent)` + inset 高光 + `color-mix(accent-400)` 彩影）、secondary 玻璃底呼应壳材质（hover/active 改 `filter` paint-only）；悬浮球去 accent 渐变浓底 → 玻璃底 + 亚克力模糊（`--glass-*`/`--acrylic-*` 纯消费）+ accent 图标，40→44px（HIG 最小触控区）。badge/float-ball.css 逐字替换，button.css 按 brief 替换视觉块（基类/sm/lg/disabled 结构保留）。themes.css 零改动（材质体系不动）。e2e 追加 B5-3 样式断言（badge `color(srgb` / btn inset / float-ball `blur`）；视觉基线 6 张重生成（app-main × light/dark × 3 accent，含浮球）。
- **偏离**：① brief 测试「回概览」home 选择器 `.app-main__nav-r`→`.app-main__nav-l`（右窗设置目录无 home 项，home 是左窗应用模块）；② 既有「主按钮 hover 阴影 --shadow-md 令牌」测试重写（brief 新 CSS 刻意移除 --shadow-md，改 `0 4px 14px color-mix` 柔和彩影，blur 16→14 断言随之更新）；③ 基线仅 app-main 6 张重生成（components 徽标/按钮矩阵在设置窗捕获 fold 之下 y1056+/y3453+ 字节不变，与 B5-2 滑杆同型；appearance/motion 零变化符合预期）。
- **评审**：规格 ✅ / Approved（0 Critical，1 Important plan-mandated 延期，3 Minor 免修）——**Important（plan-mandated，延期最终评审）**：primary hover 阴影丢弃 `--shadow-md` 令牌、硬编码 `0 4px 14px color-mix(...)` blur/alpha（违反 src/CLAUDE.md「禁止硬编码值」，primary hover 阴影不再随 shadow-intensity 定制器缩放）——brief 逐字 CSS 既定后果，评审裁定**上游分诊（B5-5/最终评审）非任务内修复**（偏离 brief verbatim 更糟）。与 B5-2 静态 50% 填充 Minor 同型（plan-mandated 静态值），严重度分类有分歧（B5-2 Minor vs B5-3 Important），一并留最终评审裁定。Minor：① `.c-btn` transition 未含 filter（primary hover brightness 跳变，brief verbatim + 既有 danger 先例）；② 重写 hover 测试不再守卫令牌/定制器契约（设计变更后果）；③ 徽标/按钮无像素基线覆盖（fold 局限，e2e 样式断言为唯一守卫）。⚠️ 项已核实：基线集合与 diff 一致（恰 6 张 app-main）、解码比对以报告方法学接受。
- **执行状态**：Task B5-3：✅ 完成（b7c54ec + 490706d，评审通过）

## Task B5-4: 自适应布局（限宽居中 + 分区撑满）

- **状态**：DONE（2026-08-09）
- **简报**：docs/superpowers/sdd/task-B5-4-brief.md
- **报告**：docs/superpowers/sdd/task-B5-4-report.md
- **提交**：feat（内容区自适应布局）+ docs 一枚（本台账/简报/报告）
- **内容**：内容区自适应窗口宽度——`.app-main__page` max-width 720→1080 限宽居中（`margin-inline:auto`），新增 `.app-main__page[data-layout="fluid"] { max-width:none; margin-inline:0 }` 撑满；MODULES 渲染 section 加 `data-layout="center"`（含 home 概览页）、settings section 加 `data-layout="fluid"`（设置页整体 fluid，含表单分区——表单靠 `.csettings__field` 420px 自限宽克制观感，组件/动效分区铺满）。字号间距恒定（无窗口比例缩放）。e2e 追加 B5-4 data-layout 断言；视觉基线 24 张全量重生成（内容区 720→1080 栅格扩列，计划预期）。
- **偏离**：无 verbatim 适配（CSS/JS/e2e 全逐字按 brief）。Step 5 分区内限宽**不加**（默认），2560×1440 视口截图确认表单 420px 自限宽观感克制；若超大窗口后续判定松散可按 brief 补加。
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，3 Minor 免修）——Minor：① e2e 标题「表单限宽居中」仅由概览页断言覆盖，设置页表单分区（fluid 容器 + `.csettings__field` 420px 自限宽）的克制仅手动 2560 截图守卫（brief 逐字测试，计划既定）；② `data-layout="center"` 功能冗余（无 `[data-layout="center"]` CSS 规则，默认 max-width 即居中——brief 为 e2e 稳定性显式要求）；③ app-main.css:110 注释「表单/概览保持限宽居中」措辞略不精确（表单实为 fluid 容器 + field 自限宽）。⚠️ 项已核实：24 张基线全量重生成与 720→1080 成因自洽（报告尺寸变化：components/motion 变宽变矮=栅格扩列、appearance 仅变宽=拉伸）；Step 5 决策有代码级证据（`.csettings__field { max-width:420px }` settings-window.css:64-65 确认存在）。
- **执行状态**：Task B5-4：✅ 完成（9321aaa + 542cfe0，评审通过）

## Task B5-5: 控件语言收尾（外观页密度/对齐统一）

- **状态**：DONE（2026-08-09，含 1 Minor 观察项）
- **简报**：docs/superpowers/sdd/task-B5-5-brief.md
- **报告**：docs/superpowers/sdd/task-B5-5-report.md
- **提交**：feat（外观页控件行对齐统一）+ docs 一枚（本台账/简报/报告）
- **内容**：外观页控件行对齐/密度统一——customizer.css 按 verbatim 加 `.cust-row__head { min-height:20px }`、`.cust-row--switch { min-height:40px }`（两处 switch 行 20→40px 密度下限，元素增高恰 +33px）、`.cust-row--switch .cust-row__head { min-height:auto }`、`.cust-accent-grid { align-items:stretch }`；标签基线/行距/accent 网格等高实测既有规则已满足（brief Step 3 兜底条款）。e2e 追加 B5-5 用例（基线 + 行距 + switch 密度三段断言）。视觉基线恰 6 张 appearance-partition 重生成，其余 18 张零变化。
- **偏离**：**verbatim e2e 断言与真实 DOM 结构性不匹配，需适配**（probe 实测佐证）：①「前 3 行 label top 一致 <2px」对纵向堆叠行结构性不可能（实测差 204px，含 switch 行）→ 适配为「slider 行内 label/value 同基线」；②「前 4 行间距差 <4px」中首 switch 行与下一行间隔玻璃预览卡（非 .cust-row，gap 136px 由卡片高度主导）→ 适配为「连续 slider 段行距一致」（差 0px）；③ RED 驱动改「switch 行高 ≥40px」（verbatim CSS 唯一实际渲染变化点，20→40 红→绿完整闭环）。settings-window.css 零改动（Step 4 要求现状已满足，无观感偏差）。
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，4 Minor 免修）——评审独立验证：断言①②适配结构性成立（对照 customizer-panel.js:46 glassPreview 在 switch 行与 slider 段之间、纵向堆叠行 label top 不可能 <2px）；RED 驱动③真实（min-height:40px 是 verbatim CSS 唯一可观测渲染变化，20→40 闭环）；settings-window.css 零改动正确（Step 4 三项要求现状已满足：field margin-bottom :65、field-label sm/medium :68、modes align-self :76）。Minor：① 断言②空 gap 数组时真空通过（可补 `gaps.length>0` 守卫）；② 断言①基线判别弱（label/value 框近等高，flex-start 也可能过，仅粗对齐守卫）；③ `.cust-accent-grid { align-items:stretch }` 是 CSS grid 默认 no-op（brief verbatim 计划强制，无动作）；④ 行距覆盖仅 2 个 gap、switch 行 vs slider 行密度差未断言（设计意图，观察项）+ 既有 `.cust-switch-wrap` 3.2px 中轴偏移非本 diff（延最终评审分诊）。
- **执行状态**：Task B5-5：✅ 完成（a6982db + 96e2fb6，评审通过）

## 延期项汇总（供最终整体评审分诊）

**plan-mandated 静态值（brief 逐字 CSS 既定后果，需用户/最终评审裁定）：**
1. **B5-2 Minor**：非 customizer 滑杆（动效/组件）track 填充退化为静态 50%（`var(--fill, 50%)` 兜底；仅 customizer syncUI 设 `--fill`），旧原生 accent-color 三处都按值填充。评审建议 B5-5 确认或给 motion-lab input 补 `--fill` 同步——未纳入 B5-5（范围外）。修法：motion-lab.js 或组件渲染时按值 setProperty `--fill`。
2. **B5-3 Important**：primary hover 阴影丢弃 `--shadow-md` 令牌、硬编码 `0 4px 14px color-mix(...)` blur/alpha（违反 src/CLAUDE.md「禁止硬编码值」，不再随 shadow-intensity 定制器缩放）。修法：将 blur 值令牌化（如 `--shadow-blur` 派生自 shadow-intensity）或接受静态。与 #1 同型（plan-mandated 静态值），严重度分类有分歧（B5-2 Minor vs B5-3 Important）。

**Minor 免修（记录）：**
- B5-1：font-assets 单测 weight↔file 配对未断言；tokens e2e 仅断言 400 face；字体资产 10.4MB 大。
- B5-2：moz 端保真低；focus outline-offset 丢失；`.ml-slider` flex:1;min-width:0 移除；form-controls 断言间接性。
- B5-3：`.c-btn` transition 未含 filter；重写 hover 测试不守卫令牌契约；徽标/按钮无像素基线覆盖。
- B5-4：e2e「表单限宽居中」仅概览页覆盖；`data-layout="center"` 冗余；注释措辞。
- B5-5：断言②空数组真空通过；断言①基线判别弱；accent-grid stretch no-op；行距覆盖窄；`.cust-switch-wrap` 3.2px 中轴偏移（既有）。

**评审观察（非缺陷）：** 视觉基线 fold 局限（components 徽标/按钮/滑杆在设置窗捕获 fold 之下，部分分区无像素基线覆盖，e2e 样式断言为唯一守卫）。
