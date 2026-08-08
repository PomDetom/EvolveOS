# 应用壳 B5 设计规格（设计语言统一 + iOS 风格组件 + 字体替换 + 自适应布局）

- **日期**: 2026-08-09
- **前置**: B4 收尾修复已合并 main（317b0c4）；fix/b4-strip-open 与 worktree-b4-close-sizing 已删
- **来源**: 用户四项需求头脑风暴（2026-08-09 会话）：① 字体观感 ② 设置页控件风格统一 ③ 徽标/按钮/悬浮球重设计 ④ 页面内容同步缩放
- **目标**: ① 阿里普惠体全局替换字体 ② 三区（外观/动效/组件）控件语言统一 ③ 徽标/按钮/悬浮球 iOS 风格化 ④ 内容区自适应布局
- **范围决策**: 材质体系（Windows 亚克力）**不动**，仅交互组件 iOS 化；整体为单个 B5 版本（方案 A），5 任务串行

## 1. 项目当前状态与问题

应用壳为唯一产品形态（浏览器 `/` 与 Tauri 直进应用壳）。B4 收尾已落地：悬浮窗尺寸 LogicalSize 贴合、主窗关闭可配置（closeBehavior + Rust on_window_event）、strip 恢复主窗按钮。当前 `main` @ `317b0c4`。

**用户报告的四项问题**：

1. **字体观感不佳**：`--font-sans`（tokens.css:23）是系统字体栈，Windows 中文走微软雅黑，观感普通。
2. **设置外观页观感突兀 + 三区滑杆不一致**：
   - 外观页（定制器 6 组）观感突兀，问题集中在**布局对齐、密度节奏、风格割裂**三类。
   - 三处滑杆三种实现：组件 `.c-slider`（原生 accent-color，slider.css:1）、动效 `.ml-slider`（原生 accent-color，motion-lab.css:129）、外观 `.cust-range`（自绘圆拇指，customizer.css:145-168）。
3. **徽标/按钮/悬浮球不好看**：底色过于浓厚（实色平涂、无层次），用户希望类 iOS 风格。
4. **页面内容大小定死**：`.app-main__page { max-width: 720px }`（app-main.css:108），窗口放大内容不变。

## 2. 核心铁律（延续既有，违反即失败）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- 每任务 TDD、独立评审、修复循环（≤5 轮）、留痕入 `docs/superpowers/sdd/`；每任务结束全量回归绿。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 update-snapshots**；本版本字体替换 + 组件改版 → 预期内大量重生成。
- 测试环境截图须确保字体加载完成（`document.fonts.ready`）防基线抖动。

## 3. 字体全局替换（阿里普惠体）

**选择**：阿里普惠体 55（Regular）/ 85（Bold）两档，WOFF2 格式（官方包已带，55=5.2MB、85=5.5MB），随项目提交 `src/assets/fonts/`。正文 55 + 拉丁回退混排，标题 85。`--font-mono` 保留 JetBrains Mono/Cascadia（数值/代码走等宽）。

**@font-face**（新增 `src/styles/fonts.css`，由 `src/styles/base.css` 引入——base.css 是全局样式入口，Tauri/浏览器共用）：

```css
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2') format('woff2');
  font-weight: 700; font-display: swap;
}
```

**令牌替换**（tokens.css:23）：

```css
--font-sans: "Alibaba PuHuiTi", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
```

- 普惠体排最前：中文/标点走普惠体，拉丁（英文/数字）在普惠体缺字形时回退 Segoe UI。
- 字号层级 `--font-size-*`、字重 `--font-weight-*` 现有令牌不动（B4-2 已 real 生效）；字重 400/700 直接映射普惠体 Regular/Bold。
- 文件落地：`src/assets/fonts/` 两个 `.woff2` 随代码提交；Vite 构建自动带 hash。
- 浏览器性能：`font-display: swap`（FOIT 变 FOUT）；Tauri 本地加载即时。

**注意**：
- e2e 视觉基线因字体替换**全量变化**（预期内），须重生成。
- 截图前等待 `document.fonts.ready`（CJK 字体大，未加载完成会截图系统字体 → 基线抖动）。

## 4. 统一 Slider 组件（胶囊形）

**目标**：三处滑杆（组件 `.c-slider` / 动效 `.ml-slider` / 外观 `.cust-range`）统一到一个胶囊形 Slider 组件，视觉一致。

**新组件**：`src/components/slider/` 现有 `renderSlider`（slider.js:1）升级为胶囊形自绘。CSS 设计：

