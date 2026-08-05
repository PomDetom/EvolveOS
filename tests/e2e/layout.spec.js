import { test, expect } from '@playwright/test';

test('应用骨架结构完整', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.navwheel__list')).toBeVisible();
  await expect(page.locator('.navwheel__settings')).toContainText('设置');
  await expect(page.locator('.content__section')).toHaveCount(4);
  for (const id of ['tokens', 'components', 'motion', 'scenes']) {
    await expect(page.locator(`section#${id}`)).toBeVisible();
  }
});

// Task I4 Step 1（规格 §10 窄屏自动折叠导航）：≤900px 侧栏 NavigationWheel 折叠为顶部下拉。
// 断言链：800×600 下 .navwheel 隐藏 + 顶部下拉出现（4 个真实模块，NAV_CORE 去重）→
// 选择模块 → 对应 section 可见（wheel.setActive 触发 onChange 的 scrollIntoView）→
// 侧栏实例选中态已同步 → 1280 下恢复可见且选中项一致。
test('窄屏折叠导航：顶部下拉选择模块跳转，宽屏恢复侧栏且选中态一致', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(page.locator('.navwheel')).toBeHidden();
  await expect(page.locator('.topbar__nav')).toBeHidden();
  const select = page.locator('.topbar__nav-mobile');
  await expect(select).toBeVisible();
  await expect(select.locator('option')).toHaveCount(4); // 4 个真实模块（去重后的 NAV_CORE）
  await select.selectOption('scenes');
  await expect(page.locator('section#scenes')).toBeInViewport();
  // 侧栏实例选中态同步（wheel.setActive）：切回宽屏后 active 项即所选项
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('.navwheel')).toBeVisible();
  await expect(page.locator('.navwheel__list .c-navwheel__item--active')).toHaveAttribute('data-id', 'scenes');
});
