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
  // 点击 ⚙ → 右窗展开 + 10 项设置目录（APP_SECTIONS：共享 8 + 组件/动效）+ 内容区显示通用设置页
  await settingsBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(10);
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
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(10);
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

// —— 收尾评审修复覆盖：I1 冷启动配置持久化 / I2 左窗拖拽阈值 ——

test('冷启动应用持久化配置：localStorage theme=dark → reload → 深色生效 + 通用页高亮一致', async ({ page }) => {
  await page.goto(APP_URL);
  // 写入持久化配置（模拟应用壳设置里切深色主题并重启/Tauri 重开）
  await page.evaluate(() => {
    localStorage.setItem('ui-design-config', JSON.stringify({ theme: 'dark' }));
  });
  await page.reload();
  // 等 app 壳挂载完成（app-main 为动态 import，reload 的 load 事件不等待其 resolve）
  await expect(page.locator('.app-main')).toBeVisible();
  // 冷启动即应用持久化主题：data-theme 由 applyConfig(getConfig()) 写入
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('dark');
  // R9 评审 I1：冷启动深色下标题栏按钮图标须为 moon（非 title-bar.js 静态 sun）——与页面/设置分区同步
  await expect(page.locator('.c-titlebar__control--theme svg circle')).toHaveCount(0);
  await expect(page.locator('.c-titlebar__control--theme svg rect')).toHaveCount(0);
  // 设置「通用」页按持久化配置高亮「深色」——与实际渲染一致，两态不再自相矛盾
  await page.locator('.app-main .c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main .csettings__mode[data-mode="dark"]')).toHaveClass(/csettings__mode--active/);
  await expect(page.locator('.app-main .csettings__mode[data-mode="light"]')).not.toHaveClass(/csettings__mode--active/);
});

test('左窗对已选中项拖拽（位移 >10px）松手不触发收起（拖拽阈值，与 dock 同机制）', async ({ page }) => {
  await page.goto(APP_URL);
  // 选中剪贴板（右窗展开）
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  // 在已选中项上慢速拖拽 ~15px（>10px 阈值、<半项 32px）——模拟浏览滑动后松手。
  // 慢速步进（间隔 50ms）令速度 <0.3 不触发惯性；scroll 位移不足半项，吸附仍回剪贴板
  // （避免 snap 换项干扰断言 —— 换到有目录的项右窗仍开，只有 home 会收起）。
  const item = page.locator('.app-main__nav-l .c-navwheel__item').nth(1);
  const box = await item.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(x, y - i * 3);
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  await page.waitForTimeout(400); // 覆盖吸附 150ms + 余量
  // 拖拽不得误收起右窗：仍为剪贴板目录
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="history"]')).toHaveCount(1);
});

test('设置模式退出后右窗目录轮回归：exit settings → same-app re-click → 右窗显示应用目录', async ({ page }) => {
  await page.goto(APP_URL);
  // 应用模式：选中剪贴板（右窗 = 剪贴板目录 3 项）
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(3);
  // 进入设置模式（右窗 = 设置目录 10 项）
  await page.locator('.app-main .c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(10);
  // 退出设置模式（⚙ 再点 → 右窗收起）
  await page.locator('.app-main .c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeHidden();
  // 再次点击仍选中的剪贴板项 → 右窗重开：应显示剪贴板目录，而非残留的设置目录轮
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(1).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.app-main__nav-r')).toBeVisible();
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(3);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="history"]')).toHaveCount(1);
  await expect(page.locator('.app-main__nav-r .c-navwheel__item[data-id="general"]')).toHaveCount(0);
  // 上下文为应用模式（剪贴板 › 历史）
  await expect(page.locator('.app-main [data-ctx]')).toHaveText('剪贴板 › 历史');
});

// —— 设置分区扩展（Task B1-1：APP_SECTIONS 10 分区 + 组件/动效分区惰性挂载展示内容）——

test('设置分区包含组件/动效且挂载展示内容', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  // 10 分区（共享 8 + 组件 + 动效 —— 应用壳专用 APP_SECTIONS）
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(10);
  // 组件分区：点击「组件」→ 内容区出现组件矩阵组 + 剪贴板悬浮窗组合示例
  // APP_SECTIONS 实际序：通用0/外观1/界面2/快捷键3/通知4/数据5/高级6/关于7/组件8/动效9
  // （[...SECTIONS, components, motion] 追加到尾部 —— 索引以实现核对为准）
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(8).click();
  // 7 个 .csg：6 组矩阵（核心导航/表单/数据/浮层/辅助/悬浮窗专属）+ 1 个交互悬浮窗实例块（csg csg-fwin）
  await expect(page.locator('.app-main__settings [data-page="components"] .csg')).toHaveCount(7);
  await expect(page.locator('.app-main__settings [data-page="components"] .cfloat')).toBeVisible();
  // 动效分区
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(9).click();
  await expect(page.locator('.app-main__settings [data-page="motion"] .ml-grid')).toBeVisible();
  await expect(page.locator('.app-main__settings [data-page="motion"] .ml-card')).toHaveCount(5);
});

