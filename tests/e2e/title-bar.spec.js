import { test, expect } from '@playwright/test';

test('标题栏结构与窗口控制', async ({ page }) => {
  await page.goto('/');
  // 独立演示区（body 顶部）；Task 15 矩阵内另有变体实例，计数限定在此
  const bar = page.locator('#titlebar-demo .c-titlebar');
  await expect(bar).toHaveCount(1);
  // 拖拽属性只挂 .c-titlebar__drag（I2 真机实测：挂根元素会劫持三按钮点击，见
  // src/components/title-bar/title-bar.js 注释与 task-I2-report.md）
  await expect(page.locator('#titlebar-demo .c-titlebar__drag')).toHaveAttribute('data-tauri-drag-region', '');
  await expect(bar).not.toHaveAttribute('data-tauri-drag-region', '');
  await page.locator('#titlebar-demo .c-titlebar__control--max').click();
  await expect(page.locator('#titlebar-demo .c-titlebar__control--max svg')).toBeVisible();
  await page.locator('#titlebar-demo .c-titlebar__control--close').hover();
  await expect(page.locator('#titlebar-demo .c-titlebar__control--close')).toHaveCSS('background-color', 'rgb(239, 68, 68)');
});

// Task I2：窗口控制桥（Playwright 无法测真实 Tauri API，按计划书「桥接可测」设计 —
// bindWindowControls(api?) 接受注入的 windowApi，测试注入 mock 断言三按钮调用对应方法）
test('窗口控制桥：注入 mock windowApi 时三按钮调用对应窗口方法', async ({ page }) => {
  await page.goto('/');
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
  const bar = page.locator('#titlebar-demo');
  await bar.locator('.c-titlebar__control--min').click();
  await bar.locator('.c-titlebar__control--max').click();
  await bar.locator('.c-titlebar__control--close').click();
  await expect.poll(() => page.evaluate(() => window.__mockCalls))
    .toEqual(['minimize', 'toggleMaximize', 'close']);
});

test('窗口控制桥：无 windowApi（浏览器）返回降级态、演示行为保持', async ({ page }) => {
  await page.goto('/');
  const bound = await page.evaluate(async () => {
    const { bindWindowControls } = await import('/src/demo/window-controls.js');
    return bindWindowControls();
  });
  // 浏览器降级（Task B1-2）：返回 'browser' 标记降级态（原 false 契约随双通道变更）
  expect(bound).toBe('browser');
  // 演示行为保持：max 图标切换仍在、不抛错
  const btn = page.locator('#titlebar-demo .c-titlebar__control--max');
  await btn.click();
  await expect(btn).toHaveAttribute('data-maxed', '1');
  await btn.click();
  await expect(btn).not.toHaveAttribute('data-maxed', '1');
});
