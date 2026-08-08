import { test, expect } from '@playwright/test';
import { openSettingsPartition } from './helpers.js';

// B1-3 迁移：docs 定制器抽屉（.topbar__customizer → .cust-panel）→ 应用壳「外观」设置分区
// （APP_SECTIONS index 1）。外观分区为定制器整页形态（renderCustomizerGroups 惰性挂载，
// 6 组 .cust-group 与抽屉面板共用同一实现 + 同一份 store），滑杆实时链路不变。
// 取舍：导出（.cust-export）与重置（.cust-reset）在分区整页形态无对应（footer 为抽屉面板
// 专属），相应用例删除，保留滑杆 → CSS 变量实时生效的核心行为验证。

test('调整亚克力透明度实时生效', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const slider = appr.locator('.cust-row:has-text("透明度") input[type="range"]');
  await slider.fill('0.8');
  const bgOpacity = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--glass-bg-opacity').trim());
  expect(bgOpacity).toBe('0.8');
});

test('外观分区：色彩微调滑杆已移除，强调色预设保留', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  await expect(appr.locator('.c-slider[data-key="hue"]')).toHaveCount(0);
  await expect(appr.locator('.c-slider[data-key="saturation"]')).toHaveCount(0);
  await expect(appr.locator('.c-slider[data-key="temperature"]')).toHaveCount(0);
  await expect(appr.locator('.cust-accent-card')).toHaveCount(12);
  // 切强调色 → --accent 直接取色板（无微调覆盖）
  await appr.locator('.cust-accent-card[data-accent="teal"]').click();
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  // B4-3 偏差修正：未注册 CSS 自定义属性保持原始序列化（hex，非 rgb）—— 与本仓库 tokens.spec
  // 对同一变量 --accent 的既有断言（'#2dd4bf'）保持一致；语义断言不变（强调色 = teal 色板直出）。
  expect(accent).toBe('#2dd4bf'); // teal-400 #2dd4bf
});

test('强调色预设扩至 12 套，新预设可切换', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  await expect(appr.locator('.cust-accent-card')).toHaveCount(12);
  await appr.locator('.cust-accent-card[data-accent="rose"]').click();
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toBe('#fb7185'); // rose-400（--accent 取色板 400）
  const preview = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.cust-overview')).getPropertyValue('--preview-accent').trim());
  expect(preview).toBe('#f43f5e'); // ACCENTS rose.color（设计规格 500 值）
});

test('外观分区：表面质感组标题 + 亚克力开关 + 噪点滑杆', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  await expect(page.locator('.cust-group').nth(1).locator('.cust-group__title')).toContainText('表面质感');
  await expect(page.locator('[data-glass-switch]')).toContainText('亚克力材质');
  await expect(page.locator('.c-slider[data-key="noise"]')).toBeVisible();
});

test('外观分组标题体现全局语义（重命名 + desc）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  const group = page.locator('.cust-group');
  await expect(group).toHaveCount(6);
  await expect(group.nth(0).locator('.cust-group__title')).toHaveText('整体色调');
  await expect(group.nth(0).locator('.cust-group__desc')).toHaveText('预设主题色 / 语义色自动协调');
  await expect(group.nth(1).locator('.cust-group__title')).toHaveText('表面质感');
  await expect(group.nth(1).locator('.cust-group__desc')).toHaveText('透明度/模糊/噪点强度/亚克力材质');
  await expect(group.nth(2).locator('.cust-group__title')).toHaveText('文字排版');
  await expect(group.nth(2).locator('.cust-group__desc')).toHaveText('基准字号/缩放');
  await expect(group.nth(3).locator('.cust-group__title')).toHaveText('边角形状');
  await expect(group.nth(3).locator('.cust-group__desc')).toHaveText('圆角比例');
  await expect(group.nth(4).locator('.cust-group__title')).toHaveText('动效节奏');
  await expect(group.nth(4).locator('.cust-group__desc')).toHaveText('时长缩放/弹性强度');
  await expect(group.nth(5).locator('.cust-group__title')).toHaveText('阴影层次');
  await expect(group.nth(5).locator('.cust-group__desc')).toHaveText('阴影强度');
});

