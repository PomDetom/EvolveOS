import { test, expect } from '@playwright/test';

test('定制器打开并调整玻璃透明度实时生效', async ({ page }) => {
  await page.goto('/');
  await page.locator('.topbar__customizer').click();
  await expect(page.locator('.cust-panel')).toBeVisible();
  const slider = page.locator('.cust-row:has-text("透明度") input[type="range"]');
  await slider.fill('0.8');
  const bgOpacity = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--glass-bg-opacity').trim());
  expect(bgOpacity).toBe('0.8');
});

test('导出按钮复制 CSS 变量', async ({ page }) => {
  await page.goto('/');
  let copied = '';
  await page.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });
  await page.locator('.topbar__customizer').click();
  await page.locator('.cust-export').click();
  copied = await page.evaluate(() => window.__copied);
  expect(copied).toContain('--accent');
  expect(copied).toContain(':root');
});

test('重置恢复默认配置', async ({ page }) => {
  await page.goto('/');
  await page.locator('.topbar__customizer').click();
  await page.locator('.cust-glass-preview').hover();
  await page.locator('.cust-reset').click();
  const cfg = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ui-design-config') ?? 'null'));
  expect(cfg).toBeNull(); // 重置 = 清除存储 + applyConfig(DEFAULTS)
});

test('色相滑杆实时覆盖 --accent 且重置后恢复', async ({ page }) => {
  await page.goto('/');
  await page.locator('.topbar__customizer').click();
  const hue = page.locator('.cust-row:has-text("色相") input[type="range"]');
  await hue.fill('200');
  let accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toMatch(/^hsl\(200 /);
  // 数值区显示自定义色相（非「跟随」）
  await expect(page.locator('[data-out="hue"]')).toContainText('200°');
  // 重置恢复跟随主题色（无覆盖）
  await page.locator('.cust-reset').click();
  accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).not.toMatch(/^hsl\(200 /);
});
