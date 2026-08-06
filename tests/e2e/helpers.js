import { expect } from '@playwright/test';

/**
 * 进入应用壳设置分区（B1-3 迁移入口）：goto `?mode=app` → 点 ⚙（设置）→ 点第 index 个分区项。
 * 分区索引以 APP_SECTIONS 实际序为准（B1-1 实测：通用0/外观1/…/组件8/动效9）。
 *
 * 相对任务计划书基线 helper 的两处必要微调：
 * - `.csettings__page--active` 限定在桌面设置页 section[data-page="settings"] 内，防与手机
 *   页面栈同态类 strict mode 冲突（.app-main__stack 的 settings 页渲染同套 .csettings__ 类）。
 * - 组件/动效/外观分区内容为惰性挂载（动态 import + 首次激活才渲染），等待容器非空再返回，
 *   避免测试与懒加载竞态（迁移后逐文件跑绿的前提：断言目标真实存在）。
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} index APP_SECTIONS 分区索引
 * @returns {Promise<import('@playwright/test').Locator>} 桌面设置页激活分区容器（.csettings__page--active）
 */
export async function openSettingsPartition(page, index) {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(index).click();
  const active = page.locator('.app-main__page[data-page="settings"] .csettings__page--active');
  await expect(active).toBeVisible();
  // 惰性挂载容器：外观定制器（.csettings__cust）/ 组件·动效展示（[data-partition]）
  const cust = active.locator('.csettings__cust');
  if (await cust.count()) await expect(cust).not.toBeEmpty({ timeout: 10000 });
  const partition = active.locator('[data-partition]');
  if (await partition.count()) await expect(partition).not.toBeEmpty({ timeout: 10000 });
  return active;
}
