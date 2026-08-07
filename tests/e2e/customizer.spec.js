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

test('外观分组标题体现全局语义（重命名 + desc）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  const group = page.locator('.cust-group');
  await expect(group).toHaveCount(6);
  await expect(group.nth(0).locator('.cust-group__title')).toHaveText('整体色调');
  await expect(group.nth(0).locator('.cust-group__desc')).toHaveText('主题色/色相/饱和度/色温');
  await expect(group.nth(1).locator('.cust-group__title')).toHaveText('表面质感');
  await expect(group.nth(1).locator('.cust-group__desc')).toHaveText('透明度/模糊/噪点强度/亚克力材质');
  await expect(group.nth(2).locator('.cust-group__title')).toHaveText('文字排版');
  await expect(group.nth(2).locator('.cust-group__desc')).toHaveText('基准字号/缩放');
  await expect(group.nth(3).locator('.cust-group__title')).toHaveText('边角形状');
  await expect(group.nth(3).locator('.cust-group__desc')).toHaveText('圆角比例');
  await expect(group.nth(4).locator('.cust-group__title')).toHaveText('动效节奏');
  await expect(group.nth(4).locator('.cust-group__desc')).toHaveText('时长缩放/弹性强度');
  await expect(group.nth(5).locator('.cust-group__title')).toHaveText('阴影层次');
  await expect(group.nth(5).locator('.cust-group__desc')).toHaveText('阴影强度');
});

// B3-2：外观分区顶部实时整体预览卡（.cust-overview）。订阅回调只读 getConfig() 并写容器局部
// --preview-* 变量（不调 applyConfig —— 变更发起方已先 saveConfig + applyConfig）。
// getComputedStyle 读 .cust-overview 元素 inline 写入的变量；fill 触发 input → saveConfig → 订阅回调 updateOverview。
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
