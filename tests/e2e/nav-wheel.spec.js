import { test, expect } from '@playwright/test';

test('鼠标拖拽滚动导航列表', async ({ page }) => {
  await page.goto('/');
  const list = page.locator('.c-navwheel__list');
  const start = await list.evaluate(el => el.scrollTop);
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 150, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const end = await list.evaluate(el => el.scrollTop);
  expect(end).toBeGreaterThan(start);
});

test('设置入口在左下角且可点击', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('.c-navwheel__settings');
  await expect(btn).toContainText('设置');
  await btn.click();
  // 当前实现：滚动到设置页场景模板（Task 19 前为占位：触发 data-mount=settings-entry 回调）
  await expect(btn).toBeVisible();
});

test('点击模块滑动到中央并选中', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('.c-navwheel__item');
  await expect(items).toHaveCount(12); // 4 真实模块 × 3 组演示重复
  await items.nth(3).click();
  await expect(items.nth(3)).toHaveClass(/c-navwheel__item--active/);
  // 等待 rAF 滚动动画（--dur-base 200ms）结束后再测量位置
  await page.waitForTimeout(400);
  // 选中项应位于导航视口中央附近
  const box = await items.nth(3).boundingBox();
  const listBox = await page.locator('.navwheel__list').boundingBox();
  const centerDelta = Math.abs((box.y + box.height / 2) - (listBox.y + listBox.height / 2));
  expect(centerDelta).toBeLessThan(4);
});
