import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#components` 展示区 → 应用壳「组件」设置分区（APP_SECTIONS index 8）。
// 悬浮窗交互实例（.csg-fwin .c-fwin）经 CSS 定位于视口右下角（fixed），是分区内唯一
// 可拖拽/可关闭的挂载实例 —— 静态变体（.csg-fwin-static）为 relative 纯展示不挂载交互。

test('悬浮窗可拖拽移动', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const win = comp.locator('.csg-fwin .c-fwin');
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

// Task I3 4e：close 按钮行为 —— 点击移除演示窗口（Tauri 场景由用户接线真实关闭；
// 浏览器演示语义 = 关闭即移除，与「置顶/折叠」同级的演示行为）
test('悬浮窗 close 按钮移除演示窗口', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const fwinBlock = comp.locator('.csg-fwin');
  await expect(fwinBlock.locator('.c-fwin')).toHaveCount(1);
  await fwinBlock.locator('.c-fwin__close').click();
  await expect(fwinBlock.locator('.c-fwin')).toHaveCount(0);
});

// Task I3 4f：拖拽属性只挂非按钮区（与 I2 同款修复 —— 整条 titlebar 挂属性会劫持
// pin/fold/close 三按钮点击；属性在浏览器无意义，演示拖拽行为零变化）
test('悬浮窗拖拽属性只挂标题非按钮区', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const fwinBlock = comp.locator('.csg-fwin');
  const bar = fwinBlock.locator('.c-fwin__titlebar');
  await expect(bar).not.toHaveAttribute('data-tauri-drag-region', '');
  await expect(fwinBlock.locator('.c-fwin__title')).toHaveAttribute('data-tauri-drag-region', '');
});

test('搜索框空态与输入', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const input = comp.locator('.c-search-bar input').first();
  await input.fill('测');
  await expect(input).toHaveValue('测');
});

test('快捷键录制器捕获组合键', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const rec = comp.locator('.c-hotkey-recorder').first();
  await rec.click();
  await page.keyboard.press('Control+Shift+K');
  await expect(rec).toContainText('Ctrl');
});
