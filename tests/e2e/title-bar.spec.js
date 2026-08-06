import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs 独立标题栏展示区（#titlebar-demo）→ 应用壳「组件」设置分区
// （APP_SECTIONS index 8）「标题栏 TitleBar」展示盒（3 个窗口变体，mountTitleBar 已挂）。
// 保留 B1-2 契约：bindWindowControls 无 windowApi 时返回 'browser' 降级态。

test('标题栏结构与窗口控制', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const box = comp.locator('.showcase:has-text("标题栏")');
  await expect(box.locator('.c-titlebar')).toHaveCount(3); // 剪贴板/密码管理/记账本三变体
  const bar = box.locator('.c-titlebar').first();
  // 拖拽属性只挂 .c-titlebar__drag（I2 真机实测：挂根元素会劫持三按钮点击，见
  // src/components/title-bar/title-bar.js 注释与 task-I2-report.md）
  await expect(bar.locator('.c-titlebar__drag')).toHaveAttribute('data-tauri-drag-region', '');
  await expect(bar).not.toHaveAttribute('data-tauri-drag-region', '');
  await bar.locator('.c-titlebar__control--max').click();
  await expect(bar.locator('.c-titlebar__control--max svg')).toBeVisible();
  await bar.locator('.c-titlebar__control--close').hover();
  await expect(bar.locator('.c-titlebar__control--close')).toHaveCSS('background-color', 'rgb(239, 68, 68)');
});

// Task I2：窗口控制桥（Playwright 无法测真实 Tauri API，按计划书「桥接可测」设计 —
// bindWindowControls(api?) 接受注入的 windowApi，测试注入 mock 断言三按钮调用对应方法）
test('窗口控制桥：注入 mock windowApi 时三按钮调用对应窗口方法', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const bar = comp.locator('.showcase:has-text("标题栏") .c-titlebar').first();
  await page.evaluate(async () => {
    const calls = [];
    const mockWin = {
      minimize: () => calls.push('minimize'),
      toggleMaximize: () => calls.push('toggleMaximize'),
      close: () => calls.push('close'),
    };
    const { bindWindowControls } = await import('/src/demo/window-controls.js');
    window.__mockBound = bindWindowControls(mockWin);
    window.__mockCalls = calls;
  });
  await expect.poll(() => page.evaluate(() => window.__mockBound)).toBe(true);
  await bar.locator('.c-titlebar__control--min').click();
  await bar.locator('.c-titlebar__control--max').click();
  await bar.locator('.c-titlebar__control--close').click();
  await expect.poll(() => page.evaluate(() => window.__mockCalls))
    .toEqual(['minimize', 'toggleMaximize', 'close']);
});

test('窗口控制桥：无 windowApi（浏览器）返回降级态、演示行为保持', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const btn = comp.locator('.showcase:has-text("标题栏") .c-titlebar').first().locator('.c-titlebar__control--max');
  const bound = await page.evaluate(async () => {
    const { bindWindowControls } = await import('/src/demo/window-controls.js');
    return bindWindowControls();
  });
  // 浏览器降级（Task B1-2）：返回 'browser' 标记降级态（原 false 契约随双通道变更）
  expect(bound).toBe('browser');
  // 演示行为保持：max 图标切换仍在、不抛错
  await btn.click();
  await expect(btn).toHaveAttribute('data-maxed', '1');
  await btn.click();
  await expect(btn).not.toHaveAttribute('data-maxed', '1');
});
