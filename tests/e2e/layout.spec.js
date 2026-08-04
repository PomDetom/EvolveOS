import { test, expect } from '@playwright/test';

test('应用骨架结构完整', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.navwheel__list')).toBeVisible();
  await expect(page.locator('.navwheel__settings')).toContainText('设置');
  await expect(page.locator('.content__section')).toHaveCount(4);
  for (const id of ['tokens', 'components', 'motion', 'scenes']) {
    await expect(page.locator(`section#${id}`)).toBeVisible();
  }
});
