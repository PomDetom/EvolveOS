import { test, expect } from '@playwright/test';

// 手机形态（Task A6）：≤900px 媒体查询 —— 底部横滑应用栏（NavigationWheel horizontal，
// anchorRatio 0.382，纯 icon 横排）+ 全屏页面栈（点击应用 → 目录页推入 → 点击目录项 → 详情页
// 推入；返回按钮逐步 pop；⚙ 推入设置页）。桌面双窗/内容区在手机视口隐藏。
// 同一 URL（?mode=app），形态由视口宽度驱动（test.use viewport 在 goto 前生效）。
// 坑：页面栈 slide 240ms → 点击后 waitForTimeout 覆盖动画相位；transform 计算值恒为 matrix（不依赖）。

const APP_URL = '/?mode=app';

test.use({ viewport: { width: 390, height: 844 } });

test('手机形态：底部横滑应用栏可见（7 icon 横排）+ 桌面双窗隐藏', async ({ page }) => {
  await page.goto(APP_URL);
  await expect(page.locator('.app-main')).toBeVisible();
  // 底部 dock 可见且含 7 个应用项，沿 x 轴横排（位置递增）
  const dock = page.locator('.app-main__dock');
  await expect(dock).toBeVisible();
  const items = dock.locator('.c-navwheel__item');
  await expect(items).toHaveCount(7);
  const xs = await items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
  for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  // 桌面双窗隐藏
  await expect(page.locator('.app-main__nav-l')).toBeHidden();
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
  // 初始基底页 = 概览
  await expect(page.locator('.app-main__stack-page')).toHaveCount(1);
  await expect(page.locator('.app-main__stack-page')).toContainText('概览');
});

test('点击应用 → 目录页推入（页面栈）', async ({ page }) => {
  await page.goto(APP_URL);
  // 点击 dock 第 2 项（剪贴板）→ 目录页推入
  await page.locator('.app-main__dock .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(350); // slide 240ms
  const pages = page.locator('.app-main__stack-page');
  await expect(pages).toHaveCount(2);
  const top = pages.last();
  await expect(top).toHaveAttribute('data-stack', 'dir');
  await expect(top).toContainText('剪贴板');
  await expect(top.locator('.app-main__dir-item')).toHaveCount(3);
  // 标题栏上下文联动
  await expect(page.locator('.app-main [data-ctx]')).toHaveText('剪贴板');
});

test('点击目录项 → 详情页推入', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main__dock .c-navwheel__item').nth(1).click(); // 剪贴板
  await page.waitForTimeout(350);
  await page.locator('.app-main__dir-item[data-dir="pinned"]').click();
  await page.waitForTimeout(350);
  const pages = page.locator('.app-main__stack-page');
  await expect(pages).toHaveCount(3);
  const top = pages.last();
  await expect(top).toHaveAttribute('data-stack', 'detail');
  await expect(top).toContainText('固定');
  await expect(page.locator('.app-main [data-ctx]')).toHaveText('剪贴板 › 固定');
});

test('返回回退：返回按钮逐步 pop 页面栈', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main__dock .c-navwheel__item').nth(1).click(); // 剪贴板目录
  await page.waitForTimeout(350);
  await page.locator('.app-main__dir-item[data-dir="pinned"]').click(); // 详情
  await page.waitForTimeout(350);
  let pages = page.locator('.app-main__stack-page');
  await expect(pages).toHaveCount(3);
  // 详情页返回 → 回目录页
  await pages.last().locator('.app-main__stack-back').click();
  await page.waitForTimeout(350);
  pages = page.locator('.app-main__stack-page');
  await expect(pages).toHaveCount(2);
  await expect(pages.last()).toHaveAttribute('data-stack', 'dir');
  // 目录页返回 → 回概览基底
  await pages.last().locator('.app-main__stack-back').click();
  await page.waitForTimeout(350);
  await expect(page.locator('.app-main__stack-page')).toHaveCount(1);
  await expect(page.locator('.app-main [data-ctx]')).toHaveText('概览');
});

