import { test, expect } from '@playwright/test';

test('图标渲染为内联 SVG', async ({ page }) => {
  await page.goto('/');
  // 真实展示区（Task 15 矩阵）：全量组件图标均为内联 SVG（.c-icon ≥ 20 处使用）
  expect(await page.locator('#components svg.c-icon').count()).toBeGreaterThanOrEqual(20);
});

test('按钮四变体渲染', async ({ page }) => {
  await page.goto('/');
  const box = page.locator('.showcase:has-text("主按钮")');
  await box.waitFor();
  // 计数限定在按钮展示区内：Card 页脚 / EmptyState action / Dialog / Toast 演示也会渲染按钮
  await expect(box.locator('.c-btn')).toHaveCount(7);
  await expect(box.locator('.c-btn--primary')).toHaveCount(4);
  await expect(box.locator('.c-btn--secondary')).toHaveCount(1);
  await expect(box.locator('.c-btn--ghost')).toHaveCount(1);
  await expect(box.locator('.c-btn--danger')).toHaveCount(1);
  await expect(box.locator('.c-btn--disabled')).toBeDisabled();
});
