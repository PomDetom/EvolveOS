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

// B6-3：primary 扁平实心后 hover 仅背景明暗（theme-aware），box-shadow 保持中性 --shadow-sm
// （0 1px 3px，blur-3 特征值，随 shadow-intensity 缩放）。旧「hover 彩影 0 4px 14px + inset
// 内高光」（B5-3/B5-F1 引入）随彩影令牌回收一并删除。
test('主按钮 hover 中性投影（--shadow-sm 无内高光无彩影）', async ({ page }) => {
  const comp = await openSettingsPartition(page, 8);
  const box = comp.locator('.showcase:has-text("主按钮")');
  await box.waitFor();
  const btn = box.locator('.c-btn--primary').first();
  await btn.hover();
  // 中性 --shadow-sm：0 1px 3px（blur-3 特征值，亮/暗主题同形，判别稳定）
  await expect(btn).toHaveCSS('box-shadow', /0px 1px 3px/);
  await expect(btn).toHaveCSS('box-shadow', /rgb/); // 中性投影（非 color-mix 彩）
  await expect(btn).not.toHaveCSS('box-shadow', /inset/); // 内高光已去（扁平实心）
  await expect(btn).not.toHaveCSS('box-shadow', /14px/); // 旧 hover 彩影 blur-14 已移除
});

// B5-3：iOS 风格徽标/按钮/悬浮球（徽标/悬浮球 iOS 玻璃；按钮 B6-3 起由层次改扁平实心）。
// brief verbatim，唯一适配：
// 回概览的 home 项在左窗应用目录（.app-main__nav-l），右窗设置目录无 home 项。
test('B5-3：徽标/按钮/悬浮球 iOS 风格（按钮 B6-3 扁平实心）', async ({ page }) => {
  await page.goto('/?mode=app');
  const comp = page.locator('.app-main__settings [data-page="components"]');
  // 进入组件分区
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  // 徽标：tint 底半透明混色（非实色语义底）+ 细描边
  const badgeBg = await comp.locator('.c-badge--accent').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(badgeBg).toContain('color(srgb'); // color-mix 混色计算值
  // 按钮 primary：扁平实心（B6-3 去内高光 inset、去渐变 → 实色 + 中性投影）
  const btnShadow = await comp.locator('.c-btn--primary').first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(btnShadow).not.toContain('inset');
  const btnBgImg = await comp.locator('.c-btn--primary').first().evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(btnBgImg).toBe('none'); // 无 linear-gradient
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

// B6-3：primary 扁平实心（B5-3 iOS 层次 → 实色扁平）：去渐变 + 去彩影 + theme-aware hover。
// --accent/--accent-400 为纯 hex（非 color-mix），故 box-shadow 以 blur-3 特征值判别中性
// （--shadow-sm = 0 1px 3px，同 B6-2 的 accent-300 教训）；theme-aware hover 以「canvas 解析
// 计算色 → 亮度」判别方向性（Chromium 151 将 color-mix 结果序列化为 oklab(...) 而非 color(srgb，
// 故亮度比较与序列化格式解耦）：浅色混 black 暗一档、深色混 white 亮一档。
test('B6-3：按钮 primary 实色扁平（无渐变无彩影 + theme-aware hover）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="components"]').click();
  const comp = page.locator('.app-main__settings [data-page="components"]');
  const btn = comp.locator('.c-btn--primary').first();
  // 实色：background 为纯色（非 gradient）
  const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toBe('none'); // 无 linear-gradient
  // 中性投影：box-shadow 非 color-mix 彩色，且为 --shadow-sm（0 1px 3px blur-3 特征值）
  const shadow = await btn.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toContain('color(');
  expect(shadow).toContain('0px 1px 3px'); // --shadow-sm
  expect(shadow).not.toContain('inset'); // 内高光已去（扁平实心）
  // theme-aware hover：浅色混 black 暗一档、深色混 white 亮一档（经 :root[data-theme] 区分）
  // 设 motion=off 令 hover 背景瞬时到位（防 transition 120ms 插值相位抖动）
  await page.evaluate(() => { document.documentElement.dataset.motion = 'off'; });
  // 页内 canvas 把任意 CSS 颜色（含 oklab/color(srgb)）解析为 rgba → Rec.709 亮度（序列化解耦）
  const hoverLuma = async (theme) => {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await btn.hover();
    return btn.evaluate((el) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = getComputedStyle(el).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    });
  };
  const accentLuma = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.backgroundColor = 'var(--accent)';
    document.body.appendChild(probe);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = getComputedStyle(probe).backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    probe.remove();
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  });
  const lightLuma = await hoverLuma('light');
  const darkLuma = await hoverLuma('dark');
  expect(lightLuma).toBeLessThan(accentLuma); // 浅色混 black → 暗一档
  expect(darkLuma).toBeGreaterThan(accentLuma); // 深色混 white → 亮一档
  expect(darkLuma).toBeGreaterThan(lightLuma); // 深色 hover 亮于浅色 hover
});
