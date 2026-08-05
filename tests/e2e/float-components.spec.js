import { test, expect } from '@playwright/test';

test('悬浮窗可拖拽移动', async ({ page }) => {
  await page.goto('/');
  const win = page.locator('.c-fwin').first();
  const bar = win.locator('.c-fwin__titlebar');
  const before = await win.boundingBox();
  const b = await bar.boundingBox();
  await page.mouse.move(b.x + 60, b.y + 12);
  await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + 12 + 80, { steps: 5 });
  await page.mouse.up();
  const after = await win.boundingBox();
  expect(after.y - before.y).toBeGreaterThan(40);
});

test('搜索框空态与输入', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('.c-search-bar input').first();
  await input.fill('测');
  await expect(input).toHaveValue('测');
});

test('快捷键录制器捕获组合键', async ({ page }) => {
  await page.goto('/');
  const rec = page.locator('.c-hotkey-recorder').first();
  await rec.click();
  await page.keyboard.press('Control+Shift+K');
  await expect(rec).toContainText('Ctrl');
});
