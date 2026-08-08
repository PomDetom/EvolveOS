# Task B4-2: 文字排版真实生效（baseSize/scale 全局缩放）

## 任务定位

应用壳 B4 第二个任务。B4 功能 4：设置中「文字排版」滑杆几乎无效——`type.scale` 存在配置但 apply.js 从未写入 CSS（死配置 → "缩放无变化"）；`baseSize` 只覆盖 `--font-size-base`，绝大多数界面文字用 tokens.css 静态 `--font-size-xs/sm/lg/...`（10/12/14/16px），故"基准字号只改行距"。

**修法**：字号令牌全部派生自 `--font-size-base`；`applyConfig` 写 `--font-size-base = calc(baseSize px × scale)`，两滑杆共同驱动整套字号。默认（14×1）计算值不变 → 默认态视觉零漂移。

## 需求（唯一需求源，逐字执行）

**1. apply.test.js 追加单测**（`applyConfig` describe 内）：

```js
it('--font-size-base = calc(baseSize px * scale)（两滑杆共同驱动）', () => {
  applyConfig({ ...DEFAULTS, type: { baseSize: 14, scale: 1.15, weight: 400 } }, root);
  expect(root.style.getPropertyValue('--font-size-base')).toBe('calc(14px * 1.15)');
});
```

**2. apply.js 改公式**：`applyConfig` 内 `--font-size-base` 一行（现 `s.setProperty('--font-size-base', \`${cfg.type.baseSize}px\`)`）改为：

```js
s.setProperty('--font-size-base', `calc(${cfg.type.baseSize}px * ${cfg.type.scale})`);
```

**3. tokens.css 字号令牌派生**：把静态 `--font-size-xs: 10px` 等改为：

```css
--font-size-xs: calc(var(--font-size-base) * 0.714);   /* 14→10 */
--font-size-sm: calc(var(--font-size-base) * 0.857);   /* 14→12 */
--font-size-base: 14px;                                 /* 默认；applyConfig 覆盖 */
--font-size-lg: calc(var(--font-size-base) * 1.143);   /* 14→16 */
--font-size-xl: calc(var(--font-size-base) * 1.429);   /* 14→20 */
--font-size-2xl: calc(var(--font-size-base) * 1.714);  /* 14→24 */
--font-size-3xl: calc(var(--font-size-base) * 2);      /* 14→28 */
```

**4. customizer-css.js 导出对齐**：第 39 行 `--font-size-base: ${type.baseSize}px;` 改为：

```js
  --font-size-base: calc(${type.baseSize}px * ${type.scale});
```

**5. customizer.spec.js 新 e2e**（读真实元素解析 fontSize——getComputedStyle 读自定义属性返回未解析 calc 字符串，不可 parseFloat 自定义属性）：

```js
test('文字排版：baseSize/scale 滑杆真实全局缩放字号', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const readFont = () => page.evaluate(() => {
    const body = parseFloat(getComputedStyle(document.body).fontSize);
    const sm = parseFloat(getComputedStyle(document.querySelector('.c-titlebar__title')).fontSize);
    return { body, sm };
  });
  const before = await readFont();
  expect(before.body).toBeCloseTo(14, 1); // 默认 baseSize=14, scale=1
  expect(before.sm).toBeCloseTo(12, 1);   // --font-size-sm = 14 × 0.857
  await appr.locator('.cust-row:has-text("缩放") input[type="range"]').fill('1.15');
  const scaled = await readFont();
  expect(scaled.body).toBeGreaterThan(before.body);
  expect(scaled.sm).toBeGreaterThan(before.sm);
  await appr.locator('.cust-row:has-text("基准字号") input[type="range"]').fill('12');
  const based = await readFont();
  expect(based.body).toBeLessThan(scaled.body);
  expect(based.sm).toBeLessThan(scaled.sm);
});
```

## 流程（TDD）

1. 先加 apply.test 新用例 → `npx vitest run tests/unit/apply.test.js` 确认红（现写入 `14px` 非 `calc(14px * 1.15)`）
2. 改 apply.js + tokens.css + customizer-css.js → 单测确认绿
3. 加 e2e → `npx playwright test tests/e2e/customizer.spec.js -g "缩放字号"` 确认红（现状 scale 无效果 → scaled===before）→ 已实现 → 绿
4. **视觉检查**：`npm run test:visual` 应 24/24 零漂移（默认 14×1 计算值不变）。**若漂移：解码比对确认差异区域后报告，勿擅自 update-snapshots**
5. 全量回归：`npm test` + `npm run test:e2e` + `npm run build`

## 注意

- `type.weight`（无滑杆死配置）不触碰。
- 不改 RANGES（baseSize [12,16,0.5] / scale [0.9,1.15,0.01] 已在）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

## 提交

一个 commit：`feat: 文字排版真实生效（字号令牌派生自 --font-size-base，baseSize/scale 全局缩放，闭环 B4-4）`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B4-2-report.md`。回复本会话只需：状态 + 提交哈希 + 一行测试摘要 + 疑虑（如有）。
