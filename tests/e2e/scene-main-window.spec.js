import { test, expect } from '@playwright/test';

// 场景模板 2：主窗口（Task 19）—— 一体式 TitleBar + NavigationWheel 滑动导航 + 8 模块内容区。
// 8×64px > 列表视口高度，保证滑动选择可真实发生（pre-flight 修订：5 → 8 模块）。
test('主窗口滑动导航切换模块内容', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.cmain');
  await expect(scene.locator('.c-navwheel__item')).toHaveCount(8);
  await expect(scene.locator('.cmain__page--active')).toContainText('统计');
  await scene.locator('.c-navwheel__item').nth(3).click();
  await expect(scene.locator('.cmain__page--active')).toContainText('图片');
});
