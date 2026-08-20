# src/ 编码规范细则

## 组件契约

- 每组件 `src/components/<name>/` = `<name>.css` + `<name>.js`。
- JS 导出 `render(opts): string`（HTML 字符串）+ 可选 `mount(root)`（交互挂载）。
- 类名 BEM 风格、`c-` 前缀（`c-btn__icon`、`c-btn--primary`）。
- 图标：全部内联 SVG（24×24、stroke 1.8、Lucide 风格、currentColor、aria-hidden），统一 `icon(name, size)`；`icon(name, size, stroke, icons)` 第四参 `icons` = 应用级自持图标表（查找顺序 应用级 → 全局 PATHS → monitor）；应用自持图标必须 Lucide 风格（24×24/stroke 1.8/round），否则评审打回。

## 样式与令牌

- 禁止硬编码值：颜色/间距/圆角/时长/缓动全部引用 CSS 变量。
- 圆角一律 `calc(var(--radius-*) * var(--radius-scale, 1))`。
- 主题约定：`data-theme`（深浅）、`data-accent`（12 套主题色）、`data-motion`（动效开关）挂 `<html>`，正交组合。
- 语义色（成功/警告/危险/信息）随 `data-theme` 固定，**不随 `data-accent` 派生**；强调色 = 手写 50–950 预设色板，禁止任意 `--accent` 覆盖。
- 字体缩放倍率用精确有理数（calc 内 `*5/7` 非 `*0.714`）。
- 配置链路：defaults（默认值+RANGES）→ store（持久化）→ apply（CSS 变量覆盖层）；**新增可配置参数必须三件套齐**，不绕过。
- 场景/展示区新增组件实例用**局部类名**（防破全页严格计数断言）。

## 应用壳规范

- 滑动导航选中锚点 = 黄金比例 **0.382**（`anchorRatio`），禁止硬编码中心语义。
- 滑动窗口纯图标；双窗口级联（左=应用列表，右=应用目录/设置目录）；右窗状态为纯 UI 态（会话内）不进配置存储。
- 模式入口 `resolveMode` 只返回 `'app'|'strip'`（`?mode=app|strip` 显式优先；非法/无参 → `'app'`）。

## 动画红线

- 布局/几何属性的动画只用 `transform` + `opacity`（GPU 合成）；禁止动画 layout 属性（left/top/width/height/margin/padding）。
- **模糊（backdrop-filter）永不动画**。
- 超过 6 项同时动画必须 stagger。
- 动效降级（reduced-motion / `data-motion=off`）时，时长与 animation-delay **一并归零**。
- paint-only 豁免：`background` / `border-color` / `box-shadow` / `color` / `filter` 允许用于 hover/focus/active 等短暂状态切换过渡（不做入场/离场动效主体）。

## 验证要求

- 普通 Web/app 改动使用 Vitest + Playwright；涉及 Tauri window/tray/permission/filesystem/process/OS integration 时，必须补真实 Windows 桌面 evidence。
- 逻辑/配置改动 → `npm test`（单测全量）。
- 组件/交互/场景改动 → `npm run test:e2e`（全量交互；用 `--config=playwright.config.worktree.js`，端口 5174 自起 server）。
- 主题默认 `theme:'system'`：涉及主题的测试须显式 seed `theme:'light'|'dark'`。
- e2e 冷启动 flake（`page.goto` 后首断言 5s 超时、5.3MB 普惠体加载）属环境性：隔离单跑通过即接受。
- 异步/吸附/动态挂载行为写回归 e2e 时，先加确定性等待再断言（naive 立即断言在旧代码也绿，TDD 红不起来）。
- 视觉改动 → 检查视觉基线是否需重生成，**基线变化必须确认由本次改动引起**。
- 每次提交前 → `npm run build`。

## 常见坑

- Playwright：`filter({hasText})` 只匹配可见文本（不匹配 title）；`transform` 计算值恒为 `matrix(...)`；`evaluate` 勿返回永不 resolve 的 Promise；jsdom 无 `matchMedia` 需守卫。
- Vitest 会重写测试内 `import.meta.url` 字面量（环境怪癖，勿判缺陷）。
- 布局/几何边界 bug 纯函数单测复现不出时，用 Playwright 真实交互复现取证并锁定触发配置，勿停留在纯几何层下结论。
- 视觉基线平台耦合（chromium-win32）；截图前关闭动效（时长归零 + 禁用动画）防基线抖动。
- 长截图分区重生成视觉基线偶发 top-band 色带抖动属已知 run-to-shot 抖动：复跑绿即接受。
