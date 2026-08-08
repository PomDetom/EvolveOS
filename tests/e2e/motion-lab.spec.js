import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#motion` 动效实验室 → 应用壳「动效」设置分区（APP_SECTIONS index 9）。
// 内容不变（动效实验室惰性挂载 .ml-grid 5 卡），选择器限定在分区容器内。

test('动效实验室渲染 5 个演示', async ({ page }) => {
  const motion = await openSettingsPartition(page, 9);
  await expect(motion.locator('.ml-card')).toHaveCount(5);
});

test('弹性滑杆影响局部曲线', async ({ page }) => {
  const motion = await openSettingsPartition(page, 9);
  const slider = motion.locator('.c-slider').first();
  await slider.fill('1'); // 触发 input
  await expect(motion.locator('.ml-card').first())
    .toHaveCSS('--ease-spring', /cubic-bezier/);
});

test('重播按钮重新触发动画', async ({ page }) => {
  const motion = await openSettingsPartition(page, 9);
  const replay = motion.locator('.ml-replay').first();
  await replay.click();
  await expect(motion.locator('.ml-stage .ml-anim').first()).toHaveClass(/ml-anim--running/);
});