// —— 窗口控制双通道（Task B1-2：浏览器降级）——

test('浏览器模式下窗口控制按钮点击给出桌面端提示', async ({ page }) => {
  await page.goto('/?mode=app');
  // 拖拽区浏览器降级标记类已挂（CSS :active 轻量反馈通道开启）
  await expect(page.locator('.app-main .c-titlebar__drag')).toHaveClass(/c-titlebar__drag--browser/);
  // 三窗口控制按钮（min/max/close）均降级为 toast 提示；设置按钮（--settings）有真实功能不劫持
  for (const modifier of ['min', 'max', 'close']) {
    await page.locator(`.app-main .c-titlebar__control--${modifier}`).click();
    await expect(page.locator('.c-toast').last()).toContainText('桌面端');
  }
});

// —— B1-3 评审修复：恢复垂直导航轮「滚轮 → 停止 → 吸附 → 38.2% 锚点」覆盖（规格 §8.3 不得悬置）——
// 原用例随 nav-wheel.spec.js 删除（docs 侧栏 .navwheel__list 无宿主），行为是壳左窗的真实交互，
// 重挂到 `.app-main__nav-l .c-navwheel__list`（应用壳左窗 7 模块垂直轮，anchorRatio 0.382）。
// 与 mobile-nav.spec.js 的横向 dock 覆盖互补：本用例专测垂直主轴滚轮路径。
test('左窗导航轮：滚轮滚动停止后吸附最近项并选中（38.2% 锚点）', async ({ page }) => {
  await page.goto('/?mode=app');
  const list = page.locator('.app-main__nav-l .c-navwheel__list');
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

// —— B2-1 亚克力材质两档（磨砂 backdrop-filter / 纯色不透明降级）——
// 默认 blurEnabled=true → html data-glass="on" + 表面 backdrop-filter 生效；
// 外观分区「亚克力材质」开关（定制器共用实现）关闭 → data-glass="off" + backdrop-filter none；
// 开关写 store（saveConfig），reload 冷启动保持关闭 —— 完整配置链路（defaults→store→apply）。

test('亚克力两档：默认磨砂，关闭后纯色不透明（外观开关 + 持久化）', async ({ page }) => {
  await page.goto('/?mode=app');
  // 默认磨砂：html data-glass=on + 导航栏 backdrop-filter 生效
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'on');
  const blur = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(blur).toContain('blur');
  // 设置→外观：亚克力材质开关初始为开
  await page.locator('.c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const glassSwitch = page.locator('.app-main__settings [data-glass-switch] .c-switch');
  await expect(glassSwitch).toBeVisible();
  await expect(glassSwitch).toHaveAttribute('aria-checked', 'true');
  // 关闭 → data-glass 翻转为 off + backdrop-filter none（纯色不透明降级）
  await glassSwitch.click();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'off');
  await expect(glassSwitch).toHaveAttribute('aria-checked', 'false');
  const blurOff = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(blurOff).toBe('none');
  // reload 持久化：开关经 saveConfig 写 store → 冷启动 data-glass=off 保持
  await page.reload();
  await expect(page.locator('.app-main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'off');
});

// —— B2-R2 亚克力材质（表面增饱和模糊 + 噪点层）——
// 表面 backdrop-filter 消费亚克力配方：blur + saturate(--acrylic-saturate=1.8) + brightness；
// .app-main::after 噪点覆盖层（SVG data-URI 平铺）——pointer-events:none 不挡交互。

test('亚克力材质：表面增饱和模糊 + 噪点层存在', async ({ page }) => {
  await page.goto('/?mode=app');
  const filter = await page.locator('.app-main__nav-l').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(filter).toContain('saturate(1.8)');
  expect(filter).toContain('brightness(');
  const noise = await page.locator('.app-main').evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
  expect(noise).toContain('data:image/svg+xml');
});

// —— B2-2 浏览器装饰背景层（模糊对象）——
// 背景层为浏览器侧装饰（渐变/几何/网格/圆点/斜线/波纹/极光/关闭 8 预设），非配置链路
// （会话内纯 UI 态，不进 store）；Tauri 探测（window.__TAURI__）保留标志但不再隐藏背景层
// （B2-R7：桌面端同显背景层）。B6-1：选择器由 4 文字胶囊 → 8 迷你图案预览卡（.app-main__backdrop-card）。

test('浏览器装饰背景层存在且可切换预设', async ({ page }) => {
  await page.goto('/?mode=app');
  const backdrop = page.locator('.app-main__backdrop');
  await expect(backdrop).toBeVisible();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'gradient');
  // 外观分区切换背景预设
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  await page.locator('.app-main__backdrop-card[data-bd="geo"]').click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'geo');
  // 关闭背景：data-backdrop=none → 背景层平铺实底（无渐变装饰）
  await page.locator('.app-main__backdrop-card[data-bd="none"]').click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'none');
  const flat = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(flat).not.toMatch(/radial-gradient\(|linear-gradient\(/);
});

test('B6-1：背景装饰 8 预设 + 切换生效', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const cards = page.locator('.app-main__backdrop-card');
  await expect(cards).toHaveCount(8);
  // 切到 dots → data-backdrop 生效 + 激活态切换
  await cards.filter({ hasText: '圆点' }).click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'dots');
  await expect(page.locator('.app-main__backdrop-card[data-bd="dots"]')).toHaveAttribute('aria-pressed', 'true');
  // 切回 grid → 生效
  await cards.filter({ hasText: '网格' }).click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'grid');
});

