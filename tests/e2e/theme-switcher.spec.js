import { test, expect } from '@playwright/test';

test('切换深色主题生效并持久化', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tsw__mode').filter({ hasText: '深' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

// Task I3 4a：.tsw__mode 单选语义（aria-pressed 状态同步，初始/切换/持久化后一致）
test('主题模式按钮带 aria-pressed 单选语义', async ({ page }) => {
  await page.goto('/');
  const modes = page.locator('.tsw__mode');
  // 初始：默认主题（跟随 system）为按下，其余非按下
  await expect(modes.filter({ hasText: '跟随' })).toHaveAttribute('aria-pressed', 'true');
  await expect(modes.filter({ hasText: '浅' })).toHaveAttribute('aria-pressed', 'false');
  await expect(modes.filter({ hasText: '深' })).toHaveAttribute('aria-pressed', 'false');
  // 切换后状态同步（单选：旧项弹起、新项按下）
  await modes.filter({ hasText: '深' }).click();
  await expect(modes.filter({ hasText: '深' })).toHaveAttribute('aria-pressed', 'true');
  await expect(modes.filter({ hasText: '浅' })).toHaveAttribute('aria-pressed', 'false');
});

test('切换主题色风格生效并持久化', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tsw__accent').filter({ hasText: '青绿' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
});
