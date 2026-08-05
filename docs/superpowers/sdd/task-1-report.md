# 任务 1 实施报告：色温滑杆映射（color.temperature 补视觉消费者）

**需求源**：`docs/superpowers/sdd/task-1-brief.md`（计划书「后续计划项 A」）

**状态**：完成 — 单测 31/31 绿、e2e 75/75 绿（含 36 张视觉基线零变化）、`npm run build` 通过

**提交**：`e235935`（feat 提交）；docs 留痕提交见 git log（本报告所在提交）

## 一、文件修改清单

| 文件 | 修改 |
|---|---|
| `src/styles/tokens.css` | `--neutral-50..950` 11 级固定 hex → `hsl(var(--neutral-hue) <sat>% <light>%)`；`:root` 新增 `--neutral-hue: 235` |
| `src/config/apply.js` | 导出纯函数 `temperatureToHue(t)`；`applyConfig` 追加：`temperature === 0` → `removeProperty('--neutral-hue')`，否则写映射值 |
| `src/demo/customizer-css.js` | 导出 CSS 变量在温度 ≠ 0 时追加 `--neutral-hue` 覆盖行（沿用色相滑杆的 `tintLine` 模式） |
| `src/demo/token-showcase.js` | `parseRGB` 扩展支持 `hsl()/hsla()`（现代空格 + 逗号语法）— **简报外修复**，见顾虑 1 |
| `tests/unit/apply.test.js` | +3 用例（temperatureToHue 4 断言；temperature 0 不写覆盖；0.5 写 138）|
| `tests/e2e/customizer.spec.js` | +1 用例（色温 `fill('1')` → computed `--neutral-hue` 40；重置 → 恢复默认 235）|

未改动：定制器面板 UI（滑杆与 CFG_PATH 映射已存在）、themes.css 及全部纯 CSS 消费方（经变量自动跟随）。

## 二、hex → HSL 转换表（逐级）

算法与 `apply.js` 的 `hexToHsl` 完全一致（h 取整、s/l 保留 1 位小数）；hue 统一走 `--neutral-hue`（原色相 216-220，低饱和下视觉无差）：

| 级 | 原 hex | 原 HSL（含原色相） | 新令牌 |
|---|---|---|---|
| 50 | `#f7f8fa` | hsl(220 23.1% 97.5%) | `hsl(var(--neutral-hue) 23.1% 97.5%)` |
| 100 | `#eef0f4` | hsl(220 21.4% 94.5%) | `hsl(var(--neutral-hue) 21.4% 94.5%)` |
| 200 | `#e2e5eb` | hsl(220 18.4% 90.4%) | `hsl(var(--neutral-hue) 18.4% 90.4%)` |
| 300 | `#cdd2db` | hsl(219 16.3% 83.1%) | `hsl(var(--neutral-hue) 16.3% 83.1%)` |
| 400 | `#aab1bd` | hsl(218 12.6% 70.4%) | `hsl(var(--neutral-hue) 12.6% 70.4%)` |
| 500 | `#8a92a1` | hsl(219 10.9% 58.6%) | `hsl(var(--neutral-hue) 10.9% 58.6%)` |
| 600 | `#6b7280` | hsl(220 8.9% 46.1%) | `hsl(var(--neutral-hue) 8.9% 46.1%)` |
| 700 | `#525a66` | hsl(216 10.9% 36.1%) | `hsl(var(--neutral-hue) 10.9% 36.1%)` |
| 800 | `#3a4049` | hsl(216 11.5% 25.7%) | `hsl(var(--neutral-hue) 11.5% 25.7%)` |
| 900 | `#262a31` | hsl(218 12.6% 17.1%) | `hsl(var(--neutral-hue) 12.6% 17.1%)` |
| 950 | `#1a1d23` | hsl(220 14.8% 12%) | `hsl(var(--neutral-hue) 14.8% 12%)` |

`temperatureToHue` 端点复核：t=-1 → 235-25=210；t=0 → 235；t=0.5 → 235-97.5=137.5 → round 138；t=1 → 235-195=40。

## 三、测试输出

**单测（TDD 红→绿）**：
- 红（实现前）：`apply.test.js` 2 失败 — `temperatureToHue` 未定义（TypeError）+ `--neutral-hue` 未写入；其余 29 用例不受影响
- 绿（实现后）：`npm test` → Test Files 4 passed, Tests 31 passed（apply.test.js 8 → 11 用例）

**e2e**：`npm run test:e2e` → **75 passed**（customizer 4 → 5 用例；visual-regression 36 张全绿；其余 34 用例全绿）。期间 overlays.spec.js「Toast」曾 1 次失败、单独重跑通过 — 与本次改动无关（未触及 toast 代码），疑似既有时序 flake（见顾虑 4）。

**构建**：`npm run build` → `vite build` 成功。

## 四、视觉基线确认（36 张）

- 全量 e2e 两次完整跑：36 张基线**全部通过，零变化，未重生成**（全程未使用 `--update-snapshots`；`git status` 确认 snapshot 目录无改动）。
- 默认态（temperature=0）覆盖为零：`applyConfig` 走 `removeProperty('--neutral-hue')`，渲染回退 `:root` 的 235，与改动前渲染一致（hue 216-220 → 235 的单通道 ≤6/255 偏移在 Playwright 逐像素阈值内视为一致，已实测通过）。
- 中间态排查：参数化后首批 tokens 6 张基线曾失败，根因见顾虑 1，修复后恢复全绿。

## 五、顾虑与偏差记录

1. **简报外修复（必要）**：简报称「全仓所有 `--neutral-*` 消费方经变量自动跟随，不需要改消费方」— 遗漏了 `src/demo/token-showcase.js`：该文件是 JS 消费方，`inkFor()` 用 `parseRGB` 解析 `--neutral-*` 的 computed 值并按亮度选色块文字色。参数化后计算值变为 `hsl(235 23.1% 97.5%)`，hex/rgb 正则解析失败 → 回退 [128,128,128]（lum 0.502 < 0.62）→ 全部色板标签变白字，6 张 tokens 基线失败。已扩展 `parseRGB` 支持 hsl()/hsla()；逐一复核 11 级新旧亮度决策无一穿越 0.62 阈值（最近距 0.62 的 400 级差 ~0.09），修复后渲染像素级一致。
2. **简报 e2e 重置断言偏差**：简报写「重置后 `--neutral-hue` 为空（恢复默认）」，但简报同时要求 `:root` 定义 `--neutral-hue: 235` — computed style 重置后必为 `'235'`（只有 inline 覆盖被移除）。按「恢复默认」意图实现为断言 `=== '235'`；「inline 为空」语义由单测覆盖（temperature 0 不写覆盖）。
3. **简报示例数值偏差**：简报示例「`#f7f8fa → hsl(var(--neutral-hue) 14% 97%)`」与标准 HSL 转换（同 `hexToHsl` 算法）的 23.1% 97.5% 不符。按硬约束「sat/light 取原值、基线不变」采用计算值（示例标注为示意）。
4. **toast e2e 既有 flake**：`overlays.spec.js`「Toast 出现并自动消失」全量跑偶发失败、单独重跑通过；非本次改动引入（本次未触碰 toast/overlay 代码），建议收尾时排查。
5. 色温覆盖与导出契约一致：`exportCss` 温度 ≠ 0 时输出 `--neutral-hue` 行（hue 的 `tintLine` 同构）；导出 e2e 用例不受影响。
