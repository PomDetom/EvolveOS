# Task B4-3 执行报告：删色彩微调组（色相/饱和度/色温），强调色 = 预设色板直出

- 任务：B4-3（B4 桌面真实化第 3 任务）
- 状态：DONE_WITH_CONCERNS（两处 verbatim 适配，见「偏差修正」）
- 提交：`8eb3162`（feat）+ 本文档 docs 提交（docs 留痕）
- 日期：2026-08-08

## 一、变更总览

删净「整体色调」组内 色相/饱和度/色温 三个微调滑杆的全链路，强调色改为预设色板直出。**删前 grep 确认 `hexToHsl` 消费者**（apply.js applyColorTint、customizer-panel.js hueSliderValue/tintHsl、customizer-css.js tintHsl）——全部随本任务删除，故 `hexToHsl` 定义连删；`ACCENTS` import 仅 applyColorTint 用，一并删。保留 `prefersDark`。

| 文件 | 变更 |
|---|---|
| `src/config/defaults.js` | `DEFAULTS` 删 `color:{ hue:-1, saturation:100, temperature:0 }`；`RANGES` 删 hue/saturation/temperature 三行 |
| `src/config/apply.js` | 删 `applyColorTint`/`temperatureToHue`/`hexToHsl` 三函数、`ACCENTS` import、`applyConfig` 内 `applyColorTint(cfg, root)` 调用与色温覆盖块（`--neutral-hue` 两行）；保留 `prefersDark` |
| `src/demo/customizer-panel.js` | `CFG_PATH` 删 hue/saturation/temperature 三键；「整体色调」组 desc 改「预设主题色 / 语义色自动协调」、删 sliders；删 `hueSliderValue`/`tintSwatch`/`tintHsl`；`fmtValue` 删 hue 分支简化为 `readCfg` 直取；`renderSlider` 删 hue swatch/value 分支；`syncUI` 删 hue 分支；预览卡 `--preview-accent` 改 `ACCENTS.find((a) => a.id === cfg.accent)?.color ?? ACCENTS[0].color`；`renderCustomizerGroups` 与 `syncUI` 对 `g.sliders` 做 `?? []` 兜底（整体色调组不再有 sliders 键） |
| `src/demo/customizer-css.js` | 删 `tintHsl`、`temperatureToHue` import、`tintActive`/`tint`/`tintLine`/`tempLine` 及 `:root` 段 `--accent:` 覆盖行与 `--neutral-hue:` 行 |
| `src/styles/customizer.css` | 删死 CSS `.cust-tint-swatch`（不再有任何元素渲染该 class；brief 清单外的小清理） |
| `src/styles/tokens.css` | 注释去掉「定制器色温滑杆经 apply.js 写 --neutral-hue 覆盖」过期引用（`--neutral-hue: 235` 本体保留；brief 清单外的小清理） |
| `tests/unit/apply.test.js` | import 去掉 `temperatureToHue`；色彩微调/色温用例（原 54-90 行）替换为单条「不写 --accent/--neutral-hue 覆盖」 |
| `tests/e2e/customizer.spec.js` | 删「色相滑杆实时覆盖 --accent 且数值区显示」「色温滑杆映射 --neutral-hue 暖端」两用例；新增「外观分区：色彩微调滑杆已移除，强调色预设保留」；B3-1 用例组 0 desc 断言同步更新为新 desc |
| 视觉基线 | `tests/e2e/visual-regression.spec.js-snapshots/appearance-partition-{light,dark}-{indigo,amber,emerald}-chromium-win32.png` 6 张重生成 |

## 二、TDD 执行记录

### 1. apply.test.js 重写（预期红 → 实测绿）

改 import + 替换用例后 `npx vitest run tests/unit/apply.test.js`：

```
Test Files  1 passed (1)
     Tests  10 passed (10)
```

**红信号未按 brief 预期在 apply.test.js 落地**：brief 步骤 1 预期红因「temperatureToHue 不存在」，但同一步骤又要求去掉 import 中的 `temperatureToHue` —— 唯一红引用随 import 一并删除，且新用例断言（`--accent`/`--neutral-hue` 均 `''`）对当前实现（默认态 removeProperty）即成立。真实红信号在 customizer.test.js 层：改 defaults.js/apply.js 后 `npm test` 报 `RANGES['hue']` 为 undefined 崩溃（customizer-panel.js 仍渲染 hue 滑杆），修复 `g.sliders` 未定义（`?? []`）后转绿。此为本任务唯一真实 RED→GREEN 循环。

### 2. 单测全量（customizer-panel + customizer-css 改后）

```
npm test
Test Files  11 passed (11)
     Tests  56 passed (56)
```

### 3. e2e customizer.spec.js（改 spec + 新增用例）

```
npx playwright test tests/e2e/customizer.spec.js
6 passed (14.6s)
```

