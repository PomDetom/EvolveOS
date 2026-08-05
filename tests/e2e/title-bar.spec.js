import { test, expect } from '@playwright/test';

test('标题栏结构与窗口控制', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.c-titlebar');
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveAttribute('data-tauri-drag-region', '');
  await page.locator('.c-titlebar__control--max').click();
  await expect(page.locator('.c-titlebar__control--max svg')).toBeVisible();
  await page.locator('.c-titlebar__control--close').hover();
  await expect(page.locator('.c-titlebar__control--close')).toHaveCSS('background-color', 'rgb(239, 68, 68)');
});
