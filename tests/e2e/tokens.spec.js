import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs 页 → 应用壳「外观」设置分区（APP_SECTIONS index 1）。令牌系统为全局
// CSS 变量层（挂 <html>，mode 无关），在外观分区内验证同一套默认配置与主题色覆盖。

test('设计令牌已挂载', async ({ page }) => {
  await openSettingsPartition(page, 1);
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveAttribute('data-accent', 'indigo');
  const bg = await root.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(bg).toBe('#6e7bf2');
});

test('切换 data-accent 后强调色变化', async ({ page }) => {
  await openSettingsPartition(page, 1);
  await page.evaluate(() => document.documentElement.dataset.accent = 'teal');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(bg).toBe('#2dd4bf');
});
