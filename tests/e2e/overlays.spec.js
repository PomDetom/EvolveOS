import { test, expect } from '@playwright/test';

// Task I3 Step 2：toast flake 修复。根因：toast 生命周期 2500ms（自动消失）+ 220ms
// （淡出后移除）≈ 2720ms 由页面内 setTimeout 驱动；旧消失断言预算 4000ms，在全量并行
// （多 worker + swiftshader 软件栅格化）下页面主线程被 CPU 竞争拖延、setTimeout 偶发
// 延迟 >1.3s 时预算耗尽 → 偶发「消失断言超时」（账本 minor：全量偶发、单跑必过）。
// 修复：两个断言都用自动重试 + 足够超时（不依赖精确计时预算），慢环境不再失败，
// 测试语义（出现 → 自动消失）不变。
test('Toast 出现并自动消失', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.__toast('测试消息', { variant: 'success' }));
  await expect(page.locator('.c-toast')).toContainText('测试消息', { timeout: 10000 });
  await expect(page.locator('.c-toast')).toHaveCount(0, { timeout: 15000 });
});

test('Dialog 打开与确认', async ({ page }) => {
  await page.goto('/');
  // 注意：不能把 openDialog 的 Promise 返回给 page.evaluate（会死等用户交互）——
  // 用块语句只执行不返回，交互由后续断言驱动
  await page.evaluate(() => { window.__openDialog({ title: '确认删除', content: '确定吗？', confirmLabel: '删除', danger: true }); });
  await expect(page.locator('.c-dialog')).toContainText('确认删除');
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(page.locator('.c-dialog')).toHaveCount(0);
});

test('Tab 切换指示条跟随', async ({ page }) => {
  await page.goto('/');
  const tab = page.locator('.c-tab').nth(1);
  await tab.click();
  await expect(tab).toHaveClass(/c-tab--active/);
});
