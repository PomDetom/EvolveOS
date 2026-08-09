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

// B5-final（find 1）：动效试玩器弹性滑杆 --fill 按值（默认 springStrength 0.6 / [0,1] → 60%，
// 非 50% 静态兜底），并随交互更新。渲染消费路径由 customizer 像素用例覆盖（同一 CSS 渐变机制）。
test('B5-final：弹性滑杆 --fill 按值填充（默认 0.6 → 60% 且交互更新）', async ({ page }) => {
  const motion = await openSettingsPartition(page, 9);
  const spring = motion.locator('.c-slider[aria-label="弹性强度"]').first();
  // parseFloat 抗浮点序列化（60.00000000000001% 与 60% 语义等价）
  const readFillPct = () => spring.evaluate((el) => {
    const v = parseFloat(el.style.getPropertyValue('--fill'));
    return Number.isNaN(v) ? -1 : v;
  });
  expect(await readFillPct()).toBeCloseTo(60, 0); // 初始渲染即正确（非仅交互后）
  await spring.fill('1');
  expect(await readFillPct()).toBeCloseTo(100, 0);
  await spring.fill('0.5');
  expect(await readFillPct()).toBeCloseTo(50, 0);
});
