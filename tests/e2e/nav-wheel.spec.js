import { test, expect } from '@playwright/test';

test('点击模块滑动到中央并选中', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('.c-navwheel__item');
  await expect(items).toHaveCount(12); // 4 真实模块 × 3 组演示重复
  await items.nth(3).click();
  await expect(items.nth(3)).toHaveClass(/c-navwheel__item--active/);
  // 等待 rAF 滚动动画（--dur-base 200ms）结束后再测量位置
  await page.waitForTimeout(400);
  // 选中项应位于导航视口中央附近
  const box = await items.nth(3).boundingBox();
  const listBox = await page.locator('.navwheel__list').boundingBox();
  const centerDelta = Math.abs((box.y + box.height / 2) - (listBox.y + listBox.height / 2));
  expect(centerDelta).toBeLessThan(4);
});
