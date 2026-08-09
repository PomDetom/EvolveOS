# 应用壳 B6 设计规格（页面样式刷新：背景装饰 / 悬浮球 / 按钮）

- **日期**: 2026-08-09
- **前置**: B5 设计语言统一 + B5-F1 字体修复已合并 main（a5edb0a）
- **来源**: 用户头脑风暴「现已无明显问题，开启下一个大阶段，着重优化页面样式」三项需求
- **目标**: ① 背景装饰多样化（强化网格 + 新增多样式）② 悬浮球悬停去光晕 ③ 按钮控件参考成熟方案改扁平实心
- **范围决策**: 材质体系（玻璃/亚克力）不动，仅交互组件与装饰背景优化；单版本 B6，3 任务

## 1. 项目当前状态与问题

B5 已落地（字体 55/65/85、胶囊滑杆、iOS 组件、自适应布局、控件收尾、伪字重修复）。用户目检后提出三项遗留问题：

1. **背景网格几乎看不出效果**：`data-backdrop` 四预设（渐变/几何/网格/关闭），网格 = 40px 1px 细线 25% accent-300，画在磨砂玻璃（blur 30 + 0.48 透明）之下被重度磨糊。
2. **悬浮球悬停太花哨**：hover 有 `0 8px 22px accent-300` 彩色光晕阴影 + 外圈 `.c-float-ball__glow` 径向光晕环渐显——两层光晕，看着奇怪。
3. **按钮仍不好看**：primary 渐变底 + 顶部内高光 + `--shadow-glow` 彩色投影（B5-3 iOS 化产物），用户参考成熟方案后判定要改扁平实心。

## 2. 核心铁律（延续既有，违反即失败）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；桌面观感由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。paint-only 豁免（background/border-color/box-shadow/color/filter）仅限 hover/focus/active。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（显式 `document.fonts.load`，B5-1/F1 模式，含 500 档）。
- e2e 必须用 `playwright.config.worktree.js`（端口 5174 新鲜 server；共享 checkout 陈旧 5173 已由用户 reset 后重启，若仍残留须规避）。
- 每任务 TDD + 独立评审；留痕入 `docs/superpowers/sdd/`；每任务结束全量回归绿。
- **任务直接在共享 checkout（主工作目录）执行，不用 git worktree 隔离**（B5 确立，已入 CLAUDE.md）。
- 材质体系（themes.css Windows 亚克力配方）不动；`--font-mono` 不动。

## 3. 背景装饰多样化（Task B6-1）

**现状**：`data-backdrop` 四预设（gradient/geo/grid/none），网格 1px/40px/25% accent 被磨砂磨糊。选择器为外观分区 4 个文字胶囊按钮。

**方向**（用户选「衬底更鲜明」）：保留玻璃材质，图案更突出、样式更多样。

### 3.1 强化网格

`data-backdrop="grid"` 改为工程网格感：
- 线 2px + 格距 24px（比现 1px/40px 更密更粗）
- 交点圆点：`radial-gradient` 圆点落在交点（multi-layer background 叠加）
- accent 浓度 25% → 40%（更可感知但克制）

### 3.2 新增预设（8 预设全集）

| 预设 | 图案 | 实现要点 |
|---|---|---|
| `gradient` | 极光式大色块（现有微调） | 保留两团 accent 光晕，微调浓度 |
| `geo` | 几何斜切（现有） | 保留 |
| `grid` | **强化工程网格**（3.1） | 2px 线 + 24px 格距 + 交点圆点 + 40% accent |
| `dots` | 圆点点阵 | radial-gradient 圆点 24px 网格位 |
| `diagonal` | 斜线纹理 | 45° repeating-linear-gradient 斜纹 |
| `waves` | 波纹横线 | 两层不同波长 repeating-linear-gradient 叠加成波感 |
| `aurora` | 极光大色块（扩展 gradient 的多色版） | 2-3 团 accent + 中性色光晕 |
| `none` | 关闭 | 实底（现有） |

**实现**：全部纯 CSS，沿用 B2 机制——每个预设 = `.app-main[data-backdrop="X"] { --backdrop-bg: 多层 background }` + 对应 `.app-main__backdrop { background-size }`。零运行时成本、零架构改动。

### 3.3 选择器 UI：迷你图案预览卡

外观分区背景选择器从 4 文字胶囊 → **8 迷你图案预览卡**：
- 每个卡 = 小方形（约 48×32）背景直接铺该预设图案 + 下方文字标签
- 激活态 = accent 描边（paint-only，无动画主体）
- 局部类 `app-main__backdrop-*` 前缀保留（不打破全页计数断言）
- 会话内纯 UI 态，不进 store（延续 B2 决策）

### 3.4 验证

- e2e：切换新预设 → `.app-main` 的 `data-backdrop` 生效 + 预览卡激活态切换；8 预设卡片存在性计数
- 视觉基线：网格/新预设分区重生成（app-main 含背景的分区），解码比对确认图案差异

## 4. 悬浮球去光晕（Task B6-2）

