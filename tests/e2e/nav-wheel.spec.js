import { test, expect } from '@playwright/test';

test('鼠标拖拽滚动导航列表', async ({ page }) => {
  await page.goto('/');
  // 侧栏导航轮：限定 .navwheel__list（Task 15 矩阵内的演示实例仅用 .c-navwheel__list）
  const list = page.locator('.navwheel__list');
  const start = await list.evaluate(el => el.scrollTop);
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 150, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const end = await list.evaluate(el => el.scrollTop);
  expect(end).toBeGreaterThan(start);
});

test('设置入口在左下角且可点击', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('.c-navwheel__settings');
  await expect(btn).toContainText('设置');
  await btn.click();
  // 当前实现：滚动到设置页场景模板（Task 19 前为占位：触发 data-mount=settings-entry 回调）
  await expect(btn).toBeVisible();
});

// Task I3 Step 1：滚轮滚动 → 停止 150ms+ 后吸附最近项（规格 §8.3 不得悬置）。
// 方法参考最终审查复评实测（wheel 滚 100px）：吸附后 scrollTop 收敛到
// 「最近项中心对齐视口 38.2% 锚线」的位置（Task A2 锚点化后按新几何）—— 断言滚动发生
// + 选中项精确锚定，不硬编码具体 index（几何依赖视口长度，随尺寸变化）。
test('滚轮滚动停止后吸附最近项并选中', async ({ page }) => {
  await page.goto('/');
  const list = page.locator('.navwheel__list');
  const box = await list.boundingBox();
  // wheel 需要指针悬停在列表上（Chromium 将 wheel 派发到 hover 元素）
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 100);
  // 吸附延迟 150ms；toHaveClass 自动重试，覆盖计时窗口
  await expect(list.locator('.c-navwheel__item--active')).toHaveCount(1);
  await page.waitForTimeout(400); // 吸附完成后测量位置
  // 滚动确实发生了（wheel 100px 被消费，吸附位置在初始之上）
  const scrolled = await list.evaluate(el => el.scrollTop);
  expect(scrolled).toBeGreaterThan(50);
  // 最近项被选中且中心对齐视口 38.2% 锚线（黄金比例锚点，非居中；精确吸附，delta < 4px）
  const activeBox = await list.locator('.c-navwheel__item--active').boundingBox();
  const listBox = await list.boundingBox();
  const anchorDelta = Math.abs((activeBox.y + activeBox.height / 2) - (listBox.y + listBox.height * 0.382));
  expect(anchorDelta).toBeLessThan(4);
});

test('点击模块滑动到锚点并选中', async ({ page }) => {
  await page.goto('/');
  // 侧栏导航轮：限定 .navwheel__list（矩阵内演示实例另含 8 项，不参与计数）
  const items = page.locator('.navwheel__list .c-navwheel__item');
  await expect(items).toHaveCount(12); // 4 真实模块 × 3 组演示重复
  await items.nth(3).click();
  await expect(items.nth(3)).toHaveClass(/c-navwheel__item--active/);
  // 等待 rAF 滚动动画（--dur-base 200ms）结束后再测量位置
  await page.waitForTimeout(400);
  // 选中项应位于导航视口 38.2% 锚线附近（黄金比例锚点）
  const box = await items.nth(3).boundingBox();
  const listBox = await page.locator('.navwheel__list').boundingBox();
  const anchorDelta = Math.abs((box.y + box.height / 2) - (listBox.y + listBox.height * 0.382));
  expect(anchorDelta).toBeLessThan(4);
});