test('设置推入：标题栏 ⚙ → 设置页推入 + toggle 弹回', async ({ page }) => {
  await page.goto(APP_URL);
  const settingsBtn = page.locator('.app-main .c-titlebar__control--settings');
  await settingsBtn.click();
  await page.waitForTimeout(350);
  const pages = page.locator('.app-main__stack-page');
  await expect(pages).toHaveCount(2);
  const top = pages.last();
  await expect(top).toHaveAttribute('data-stack', 'settings');
  await expect(top).toContainText('通用');
  await expect(settingsBtn).toHaveClass(/settings-toggle--active/);
  await expect(page.locator('.app-main [data-ctx]')).toHaveText('设置 › 通用');
  // 再次点击 ⚙ → 弹回概览（toggle）
  await settingsBtn.click();
  await page.waitForTimeout(350);
  await expect(page.locator('.app-main__stack-page')).toHaveCount(1);
  await expect(page.locator('.app-main [data-ctx]')).toHaveText('概览');
});

// —— 收尾评审修复覆盖：I1 手机动效分区订阅退订（闭环 I1）——
// 手机路径每次 renderStack 重建页面栈 DOM → activateMobileSettings 对空容器重挂
// mountMotionLab（新增一次 store 订阅）。重建前 renderStack 释放 mobileMotionUnsub 旧订阅，
// 防订阅数随进入设置→动效次数线性累积（回调引用已脱离容器的旧 .ml-card 节点）。
// 本用例守护重建→重挂流程不破（isConnected 守卫不误杀合法挂载）；退订契约由
// tests/unit/motion-lab.test.js 单测断言。
test('设置→动效 两次进出：重建后分区重挂载仍渲染 5 卡', async ({ page }) => {
  await page.goto(APP_URL);
  const settingsBtn = page.locator('.app-main .c-titlebar__control--settings');
  const motionCards = () => page.locator('.app-main__stack [data-page="motion"] .ml-card');
  // 第一次进入设置 → 切到动效分区（activateMobileSettings 挂载 + mobileMotionUnsub 记录订阅）
  await settingsBtn.click();
  await page.waitForTimeout(350);
  await page.locator('.app-main__settings-tab[data-tab="motion"]').click();
  await expect(motionCards()).toHaveCount(5);
  // 退出设置（⚙ toggle 弹回）→ popStack → renderStack 重建 DOM 前释放旧订阅
  await settingsBtn.click();
  await page.waitForTimeout(350);
  await expect(page.locator('.app-main__stack-page')).toHaveCount(1);
  // 第二次进入设置（settingsId 保持 motion）→ 空容器重挂载，仍渲染 5 卡
  await settingsBtn.click();
  await page.waitForTimeout(350);
  await expect(motionCards()).toHaveCount(5);
});

test('horizontal 渲染层（闭环 A2 Minor ①/④）：底部横滑栏横向滚动 + focal 峰值在 38.2% 锚线', async ({ page }) => {
  await page.goto(APP_URL);
  const dockList = page.locator('.app-main__dock .c-navwheel__list');
  // items 沿 x 轴排列（横向布局，非纵向）
  const xs = await dockList.locator('.c-navwheel__item')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
  for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  // 横向拖拽 → scrollLeft 增加（主轴为 x：滚动方向正确）
  const box = await dockList.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(450); // 惯性/吸附 150ms + 余量
  const scrolled = await dockList.evaluate((el) => el.scrollLeft);
  expect(scrolled).toBeGreaterThan(50);
  // 覆盖断言（评审 Important #1）：横滑浏览不弹页 —— 拖拽结束后页面栈仍为基底 1 页
  // （nav-wheel 未 preventDefault，浏览器在 pointerup 后仍派发 click；dock 点击需按位移阈值
  //   区分「点按」与「横滑浏览」，否则浏览滑动会误触 handleDockTap 推入/替换目录页）
  await expect(page.locator('.app-main__stack-page')).toHaveCount(1);
  // 点击项 3 → 锚定动画 → active 中心对齐视口 38.2% 锚线（黄金比例锚点）
  await dockList.locator('.c-navwheel__item').nth(3).click();
  await page.waitForTimeout(400); // animateScrollTo --dur-base 200ms + 余量
  await expect(dockList.locator('.c-navwheel__item--active')).toHaveCount(1);
  const activeBox = await dockList.locator('.c-navwheel__item--active').boundingBox();
  const listBox = await dockList.boundingBox();
  const anchorDelta = Math.abs((activeBox.x + activeBox.width / 2) - (listBox.x + listBox.width * 0.382));
  expect(anchorDelta).toBeLessThan(5);
});
