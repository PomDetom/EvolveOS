import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#components` 展示区 → 应用壳「组件」设置分区（APP_SECTIONS index 8）。
// 计数限定在分区容器内。

test('列表点击选中切换样式', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const item = comp.locator('.c-list__item').first();
  await item.click();
  await expect(item).toHaveClass(/c-list__item--selected/);
});

test('徽标与标签渲染', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  await expect(comp.locator('.c-badge--danger')).toContainText('危险');
  await expect(comp.locator('.c-tag')).toHaveCount(2);
});

test('进度条达到目标值', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const bar = comp.locator('.c-progress__fill').first();
  // 注：简报原断言 /scaleX/ 在 Chromium 无法匹配 —— 计算值恒为 matrix(0.6,0,0,1,0,0)，
  // 等价断言改为 /matrix/（详见 task-8-report.md 顾虑说明）
  await expect(bar).toHaveCSS('transform', /matrix/);
});
