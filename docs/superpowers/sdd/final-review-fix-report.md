# B6 最终评审修复报告（hover 混色 88%→92% 对齐规格 §5）

- **状态**：DONE（2026-08-09）
- **需求源**：B6 最终整体评审唯一 spec-authority 差距 —— 设计规格 §5（`docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-design.md`，权威需求源）声明按钮 theme-aware hover 混色为 **92%**，而计划/简报转录与代码实现均为 88%
- **分支**：feature/b6-page-style-refresh（共享 checkout 直改，无 worktree 隔离）
- **提交**：`b178653` `fix: primary/danger hover 混色 88%→92%（对齐规格 §5，B6 最终评审）`

## 变更内容

仅改 `src/components/button/button.css` 四条 theme-aware hover 规则，其余代码零改动：

| 行 | 规则 | 变更 |
|---|---|---|
| 18 | `:root[data-theme="light"] .c-btn--primary:hover` | `var(--accent) 88%` → `92%`（混 black） |
| 19 | `:root[data-theme="dark"] .c-btn--primary:hover` | `var(--accent) 88%` → `92%`（混 white） |
| 31 | `:root[data-theme="light"] .c-btn--danger:hover` | `var(--danger-500) 88%` → `92%`（混 black） |
| 32 | `:root[data-theme="dark"] .c-btn--danger:hover` | `var(--danger-500) 88%` → `92%`（混 white） |

评审已核验 luma-direction e2e 断言对 88% / 92% 均成立（方向性断言不受幅度影响）。视觉基线不含 hover → **零基线影响，未触碰任何 baseline，无 `--update-snapshots`**。

## 验证

| 命令 | 结果 |
|---|---|
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-3"`（覆盖测试：theme-aware hover luma 断言） | **2 passed**（B5-3 徽标/按钮/悬浮球 + B6-3 按钮 primary 实色扁平） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js`（整个文件） | **6 passed** |
| `npm test` | **15 files / 69 passed** |
| `npm run build` | 通过（✓ built in 425ms） |
| `npx playwright test --config=playwright.config.worktree.js`（全量回归） | **115 passed / 1 failed** —— 唯一失败 `app-shell.spec.js:270` 设置分区「组件/动效挂载展示内容」（`.csg` 计数 0，惰性挂载 5s 超时），为已知 **components/motion mount flake**（与 B5-3/5-final 记录同型：全量并行资源紧张导致惰性挂载超时）；**单独复跑 1/1 passed** → 并集 116/116 绿 |

> 两个已知 flake（components/motion mount、app-shell 亚克力两档 data-glass timing）中，本次全量仅命中前一个，且隔离复跑全绿；第二个未出现。均为环境 flake，非本次修复回归。

## 关注点

无。改动为纯数值对齐（88%→92%），与规格 §5 一致；测试全绿，基线零影响。

## 提交

`b178653`（仅 `src/components/button/button.css`，1 file changed, 4 insertions(+), 4 deletions(-)）。`playwright.config.worktree.js` 未入库（git-ignored，仅本地使用）。