// B3-2：外观分区顶部实时整体预览卡（.cust-overview）。订阅回调只读 getConfig() 并写容器局部
// --preview-* 变量（不调 applyConfig —— 变更发起方已先 saveConfig + applyConfig）。
// getComputedStyle 读 .cust-overview 元素 inline 写入的变量；fill 触发 input → saveConfig → 订阅回调 updateOverview。
test('外观分区顶部有实时整体预览卡（强调色/圆角实时联动）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  const overview = page.locator('.cust-overview');
  await expect(overview).toBeVisible();
  // 切强调色 → 预览卡强调色同步变化
  const before = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-accent'));
  await page.locator('.cust-accent-card[data-accent="teal"]').click();
  const after = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-accent'));
  expect(after).not.toBe(before);
  // 圆角滑杆 → 预览卡圆角比例同步变化（全局联动验证）
  const rBefore = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-radius'));
  await page.locator('.c-slider[data-key="radiusScale"]').fill('1.5');
  const rAfter = await overview.evaluate((el) => getComputedStyle(el).getPropertyValue('--preview-radius'));
  expect(rAfter).not.toBe(rBefore);
});

test('文字排版：baseSize/scale 滑杆真实全局缩放字号', async ({ page }) => {
  const appr = await openSettingsPartition(page, 1);
  const readFont = () => page.evaluate(() => {
    const body = parseFloat(getComputedStyle(document.body).fontSize);
    const sm = parseFloat(getComputedStyle(document.querySelector('.c-titlebar__title')).fontSize);
    return { body, sm };
  });
  const before = await readFont();
  expect(before.body).toBeCloseTo(14, 1); // 默认 baseSize=14, scale=1
  expect(before.sm).toBeCloseTo(12, 1);   // --font-size-sm = 14 × 6/7
  // 注：brief 原始 `.cust-row:has-text("缩放")` 与「时长缩放」行（durationScale）子串冲突 → 改按
  // data-key 精确定位（与同文件 radiusScale/noise 用例同款约定）
  await appr.locator('.c-slider[data-key="scale"]').fill('1.15');
  const scaled = await readFont();
  expect(scaled.body).toBeGreaterThan(before.body);
  expect(scaled.sm).toBeGreaterThan(before.sm);
  await appr.locator('.c-slider[data-key="baseSize"]').fill('12');
  const based = await readFont();
  expect(based.body).toBeLessThan(scaled.body);
  expect(based.sm).toBeLessThan(scaled.sm);
});

test('B5-5：外观页控件行对齐统一（标签基线 + 行距一致）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="appearance"]').click();
  const appr = page.locator('.app-main__settings [data-page="appearance"]');
  // ① 标签基线对齐：slider 行内 label 与 value 同基线（bottom 差 < 2px，.cust-row__head align-items:baseline）
  const bases = await appr.locator('.cust-row:not(.cust-row--switch) .cust-row__head').evaluateAll(
    (heads) => heads.slice(0, 4).map((h) => {
      const l = h.querySelector('.cust-row__label');
      const v = h.querySelector('.cust-row__value');
      return l && v ? Math.abs(l.getBoundingClientRect().bottom - v.getBoundingClientRect().bottom) : null;
    }).filter((d) => d !== null));
  expect(bases.length).toBeGreaterThan(0);
  for (const d of bases) expect(d).toBeLessThan(2);
  // ② 行距一致：连续 slider 行间距差 < 4px（表面质感组 透明度/模糊/噪点 连续段，跳过首行 switch 行——
  //    首 switch 行与下一行间隔着玻璃预览卡（非 .cust-row），其 gap 由卡片高度主导，非行距可比）
  const rows = await appr.locator('.cust-row').evaluateAll((els) => els.slice(1, 4).map((el) => el.getBoundingClientRect().top));
  const gaps = rows.slice(1).map((t, i) => t - rows[i]);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(4);
  // ③ switch 行：标签垂直居中于行（align-items:center 兜底）+ 行高 ≥ 40px（min-height 密度统一）。
  //    以「标签中心 vs 行中心」度量（.c-switch 在动效行有 .cust-switch-wrap 嵌套，行中心才是 flex 保证）
  const sws = await appr.locator('.cust-row--switch').evaluateAll((els) => els.slice(0, 2).map((r) => {
    const l = r.querySelector('.cust-row__label');
    if (!l) return null;
    const rr = r.getBoundingClientRect();
    const lr = l.getBoundingClientRect();
    const lc = lr.top + lr.height / 2;
    const rc = rr.top + rr.height / 2;
    return { cent: Math.abs(lc - rc), h: rr.height };
  }).filter((v) => v !== null));
  expect(sws.length).toBeGreaterThan(0);
  for (const { cent, h } of sws) {
    expect(cent).toBeLessThan(1);
    expect(h).toBeGreaterThanOrEqual(40);
  }
});
