# B2 返工设计：玻璃 → Windows 11 亚克力材质体系 + 图标选中态去光晕

- **日期**: 2026-08-06
- **状态**: 已确认（brainstorming 完成，待写实施计划）
- **前置**: 规格 `2026-08-06-app-shell-product-design.md`（§3 B2）—— 本设计**修订**其「玻璃质感」决策为「亚克力质感」
- **分支**: `feature/b2-visual`（未合并 main，B2-1/B2-2/B2-3 已实施并评审通过，现因用户验收不满意返工）

## 1. 背景与动机

用户验收 B2 视觉效果后判**质量不合格**，两条核心意见：

1. **材质语言错了**：不要「玻璃质感」（磨砂 backdrop-filter + 玻璃高光反光），要 **Windows 11 亚克力材料效果**，重新制定此处设计语言。范围 = **整个材质体系**（导航栏/内容区/卡片/标题栏/遮罩/背景层/手机形态全部一致化），非仅背景层。
2. **图标选中态光晕失败**：nav-wheel 选中态 `.c-navwheel__glow`（径向渐变光晕层）与 icon 叠加时**图标完全看不清、观感不适**，应换其他方案展示选中。

两项均否决既有 B2 交付，须返工。分支尚未合并，返工在 `feature/b2-visual` 上进行。

## 2. 设计决策（brainstorming 确认）

| 决策 | 内容 |
|---|---|
| 材质语言 | 玻璃质感 → **Windows 11 亚克力**（着色模糊 + 细边框 + 噪点纹理 + 去高光反光） |
| 亚克力配方 | **标准含噪点**：`blur + saturate(1.8) + brightness` + 着色 rgba 底 + SVG 噪点 data-URI |
| 返工范围 | **整个材质体系**（桌面导航栏/内容区/卡片/标题栏/遮罩 + 手机形态 + 背景层预设重调） |
| 图标选中态 | **去掉 `.c-navwheel__glow` 光晕层**，只留圆角衬底（accent-100 底 + accent icon；hover 浅灰底） |
| 自定义器 | 组名「玻璃材质」→「表面质感」；开关「玻璃磨砂」→「亚克力材质」；第三滑杆「高光」→「噪点强度」 |
| 命名 | `--glass-*` 变量名 / `data-glass` / `--glass-enabled` **保留原名**（只换材质值不重构命名） |

## 3. 亚克力材质配方（Windows 11 标准）

### 3.1 表面属性（浅色 / 深色）

| 属性 | 浅色 | 深色 |
|---|---|---|
| backdrop-filter | `blur(var(--glass-blur)) saturate(1.8) brightness(1.1)` | `blur(var(--glass-blur)) saturate(1.8) brightness(0.92)` |
| 着色底 | `rgba(248 249 251 / var(--glass-bg-opacity))`（沿用 `--glass-bg-rgb`） | `rgba(24 26 32 / var(--glass-bg-opacity))`（沿用 `--glass-bg-rgb`） |
| 着色透明度 | 单一配置 `glass.opacity`（default 0.62，滑杆可调；深浅共用，`--glass-bg-rgb` 分主题） | 同 |
| 噪点纹理 | `--acrylic-noise`（SVG feTurbulence data-URI）+ `--noise-opacity`（default 0.04） | 同 |
| 边框 | `rgba(255 255 255 / 0.42)` 1px | `rgba(255 255 255 / 0.07)` 1px |
| 高光/反光 | **移除** `--shadow-inset-highlight`（顶部玻璃反光边缘）与 `--glass-highlight` 在表面上的使用 | 同 |
| 阴影 | 保留 `--glass-shadow`（柔和） | 同 |

> 值为目标值，实施时可在「克制的亚克力质感」语言内微调（如 blur 默认 24→28、saturate 1.8）。

### 3.2 噪点纹理

- `--acrylic-noise` = SVG `feTurbulence` fractalNoise data-URI（零运行时依赖，纯 CSS 内联）。
- 噪点作为材质表面的**独立噪点层**叠加在着色底之上（仿 Windows 11：防纯 blur 在渐变/网格背景产生色带，哑光不反光）。
- 不透明度由 `--noise-opacity` 控制（default 0.04，范围 0–0.12），与自定义器「噪点强度」滑杆联动。
- 噪点层实现方式（伪元素叠加 / CSS 复合背景）由实施者择简，但必须：`pointer-events: none`、不遮挡内容交互、不随内容滚动（面板滚动时噪点覆盖可视区域而非滚动跟随）、静态不参与动画（红线）。

### 3.3 表面清单（全部接亚克力）

- 桌面：`.app-main__nav-l`、`.app-main__nav-r`、`.app-main__pages`、`.app-main__card`
  - **补 `.c-titlebar`**（原 B2-1 降级清单遗漏，闭环 M-1）
  - `.c-navwheel__mask` 遮罩渐变改用亚克力底色（闭环 M-1）
