# ui-design — Tauri 统一 UI 设计系统

为多个 Rust Tauri 桌面应用（剪贴板、密码管理、记账等）建立统一设计语言的**设计系统展示页**项目。纯原生 Web（Vite + HTML/CSS/JS，**零框架零运行时依赖**），核心特征：克制的玻璃质感、深/浅双主题、6 套主题色预设、滑动选择导航（NavigationWheel）、可配置主题定制器、3 个场景模板（剪贴板悬浮窗/主窗口/设置页）。

## 文档索引

| 文档 | 路径 |
|---|---|
| 设计规格（已确认） | `docs/superpowers/specs/2026-08-04-tauri-ui-design.md` |
| 实施计划（21 任务 + 修订记录） | `docs/superpowers/plans/2026-08-04-tauri-ui-design.md` |
| 会话交接快照 | `HANDOFF.md` |

## 开发命令

```bash
npm run dev        # 开发服务器 (localhost:5173)
npm test           # Vitest 单元测试
npm run test:e2e   # Playwright 交互测试（自动拉起 dev server）
npm run build      # 生产构建
```

## 工作流约定（重要）

- 本仓库实施遵循 **superpowers:subagent-driven-development**（SDD）：每个任务派发独立 implementer 子代理 → 任务评审 → 修复循环，进度记录在**账本** `.superpowers/sdd/2026-08-04-tauri-ui-design/progress.md`。
- **会话开始时**：若实施计划未完成，先读 `HANDOFF.md` 与账本 `progress.md`（账本首行指向计划文件，含每任务提交哈希与完成状态），从账本中第一个没有 `Task <N>: complete` 行的任务恢复，**不要重新派发已完成任务**。
- 任务简报与实施报告位于 `.superpowers/sdd/2026-08-04-tauri-ui-design/`（`task-N-brief.md` / `task-N-report.md`），派发实施子代理时用它。
- 全局约束（所有任务必须遵守）：零运行时依赖；动画只动 transform/opacity，模糊永不动画，6 项以上动画必须 stagger；所有时长/曲线经 CSS 变量引用；组件 = 原生 HTML + CSS 类（BEM `c-` 前缀）+ 渐进增强 JS，统一 `render()`/`mount()` 接口；图标全部内联 SVG（24×24，stroke 1.8）；文案中文；`data-theme`/`data-accent` 挂 `<html>`。
- 分支：当前实施在 `feature/ui-design-system`（main 仅文档）。
- **任务间不要并行派发实施子代理**；任务完成后立即生成审查包（`scripts/review-package`）派发评审，发现按 Critical/Important/Minor 处理，Minor 记入账本留给收尾。
