import { test, expect } from '@playwright/test';

test('标题栏结构与窗口控制', async ({ page }) => {
  await page.goto('/');
  // 独立演示区（body 顶部）；Task 15 矩阵内另有变体实例，计数限定在此
  const bar = page.locator('#titlebar-demo .c-titlebar');
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveAttribute('data-tauri-drag-region', '');
  await page.locator('#titlebar-demo .c-titlebar__control--max').click();
  await expect(page.locator('#titlebar-demo .c-titlebar__control--max svg')).toBeVisible();
  await page.locator('#titlebar-demo .c-titlebar__control--close').hover();
  await expect(page.locator('#titlebar-demo .c-titlebar__control--close')).toHaveCSS('background-color', 'rgb(239, 68, 68)');
});
