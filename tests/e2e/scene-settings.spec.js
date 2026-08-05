import { test, expect } from '@playwright/test';

// 场景模板 3：设置页（Task 20）—— 滑动选择分区 + 定制器整页嵌入 + 快捷键录制。
// pre-flight 修订：5 → 8 分区（8×64px > 列表视口高度，滑动选择真实生效）。
test('设置页滑动选择分区切换', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.csettings');
  await expect(scene.locator('.c-navwheel__item')).toHaveCount(8);
  await expect(scene.locator('.csettings__page--active')).toContainText('通用');
  await scene.locator('.c-navwheel__item').nth(1).click();
  await expect(scene.locator('.csettings__page--active')).toContainText('外观');
});

test('外观页嵌入定制器分组', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.csettings');
  await scene.locator('.c-navwheel__item').nth(1).click();
  await expect(scene.locator('.cust-group')).toHaveCount(6);
});
