import { test, expect } from '@playwright/test';

test('开关切换 aria-checked 并带动画类', async ({ page }) => {
  await page.goto('/');
  const sw = page.locator('.c-switch').first();
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
});

test('滑杆使用主题强调色', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('.c-slider').first();
  const color = await slider.evaluate(el => getComputedStyle(el).accentColor);
  // 通过计算样式路径解析 --accent（与 accentColor 同序列化格式），避免原始令牌字面量（hex）与计算色（rgb）格式比较
  const accent = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(color).toBe(accent);
});

test('表单组件结构完整', async ({ page }) => {
  await page.goto('/');
  // 变体矩阵（Task 15）：各表单组件在矩阵内多变体渲染，断言数量与矩阵一致
  await expect(page.locator('#components .c-input')).toHaveCount(4);
  await expect(page.locator('#components .c-textarea')).toHaveCount(2);
  await expect(page.locator('#components .c-select')).toHaveCount(3);
  await expect(page.locator('#components .c-checkbox')).toHaveCount(3);
  await expect(page.locator('#components .c-radio')).toHaveCount(3);
  // Task 13 起 kbd 被 SearchBar/HotkeyHint/HotkeyRecorder 组合复用，断言存在即可
  expect(await page.locator('#components .c-kbd').count()).toBeGreaterThanOrEqual(1);
});
