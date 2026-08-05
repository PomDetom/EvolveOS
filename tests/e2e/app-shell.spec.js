import { test, expect } from '@playwright/test';

// 应用壳骨架（Task A3，规格 §2/§3/§4）：双窗口级联 + 标题栏上下文 + 7 模块占位。
// 入口 `?mode=app`（docs 模式零冲击是硬门槛，本 spec 只测 app 路径）。
// 动画时长：右窗推入 --dur-push 240ms（calc(--dur-base*1.2)）、切页 --dur-fast 120ms，
// 点击后 waitForTimeout 覆盖动画相位。

const APP_URL = '/?mode=app';

test('壳结构：标题栏/左窗 7 模块/单窗口态右窗隐藏/内容区概览页', async ({ page }) => {
  await page.goto(APP_URL);
  await expect(page.locator('.app-main')).toBeVisible();
  // 标题栏存在（app 模式唯一实例）
  await expect(page.locator('.app-main .c-titlebar')).toHaveCount(1);
  await expect(page.locator('.app-main [data-ctx]')).toBeVisible();
  // 左窗 7 个模块项
  await expect(page.locator('.app-main__nav-l .c-navwheel__item')).toHaveCount(7);
  // 单窗口态：右窗隐藏
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
  // 内容区：概览页为默认 active 页
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'home');
  await expect(active).toContainText('概览');
});

test('点击应用：右窗展开 + 目录项出现 + 内容区切到该应用首屏', async ({ page }) => {
  await page.goto(APP_URL);
  // 点击左窗第 2 项（剪贴板）
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  // 右窗展开且含剪贴板目录 3 项
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(3);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toContainText(['历史', '固定', '分组']);
  // 内容区切到剪贴板首屏
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'clipboard');
  await expect(active).toContainText('剪贴板');
  await expect(active).toContainText('功能开发中');
});

test('收起通道一：右窗顶部返回按钮', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await page.locator('.app-main__nav-r-back').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
});

test('收起通道二：再次点击左窗已选中项', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  // 再次点击已选中左项 → 收起（toggle）
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
});

test('收起通道三：Esc', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
});

test('换应用：右窗目录内容切换（不收起）', async ({ page }) => {
  await page.goto(APP_URL);
  // 剪贴板（目录：历史/固定/分组）
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(3);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="history"]')).toHaveCount(1);
  // 换到密码（目录：全部/分组/回收站）→ 右窗保持展开，目录内容切换
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(2).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(3);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="history"]')).toHaveCount(0);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="all"]')).toHaveCount(1);
  // 内容区切到密码页
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'key');
  await expect(active).toContainText('密码');
});

test('标题栏上下文联动：应用名 / 应用名 › 页面名', async ({ page }) => {
  await page.goto(APP_URL);
  const ctx = page.locator('.app-main [data-ctx]');
  // 单窗口态：只有应用名
  await expect(ctx).toHaveText('概览');
  // 选中剪贴板 → 右窗展开 → 应用名 › 首目录项
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await expect(ctx).toHaveText('剪贴板 › 历史');
  // 选中右窗目录项「固定」→ 页面名联动
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="pinned"]').click();
  await expect(ctx).toHaveText('剪贴板 › 固定');
  // 收起右窗 → 回到单窗口态（只有应用名）
  await page.locator('.app-main__nav-r-back').click();
  await expect(ctx).toHaveText('剪贴板');
});

test('概览页结构：欢迎卡 + 7 快捷入口 + 主题状态卡', async ({ page }) => {
  await page.goto(APP_URL);
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview.locator('.app-main__welcome')).toBeVisible();
  await expect(overview.locator('.app-main__shortcut')).toHaveCount(7);
  await expect(overview.locator('.app-main__theme-status')).toBeVisible();
  // 快捷入口点击 = 展开右窗 + 切到该应用（点击剪贴板入口）
  await overview.locator('.app-main__shortcut[data-shortcut="clipboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__page--active')).toHaveAttribute('data-page', 'clipboard');
});

// —— 设置模式（Task A4：⚙ 按钮 + 右窗设置目录 + 设置页共享）——

test('设置模式：⚙ 展开右窗设置目录 + 内容区设置页 + 激活高亮', async ({ page }) => {
  await page.goto(APP_URL);
  const settingsBtn = page.locator('.app-main .c-titlebar__control--settings');
  await expect(settingsBtn).toHaveCount(1);
  // 初始未激活
  await expect(settingsBtn).not.toHaveClass(/settings-toggle--active/);
  // 点击 ⚙ → 右窗展开 + 8 项设置目录 + 内容区显示通用设置页
  await settingsBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(8);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'settings');
  await expect(active).toContainText('通用');
  // ⚙ 激活态高亮
  await expect(settingsBtn).toHaveClass(/settings-toggle--active/);
});

test('设置模式：选择「外观」→ 内容区设置页含 cust-group 6', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main .c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const settings = page.locator('.app-main__page[data-page="settings"]');
  await expect(settings.locator('.cust-group')).toHaveCount(6);
  await expect(settings).toContainText('外观');
});

test('设置模式：再次点击 ⚙ 收起右窗（toggle）+ 取消激活', async ({ page }) => {
  await page.goto(APP_URL);
  const settingsBtn = page.locator('.app-main .c-titlebar__control--settings');
  await settingsBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(settingsBtn).toHaveClass(/settings-toggle--active/);
  // 再次点击 → 收起（toggle）
  await settingsBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
  await expect(settingsBtn).not.toHaveClass(/settings-toggle--active/);
});

test('设置模式：左栏应用仍可选（点应用切回应用模式）', async ({ page }) => {
  await page.goto(APP_URL);
  await page.locator('.app-main .c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(8);
  // 设置模式点左窗第 2 项（剪贴板）→ 切回应用模式：右窗变应用目录 + 内容区剪贴板页
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(3);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'clipboard');
  await expect(active).toContainText('剪贴板');
  await expect(page.locator('.app-main .c-titlebar__control--settings')).not.toHaveClass(/settings-toggle--active/);
});

test('设置模式：标题栏上下文「设置 › 分区」联动', async ({ page }) => {
  await page.goto(APP_URL);
  const ctx = page.locator('.app-main [data-ctx]');
  await page.locator('.app-main .c-titlebar__control--settings').click();
  await expect(ctx).toHaveText('设置 › 通用');
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  await expect(ctx).toHaveText('设置 › 外观');
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="about"]').click();
  await expect(ctx).toHaveText('设置 › 关于');
});
