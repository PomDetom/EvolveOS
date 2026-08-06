import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#components` 展示区 → 应用壳「组件」设置分区（APP_SECTIONS index 8）。
// 组件矩阵内容不变（docs/应用壳共用 component-showcase-full.js），选择器限定在分区容器内，
// 避免与壳标题栏/设置页同态类 strict mode 冲突。

test('图标渲染为内联 SVG', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  // 组件矩阵全量图标均为内联 SVG（.c-icon ≥ 20 处使用）
  expect(await comp.locator('svg.c-icon').count()).toBeGreaterThanOrEqual(20);
});

test('按钮四变体渲染', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const box = comp.locator('.showcase:has-text("主按钮")');
  await box.waitFor();
  // 计数限定在按钮展示区内：Card 页脚 / EmptyState action / Dialog / Toast 演示也会渲染按钮
  await expect(box.locator('.c-btn')).toHaveCount(7);
  await expect(box.locator('.c-btn--primary')).toHaveCount(4);
  await expect(box.locator('.c-btn--secondary')).toHaveCount(1);
  await expect(box.locator('.c-btn--ghost')).toHaveCount(1);
  await expect(box.locator('.c-btn--danger')).toHaveCount(1);
  await expect(box.locator('.c-btn--disabled')).toBeDisabled();
});

// Task I3 4d：primary hover 阴影令牌化（--shadow-md，跟随 shadow-intensity 定制器；
// 旧实现硬编码 rgba(0,0,0,0.18) 0 4px 12px，不响应定制器也不符合「禁止硬编码值」）
test('主按钮 hover 阴影使用 --shadow-md 令牌', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const box = comp.locator('.showcase:has-text("主按钮")');
  await box.waitFor();
  const btn = box.locator('.c-btn--primary').first();
  await btn.hover();
  // --shadow-md = 0 4px 16px ...（blur 16 为令牌特征值；旧硬编码 blur 12）
  await expect(btn).toHaveCSS('box-shadow', /0px 4px 16px/);
});
