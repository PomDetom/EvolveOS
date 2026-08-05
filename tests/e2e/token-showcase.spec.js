import { test, expect } from '@playwright/test';

test('令牌展示区渲染六大类', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tokens .tk-card')).toHaveCount(6);
  await expect(page.locator('#tokens .tk-swatch')).toHaveCount(11 + 10 + 4);
});

test('点击色块复制变量名', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {};
  });
  await page.locator('#tokens .tk-swatch').first().click();
  await expect(page.locator('.c-toast')).toContainText('已复制');
});
