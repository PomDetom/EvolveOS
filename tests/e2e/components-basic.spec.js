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

// B5-3：iOS 风格徽标/按钮/悬浮球（徽标/悬浮球 iOS 玻璃；按钮 B6-R2-2 起改精致浅色材质）。
// brief verbatim，唯一适配：
// 回概览的 home 项在左窗应用目录（.app-main__nav-l），右窗设置目录无 home 项。
test('B5-3：徽标/按钮/悬浮球 iOS 风格（按钮 B6-R2-2 浅色材质）', async ({ page }) => {
  await page.goto('/?mode=app');
  const comp = page.locator('.app-main__settings [data-page="components"]');
  // 进入组件分区
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  // 徽标：tint 底半透明混色（非实色语义底）+ 细描边
  const badgeBg = await comp.locator('.c-badge--accent').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(badgeBg).toContain('color(srgb'); // color-mix 混色计算值
  // 按钮 primary：精致浅色材质（B6-R2-2 取代 B6-3 实色扁平）—— 纯色 tint 底无渐变 + 顶部白内高光 inset
  const btnShadow = await comp.locator('.c-btn--primary').first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(btnShadow).toContain('inset'); // 顶部白内高光（浅色材质层次）
  const btnBgImg = await comp.locator('.c-btn--primary').first().evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(btnBgImg).toBe('none'); // 无 linear-gradient（纯浅色 tint，非渐变）
  // 悬浮球：玻璃底（backdrop-filter 生效）
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="home"]').click(); // 回概览（悬浮球在壳）
  const ballFilter = await page.locator('.app-main__float-ball .c-float-ball').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(ballFilter).toContain('blur');
});

// B6-2：悬浮球去光晕（B5-3 iOS 玻璃底之上，hover 从「彩色光晕 + 外圈 glow 环」改
// 「上浮 + 中性投影」）。glow 环（.c-float-ball__glow）已删、hover box-shadow 改
// --shadow-md 中性（随 shadow-intensity 缩放），内高光保留。
// 适配：①壳挂载期惰性 append 悬浮球，先 toBeVisible 再断言 count，否则 count 断言踩空 DOM 竞态；
//       ②--accent-300 为纯 hex（非 color-mix），计算值无 'color(' 残余 —— 改以 --shadow-md 的
//       blur-16 特征值（0 4px 16px）判别中性投影，旧 0 8px 22px 彩影为 blur-22。
test('B6-2：悬浮球 hover 中性投影（无彩色光晕 + 无 glow 元素）', async ({ page }) => {
  await page.goto('/?mode=app');
  const ball = page.locator('.app-main__float-ball .c-float-ball');
  await expect(ball).toBeVisible(); // 等壳挂载 append，避免 glow count 断言踩空 DOM
  await expect(ball.locator('.c-float-ball__glow')).toHaveCount(0); // glow 环已删
  await ball.hover();
  const shadow = await ball.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toContain('color('); // 非 color-mix 彩色阴影
  expect(shadow).toContain('rgb'); // 中性投影（--shadow-md 计算值）
  expect(shadow).toContain('16px'); // --shadow-md = 0 4px 16px（blur-16 特征值）
  expect(shadow).not.toContain('22px'); // 旧 hover 彩影 0 8px 22px（blur-22）已移除
});

// B6-R2-2：按钮 primary 精致浅色材质（对齐菜单选中态 .c-navwheel__item--active 的 --accent-100
// 浅 tint 材质），取代 B6-3 实色扁平 + :root[data-theme] color-mix 明暗 hover（luma 断言随规则删除）。
// brief verbatim（Chromium 151 将 color-mix 计算值序列化为 oklab/color(srgb) → 断言经 toRGB 归一化解耦）。
test('B6-R2-2：按钮 primary 浅色材质（accent-100 底 + accent-600 字 + 描边 + 上浮 hover）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const comp = page.locator('.app-main__settings [data-page="components"]');
  const btn = comp.locator('.c-btn--primary').first();
  await expect(btn).toBeVisible();
  // 归一化任意 CSS 色为 [r,g,b]（hex 或 rgb()）
  const toRGB = (color) => {
    const c = color.trim();
    if (c.startsWith('#')) {
      const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    return m ? m[1].split(',').slice(0, 3).map(Number) : null;
  };
  const token = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  // 底 = --accent-100（浅 tint，非旧 var(--accent) 纯色）
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--accent-100')));
  // 字 = --accent-600
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).color)))
    .toEqual(toRGB(await token('--accent-600')));
  // 描边存在
  expect(await btn.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px');
  // hover：上浮 translateY(-1px) + 阴影加深（--shadow-md blur 16px）+ 底色 accent-200
  await btn.hover();
  await expect(btn).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, -1\)/);
  expect(await btn.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('16px');
  expect(toRGB(await btn.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--accent-200')));
});

// B6-R2-2 补充（spec §5 验证清单补齐）：顶部白内高光 inset + active 压下 scale(0.97) + danger 浅色材质。
test('B6-R2-2：按钮顶部内高光 + active 压下 + danger 浅色材质', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const box = page.locator('.app-main__settings [data-page="components"] .showcase:has-text("主按钮")');
  await box.waitFor();
  const toRGB = (color) => {
    const c = color.trim();
    if (c.startsWith('#')) {
      const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    return m ? m[1].split(',').slice(0, 3).map(Number) : null;
  };
  const token = (name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  const primary = box.locator('.c-btn--primary').first();
  // 顶部白内高光 inset 0 1px 0 rgba(255,255,255,0.5)（静止态即有层次）
  await expect(primary).toHaveCSS('box-shadow', /inset/);
  // active：translateY(0) scale(0.97) → matrix(0.97, 0, 0, 0.97, 0, 0) 压下
  await primary.hover();
  await page.mouse.down();
  await expect(primary).toHaveCSS('transform', /matrix\(0\.97, 0, 0, 0\.97, 0, 0\)/);
  await page.mouse.up();
  // danger 同机制：danger-50 底 + danger-600 字 + 描边
  const danger = box.locator('.c-btn--danger').first();
  await expect(danger).toBeVisible();
  expect(toRGB(await danger.evaluate((el) => getComputedStyle(el).backgroundColor)))
    .toEqual(toRGB(await token('--danger-50')));
  expect(toRGB(await danger.evaluate((el) => getComputedStyle(el).color)))
    .toEqual(toRGB(await token('--danger-600')));
  expect(await danger.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px');
});
