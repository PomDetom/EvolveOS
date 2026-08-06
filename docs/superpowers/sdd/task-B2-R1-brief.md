# Task B2-R1: 亚克力材质令牌 + 噪点配置链路

（摘自 docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md，唯一需求源）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（blur 永不动画）；配置链路（defaults→store→apply 不绕过）。
- 零运行时依赖；遵循 src/CLAUDE.md。
- **命名保留**：`--glass-*` / `data-glass` / `--glass-enabled` / `data-glass-switch` 一律不改名；只换材质值与后续任务的 UI 措辞。
- `.cust-group` count 6 不得破坏。
- TDD（先红后绿）、独立评审；`npm test` 全绿。

## Files

- Modify: `src/styles/themes.css`（亚克力配方变量 + 噪点 token + 边框/暗色微调）
- Modify: `src/config/defaults.js`（`glass.highlight` → `glass.noise`，RANGES）
- Modify: `src/config/apply.js`（写 `--noise-opacity` 替代 `--glass-highlight-opacity`）
- Modify: `src/demo/customizer-css.js`（导出 `--noise-opacity` 替代 `--glass-highlight-opacity`）
- Test: `tests/unit/apply.test.js`

## Interfaces

- Consumes: `applyConfig(cfg, root)`（apply.js，现有 `--glass-*` 写入区）；`DEFAULTS`/`RANGES`（defaults.js）
- Produces: CSS 变量 `--acrylic-saturate: 1.8`、`--acrylic-brightness`（light 1.1 / dark 0.92）、`--acrylic-noise`（SVG data-URI）、`--noise-opacity`（default 0.04）；配置 `cfg.glass.noise`（number，RANGES `[0, 0.12, 0.01]`）；`applyConfig` 写 `--noise-opacity`（不再写 `--glass-highlight-opacity`）

## Steps

### Step 1: 写失败单测（apply.test.js，沿用真实 document.documentElement 风格）

```js
it('噪点强度写入 --noise-opacity 覆盖', () => {
  applyConfig({ ...DEFAULTS, glass: { ...DEFAULTS.glass, noise: 0.06 } }, root);
  expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.06');
});
it('默认噪点强度 0.04 写入', () => {
  applyConfig(DEFAULTS, root);
  expect(root.style.getPropertyValue('--noise-opacity')).toBe('0.04');
});
```

### Step 2: 运行确认红

Run: `npm test -- apply.test.js`
Expected: FAIL（`--noise-opacity` 未写入）

### Step 3: defaults.js 换键

```js
glass: { opacity: 0.62, blur: 24, noise: 0.04, blurEnabled: true },
```
RANGES 把 `highlight: [0, 1, 0.05]` 改为 `noise: [0, 0.12, 0.01]`。

### Step 4: apply.js 换写变量

在 `applyConfig` 玻璃区把：
```js
s.setProperty('--glass-highlight-opacity', String(cfg.glass.highlight));
```
改为：
```js
s.setProperty('--noise-opacity', String(cfg.glass.noise));
```
`--glass-enabled` 与 `root.dataset.glass` 的 B2-1 逻辑逐字不动。

### Step 5: customizer-css.js 换导出

`exportCss` 模板里 `--glass-highlight-opacity: ${glass.highlight};` 改为 `--noise-opacity: ${glass.noise};`。

### Step 6: themes.css 加亚克力配方变量

```css
:root {
  --acrylic-saturate: 1.8;
  --acrylic-brightness: 1.1; /* light 基准 */
  --acrylic-noise: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --noise-opacity: 0.04; /* 兜底；apply.js 从 glass.noise 覆盖 */
}
:root[data-theme="dark"] { --acrylic-brightness: 0.92; }
```
同时微调：light `--glass-border-opacity: 0.6` → `0.45`；dark `0.08` → `0.07`；dark `--surface-solid: #14161c` → `#16181f`。`--glass-highlight` 定义保留（不再被表面使用，R2 移除消费）。

### Step 7: 运行绿

Run: `npm test -- apply.test.js`
Expected: PASS（2 新用例 + 既有全绿）。再跑全量 `npm test`（确认 store/customizer 单测不因 defaults 换键破坏）。

**注意**：`tests/unit/apply.test.js` 第 24 行既有 fixture 传了 `highlight: 0.2`——换键后该对象无 `noise`，apply 会写 `--noise-opacity: undefined`。请把该 fixture 的 `highlight: 0.2` 改为 `noise: 0.06`（该测试断言 `--glass-bg-opacity`/`--glass-blur`，不因换键破坏，但 fixture 须与 DEFAULTS 同步）。

### Step 8: 提交

```bash
git add src/styles/themes.css src/config/defaults.js src/config/apply.js src/demo/customizer-css.js tests/unit/apply.test.js
git commit -m "feat: 亚克力材质令牌与噪点配置链路（--acrylic-* 配方 + glass.noise → --noise-opacity）"
```
