# Task B2-R1: 亚克力材质令牌 + 噪点配置链路 — 实施报告

- **状态**：DONE（含一处必要偏差，已披露）
- **提交**：见本报告文末「提交」
- **计划**：docs/superpowers/plans/2026-08-06-app-shell-b2-acrylic-rework.md（Task B2-R1）
- **需求源**：docs/superpowers/sdd/task-B2-R1-brief.md
- **分支**：feature/b2-visual（B2-1/2/3 已评审通过，返工叠加其上）

## 变更文件

| 文件 | 变更 |
|---|---|
| `src/config/defaults.js` | `glass: { opacity, blur, highlight: 0.5, blurEnabled }` → `glass: { opacity, blur, noise: 0.04, blurEnabled }`；RANGES `highlight: [0,1,0.05]` → `noise: [0,0.12,0.01]` |
| `src/config/apply.js` | 玻璃区最后一行 `setProperty('--glass-highlight-opacity', cfg.glass.highlight)` → `setProperty('--noise-opacity', cfg.glass.noise)`；`--glass-enabled` 与 `root.dataset.glass` 逐字不动 |
| `src/demo/customizer-css.js` | exportCss 模板 `--glass-highlight-opacity: ${glass.highlight}` → `--noise-opacity: ${glass.noise}` |
| `src/styles/themes.css` | 新增亚克力配方 `:root` 块（`--acrylic-saturate: 1.8` / `--acrylic-brightness` light 1.1、dark 0.92 / `--acrylic-noise` SVG data-URI / `--noise-opacity: 0.04` 兜底）；微调 light `--glass-border-opacity` 0.6→0.45、dark 0.08→0.07、dark `--surface-solid` `#14161c`→`#16181f`；`--glass-highlight` 定义保留 |
| `src/demo/customizer-panel.js` | **必要偏差（见下）**：CFG_PATH `highlight: ['glass','highlight']` → `noise: ['glass','noise']`；「玻璃材质」组第三滑杆 `{ key: 'highlight', label: '高光' }` → `{ key: 'noise', label: '噪点强度' }` |
| `tests/unit/apply.test.js` | 新增 2 用例（`--noise-opacity` 覆盖写入 0.06 / 默认 0.04 写入）；既有 fixture 第 24 行 `highlight: 0.2` → `noise: 0.06`（与 DEFAULTS 同步） |

## 一处必要偏差（已披露）

brief 的 Files 清单不含 `customizer-panel.js`，但其 Step 3 要求 RANGES「`highlight` 改为 `noise`」。
`customizer-panel.js` `renderSlider`（第 127 行）对每个滑杆执行 `const [min, max, step] = RANGES[spec.key]`——
若只删 `RANGES.highlight` 而保留「玻璃材质」组的 `highlight` 滑杆，`RANGES['highlight']` 为 `undefined`，
数组解构抛 TypeError，`renderCustomizerGroups` 崩溃，直接击穿 `tests/unit/customizer.test.js`（其渲染整面板）
与浏览器定制器面板/外观分区，与 brief「customizer 单测不因换键破坏」的断言矛盾。

**处理**：按「配置键换名须原子化」原则，在本任务内同步把定制器滑杆键/标签 `highlight`→`noise`（CFG_PATH + GROUPS）。
这属于换键的必要后果，非 R5 措辞工作——R5 仍负责：组名「表面质感」、开关「亚克力材质」、预览去高光改噪点、
customizer.css 预览、settings-pages/showcase 措辞、e2e 措辞同步。已据此把 `customizer-panel.js` 纳入提交。

备选（保留 `RANGES.highlight` 死键 + 死「高光」滑杆）被否决：会留下不可控的中间态（滑杆读 `cfg.glass.highlight`
= undefined、值显示 undefined、控制一个不再被写入的变量），违背配置链路整洁。

## TDD 证据

- **Step 1/2（红）**：新增 2 用例后运行 `npm test -- apply.test.js` → 2 failed（`--noise-opacity` 未写入，expected '' → '0.06'/'0.04'），13 passed。
- **Step 3-6（实现）**：defaults/apply/customizer-css/customizer-panel/themes 按上表落地。
- **Step 7（绿）**：`npm test -- apply.test.js` → 15/15 passed。

## 验证结果

- `npm test`：**60/60**（10 files，含 store 8 + customizer 2 + apply 15，defaults 换键未破坏）
- `npm run build`：**通过**（1.24s）
- `npm run test:e2e`：**85/85**（含 18 张视觉基线对比全部通过——`--glass-border-opacity` 微调在截图容差内，
  R1 未造成基线漂移；R2 落地表面亚克力时按计划 18 张重生成）

## 命名边界核对

- `--glass-*` / `data-glass` / `--glass-enabled` / `data-glass-switch` 一律未改名 ✓
- `.cust-group` count 6 未破坏（e2e app-shell.spec.js:148 通过）✓
- `--glass-highlight` / `--glass-highlight-opacity`（fallback 引用）定义保留，apply 不再写该变量（R2 移除消费）✓
- 无测试断言 `highlight`（预检确认 + 复验）；`cfg.glass.highlight` 消费全清，src 内无残留 ✓

## 提交

```
feat: 亚克力材质令牌与噪点配置链路（--acrylic-* 配方 + glass.noise → --noise-opacity）
```

（含 `src/demo/customizer-panel.js`——偏差项见上。）
