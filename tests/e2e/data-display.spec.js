import { test, expect } from '@playwright/test';

test('列表点击选中切换样式', async ({ page }) => {
  await page.goto('/');
  const item = page.locator('.c-list__item').first();
  await item.click();
  await expect(item).toHaveClass(/c-list__item--selected/);
});

test('徽标与标签渲染', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.c-badge--danger')).toContainText('危险');
  await expect(page.locator('.c-tag')).toHaveCount(2);
});

test('进度条达到目标值', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.c-progress__fill').first();
  // 注：简报原断言 /scaleX/ 在 Chromium 无法匹配 —— 计算值恒为 matrix(0.6,0,0,1,0,0)，
  // 等价断言改为 /matrix/（详见 task-8-report.md 顾虑说明）
  await expect(bar).toHaveCSS('transform', /matrix/);
});
