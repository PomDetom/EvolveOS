# SDD ledger — plan: docs/superpowers/plans/2026-08-09-app-shell-b5-faux-weight-fix.md

Base: be55eae（branch feature/b5-faux-weight-fix，自 main 0b79e70 检出）
规格：docs/superpowers/specs/2026-08-09-app-shell-b5-faux-weight-fix-design.md（唯一需求源）
计划书：docs/superpowers/plans/2026-08-09-app-shell-b5-faux-weight-fix.md（唯一实施需求源）

## Pre-flight 扫描（2026-08-09，干净，无阻塞冲突）

- 单任务（B5-F1），无任务间矛盾；无「测试断言空洞/逻辑块逐字重复」的计划强制造缺陷。
- B5-1 的 `document.fonts.ready` 竞态适配模式沿用（显式 `document.fonts.load`）。
- medium 字重渲染变化 → 预期内多分区视觉基线重生成（先解码比对）。
- 环境：共享 checkout 陈旧 5173 server（PID 11964）运行中——e2e 一律 playwright.config.worktree.js（5174）。worktree 已建该配置（不提交）。共享 checkout 尚未同步新 main（用户待 reset），不影响本 worktree。
- 基线前提：main 0b79e70 全绿（B5 合并后 112/112）。

## Task B5-F1: 普惠体 500 字重补齐（65 Medium）

- **状态**：完成
- **简报**：docs/superpowers/sdd/task-B5-F1-brief.md
- **报告**：docs/superpowers/sdd/task-B5-F1-report.md
- **提交**：`5122103` feat（65 woff2 + fonts.css 500 档 + 单测/e2e 断言 + 8 张视觉基线重生成）；`74721f2` fix（评审 round 1/5：visual-regression 字体等待补 500 档）；docs 提交含本账本。
- **评审**：round 1/5 发现 1 个 Important（visual-regression 未显式 load 500 档 → appearance 基线确定性缺口），已修复（`74721f2`），视觉回归 24/24 绿 + build 通过。
- **结论**：单测 65/65、e2e 112 passed（smoke 冷启动 flake 重跑绿）、build 成功；视觉基线 8 张重生成，解码比对确认仅 medium 字形粗细变化（真 65 vs 伪粗），非布局/颜色。
