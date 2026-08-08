# Task B4-4: 颜色方案 —— 强调色预设扩至 12 套

## 任务定位

应用壳 B4 第四个任务。B4 功能 3 后半：把强调色预设从 6 套扩到 12 套（新增 玫红/橙/青柠/青/蓝/品红），配合 B4-3 已删的色彩微调组，让「多样化的颜色搭配」= 选预设即整套协调色板。**B4-3 已删微调链，本任务只加色板 + 预设条目。**

## 现状关键文件

- `src/config/defaults.js`：`ACCENTS` 6 项（indigo/teal/sky/amber/violet/emerald，结构 `{id, name, color, desc}`）
- `src/styles/themes.css`：`:root` 默认（indigo）+ 5 个 `:root[data-accent="..."]` 块，每块 50–950 全阶 + `--accent: var(--accent-400)` / `--accent-hover: var(--accent-300)` / `--accent-active: var(--accent-500)` / `--accent-contrast: <950 值>`
- `src/demo/customizer-panel.js`：`accentCards` 渲染 `.cust-accent-grid`（3 列网格，卡片 `--swatch: a.color`）；预览卡 `--preview-accent` = `ACCENTS.find(...).color`

**`color` 字段取值说明（重要）**：既有 ACCENTS 的 `color` 取值**不统一**——teal #2dd4bf = teal-400、sky #38bdf8 = sky-400、violet #a78bfa = violet-400；amber #f59e0b = amber-500、emerald #34d399 = emerald-500。`color` 是「该强调色的代表性色」；`--accent` 实际取色板 400。**本任务新增 6 项按已批准设计规格用 500 值**（与 amber/emerald 同构）。卡片 swatch 与 `--preview-accent` 显示 `color`（500），`--accent` 应用色板 400——两者可不同，符合既有现状。

## 需求（唯一需求源，逐字执行）

**1. defaults.js `ACCENTS` 追加 6 项**（现有 6 项后）：

```js
  { id: 'rose', name: '玫红', color: '#f43f5e', desc: '热情、张力' },
  { id: 'orange', name: '橙', color: '#f97316', desc: '活力、明亮' },
  { id: 'lime', name: '青柠', color: '#84cc16', desc: '清新、能量' },
  { id: 'cyan', name: '青', color: '#06b6d4', desc: '通透、清爽' },
  { id: 'blue', name: '蓝', color: '#3b82f6', desc: '稳重、可靠' },
  { id: 'fuchsia', name: '品红', color: '#d946ef', desc: '时尚、鲜明' },
```

**2. themes.css 新增 6 个 `:root[data-accent="..."]` 块**（在既有块之后、同构：50–950 全阶 + 4 个语义色令牌；`--accent-contrast` = 该色板 950 值）：

```css
:root[data-accent="rose"] {
  --accent-50: #fff1f2; --accent-100: #ffe4e6; --accent-200: #fecdd3;
  --accent-300: #fda4af; --accent-400: #fb7185; --accent-500: #f43f5e;
  --accent-600: #e11d48; --accent-700: #be123c; --accent-800: #9f1239;
  --accent-900: #881337; --accent-950: #4c0519;
  --accent: var(--accent-400); --accent-hover: var(--accent-300);
  --accent-active: var(--accent-500); --accent-contrast: #4c0519;
}
```

其余 5 块色板值（每块同构）：
- orange: 50 #fff7ed 100 #ffedd5 200 #fed7aa 300 #fdba74 400 #fb923c 500 #f97316 600 #ea580c 700 #c2410c 800 #9a3412 900 #7c2d12 950 #431407；contrast #431407
- lime: 50 #f7fee7 100 #ecfccb 200 #d9f99d 300 #bef264 400 #a3e635 500 #84cc16 600 #65a30d 700 #4d7c0f 800 #3f6212 900 #365314 950 #1a2e05；contrast #1a2e05
- cyan: 50 #ecfeff 100 #cffafe 200 #a5f3fc 300 #67e8f9 400 #22d3ee 500 #06b6d4 600 #0891b2 700 #0e7490 800 #155e75 900 #164e63 950 #083344；contrast #083344
- blue: 50 #eff6ff 100 #dbeafe 200 #bfdbfe 300 #93c5fd 400 #60a5fa 500 #3b82f6 600 #2563eb 700 #1d4ed8 800 #1e40af 900 #1e3a8a 950 #172554；contrast #172554
- fuchsia: 50 #fdf4ff 100 #fae8ff 200 #f5d0fe 300 #f0abfc 400 #e879f9 500 #d946ef 600 #c026d3 700 #a21caf 800 #86198f 900 #701a75 950 #4a044e；contrast #4a044e

**3. customizer.spec.js 新用例**（`--accent` 序列化：B4-3 实测未注册自定义属性 getPropertyValue 返回 hex——断言按 hex；若实测异常再调整并披露）：

```js
test('强调色预设扩至 12 套，新预设可切换', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  await expect(appr.locator('.cust-accent-card')).toHaveCount(12);
  await appr.locator('.cust-accent-card[data-accent="rose"]').click();
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toBe('#fb7185'); // rose-400（--accent 取色板 400）
  const preview = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.cust-overview')).getPropertyValue('--preview-accent').trim());
  expect(preview).toBe('#f43f5e'); // ACCENTS rose.color（设计规格 500 值）
});
```

## 流程（TDD）

1. 先写 e2e 新用例 → `npx playwright test tests/e2e/customizer.spec.js -g "12 套"` 确认红（现 6 卡，rose 不存在）
2. 改 defaults.js ACCENTS（6→12）+ themes.css 6 块色板 → 复跑 e2e 绿
3. 全文件 `npx playwright test tests/e2e/customizer.spec.js` 零回归
4. **视觉基线重生成**（appearance-partition 6 张）：`npm run test:visual` 确认仅 appearance-partition 失败（色卡网格 6→12 多两行）→ 解码比对确认差异区域 → `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots` → 复跑 24/24 绿
5. 全量回归：`npm test` + `npm run test:e2e` + `npm run build`

## 注意

- 动画红线不涉及；配置链路不绕过。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

## 提交

一个 commit：`feat: 强调色预设扩至 12 套（玫红/橙/青柠/青/蓝/品红），B4-4`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B4-4-report.md`（含 `--accent` 序列化实测结论与基线解码比对说明）。回复本会话只需：状态 + 提交哈希 + 一行测试摘要 + 疑虑（如有）。
