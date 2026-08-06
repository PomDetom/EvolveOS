# SDD ledger — plan: docs/superpowers/plans/2026-08-06-app-shell-b1.md

Base: 86398d0（branch feature/b1-product，自 main 检出）

规格：docs/superpowers/specs/2026-08-06-app-shell-product-design.md（§2 B1 部分）
计划书：docs/superpowers/plans/2026-08-06-app-shell-b1.md

## Pre-flight 决策（2026-08-06，用户确认）

1. **B1 边界**：只管架构，视觉归 B2（玻璃/图标不在此计划）。
2. **B1-1 展示分区**：`APP_SECTIONS` 10 分区（共享 `SECTIONS` 保持 8，docs 场景 scene-settings count 8 零冲击）；组件/动效分区惰性挂载。
3. **B1-2 浏览器窗口控制**：按钮保留 + toast「此功能在桌面端生效」。
4. **B1-3/B1-4**：docs e2e 迁移/删除；模式简化 app/strip 两态；docs-mode.js 删除。

## Task B1-1: 设置分区扩展（组件/动效分区 + 展示内容内化）

- **状态**：完成（2026-08-06）
- **提交**：`a4fad8e` `feat: 设置分区扩展（组件/动效分区 + 展示内容内化）`
- **验证**：npm test 51/51；npm run test:e2e 119/119（app-shell 17 含新用例 + docs 84 零冲击 + scene-settings count 8 绿 + 视觉全绿）；npm run build 通过
- **实现**：`settings-pages.js` 新增 `APP_SECTIONS`（10 分区，`SECTIONS` 保持 8）+ `pageBody` 分区分支 + `renderSettingsPages(sections = SECTIONS)` 参数化；`app-main.js` 全部 SECTIONS 引用切 APP_SECTIONS（设置轮/桌面 ctx/手机 tabs/手机 ctx）+ 分区惰性动态 `import()` 挂载（桌面模块标志 + 手机 children-empty 模式）；组件分区挂剪贴板悬浮窗组合示例；展示模块自 import CSS；新建 `partitions.css`
- **简报/报告**：docs/superpowers/sdd/task-B1-1-brief.md / task-B1-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，4 Minor）
- **Brief 修正（实施实测）**：① APP_SECTIONS 追加尾部（组件8/动效9），测试 nth(8)/nth(9)；② 组件分区产出 7 个 `.csg`（6 组 + 交互块）；③ motion-lab.css 路径 `../styles/`；④ 手机路径不共享桌面 DOM（栈重建），用 children-empty 模式
- **Minor 留收尾**：① 手机动效分区 store 订阅泄漏（mountMotionLab subscribe 无退订，手机每次重进累积——与定制器 M1 已修模式不一致，B1-2+ 暴露 unsubscribe 关闭）；② 手机 components/motion tabs 无 e2e 覆盖（泄漏路径也未测）；③ 惰性加载未断言（激活前 `.csg` count 0 可加一条）；④ 动态 import 无 .catch（chunk 加载失败时桌面分区永久空，一行可修）

## Task B1-2: 窗口控制双通道（浏览器降级）

- **状态**：完成（2026-08-06）
- **提交**：`b03117e` `feat: 窗口控制浏览器降级通道（按钮保留 + 桌面端提示）`
- **验证**：npm test 51/51；npm run test:e2e 120/120（新用例「浏览器模式窗口控制按钮 → 桌面端提示」+ docs 84 零冲击）；npm run build 通过
- **实现**：`window-controls.js` `bindWindowControls` Tauri 路径逐字未动，仅 `if (!win)` 走新增浏览器降级——min/max/close → `toast('此功能在桌面端生效', { variant: 'info' })`（显式 allowlist 不劫持设置按钮），返回 `'browser'`；WeakSet 幂等；拖拽区 `--browser` 标记类启用 `:active` transform/opacity 反馈（时长经 CSS 变量）。返回值契约 `false`→`'browser'` 连带更新 title-bar.spec 断言（唯一返回值依赖方，两运行时调用点 app-main/docs-mode 均不读返回值）
- **简报/报告**：docs/superpowers/sdd/task-B1-2-brief.md / task-B1-2-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，3 Minor）
- **Minor 留收尾**：① 设置按钮不劫持无负向断言（代码正确，可加一行 `.c-toast` count 检查锁定）；② 幂等仅覆盖浏览器路径（不防「先浏览器降级再注入真实 API」的双监听——生产页面二态不共存，title-bar.spec 内发生但无测试破坏）；③ 视觉回归 scenes 组全量并行偶发 flake（干净树可复现，pre-existing 并行负载渲染 flake，与本次改动无关——改动静态渲染零 footprint）

## Task B1-3: docs e2e 迁移（分区内验证 + 删除无宿主用例）

