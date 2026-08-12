import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs `#components` 展示区 → 应用壳「组件」设置分区（APP_SECTIONS index 9）。
// 原用例经 window.__toast/__openDialog 测试桥（docs 专属）触发浮层 —— 分区矩阵内浮层组件
// 自带「点击演示」触发按钮（[data-toast] / [data-dialog]），改点按钮驱动，语义不变。

// Task I3 Step 2：toast flake 修复。根因：toast 生命周期 2500ms（自动消失）+ 220ms
// （淡出后移除）≈ 2720ms 由页面内 setTimeout 驱动；旧消失断言预算 4000ms，在全量并行
// （多 worker + swiftshader 软件栅格化）下页面主线程被 CPU 竞争拖延、setTimeout 偶发
// 延迟 >1.3s 时预算耗尽 → 偶发「消失断言超时」（账本 minor：全量偶发、单跑必过）。
// 修复：两个断言都用自动重试 + 足够超时（不依赖精确计时预算），慢环境不再失败，
// 测试语义（出现 → 自动消失）不变。
test('Toast 出现并自动消失', async ({ page }) => {
  const comp = await openSettingsPartition(page, 9);
  await comp.locator('[data-toast="success"]').click();
  await expect(page.locator('.c-toast').last()).toContainText('操作成功', { timeout: 10000 });
  await expect(page.locator('.c-toast')).toHaveCount(0, { timeout: 15000 });
});

test('Dialog 打开与确认', async ({ page }) => {
  const comp = await openSettingsPartition(page, 9);
  await comp.locator('[data-dialog="danger"]').click();
  await expect(page.locator('.c-dialog')).toContainText('确认删除');
  await page.locator('.c-dialog .c-btn--danger').click();
  await expect(page.locator('.c-dialog')).toHaveCount(0);
});

test('Tab 切换指示条跟随', async ({ page }) => {
  const comp = await openSettingsPartition(page, 9);
  const tab = comp.locator('.c-tabs').first().locator('.c-tab').nth(1);
  await tab.click();
  await expect(tab).toHaveClass(/c-tab--active/);
});

// Task I3 4c：布局重排（resize）后指示条重定位。实测：当前演示布局下容器随视口整体
// 平移（transform 相对容器，天然跟随），故用「resize 触发的真实重排」模拟漂移——
// tab 宽度变化（响应式字体/间距场景）+ 真实窗口 resize；无 resize 重算时指示条
// 保持旧宽/旧位（中心偏 12px），有重算则精确对齐。
test('Tab 指示条在布局重排（resize）后重新定位', async ({ page }) => {
  const comp = await openSettingsPartition(page, 9);
  const tabs = comp.locator('.c-tabs').first();
  const tab = tabs.locator('.c-tab').nth(1);
  const bar = tabs.locator('.c-tabs__indicator');
  await tab.click();
  await page.waitForTimeout(500); // 等指示条过渡动画完成（--dur-base）
  const delta = async () => {
    const tb = await tab.boundingBox();
    const ib = await bar.boundingBox();
    return Math.abs((tb.x + tb.width / 2) - (ib.x + ib.width / 2));
  };
  expect(await delta()).toBeLessThan(2);
  // 模拟 resize 触发的布局重排：tab 加宽 → 指示条须按新尺寸重算（位置 + 宽度）
  await tab.evaluate(el => { el.style.paddingLeft = el.style.paddingRight = '24px'; });
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.waitForTimeout(500);
  expect(await delta()).toBeLessThan(2);
});
