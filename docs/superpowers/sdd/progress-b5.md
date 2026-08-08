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
- **评审**：（待评审，0 提交前自审结论：DONE——TDD RED/GREEN 完整、解码比对确认纯布局宽度差异、单测 64/64 + 全量 e2e 109 并集 + build 全绿）
- **执行状态**：Task B5-4：✅ 完成（feat + docs，待评审）
