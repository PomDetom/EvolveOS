import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#scenes` 剪贴板悬浮窗场景模板 → 应用壳「组件」设置分区（APP_SECTIONS
// index 8）的组合示例（B1-1 已挂 `.cfloat`，mountClipboardFloat 流式 in-flow 于分区末尾）。

test('剪贴板悬浮窗列表渲染与搜索过滤', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const scene = comp.locator('.cfloat');
  await expect(scene).toBeVisible();
  await expect(scene.locator('.cfloat__item')).toHaveCount(12);
  await scene.locator('.c-search-bar input').fill('github');
  const visible = await scene.locator('.cfloat__item:visible').count();
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(12);
});

test('删除与清空流程', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const scene = comp.locator('.cfloat');
  await scene.locator('.cfloat__item').first().hover();
  await scene.locator('.cfloat__item .cfloat__op--delete').first().click();
  await expect(scene.locator('.cfloat__item')).toHaveCount(11);
  await scene.locator('.cfloat__clear').click();
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(scene.locator('.cfloat__item')).toHaveCount(0);
  await expect(scene.locator('.c-empty-state')).toBeVisible();
});