```css
.c-slider { width: 100%; height: 24px; -webkit-appearance: none; appearance: none;
  background: transparent; }
.c-slider::-webkit-slider-runnable-track {
  height: 8px; border-radius: 999px;
  background: linear-gradient(var(--accent), var(--accent)) 0 / var(--fill, 50%) 100% no-repeat,
    var(--surface-hover);
}
.c-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; margin-top: -6px;
  border-radius: 8px;  /* 胶囊圆角拇指 */
  background: var(--surface-2); border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
  transition: transform var(--dur-fast) var(--ease-spring);
}
.c-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
.c-slider::-webkit-slider-thumb:active { transform: scale(1.05); }
```

- 胶囊形：轨道 8px 全圆角 + 拇指 20×20 圆角 8px（明显圆角，非圆点）。
- accent 填充：轨道左段 accent、右段 surface-hover（`--fill` 变量机制，customizer 现用）。
- 触控友好：thumb 20px（现 customizer 14px）。
- 保留 `renderSlider({...})` 签名，兼容组件分区现有调用（component-showcase-full.js:15）。
- 红线段：thumb hover/active 只动 transform；track 填充是背景渐变（paint-only，不参与动画）。

**三处接入改造**：

| 位置 | 现状 | 改为 |
|---|---|---|
| 组件分区 `.c-slider` | slider.css 原生 accent | 胶囊自绘（slider.css 整体替换） |
| 动效分区 `.ml-slider` | motion-lab.css:129 原生 accent | 复用 `.c-slider`（删 `.ml-slider` 独立规则） |
| 外观定制器 `.cust-range` | customizer.css:145-168 圆拇指自绘 | 复用 `.c-slider` 胶囊（删 `.cust-range` 独立规则） |

**值输出/标签对齐**：三处「标签 + 滑杆 + 值」行结构统一 —— `.cust-row` 结构（label 左、value 右、滑杆在下）成为标准行模式；动效试玩器 `.ml-control`（label/滑杆/out 同行横排）保留横排但用同款 `.c-slider` 视觉。

## 5. iOS 风格组件（徽标 / 按钮 / 悬浮球）

**材质不动**（Windows 亚克力配方保持，themes.css 不改），仅三个交互组件 iOS 化。方向：靠**材质/层次/透明度**而非**色彩浓度**表达（用户明确的 iOS 观感核心）。

### 5.1 徽标 `.c-badge` → 浅 tint 底 + 语义色文字 + 细描边

```css
.c-badge { background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent-700); border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  padding: 2px 9px; font-size: var(--font-size-xs); border-radius: 999px; }
```

- 底色从「语义 50 实色」改为「accent 12% 透明混色」——透出玻璃底，层次自然。
- 细描边 1px 界定轮廓（iOS `secondarySystemFill` 风格）。
- 语义色（成功/警告/危险/信息）各自 `color-mix` 同机制，语义不丢失。
- 半透明混色让徽标「坐」在表面上而非「贴」上去。

### 5.2 按钮 `.c-btn` → 层次按钮（内高光 + 柔和投影 + 圆角）

- **primary**：accent 底保留（品牌色要实），加 `inset 0 1px 0 rgba(255,255,255,.25)` 顶部内高光 + `0 2px 8px accent-400/30` 柔和彩影 → 有厚度不扁平。
- **secondary**：玻璃底（`var(--glass-bg)` 半透明）+ 细边框 + 内高光，替代白实底——与壳材质呼应。
- **圆角**：跟随现有 `--radius-sm * --radius-scale`（B4 已参数化），不强制 iOS 12px，保持可配置。
- **hover/active**：保持 transform scale（红线内），加背景微调。

### 5.3 悬浮球 `.c-float-ball` → 玻璃悬浮球（去渐变浓底）

```css
.c-float-ball { background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness));
  border: 1px solid var(--glass-border); color: var(--accent);
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,.3);
  width: 44px; height: 44px; }
```

- 去掉 `linear-gradient(135deg, accent-400, accent-600)` 浓渐变底。
- 玻璃底 + 亚克力模糊（与壳材质一致）+ accent 图标 + 玻璃投影。
- 图标从白变 accent 色（玻璃上白字无层次）。
- hover 保留上浮 + 光晕（现有结构），光晕色随玻璃更柔。

**红线段**：三处 hover/active 都只动 transform/box-shadow/background（paint-only 豁免），符合红线。

## 6. 自适应布局（限宽居中 + 分区撑满）

**目标**：窗口放大时内容自适应，字号间距恒定（排版节奏保持）。

