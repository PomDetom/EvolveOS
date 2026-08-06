import { test, expect } from '@playwright/test';

// B1-3 迁移：docs 展示页冒烟 → 应用壳骨架冒烟（?mode=app 为唯一产品形态）。

test('app shell renders', async ({ page }) => {
  await page.goto('/?mode=app');
  await expect(page.locator('.app-main')).toBeVisible();
});
