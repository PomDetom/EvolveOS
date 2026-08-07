import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs 定制器抽屉（.topbar__customizer → .cust-panel）→ 应用壳「外观」设置分区
// （APP_SECTIONS index 1）。外观分区为定制器整页形态（renderCustomizerGroups 惰性挂载，
// 6 组 .cust-group 与抽屉面板共用同一实现 + 同一份 store），滑杆实时链路不变。
// 取舍：导出（.cust-export）与重置（.cust-reset）在分区整页形态无对应（footer 为抽屉面板
// 专属），相应用例删除，保留滑杆 → CSS 变量实时生效的核心行为验证。

test('调整亚克力透明度实时生效', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const slider = appr.locator('.cust-row:has-text("透明度") input[type="range"]');
  await slider.fill('0.8');
  const bgOpacity = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--glass-bg-opacity').trim());
  expect(bgOpacity).toBe('0.8');
});

test('色相滑杆实时覆盖 --accent 且数值区显示', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const hue = appr.locator('.cust-row:has-text("色相") input[type="range"]');
  await hue.fill('200');
  let accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toMatch(/^hsl\(200 /);
  // 数值区显示自定义色相（非「跟随」）
  await expect(appr.locator('[data-out="hue"]')).toContainText('200°');
});

test('色温滑杆映射 --neutral-hue 暖端', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const temp = appr.locator('.cust-row:has-text("色温") input[type="range"]');
  await temp.fill('1'); // 暖端 → 中性色相 40（暖橙灰）
  let hue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--neutral-hue').trim());
  expect(hue).toBe('40');
});

test('外观分区：表面质感组标题 + 亚克力开关 + 噪点滑杆', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  await expect(page.locator('.cust-group').nth(1).locator('.cust-group__title')).toContainText('表面质感');
  await expect(page.locator('[data-glass-switch]')).toContainText('亚克力材质');
  await expect(page.locator('.cust-range[data-key="noise"]')).toBeVisible();
});