**改造**（app-main.css:108 现状 `max-width: 720px`）：
- **表单页（概览/设置/应用占位）**：内容区 `max-width: 720px → 1080px`，且**居中**（`.app-main__page { margin-inline: auto; }`）——大窗口下内容不拥挤靠左，两侧留白舒适。
- **展示分区（组件/动效）**：**撑满**内容区（`max-width: none`）——`auto-fill, minmax()` 栅格（app-main.css:133、motion-lab.css:8）已自动扩列，窗口变宽卡自动增多。
- **分区差异化**：给 `.app-main__page` 加修饰类（如 `data-layout="center"|"fluid"`），概览/设置/其余应用页走 center（限宽居中），组件/动效走 fluid（撑满）。
- **手机形态（≤900px）**：不变（已全屏页面栈，无 max-width 问题）。
- **字号间距恒定**：不引入窗口比例缩放，`--font-size-base` 保持 B4-2 的配置驱动，与窗口尺寸解耦。

## 7. 任务分解（B5，5 任务串行，每任务 TDD + 独立评审）

| Task | 内容 | 关键文件 |
|---|---|---|
| **B5-1** | 字体全局替换：WOFF2 落地 + `fonts.css` + `--font-sans` 替换 | `src/assets/fonts/*.woff2`、`src/styles/fonts.css`、`tokens.css` |
| **B5-2** | 统一 Slider 胶囊组件：`.c-slider` 重设计 + 三处接入（组件/动效/外观删独立规则） | `slider.css/js`、`customizer.css`、`motion-lab.css` |
| **B5-3** | iOS 风格组件：徽标浅 tint + 按钮层次 + 悬浮球玻璃 | `badge.css`、`button.css`、`float-ball.css` |
| **B5-4** | 自适应布局：`data-layout` 中心/撑满分区 + max-width 1080 居中 | `app-main.css`、app-main.js |
| **B5-5** | 控件语言收尾：外观页密度/对齐统一（标签对齐、行距、分组容器） | `customizer.css`、`settings-window.css` |

**任务依赖**：B5-2 依赖 B5-1（滑杆标签字号走新字体）弱；B5-5 依赖 B5-2（滑杆已统一）；B5-1 独立先行。串行执行。

## 8. 测试策略（仅 Web 环境）

| 改动 | 验证 |
|---|---|
| 字体 | `--font-sans` 令牌断言；字体文件存在性守卫（单测）；截图前 `document.fonts.ready` |
| Slider | `.c-slider` render 签名兼容单测；三区同一类断言（e2e）；动效/外观滑杆删独立规则后行为不变 |
| iOS 组件 | 样式断言（无浓渐变底/有内高光/半透明混色）；悬浮球 backdrop-filter 存在 |
| 自适应 | `data-layout` 类切换断言；大视口截图（组件分区扩列） |
| 控件收尾 | 外观页结构断言（行对齐/间距） |

**视觉基线**：字体替换 + 组件改版 → **全量重生成**（预期内），逐个分区解码比对确认由 B5 改动引起；材质不动 → 壳分区基线基本稳定（仅组件出现在内的分区变化）。**截图前须等字体加载完成**。

## 9. 非目标

- 材质体系（Windows 亚克力配方）不改动（用户明确选择「材质不动」）。
- 不做窗口比例缩放（字号/间距不随窗口变化，仅布局自适应）。
- 不改 `--font-mono`（JetBrains Mono/Cascadia 保留给数值/代码）。
- 不改 12 套强调色/语义色色板（仅徽标底色用法从实色改混色）。
- 不重构组件抽象层（保持零抽象封装，沿用现有 `render(opts)` 契约）。

## 10. 交接指引

- 本规格 + 实施计划由**下一轮对话**执行（当前对话产出规格与计划书）。
- 起点：`main`（317b0c4）检出 `feature/b5-*` 分支，按实施计划逐任务 SDD 执行。
- 每任务：TDD、独立评审、全量回归绿、留痕 `docs/superpowers/sdd/progress-b5.md`；完成后最终评审 + 合并 main。
- 依赖：用户已提供 55/85 WOFF2（官方包带，在 `C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-55-Regular` / `AlibabaPuHuiTi-3-85-Bold`），实施时复制到 `src/assets/fonts/`。
- **环境注意**：若共享 checkout 仍有陈旧 5173 dev server（PID 2528），e2e 用 worktree 配置（5174 新鲜 server）或先停旧进程，防 Playwright `reuseExistingServer:true` 误连测旧代码。
