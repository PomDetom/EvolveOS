import { test, expect } from '@playwright/test';

test('Toast 出现并自动消失', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.__toast('测试消息', { variant: 'success' }));
  await expect(page.locator('.c-toast')).toContainText('测试消息');
  await expect(page.locator('.c-toast')).toHaveCount(0, { timeout: 4000 });
});

test('Dialog 打开与确认', async ({ page }) => {
  await page.goto('/');
  // 注意：不能把 openDialog 的 Promise 返回给 page.evaluate（会死等用户交互）——
  // 用块语句只执行不返回，交互由后续断言驱动
  await page.evaluate(() => { window.__openDialog({ title: '确认删除', content: '确定吗？', confirmLabel: '删除', danger: true }); });
  await expect(page.locator('.c-dialog')).toContainText('确认删除');
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(page.locator('.c-dialog')).toHaveCount(0);
});

test('Tab 切换指示条跟随', async ({ page }) => {
  await page.goto('/');
  const tab = page.locator('.c-tab').nth(1);
  await tab.click();
  await expect(tab).toHaveClass(/c-tab--active/);
});