- **状态**：评审 ❌ → 修复循环
- **提交**：`613eaf1` `test: docs e2e 迁移至应用壳设置分区（组件/动效/外观）`
- **验证**：npm run test:e2e 104/104（迁移后 net -16）；npm test 51/51；npm run build 通过；控制器独立复跑 e2e 104 绿
- **实现**：`helpers.js` `openSettingsPartition`（桌面作用域 + 惰性挂载等待）；11 个 spec 迁移至分区（组件 index 8 / 动效 9 / 外观 1）；title-bar 保留 B1-2 `toBe('browser')`；smoke → `?mode=app`；删除 6 个 docs 专属 spec（theme-switcher/token-showcase/nav-wheel/layout/scene-main-window/scene-settings）
- **简报/报告**：docs/superpowers/sdd/task-B1-3-brief.md / task-B1-3-report.md
- **评审**：规格 ❌ → 修复循环（1 Important：**nav-wheel 滚轮→吸附→锚点行为失去唯一测试**——删除的「滚轮滚动停止后吸附最近项并选中」（spec §8.3 不得悬置）是唯一测垂直轮滚轮行为的用例；报告称被 app-shell/mobile-nav 覆盖但实测不成立（app-shell 只测 click→锚点，mobile-nav 只测横向），应在应用壳左栏 `.app-main__nav-l .c-navwheel__list` 重挂该断言而非删除）
- **评审修复（2026-08-06，已闭环）**：`c6cbaf7` `fix: 恢复垂直导航轮滚轮吸附覆盖测试` —— 重挂到应用壳左栏 `.app-main__nav-l .c-navwheel__list`（`?mode=app`，7 模块垂直轮 anchorRatio 0.382），保留原断言（wheel 100 → 停止 150ms 吸附 → active count 1 → 38.2% 锚点 delta < 4px）；验证：app-shell 19/19、全量 e2e 105（104+1）、npm test 51、build 通过
- **Minor 留收尾**：① customizer 重置/导出覆盖丢失（重置=清除存储+applyConfig(DEFAULTS)、导出=复制 CSS 变量，现仅测冷启动持久化）；② theme-switcher aria-pressed 单选语义断言丢失（app-shell 只断言 class 与 data-theme 持久化）；③ 报告表 components-basic 行 `#components` 表述与实际分区容器作用域不符（等值覆盖，表文案漂移）；④ tokens.spec 分区访问对全局 CSS 断言惰性（vestigial）

## Task B1-4: 模式简化 + docs 渲染删除

- **状态**：完成（2026-08-06）
- **提交**：`415b640` `feat: 模式简化（浏览器直进应用壳）+ docs 渲染删除`
- **验证**：npm test 52/52（mode 单测 6 例）；npm run test:e2e 81/81（非视觉 63 + 视觉 18）；npm run test:visual 18/18（42→18：删 36 docs 张 + 保留 app-main 6 + 新增组件/动效分区 12 张）；npm run build 通过；app-main 基线逐字节零变化
- **实现**：`mode.js` `resolveMode` 只返回 app|strip（无参/非法/?mode=docs → app，?mode=strip 保留）；`main.js` 删 docs 分支 + 5 个 docs CSS import（保留 settings-window.css/customizer.css）；删 `docs-mode.js` + 4 个孤儿模块（theme-switcher/token-showcase/main-window 场景/settings-window 场景）；保留 5 个应用壳复用模块（component-showcase-full/motion-lab/clipboard-float/customizer-panel/settings-pages，均已自 import CSS）；视觉基线重构（SHOTS 3 组 × 2 主题 × 3 accent = 18，分区基线等惰性挂载内容出现再截图）；README/根 CLAUDE/src CLAUDE 模式说明同步
- **简报/报告**：docs/superpowers/sdd/task-B1-4-brief.md / task-B1-4-report.md
- **评审**：规格 ✅ / Approved（0 Critical/Important，3 Minor）
- **Minor 留收尾**：① `src/styles/layout.css` 含 docs 时代死规则（.app-shell/.topbar/.navwheel/.tsw__*）+ 第 17 行引用已删 token-showcase.css 的过时注释（.showcase__* 仍被组件分区用故文件保留，留后续清理）；② `resolveMode` hasTauri 参数现为死参数（保留接口签名，随 layout.css 清理一并移除）；③ visual spec 硬编码 `toHaveCount(10)`（未来共享分区增减需同步更新）

## 执行状态

- Task B1-1 设置分区扩展（组件/动效 + 展示内化）：✅ 完成（2026-08-06）
- Task B1-2 窗口控制双通道（浏览器降级）：✅ 完成（2026-08-06）
- Task B1-3 docs e2e 迁移：✅ 完成（2026-08-06，修复闭环）
- Task B1-4 模式简化 + docs 删除：✅ 完成（2026-08-06）

## 执行规则（摘要，详见计划书与 docs/CLAUDE.md）

- 测试仅在 Web 环境执行；每任务结束全量回归绿（npm test + test:e2e + test:visual + build）
- 每任务：简报 → 派发 → 报告 → 审查包 → 评审 → 修复循环（≤5 轮）→ 本账本留痕（随代码提交）
- 动画红线：只动 transform/opacity；配置链路不绕过
