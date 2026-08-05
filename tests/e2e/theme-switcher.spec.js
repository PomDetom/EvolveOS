import { test, expect } from '@playwright/test';

test('切换深色主题生效并持久化', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tsw__mode').filter({ hasText: '深' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('切换主题色风格生效并持久化', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tsw__accent').filter({ hasText: '青绿' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
});