// —— B6-R2-1 背景装饰大色块构图（8 预设可见且互不相同）——
// 旧细线图案被玻璃磨没，本任务改大尺寸渐变构图（blob/band ≥ 容器 15-25%，alpha 40-55%）；
// 断言每预设 .app-main__backdrop computed background-image 为多层渐变（非 none、非纯实底）。

test('B6-R2-1：8 背景预设切换均生效（非 none 预设 backdrop 含渐变 wash）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  await expect(page.locator('.app-main__backdrop-card')).toHaveCount(8);
  for (const bd of ['gradient', 'geo', 'grid', 'dots', 'diagonal', 'waves', 'aurora', 'none']) {
    await page.locator(`.app-main__backdrop-card[data-bd="${bd}"]`).click();
    const img = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
    if (bd === 'none') expect(img).toBe('none');
    else expect(img).toContain('gradient'); // 大构图 wash 非纯实底
  }
});

// —— B2-R3 背景层预设柔和补色（闭环 B2-2 I-1：暗色光晕过广）——
// 三预设 --backdrop-bg 从 --accent-200/300 实色改 color-mix 加 alpha（≤0.3）、范围收窄；
// 默认 gradient 实色光晕经 color-mix 后计算值带非零 alpha（Chromium 序列化为
// color(srgb r g b / alpha)）—— 观感守卫（弱断言），真实 gate 为视觉基线 + 用户验收；
// 前实现光晕为实色 rgb / rgba(0,0,0,0)（transparent 停靠点），无任何非零 alpha 颜色。

