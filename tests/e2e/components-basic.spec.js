import { test, expect } from '@playwright/test';

test('图标渲染为内联 SVG', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const div = document.createElement('div');
    div.innerHTML = window.__renderIcon('home');
    document.querySelector('.content').append(div);
  });
  await expect(page.locator('.content > div svg.c-icon')).toHaveCount(1);
});

test('按钮四变体渲染', async ({ page }) => {
  await page.goto('/');
  await page.locator('#components .showcase:has-text("按钮")').first().waitFor();
  await expect(page.locator('#components .c-btn')).toHaveCount(7);
  await expect(page.locator('#components .c-btn--primary')).toHaveCount(4);
  await expect(page.locator('#components .c-btn--secondary')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--ghost')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--danger')).toHaveCount(1);
  await expect(page.locator('#components .c-btn--disabled')).toBeDisabled();
});
