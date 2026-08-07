# Task B2-R6: 亚克力可见性调参（明显亚克力）

（用户视觉验收反馈后的调参任务：背景装饰无效果、亚克力不明显、噪点只在展示板可见）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（blur 永不动画、背景层静态）；配置链路经 defaults→store→apply。
- 零运行时依赖；遵循 src/CLAUDE.md。
- **命名保留**：`--glass-*` / `data-glass` / `--glass-enabled` 不改名。
- 视觉基线会变（背景层更可见 + 着色透明度变化，24 张全变）→ 确认差异由本次调参引起后 `--update-snapshots`。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## 背景（用户验收，2026-08-06）

用户目检 R1-R5 后指出：① 背景装饰无效果；② 亚克力材质效果不明显（展示板更像亚克力）；③ 噪点强度只影响展示板。控制器实测（computed-style）确认：结构全对（表面 backdrop-filter `blur saturate(1.8) brightness(1.1)`、噪点层渲染且随滑杆响应），问题是**可见性**——表面着色 0.62 太不透明盖住背景层 + 背景层 alpha ≤0.3 太淡 → 模糊无物可糊。

## Files

- Modify: `src/config/defaults.js`（glass 默认值：opacity/blur/noise）
- Modify: `src/app/app-main.css`（3 预设 `--backdrop-bg` alpha 提升 + 范围铺开）
- Modify: `tests/unit/apply.test.js`（默认噪点断言 0.04→0.06）
- Test: 视觉基线重生成（24 张）

## Interfaces

- Consumes: `glass` 配置（opacity/blur/noise，defaults.js）；`--acrylic-noise`/`--noise-opacity`（R1）；`data-backdrop` 预设（R3）
- Produces: 默认观感=明显亚克力（彩色磨砂 wash 可见）

## 当前状态（实测事实）

- `src/config/defaults.js:4` `glass: { opacity: 0.62, blur: 24, noise: 0.04, blurEnabled: true }`。
- `src/app/app-main.css` 预设（R3 后）：
  - gradient：`color-mix(accent-300 26%, transparent) 0%, transparent 60%`（20% 10%）+ `color-mix(accent-300 18%, transparent) 0%, transparent 55%`（85% 90%）
  - geo：`color-mix(accent-300 20%, transparent) 0%, transparent 32%`
  - grid：`color-mix(accent-300 14%, transparent)` 线
- `tests/unit/apply.test.js:48` `expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.04');`（默认噪点断言）。
- `tests/unit/store.test.js:29` 动态引用 `DEFAULTS.glass.blur`（安全，不破）。

## 选定的强度（用户确认：明显亚克力）

| 参数 | 现 | 改 |
|---|---|---|
| `glass.opacity` | 0.62 | **0.48** |
| `glass.blur` | 24 | **30** |
| `glass.noise` | 0.04 | **0.06** |
| gradient 主光晕 | 26% | **50%**（停靠点 60%→65%，范围铺开覆盖内容区） |
| gradient 次光晕 | 18% | **30%**（停靠点 55%→60%） |
| geo 光晕 | 20% | **40%** |
| grid 线 | 14% | **25%** |
| saturate/brightness | 1.8 / 1.1·0.92 | 不变 |

## Steps

### Step 1: 写失败单测（apply.test.js）

把既有「默认噪点强度 0.04 写入」改为 0.06（`toBe('0.06')`），先确认红：

Run: `npm test -- apply.test.js`
Expected: FAIL（现 0.04 ≠ 0.06 断言失败——若先改默认值则绿，此步验证 TDD 顺序）

### Step 2: defaults.js 改默认值

```js
glass: { opacity: 0.48, blur: 30, noise: 0.06, blurEnabled: true },
```
RANGES 不动（`opacity: [0.4, 0.95, 0.01]` 下限 0.4 高于 0.48，OK；blur `[8,48,1]`；noise `[0,0.12,0.01]`）。

### Step 3: 运行绿

Run: `npm test -- apply.test.js`
Expected: PASS（0.06 断言 + 其余全绿）

### Step 4: app-main.css 背景层预设增强

把 3 预设 alpha 提升 + 范围铺开：

```css
.app-main[data-backdrop="gradient"] { --backdrop-bg:
  radial-gradient(120% 120% at 20% 10%, color-mix(in srgb, var(--accent-300) 50%, transparent) 0%, transparent 65%),
  radial-gradient(100% 100% at 85% 90%, color-mix(in srgb, var(--accent-300) 30%, transparent) 0%, transparent 60%),
  var(--surface-solid); }
.app-main[data-backdrop="geo"] { --backdrop-bg:
  radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent-300) 40%, transparent) 0%, transparent 38%),
  linear-gradient(135deg, transparent 30%, rgba(255,255,255,.03) 30% 32%, transparent 32%),
  var(--surface-solid); }
.app-main[data-backdrop="grid"] { --backdrop-bg:
  linear-gradient(color-mix(in srgb, var(--accent-300) 25%, transparent) 1px, transparent 1px),
  linear-gradient(90deg, color-mix(in srgb, var(--accent-300) 25%, transparent) 1px, transparent 1px),
  var(--surface-solid); }
```

> 原则：背景层是「模糊对象 + 装饰背景」，须有可感知的彩色 wash（用户明确要它有效果）；经表面 0.48 透明 + blur 30 后呈克制彩色磨砂，不发艳。暗色下 alpha 已由表面着色压暗，无需再单独调。

### Step 5: 全量回归 + 基线重生成

Run: `npm run test:e2e`（含「背景层」「亚克力两档」「亚克力材质」回归 + 其余零冲击）+ `npm test` + `npm run build`；视觉基线 `--update-snapshots`（24 张全重生成——背景层更可见 + 着色 0.48 变化，先解码比对确认差异来源、无布局位移）。
Expected: 全绿

### Step 6: 提交

```bash
git add src/config/defaults.js src/app/app-main.css tests/unit/apply.test.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 亚克力可见性调参（明显亚克力：着色0.48/模糊30/噪点0.06 + 背景层增强）"
```
