import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#components` 展示区 → 应用壳「组件」设置分区（APP_SECTIONS index 8）。
// 组件矩阵内容不变（docs/应用壳共用 component-showcase-full.js），选择器限定在分区容器内，
// 避免与壳标题栏/设置页同态类 strict mode 冲突。

test('图标渲染为内联 SVG', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  // 组件矩阵全量图标均为内联 SVG（.c-icon ≥ 20 处使用）
  expect(await comp.locator('svg.c-icon').count()).toBeGreaterThanOrEqual(20);
});

test('按钮四变体渲染', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const box = comp.locator('.showcase:has-text("主按钮")');
  await box.waitFor();
  // 计数限定在按钮展示区内：Card 页脚 / EmptyState action / Dialog / Toast 演示也会渲染按钮
  await expect(box.locator('.c-btn')).toHaveCount(7);
  await expect(box.locator('.c-btn--primary')).toHaveCount(4);
  await expect(box.locator('.c-btn--secondary')).toHaveCount(1);
  await expect(box.locator('.c-btn--ghost')).toHaveCount(1);
  await expect(box.locator('.c-btn--danger')).toHaveCount(1);
  await expect(box.locator('.c-btn--disabled')).toBeDisabled();
});

// Task I3 4d：primary hover 阴影 —— B5-3 iOS 化后从 `--shadow-md`（blur 16 中性暗影）
// 改为柔和彩影 `0 4px 14px color-mix(accent-400 40%)`（内高光 + 彩影，层次按钮），
// 断言随之改为新 iOS 彩影特征值（blur 14 + inset 内高光）。
test('主按钮 hover 阴影为柔和彩影（内高光 + accent 彩影）', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const box = comp.locator('.showcase:has-text("主按钮")');
  await box.waitFor();
  const btn = box.locator('.c-btn--primary').first();
  await btn.hover();
  // 新 iOS 层次按钮 hover：inset 顶部内高光 + 0 4px 14px accent 彩影（blur 14 特征值）
  await expect(btn).toHaveCSS('box-shadow', /0px 4px 14px/);
  await expect(btn).toHaveCSS('box-shadow', /inset/);
});

// B5-3：iOS 风格徽标/按钮/悬浮球（层次而非浓色）。brief verbatim，唯一适配：
// 回概览的 home 项在左窗应用目录（.app-main__nav-l），右窗设置目录无 home 项。
test('B5-3：徽标/按钮/悬浮球 iOS 风格（层次而非浓色）', async ({ page }) => {
  await page.goto('/?mode=app');
  const comp = page.locator('.app-main__settings [data-page="components"]');
  // 进入组件分区
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  // 徽标：tint 底半透明混色（非实色语义底）+ 细描边
  const badgeBg = await comp.locator('.c-badge--accent').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(badgeBg).toContain('color(srgb'); // color-mix 混色计算值
  // 按钮 primary：内高光（box-shadow 含 inset）
  const btnShadow = await comp.locator('.c-btn--primary').first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(btnShadow).toContain('inset');
  // 悬浮球：玻璃底（backdrop-filter 生效）
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="home"]').click(); // 回概览（悬浮球在壳）
  const ballFilter = await page.locator('.app-main__float-ball .c-float-ball').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(ballFilter).toContain('blur');
});
