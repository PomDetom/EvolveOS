import { test, expect } from '@playwright/test';

test('剪贴板悬浮窗列表渲染与搜索过滤', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.cfloat');
  await expect(scene.locator('.cfloat__item')).toHaveCount(12);
  await scene.locator('.c-search-bar input').fill('github');
  const visible = await scene.locator('.cfloat__item:visible').count();
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(12);
});

test('删除与清空流程', async ({ page }) => {
  await page.goto('/');
  const scene = page.locator('.cfloat');
  await scene.locator('.cfloat__item').first().hover();
  await scene.locator('.cfloat__item .cfloat__op--delete').first().click();
  await expect(scene.locator('.cfloat__item')).toHaveCount(11);
  await scene.locator('.cfloat__clear').click();
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(scene.locator('.cfloat__item')).toHaveCount(0);
  await expect(scene.locator('.c-empty-state')).toBeVisible();
});