**现状**（float-ball.css）：hover = `translateY(-2px)` + `box-shadow: 0 8px 22px var(--accent-300)` 彩色光晕 + `.c-float-ball__glow` 径向光晕环渐显（inset:-8px 外圈）。

**改动**（用户选「去光晕保上浮」）：
- **删 `.c-float-ball__glow` 光晕环**：CSS 规则 + HTML 模板渲染点一并删除
- **hover 阴影去彩**：`0 8px 22px var(--accent-300)` → 中性投影 `var(--shadow-md)`（随 shadow-intensity 定制器缩放，不硬编码）
- **保留**：`translateY(-2px)` 上浮 + `inset 0 1px 0 rgba(255,255,255,.3)` 内高光（层次非光晕）+ 静止态 `--glass-shadow`
- 动画红线：hover 仍只动 transform/box-shadow（中性投影），符合红线

**验证**：e2e B5-3 浮球断言（backdrop-filter 含 blur）保持；补 hover 阴影不含 accent 彩色的断言；视觉基线按实测（静止态无变化则零基线改动，仅 hover 断言覆盖）

## 5. 按钮扁平实心（Task B6-3）

**现状**（button.css）：primary 渐变底（`linear-gradient(180deg, accent-hover, accent)`）+ 顶部内高光 + `--shadow-glow` 彩色投影；hover `filter: brightness` + `--shadow-glow-hover`。

**改动**（用户选「扁平实心」）：
- **primary 实心**：
  ```css
  .c-btn--primary {
    background: var(--accent);            /* 实色，去渐变 */
    color: var(--accent-contrast);
    box-shadow: var(--shadow-sm);         /* 中性轻投影，去彩色光晕 */
  }
  ```
  - hover theme-aware：浅色主题 `background: color-mix(in srgb, var(--accent) 92%, black)`（暗一档）；深色主题反向 `color-mix(..., white)`（亮一档）——经 `:root[data-theme]` 区分
  - active：`scale(0.97)` 下压（既有）
- **删彩影令牌**：`--shadow-glow` / `--shadow-glow-hover`（themes.css B5-F1 新增）删除 + button.css 引用清理 + 相关 e2e 断言更新（B5-3/B5-F1 重写过的 hover 测试再同步）
- **secondary**：玻璃底保留（B5-3），hover 背景微调
- **ghost**：不变
- **danger**：hover `filter: brightness` → 实色明暗（与 primary 同机制 theme-aware）

**验证**：e2e 按钮断言更新（实心 + 中性投影 + theme-aware hover 计算值）；视觉基线 components/app-main 相关分区重生成（解码比对确认仅按钮视觉变化）

## 6. 任务分解（B6，3 任务串行，每任务 TDD + 独立评审）

| Task | 内容 | 关键文件 |
|---|---|---|
| **B6-1** | 背景装饰多样化：强化网格 + 新增 dots/diagonal/waves/aurora 预设 + 迷你预览卡 UI | `app-main.css`、`app-main.js`、`partitions.css` |
| **B6-2** | 悬浮球去光晕：删 glow 元素 + 中性投影 | `float-ball.css`、float-ball.js（若渲染 glow） |
| **B6-3** | 按钮扁平实心：primary 实色 + theme-aware hover + 删彩影令牌 + 变体协调 | `button.css`、`themes.css`、customizer 相关 |

**依赖**：B6-1 独立；B6-2/3 独立且互相不依赖。串行执行（每任务 TDD + 独立评审 + 全量回归绿）。

## 7. 测试策略（仅 Web 环境）

| 改动 | 验证 |
|---|---|
| 背景预设 | 8 卡存在性 + 切换 data-backdrop 生效断言；视觉基线（含背景分区）解码比对 |
| 浮球 | hover 中性阴影断言（无 accent 彩）；静止态基线零变化或解码比对确认 |
| 按钮 | primary 实色 + 中性投影 + theme-aware hover 计算值断言；视觉基线解码比对 |

**视觉基线**：网格/新预设 + 按钮相关分区重生成（预期内）；截图前等字体加载完成（含 500 档）。

## 8. 非目标

- 材质体系（玻璃/亚克力配方）不改（用户明确「衬底更鲜明」= 图案强化而非玻璃变透）。
- 不引入背景参数可配置化（密度/色浓度固定，先看观感；如需可后续）。
- 不做按钮微交互动画（ripple 等）——保持零依赖克制风格。
- 不改 `--font-mono`、不改 12 套强调色/语义色色板。
- 不重构组件抽象层。

## 9. 交付形态

- Git：分支 `feature/b6-page-style-refresh`（自 main a5edb0a 检出），在共享 checkout 执行；每任务 TDD + 独立评审，全量回归绿后合并 main。
- 留痕：`docs/superpowers/sdd/progress-b6.md`。
- 桌面目检：① 背景网格/点阵/斜线等可感知 ② 悬浮球 hover 克制不花哨 ③ 按钮扁平实心好看、hover 明暗自然。
