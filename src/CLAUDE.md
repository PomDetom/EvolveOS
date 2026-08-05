# src/ 编码规范细则

## 组件契约

- 每组件 `src/components/<name>/` = `<name>.css` + `<name>.js`。
- JS 导出 `render(opts): string`（HTML 字符串）+ 可选 `mount(root)`（交互挂载）。
- 类名 BEM 风格、`c-` 前缀（`c-btn__icon`、`c-btn--primary`）。
- 图标：全部内联 SVG（24×24、stroke 1.8、Lucide 风格、currentColor、aria-hidden），统一经 `icon(name, size)`。

## 样式与令牌

- 禁止硬编码值：颜色/间距/圆角/时长/缓动全部引用 CSS 变量。
- 圆角一律 `calc(var(--radius-*) * var(--radius-scale, 1))`。
- 主题约定：`data-theme`（深浅）、`data-accent`（6 套主题色）、`data-motion`（动效开关）挂 `<html>`，正交组合。
- 配置链路：defaults（默认值 + RANGES）→ store（持久化）→ apply（写入 CSS 变量覆盖层）。**新增可配置参数必须三件套齐**，不绕过直接写 CSS 变量。
- 场景/展示区新增组件实例用**局部类名**，避免打破全页严格计数断言。

## 动画红线

- 布局/几何属性的动画只用 `transform` + `opacity`（GPU 合成）；禁止动画 layout 属性（left/top/width/height/margin/padding）。
- **模糊（backdrop-filter）永不动画**。
- 超过 6 项同时动画必须 stagger。
- 动效降级（reduced-motion / 动效关闭）时，时长与 animation-delay **一并归零**。
- **paint-only 过渡豁免**：`background`/`border-color`/`box-shadow`/`color` 允许用于 hover/focus/active 等短暂状态切换的过渡（不做入场/离场动效主体）；完整口径见 `docs/CLAUDE.md`「动画红线口径」。

## 验证要求

- **测试仅在 Web 环境执行**：单测（Vitest）+ 浏览器交互测试（Playwright），**不做 webview 真机验证**（Tauri 壳可启动即视为环境就绪，桌面内页面行为由用户自行测试）。
- 逻辑/配置改动 → `npm test`（单测全量）。
- 组件/交互/场景改动 → `npm run test:e2e`（全量交互测试）。
- 视觉改动 → 检查视觉基线是否需重生成，**基线变化必须确认由本次改动引起**。
- 每次提交前 → `npm run build`。

## 常见坑

- Playwright：`filter({hasText})` 只匹配可见文本（不匹配 title — 用 sr-only 方案）；transform 计算值恒为 `matrix(...)`；`evaluate` 勿返回永不 resolve 的 Promise；jsdom 无 `matchMedia` 需守卫。
- 视觉基线平台耦合（chromium-win32），换平台/CI 需重生成；截图前关闭动效（时长归零 + 禁用动画）防入场相位随机导致基线抖动。
