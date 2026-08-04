import { test, expect } from '@playwright/test';

test('app shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('UI Design System');
  await expect(page.locator('#app')).toHaveCount(1);
});
