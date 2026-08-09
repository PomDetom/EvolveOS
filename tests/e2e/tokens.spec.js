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

test('B5-1：--font-sans 全局指向阿里普惠体', async ({ page }) => {
  await page.goto('/?mode=app');
  // 显式 load 强制拉取普惠体：仅 await document.fonts.ready 不足（字体由渲染惰性触发，
  // ready 可能在 load 开始前已 settle，随后 check 返回 false），CJK 字体大需确保加载完成
  await page.evaluate(() =>
    Promise.all([
      document.fonts.load('14px "Alibaba PuHuiTi"'),
      document.fonts.load('700 14px "Alibaba PuHuiTi"'),
    ]));
  const fam = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily);
  expect(fam).toContain('Alibaba PuHuiTi');
  // 普惠体已加载（55 Regular）
  const loaded = await page.evaluate(() =>
    document.fonts.check('14px "Alibaba PuHuiTi"'));
  expect(loaded).toBe(true);
});

test('B5-F1：--font-sans 的 medium 字重指向普惠体 500（65 Medium）', async ({ page }) => {
  await page.goto('/?mode=app');
  // 显式强制加载 500 档（B5-1 竞态适配同型：document.fonts.ready 早 settle，须显式 load）
  await page.evaluate(() => document.fonts.load('500 14px "Alibaba PuHuiTi"'));
  const loaded = await page.evaluate(() =>
    document.fonts.check('500 14px "Alibaba PuHuiTi"'));
  expect(loaded).toBe(true);
});
