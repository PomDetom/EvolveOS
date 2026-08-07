# Task B3-2: 外观分区实时整体预览卡

## 任务定位

应用壳 B3 第三个（最后一个）任务。B3 目标「让改的是整个 UI 而非字体」从文案和默认效果都明显——外观分区顶部加一张**实时整体预览卡**（缩略展示当前主题/强调色/玻璃/圆角/图标效果），订阅 store 实时刷新。B3-1 已重命名分组。

## 现状（src/demo/customizer-panel.js）

- `renderCustomizerGroups(container)`（约 302-348 行）渲染 6 组 `.cust-group` + 事件 + store 订阅。**实际只有外观分区整页形态使用它**（settings-pages.js appearancePage → app-main.js setSettingsPageActive/activateMobileSettings 惰性挂载）；抽屉 mountCustomizer 已无调用方。
- store 订阅模式（约 343-347 行）：
  ```js
  const unsub = subscribe((next) => syncUI(container, next));
  syncUI(container, cfg);
  return unsub;
  ```
  订阅**只同步局部控件态，不重渲染整个定制器**。变更发起方（滑杆 input / 强调色卡点击）已先 `saveConfig` + `applyConfig`，订阅回调绝不再调 applyConfig（避免重复应用）。
- 模块内已有 `tintHsl(cfg)`（约 113-119 行）返回当前强调色经色相/饱和度微调后的 `hsl(...)`——预览卡强调色应复用此函数（与色相 swatch 同源，联动 accent+hue+saturation）。

## 需求（唯一需求源）

**在 `renderCustomizerGroups` 渲染的分组上方加 `.cust-overview` 整体预览卡**（外观分区顶部；抽屉已无调用方，无别处影响）。缩略展示 5 项，全部经 CSS 变量映射当前 config：

1. **主题**（深浅）：一块色块，背景随 `--preview-theme`（'light'|'dark'，system 经 prefersDark 解析）
2. **强调色**：一个色点，`--preview-accent`（用 `tintHsl(cfg)`）
3. **玻璃效果**：一个小玻璃面板（backdrop-filter + rgba 底色），`--preview-glass-opacity`（= cfg.glass.opacity）+ 噪点层
4. **圆角**：一个圆角示例块，`--preview-radius`（= cfg.radiusScale）
5. **图标层级**：两个尺寸不同的圆点/图标示意（active 大、inactive 小，对应 B2-3 分级）

**`updateOverview(container, cfg)`**：在容器内 `querySelector('.cust-overview')`，把上述变量写到该元素 inline style（`el.style.setProperty('--preview-accent', tintHsl(cfg))` 等；空值守卫）。**不调 applyConfig**。

**接线**：`renderCustomizerGroups` 内
- 初始渲染：`container.innerHTML = renderOverviewCard(cfg) + GROUPS.map(...).join('')`
- 订阅回调与初始同步都调 `updateOverview`：
  ```js
  const unsub = subscribe((next) => { syncUI(container, next); updateOverview(container, next); });
  syncUI(container, cfg);
  updateOverview(container, cfg);
  return unsub;
  ```

**样式**（src/styles/customizer.css 新增 `.cust-overview` 等）：小卡布局，视觉语言与既有定制器一致（`--surface-1` 底 / `--glass-border` 边 / `calc(var(--radius-*) * var(--radius-scale))` 圆角）。**全部静态背景，无任何动画**；backdrop-filter 用于玻璃面板是静态声明（红线：模糊永不动画，本卡无动画即合规）。

## 待修改文件

- `src/demo/customizer-panel.js`：`renderOverviewCard(cfg)` + `updateOverview(container, cfg)` + renderCustomizerGroups 接线
- `src/styles/customizer.css`：`.cust-overview` 预览卡样式
- `tests/e2e/customizer.spec.js`：新用例
- `tests/e2e/visual-regression.spec.js-snapshots/`：`appearance-partition-*.png`（6 张）重生成

## 测试（TDD：先写断言确认红——`.cust-overview` 不存在必然红，再实现确认绿）

customizer.spec.js 新增用例（计划书 Step 1 字面 + 补一条圆角联动断言，验证「全局联动」不止强调色）：

```js
test('外观分区顶部有实时整体预览卡（强调色/圆角实时联动）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  const overview = page.locator('.cust-overview');
  await expect(overview).toBeVisible();
  // 切强调色 → 预览卡强调色同步变化
  const before = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-accent'));
  await page.locator('.cust-accent-card[data-accent="teal"]').click();
  const after = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-accent'));
  expect(after).not.toBe(before);
  // 圆角滑杆 → 预览卡圆角比例同步变化（全局联动验证）
  const rBefore = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-radius'));
  await page.locator('.cust-range[data-key="radiusScale"]').fill('1.5');
  const rAfter = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-radius'));
  expect(rAfter).not.toBe(rBefore);
});
```

注意：`getComputedStyle(el).getPropertyValue('--preview-accent')` 读的是 `.cust-overview` 元素 inline 写入的变量；`fill` 触发 input → saveConfig → 订阅回调 updateOverview。`--preview-accent` 用 `tintHsl` 时初始（indigo，hue=-1/sat=100）与 teal 结果必不同。`--preview-radius` 初始 '1'，fill('1.5') 后必不同。

## 视觉基线（重点：必须先解码比对再重生成）

新增预览卡会改变 `appearance-partition-*.png`（6 张）。流程与 B3-1 相同：

1. 先跑 `npm run test:visual`，确认只有 `appearance-partition-*` 失败（其余 18 张零漂移）。
2. **解码比对**失败快照：差异区域 = 顶部新增预览卡（约 +100-140px 高，分区顶部块状新增），无布局位移/无意外区域。
3. 确认后 `--update-snapshots` 只重生成 appearance-partition 6 张。
4. 复跑 `npm run test:visual` 全绿。

如 app-main 或其它分区漂移，**不要 update-snapshots**，报告控制器。

## 验证要求

- `npx playwright test tests/e2e/customizer.spec.js`（新旧用例全绿）
- `npm test`（单元全绿——customizer.test.js 只测订阅退订，updateOverview 加入订阅回调不破坏其断言；jsdom 无 matchMedia 由 prefersDark 守卫）
- `npm run test:e2e`（全量交互绿）
- `npm run build` 通过

## 提交

一个 commit，message：`feat: 外观分区实时整体预览卡（主题/强调色/玻璃/圆角/图标实时联动）`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B3-2-report.md`：改动说明、测试命令与输出摘要、基线重生成的解码比对说明、self-review、提交哈希。回复本会话只需：状态 + 提交哈希 + 一行测试摘要 + 疑虑（如有）。
