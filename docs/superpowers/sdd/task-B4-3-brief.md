# Task B4-3: 颜色方案 —— 删色彩微调组（整体色调 = 强调色选择）

## 任务定位

应用壳 B4 第三个任务。B4 功能 3 前半：删除会污染主题色的「整体色调」组内 色相/饱和度/色温 三个微调滑杆。色相可把强调色扭到任意色相（`applyColorTint` 覆盖 `--accent` → 整个界面强调色被污染），语义色为固定值（非强调色派生）。**强调色 = 预设色板直出**。删干净全链：config（defaults/RANGES）、apply（applyColorTint/temperatureToHue）、customizer（滑杆 + tint 助手 + 预览卡）、customizer-css 导出。B4-4 在其上扩展 ACCENTS。

## 现状关键文件

- `src/config/defaults.js`：`DEFAULTS.color = { hue:-1, saturation:100, temperature:0 }`；`RANGES` 有 hue/saturation/temperature 三键；`ACCENTS` 6 项
- `src/config/apply.js`：`applyColorTint`（读 color.hue/saturation 覆盖 `--accent`/`--accent-hover`/`--accent-active`）、`temperatureToHue`（色温→`--neutral-hue`）、`applyConfig` 内调用两处
- `src/demo/customizer-panel.js`：GROUPS「整体色调」组 `pre: accentCards + semanticBar` + sliders hue/saturation/temperature；`CFG_PATH` 三键；`tintHsl`/`hueSliderValue`/`tintSwatch`；`renderSlider` 的 hue 分支；`fmtValue` 的 hue 分支；`syncUI` 的 hue 分支；B3-2 预览卡 `updateOverview` 的 `--preview-accent: tintHsl(cfg)`
- `src/demo/customizer-css.js`：`tintHsl` 函数 + `temperatureToHue` import + tint/temp 导出行
- `tests/unit/apply.test.js`：色彩微调/色温用例（约 54-90 行）
- `tests/e2e/customizer.spec.js`：「色相滑杆实时覆盖 --accent」「色温滑杆映射 --neutral-hue」两用例

## 需求（唯一需求源，逐字执行）

**1. apply.test.js**：顶部 import 改 `import { applyConfig } from '../../src/config/apply.js';`（去掉 `temperatureToHue`）。把 describe 内全部色彩微调/色温用例（hue 覆盖、饱和度缩放、teal hue、temperatureToHue、--neutral-hue 相关）替换为一条：

```js
it('不写 --accent/--neutral-hue 覆盖（强调色来自主题色板）', () => {
  applyConfig(DEFAULTS, root);
  expect(root.style.getPropertyValue('--accent')).toBe('');
  expect(root.style.getPropertyValue('--neutral-hue')).toBe('');
});
```

**2. defaults.js**：`DEFAULTS` 删 `color: {...}` 行；`RANGES` 删 hue/saturation/temperature 三行。

**3. apply.js**：删 `applyColorTint`、`temperatureToHue`、`applyConfig` 内 `applyColorTint(cfg, root)` 调用与色温覆盖块（`--neutral-hue` 两行）。**先 grep `hexToHsl` 消费点**：applyColorTint 删后若 customizer-panel.js 删 tintSwatch 后无其它消费者，则连 `hexToHsl` 定义一并删；若有保留则保留导出。保留 `prefersDark`。

**4. customizer-panel.js**：
- `CFG_PATH` 删 hue/saturation/temperature 三键
- GROUPS「整体色调」组：删 `sliders` 三行；desc 更新为 `预设主题色 / 语义色自动协调`
- 删 `hueSliderValue`/`tintSwatch`/`tintHsl` 函数；`hexToHsl` import 若无其它消费一并删
- `fmtValue` 删 hue 分支（`if (key === 'hue') return cfg.color.hue === -1 ? '跟随' : ...`），简化为 `return \`${readCfg(cfg, key)}${unit ?? ''}\``
- `syncUI` 删 hue 分支（`[data-out="hue"]` swatch 更新、`if (key === 'hue')`）
- `renderSlider` 删 `spec.key === 'hue'` 的 swatch/value 分支（`const swatch = ...`/`const value = ...` 改直接 `readCfg`）
- 预览卡 `updateOverview` 的 `--preview-accent` 由 `tintHsl(cfg)` 改为：`ACCENTS.find((a) => a.id === cfg.accent)?.color ?? ACCENTS[0].color`

**5. customizer-css.js**：删 `tintHsl` 函数、`temperatureToHue` import、`tintActive`/`tint`/`tintLine`/`tempLine` 及模板插值（`:root` 段删 `--accent:` 覆盖行与 `--neutral-hue:` 行）。

**6. customizer.spec.js**：删「色相滑杆实时覆盖 --accent 且数值区显示」「色温滑杆映射 --neutral-hue 暖端」两用例；新增：

```js
test('外观分区：色彩微调滑杆已移除，强调色预设保留', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  await expect(appr.locator('.cust-range[data-key="hue"]')).toHaveCount(0);
  await expect(appr.locator('.cust-range[data-key="saturation"]')).toHaveCount(0);
  await expect(appr.locator('.cust-range[data-key="temperature"]')).toHaveCount(0);
  await expect(appr.locator('.cust-accent-card')).toHaveCount(6);
  // 切强调色 → --accent 直接取色板（无微调覆盖）
  await appr.locator('.cust-accent-card[data-accent="teal"]').click();
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toBe('rgb(45, 212, 191)'); // teal-400 #2dd4bf
});
```

## 流程（TDD）

1. 改 apply.test.js（import + 替换用例）→ `npx vitest run tests/unit/apply.test.js` 确认红（temperatureToHue 不存在 / 字段已删）
2. 改 defaults.js + apply.js → 单测确认绿；`npm test` 全绿（customizer.test.js 只测订阅退订应零影响）
3. 改 customizer-panel.js + customizer-css.js
4. 改 customizer.spec.js（删两用例 + 新用例）→ `npx playwright test tests/e2e/customizer.spec.js` 红→绿
5. **视觉基线重生成**（appearance-partition 6 张）：`npm run test:visual` 确认仅 appearance-partition 失败（微调组删行 + 预览卡强调色点色值微变 hsl65→hex69），其余 18 张零漂移 → 解码比对确认差异区域 → `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots` → 复跑 24/24 绿
6. 全量回归：`npm test` + `npm run test:e2e` + `npm run build`

## 注意

- 存量 localStorage `color:{...}` 为死键，不清理。
- B3-2 预览卡 e2e（teal 点击 → `--preview-accent` 变化）必须继续通过（改后 before=indigo hex、after=teal hex，仍不同）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

## 提交

一个 commit：`feat: 删色彩微调组（色相/饱和度/色温），强调色=预设色板直出（B4-3）`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B4-3-report.md`。回复本会话只需：状态 + 提交哈希 + 一行测试摘要 + 疑虑（如有）。