test('背景层预设柔和：accent 光晕层带透明度', async ({ page }) => {
  await page.goto('/?mode=app');
  const bd = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bd).toMatch(/radial-gradient\(/);
  // accent 光晕经 color-mix 加 alpha：计算值须含非零 alpha 的颜色（实色 hex 直铺，前实现不匹配）
  const hasAlphaColor = /\/\s*0\.0*[1-9]/.test(bd) || /rgba\(\d+,\s*\d+,\s*\d+,\s*0\.0*[1-9]/.test(bd);
  expect(hasAlphaColor).toBe(true);
});

// —— B2-3 导航图标四项增强：active 项 24px/2.2 加粗、非 active 20px/1.8（icon 分级重渲染）——
// icon(name, size, stroke) 第三参（icon.js）；mountNavWheel 初始渲染 item0 为 active（24/2.2），
// select 切换时对前后两 item 原地改 .c-navwheel__icon svg 的 width/height/stroke-width 属性（分级）

test('导航图标选中项放大加粗、非选中项常规', async ({ page }) => {
  await page.goto('/?mode=app');
  const activeIcon = page.locator('.app-main__nav-l .c-navwheel__item--active .c-navwheel__icon svg');
  const inactiveIcon = page.locator('.app-main__nav-l .c-navwheel__item:not(.c-navwheel__item--active) .c-navwheel__icon svg').first();
  const activeW = await activeIcon.getAttribute('width');
  const inW = await inactiveIcon.getAttribute('width');
  expect(Number(activeW)).toBeGreaterThan(Number(inW)); // 24 > 20
});

// —— B2-R4 图标选中态去光晕：删 .c-navwheel__glow 光晕层，选中态 = accent-100 衬底 + accent icon ——
// 光晕与 icon 叠加看不清（B2-3 用户反馈），本任务移除该层；选中衬底（B2-3 40px 圆角底）保留，
// 断言无 .c-navwheel__glow 元素 + active icon 衬底为选中底色（非透明）。

test('图标选中态：无光晕层、衬底为选中底色', async ({ page }) => {
  await page.goto('/?mode=app');
  // 先等导航轮挂载（7 项）再断言：若在挂载前断言，toHaveCount(0) 会在空 DOM 上通过，
  // 失去「删光晕」的真门禁（挂载后仍有 glow 时也必须失败）
  await expect(page.locator('.app-main__nav-l .c-navwheel__item')).toHaveCount(7);
  await expect(page.locator('.c-navwheel__glow')).toHaveCount(0);
  const bg = await page.locator('.app-main__nav-l .c-navwheel__item--active .c-navwheel__icon')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)'); // accent-100 衬底非透明
});

// —— B2-R8 导航栏顶部割裂修复（遮罩 → 内容遮罩）——
// 顶部 48px 渐变叠加层（.c-navwheel__mask，linear-gradient(var(--glass-bg), transparent)）
// 叠在导航栏自身 48% 半透明背景上 = 双倍着色把顶部洗白，与标题栏割裂成色带。
// 修法：删除叠加渐变 div，竖向列表改 CSS mask-image 内容遮罩（淡出滚动项但不叠加颜色层）。
// 先等导航轮挂载（7 项）再断言 count 0 —— 若在挂载前断言，空 DOM 上 toHaveCount(0) 会真空通过
// （B2-R4 同款门禁：挂载后仍有 mask 时必须失败）。横向 dock 无竖向遮罩需求，不加 mask-image。

test('导航栏顶部无叠加遮罩色带（内容遮罩）', async ({ page }) => {
  await page.goto('/?mode=app');
  await expect(page.locator('.app-main__nav-l .c-navwheel__item')).toHaveCount(7);
  // 顶部遮罩不再是叠加渐变层（.c-navwheel__mask 元素不存在）
  await expect(page.locator('.c-navwheel__mask')).toHaveCount(0);
  // 竖向列表有 mask-image 内容遮罩
  const maskImg = await page.locator('.app-main__nav-l .c-navwheel__list').evaluate((el) => getComputedStyle(el).maskImage);
  expect(maskImg).toContain('linear-gradient');
});

// —— B2-R9 标题栏快捷主题按钮三态循环（浅/深/跟随系统）+ 与设置同步 ——
// 三态循环 light→dark→system→light，图标显示当前主题状态（浅 sun / 深 moon / 系统 monitor）；
// 主题从标题栏按钮或设置分区三态选择器任一入口变更，另一处 UI 同步（subscribe 唯一同步点）：
// 标题栏按钮 → 设置分区 .csettings__mode 高亮/aria-pressed；设置选择器 → 标题栏图标。
// 图标判别：sun 含 <circle>、moon 无 circle 无 rect、monitor（显示器）含 <rect>。

