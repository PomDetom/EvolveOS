import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#components` 展示区 → 应用壳「组件」设置分区（APP_SECTIONS index 8）。
// 变体矩阵内容不变，计数限定在分区容器内。

test('开关切换 aria-checked 并带动画类', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const sw = comp.locator('.c-switch').first();
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
});

test('滑杆使用主题强调色', async ({ page }) => {
  // 环境说明：共享 checkout（tauri dev + 陈旧 5173 server + MCP）资源紧张，截图型用例放宽时限
  test.setTimeout(60000);
  const comp = await openSettingsPartition(page, 8);
  const slider = comp.locator('.c-slider').first();
  // B5-2 适配：滑杆自绘胶囊化后不再用原生 accent-color（appearance:none + 自绘 track/thumb），
  // accent 消费在 track 填充渐变（paint-only，经 --accent 变量）与 thumb 边框。
  // 注：Chromium 151 起 getComputedStyle 对 ::-webkit-slider-runnable-track / ::-webkit-slider-thumb
  // 的伪元素样式反射不完整（返回原生默认值，backgroundImage 为 none），原生 accentColor 与
  // 伪元素 computed 断言均不可用。改为「渲染像素随 --accent 变化」的截图比对：换强调色后
  // 填充区像素必变（红 vs 靛蓝为大色块位移，swiftshader 确定性渲染下字节可靠），语义与原断言
  // 一致（滑杆外观取自主题强调色）。实现：center 滚动一次并固定视口 clip，只由 --accent 驱动差异。
  await slider.scrollIntoViewIfNeeded();
  await slider.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  const box = await slider.boundingBox();
  const clip = {
    x: Math.max(0, Math.floor(box.x - 2)), y: Math.max(0, Math.floor(box.y - 2)),
    width: Math.ceil(box.width + 4), height: Math.ceil(box.height + 4),
  };
  const shotIndigo = await page.screenshot({ clip });
  await page.evaluate(() => document.documentElement.style.setProperty('--accent', '#ff0000'));
  await page.waitForTimeout(150);
  const shotRed = await page.screenshot({ clip });
  expect(shotRed.equals(shotIndigo)).toBe(false);
});

test('表单组件结构完整', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  // 变体矩阵（Task 15）：各表单组件在矩阵内多变体渲染，断言数量与矩阵一致
  await expect(comp.locator('.c-input')).toHaveCount(4);
  await expect(comp.locator('.c-textarea')).toHaveCount(2);
  await expect(comp.locator('.c-select')).toHaveCount(3);
  await expect(comp.locator('.c-checkbox')).toHaveCount(3);
  await expect(comp.locator('.c-radio')).toHaveCount(3);
  // Task 13 起 kbd 被 SearchBar/HotkeyHint/HotkeyRecorder 组合复用，断言存在即可
  expect(await comp.locator('.c-kbd').count()).toBeGreaterThanOrEqual(1);
});