- 手机：`.app-main__stack`、`.app-main__stack-page`、`.app-main__dock`
- 其他 `--glass-*` 消费者（`.glass` 类、组件卡片/对话框/悬浮窗等）同步去高光反光，材质值一致化
- `data-glass="off"` 降级语义保持：亚克力 off = `--surface-solid` 纯色不透明（暗色 `#14161c` 可微调提亮避免发闷，见 §5 质量栏）

### 3.4 背景层预设重调（配合亚克力）

- 保留 3 预设 `data-backdrop="gradient|geo|grid"`，结构不变。
- 预设观感从「浓艳光晕」改为「**柔和补色**」：降低 accent 档位 / 加大透明度，与亚克力着色叠后干净不发脏。
- 暗色下避免大面积高亮光晕（原 B2-2 I-1 问题）：光晕范围收窄、alpha 降低。
- 会话内纯 UI 态不进 store（不变）。

## 4. 图标选中态（去光晕）

- **删除 `.c-navwheel__glow`**：元素（nav-wheel.js 模板中的 `<div class="c-navwheel__glow">`）+ CSS（径向渐变、`opacity`、`transform: scale` 分层动画）全部移除。
- 选中态 = `.c-navwheel__item--active .c-navwheel__icon { background: var(--accent-100); color: var(--accent); }`（圆角衬底 + accent 色 icon，图标清晰可读）。
- hover = `.c-navwheel__item:hover .c-navwheel__icon { background: var(--surface-hover); color: var(--text-1); }`。
- **补 `.c-navwheel__item--active:hover .c-navwheel__icon`**：保持 accent 选中态优先（闭环 B2-3 M-3，hover 不再覆盖选中态）。
- **保留** B2-3 其余增强：尺寸分级（active 24 / 非 active 20）、粗细分级（2.2 / 1.8）、`--text-2` 提亮。
- 影响组件：应用壳左/右窗纯图标栏、手机 dock、组件分区 nav-wheel 演示实例（统一经 nav-wheel.css/js 生效）。

## 5. 自定义器调整

「表面质感」组（原「玻璃材质」组）：

| 项 | 现 | 改 |
|---|---|---|
| 组标题 | 玻璃材质 | **表面质感** |
| 开关标签 | 玻璃磨砂 | **亚克力材质**（`data-glass-switch` 选择器不变） |
| 第一滑杆 | 透明度 → `--glass-bg-opacity` | 不变（着色透明度） |
| 第二滑杆 | 模糊 → `--glass-blur` | 不变 |
| 第三滑杆 | 高光 → `--glass-highlight-opacity` | **噪点强度** → `--noise-opacity`（defaults `glass.noise: 0.04`，RANGES `[0, 0.12, 0.01]`，CFG_PATH 加 `noise: ['glass','noise']`，apply.js 写 `--noise-opacity` 替代 `--glass-highlight-opacity`，customizer-css.js 导出同步） |

- 玻璃材质即时预览（`glassPreview`）去掉高光视觉，改体现噪点/着色。
- 关于页「克制的玻璃质感」→「克制的亚克力质感」。

**质量栏**（暗色观感，原 B2-1 I-1 / B2-2 I-1 同题）：暗色亚克力须读作「半透明着色材质」而非「近黑实心」；表面间应有可感知的层次（背景层与表面的明度差）。实施时按此标准调 `--glass-bg-rgb` / `--glass-bg-opacity` / `--surface-solid` 暗色值，观感由用户验收。

## 6. 命名与措辞（明确边界）

- **CSS 变量**：`--glass-*`、`--acrylic-noise`、`--noise-opacity`。`--glass-highlight*` 不再被表面使用（可保留定义或移除，实施者定）。
- **属性/开关**：`data-glass="on|off"`、`--glass-enabled`、`data-glass-switch` **保留原名**（B2-1 单测/e2e 断言零破坏）。
- **UI 措辞**：凡面向用户的「玻璃」字样改为「亚克力」或「表面质感」（定制器组名/开关/关于页/组件展示 label 视情况）。

## 7. 测试与回归

- 单测：`--glass-enabled` / `data-glass` 断言保留；`--glass-highlight-opacity` 相关若存在则改为 `--noise-opacity`；新增 `glass.noise` 写入断言。
- e2e：开关选择器 `[data-glass-switch]` 不变；测试名「玻璃两档」→「亚克力两档」；无测试断言光晕/分组标题文案（预检已确认）。
- 视觉基线：18 张重生成（材质 + 图标去光晕变化，逐张解码比对确认差异来源）。
- 动画红线：噪点/背景层静态、blur 不动画、选中态只走 color/background（paint-only 豁免）。
- 全量回归四项：`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## 8. 非目标（本期不做）

- **不重构命名**：`--glass-*` / `data-glass` 保持（用户未选命名全换；语义已由 UI 措辞承担）。
- **不改 data-glass 两档开关语义**（亚克力 on/off → solid 纯色）。
- **不重画背景层结构**（3 预设保留，只调观感）。
- FloatBall 悬浮球的光晕（非 nav-wheel 图标选中态，属另一组件）不在本次范围。
- B3 设置完善（分组重命名全量、实时整体预览卡）仍为后续独立计划；本次仅做材质转向必要的最小措辞同步。
