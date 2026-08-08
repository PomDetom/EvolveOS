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