含：新用例（三滑杆 data-key 计数 0、`.cust-accent-card` 6 张、点击 teal 后 `--accent` = teal 色板直出）；**B3-2 预览卡用例继续通过**（改后 `--preview-accent` = accent.color hex：before=indigo `#6e7bf2`、after=teal `#2dd4bf`，仍不同）；B3-1 组标题用例通过（title 保持「整体色调」，desc 断言同步为新值）。

### 4. 视觉基线重生成

首次 `npm run test:visual`：

```
6 failed   [chromium] › ... appearance-partition · light/dark × indigo/amber/emerald
18 passed
```

**恰为 brief 预期**：仅 appearance-partition 6 张失败，其余 18 张零漂移。随后 `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots` 重生成 6 张，复跑 `npm run test:visual` 24/24 绿。

### 5. 全量回归

```
npm test            → 11 files / 56 tests passed
npm run test:e2e    → 100 passed (3.6m，含视觉基线 24)
npm run build       → ✓ built in 405ms
```

## 三、视觉基线解码比对说明（decode-compare）

对 `appearance-partition-dark-emerald` 做像素级解码比对（canvas 载入基线 PNG 与实际 PNG，逐像素差 > 阈值统计差异带）：

- **基线 720×1737 → 实际 720×1567**：高度收缩 170px = 删除的 3 行微调滑杆（含间距）的总高。
- **差异带（基线对齐左上角比较）**：
  - `y 199-216`（约 18 行、~14px 宽）—— 预览卡 `.cust-overview__accent` 色点：色值由 `tintHsl(cfg)`（hsl，65% 明度）变为色板 hex（indigo `#6e7bf2` = hsl 69% 明度；即 brief 所述「hsl65→hex69」）。
  - `y 292-302`（11 行、~4px 宽）—— 预览卡 `.cust-overview__glass` 渐变首段（34% 起用 `var(--preview-accent)`）与 `.cust-overview__radius`/`__icon--active` 同类色元素，一并随 `--preview-accent` 从 hsl → hex 变化。
  - `y 534-679`（多段窄带）—— 原「整体色调」组三行微调滑杆所在区域，现为该组滑杆删除后的内容。
  - `y 1567-1736`（170 行、720px 全宽）—— 高度收缩尾部（实际元素 1567 行之后为白）。
- **漂移范围确认**：差异全部落在 appearance-partition 元素截图内；其余 18 张（components/motion 分区 × 深浅 × 3 色）零漂移，`npm run test:visual` 全量复跑 24/24 绿，证明无分区外漂移。
- 实时探针佐证：改后 `getComputedStyle(.cust-overview).getPropertyValue('--preview-accent')` = `#6e7bf2`（indigo 色板 hex，非 hsl）。

## 四、偏差修正（verbatim 适配，Concerns）

1. **brief 新 e2e 断言 `rgb(45, 212, 191)` → 实测改 `'#2dd4bf'`**。实测 Chromium（swiftshader）中未注册 CSS 自定义属性 `getComputedStyle().getPropertyValue('--accent')` 返回**原始序列化 hex**（`#2dd4bf`），非 rgb。与本仓库 `tokens.spec.js` 对同一变量 `--accent` 的既有断言（`'#2dd4bf'`）一致。语义断言不变（强调色 = teal 色板直出），仅在 spec 内注释说明。
2. **brief「一个 commit」与报告需含 feat 哈希冲突**：按 repo 既有惯例（B4-1/B4-2）拆为 feat + docs 两枚提交，报告与台账在 docs 提交承载 feat 哈希 `8eb3162`。（备选：把报告并入 feat 单提交会令报告无法含自身哈希，须 amend 且违反 git 安全协议。）
3. **brief 步骤 1 预期红未在 apply.test.js 落地**：见上文 TDD 记录第 1 条 —— 删 import 即删唯一红引用；真实红信号在 customizer.test.js 层，已闭环。

## 五、自评（self-review）

- **规格符合**：需求 1-6 逐条落地；强调色 = 预设色板直出（applyConfig 不再写 `--accent`/`--neutral-hue` 覆盖；预览卡取 `accent.color` hex）；B3-1 组标题保留、desc 按 brief 更新；B3-2 预览卡联动继续通过；存量 localStorage `color:{...}` 死键未清理；`src-tauri/Cargo.toml` 行尾噪声未动、未提交。
- **质量**：全链删净（含死 CSS `.cust-tint-swatch` 与 tokens.css 过期注释两处 brief 清单外但同属微调链的小清理）；配置链（defaults → store → apply）未绕过；无动画相关改动（红线零触碰）；零运行时依赖未增。
- **测试**：单测 56/56、e2e 100/100（含视觉 24/24）、build 通过。
- **遗留（Minor）**：tokens.css `--neutral-hue: 235` 中性色阶参数化本身保留（非微调链、不动）；文档旧 diff/plan 中的历史引用为留痕记录，不改写。

## 六、提交记录

- `8eb3162` `feat: 删色彩微调组（色相/饱和度/色温），强调色=预设色板直出（B4-3）`（14 files，+24/-180）
- docs 提交（本报告 + 简报 + 台账 progress-b4.md）