test('标题栏快捷主题按钮：三态循环 light→dark→system 且与设置同步', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.evaluate(() => localStorage.setItem('ui-design-config', JSON.stringify({ theme: 'light' })));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // 初始图标 = sun（浅色，当前状态语义）
  await expect(page.locator('.c-titlebar__control--theme svg circle')).toHaveCount(1);
  // light → dark
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // 概览「主题状态」卡同步（P0）：桌面概览页当前主题 label 随切换更新
  await expect(page.locator('.app-main__page[data-page="home"] .app-main__theme-row span').first()).toHaveText('当前主题：深色');
  // 标题栏按钮 → 设置分区三态选择器高亮同步（通用页为预渲染静态 DOM；进设置模式使其可见）
  await page.locator('.c-titlebar__control--settings').click();
  await expect(page.locator('.app-main__page--active')).toHaveAttribute('data-page', 'settings');
  await expect(page.locator('.app-main .csettings__mode[data-mode="dark"]')).toHaveClass(/csettings__mode--active/);
  await expect(page.locator('.app-main .csettings__mode[data-mode="light"]')).not.toHaveClass(/csettings__mode--active/);
  // 设置选择器 → 标题栏图标同步（反向）：点「跟随系统」→ data-theme 解析为 light|dark + 图标 monitor（含 rect）
  await page.locator('.app-main .csettings__mode[data-mode="system"]').click();
  const systemResolved = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(systemResolved);
  await expect(page.locator('.c-titlebar__control--theme svg rect')).toHaveCount(1);
  // 设置选择器 → 标题栏图标同步（反向）：点「浅色」→ data-theme light + 图标回 sun（含 circle）
  await page.locator('.app-main .csettings__mode[data-mode="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.c-titlebar__control--theme svg circle')).toHaveCount(1);
  // 从设置切回标题栏入口：light → dark → system → light 完整循环仍正确
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.c-titlebar__control--theme').click();
  const systemResolved2 = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(systemResolved2);
  await expect(page.locator('.app-main .csettings__mode[data-mode="system"]')).toHaveClass(/csettings__mode--active/);
  // system → light（回到起点）
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

// —— B4-5 独立悬浮窗：主窗 FloatBall 在 Tauri 环境显示/聚焦预注册的隐藏 strip 窗口 ——
// mock `__TAURI__` 注入 getAllWindows 返回 strip 窗口记录 show/setFocus 调用 + core.invoke
// 记录 set_close_behavior 同步（B4F-4）；无 `__TAURI__` 时仍走窗口内 strip 演示
// （floatstrip.spec.js 的浏览器分支用例回归覆盖，此处只测 Tauri 分支）。真实 Tauri 全局
// 未暴露 WebviewWindow 构造函数（修复 B4-5），故改用预注册窗口 + getAllWindows→show。

test('Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；配置同步 set_close_behavior', async ({ page }) => {
  await page.addInitScript(() => {
    const shown = [];
    const invokes = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([{
          label: 'strip',
          show: () => { shown.push('show'); return Promise.resolve(); },
          setFocus: () => { shown.push('setFocus'); return Promise.resolve(); },
        }]),
      },
      core: { invoke: (cmd, args) => { invokes.push({ cmd, args }); return Promise.resolve(); } },
    };
    window.__stripShown__ = shown;
    window.__stripInvokes__ = invokes;
  });
  await page.goto('/?mode=app');
  await page.locator('.app-main__float-ball').click();
  const shown = await page.evaluate(() => window.__stripShown__);
  expect(shown).toContain('show');
  expect(shown).toContain('setFocus');
  // 配置同步到 Rust（默认 exit）
  const invokes = await page.evaluate(() => window.__stripInvokes__);
  expect(invokes).toContainEqual({ cmd: 'set_close_behavior', args: { behavior: 'exit' } });
});

// —— B4 收尾（Task B4F-2）：主窗关闭行为可配置（closeBehavior）——
// 配置链路完整（defaults→store→apply）：通用分区「关闭主窗口时」两态选择器，
// 默认 exit 高亮，切换写 store（localStorage ui-design-config.closeBehavior）；
// 后续 B4F-3（Rust 消费）/ B4F-4（JS 同步 Rust）依赖本用例锁定的 cfg.closeBehavior。

