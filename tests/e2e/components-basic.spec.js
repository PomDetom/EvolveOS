import { test, expect } from '@playwright/test';

test('图标渲染为内联 SVG', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const div = document.createElement('div');
    div.id = 'icon-probe';
    div.innerHTML = window.__renderIcon('home');
    document.querySelector('.content').append(div);
  });
  // 计数限定在探针元素内：Task 13 起 content 直接子元素含悬浮窗演示（自带图标）
  await expect(page.locator('#icon-probe svg.c-icon')).toHaveCount(1);
});

test('按钮四变体渲染', async ({ page }) => {
  await page.goto('/');
  const btnShowcase = page.locator('#components .showcase:has-text("按钮")').first();
  await btnShowcase.waitFor();
  // 计数限定在按钮展示区内：Card 页脚 / EmptyState action 等其它展示区也会渲染按钮
  await expect(btnShowcase.locator('.c-btn')).toHaveCount(7);
  await expect(btnShowcase.locator('.c-btn--primary')).toHaveCount(4);
  await expect(btnShowcase.locator('.c-btn--secondary')).toHaveCount(1);
  await expect(btnShowcase.locator('.c-btn--ghost')).toHaveCount(1);
  await expect(btnShowcase.locator('.c-btn--danger')).toHaveCount(1);
  await expect(btnShowcase.locator('.c-btn--disabled')).toBeDisabled();
});
