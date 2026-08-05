import { test, expect } from '@playwright/test';

test('动效实验室渲染 5 个演示', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ml-card')).toHaveCount(5);
});

test('弹性滑杆影响局部曲线', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('.ml-slider').first();
  await slider.fill('1'); // 触发 input
  await expect(page.locator('.ml-card').first())
    .toHaveCSS('--ease-spring', /cubic-bezier/);
});

test('重播按钮重新触发动画', async ({ page }) => {
  await page.goto('/');
  const replay = page.locator('.ml-replay').first();
  await replay.click();
  await expect(page.locator('.ml-stage .ml-anim').first()).toHaveClass(/ml-anim--running/);
});