test('通用分区：关闭主窗口时选择器存在且可切换（写 store）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(0).click(); // 通用
  const group = page.locator('[data-close-behavior-group]');
  await expect(group).toBeVisible();
  await expect(group.locator('.csettings__mode')).toHaveCount(2);
  // 默认 exit 高亮
  await expect(group.locator('[data-close-behavior="exit"]')).toHaveClass(/csettings__mode--active/);
  await group.locator('[data-close-behavior="background"]').click();
  const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem('ui-design-config')).closeBehavior);
  expect(cfg).toBe('background');
});

// —— B4 收尾（最终整体评审修复）：配置变更 → Rust invoke 的 subscribe 路径测试锁 ——
// 前用例只断言 store 写入；本用例锁核心动态路径：点「保留后台」→ saveConfig → subscribe →
// invoke('set_close_behavior', {behavior:'background'})。mock 参照上方 FloatBall 用例结构
// （getCurrentWindow 供 bindWindowControls 用 minimize/toggleMaximize/isMaximized/close；
// getAllWindows 与 FloatBall onExpand 探测路径同构，返回空数组安全）。
// 并锁 [data-mode] 控制器裁定（Minor）：主题同步循环收敛 .csettings__mode[data-mode] 后，
// 点主题模式不得误清 close-behavior 高亮。

test('Tauri：切「保留后台」→ set_close_behavior invoke 同步 Rust；点主题模式不清 close-behavior 高亮', async ({ page }) => {
  await page.addInitScript(() => {
    const invokes = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: { invoke: (cmd, args) => { invokes.push({ cmd, args }); return Promise.resolve(); } },
    };
    window.__closeBehaviorInvokes__ = invokes;
  });
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(0).click(); // 通用
  const group = page.locator('[data-close-behavior-group]');
  await expect(group).toBeVisible();
  // 挂载同步已 invoke 默认 exit（B4F-4 挂载 + subscribe 各同步一次）
  let invokes = await page.evaluate(() => window.__closeBehaviorInvokes__);
  expect(invokes).toContainEqual({ cmd: 'set_close_behavior', args: { behavior: 'exit' } });
  // 切「保留后台」→ subscribe 触发 → invoke behavior:'background'
  await group.locator('[data-close-behavior="background"]').click();
  invokes = await page.evaluate(() => window.__closeBehaviorInvokes__);
  expect(invokes).toContainEqual({ cmd: 'set_close_behavior', args: { behavior: 'background' } });
  // [data-mode] 控制器裁定：点主题模式（dark）后 close-behavior 高亮仍保持（不被主题循环误清）
  await page.locator('.app-main .csettings__mode[data-mode="dark"]').click();
  await expect(group.locator('[data-close-behavior="background"]')).toHaveClass(/csettings__mode--active/);
  await expect(group.locator('[data-close-behavior="exit"]')).not.toHaveClass(/csettings__mode--active/);
});

// —— B5-4 自适应布局（Task B5-4：内容区限宽居中 + 展示分区撑满）——
// 概览/应用页 data-layout="center"：max-width 1080 + margin-inline auto 限宽居中；
// 设置页整体 data-layout="fluid"：max-width none 撑满内容区（表单分区靠 .csettings__field 420px 自限宽），
// 组件/动效展示分区随之铺满。大窗口 1400×900 下验证两种模式几何。

test('B5-4：自适应布局 data-layout（表单限宽居中 + 展示撑满）', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 }); // 大窗口
  await page.goto('/?mode=app');
  // 概览页：center（限宽 1080 居中）
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview).toHaveAttribute('data-layout', 'center');
  const ow = await overview.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const pr = el.parentElement.getBoundingClientRect();
    return { w: r.width, parentW: pr.width, left: r.left, parentLeft: pr.left };
  });
  expect(ow.w).toBeLessThanOrEqual(1080);
  expect(Math.abs((ow.left - ow.parentLeft) * 2 + ow.w - ow.parentW)).toBeLessThan(4); // 水平居中
  // 组件分区：fluid 撑满
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const part = page.locator('.app-main__settings [data-page="components"]');
  const pw = await part.evaluate((el) => el.getBoundingClientRect().width);
  const pagesW = await page.locator('.app-main__pages').evaluate((el) => el.getBoundingClientRect().width);
  expect(pw).toBeGreaterThan(pagesW - 80); // 撑满内容区（留 padding 余量）
});
