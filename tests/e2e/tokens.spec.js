import { test, expect } from '@playwright/test';

test('设计令牌已挂载', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveAttribute('data-accent', 'indigo');
  const bg = await root.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(bg).toBe('#6e7bf2');
});

test('切换 data-accent 后强调色变化', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.documentElement.dataset.accent = 'teal');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(bg).toBe('#2dd4bf');
});
