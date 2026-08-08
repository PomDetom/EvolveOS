import { test, expect } from '@playwright/test';

// FloatStrip 悬浮条（Task A5，规格 §5）：横竖双形态 / 四边磁吸 / 无边框 hover 浮现。
// 入口 `?mode=strip`（body 级独立渲染）；app 壳演示经 `?mode=app`（右下 FloatBall → 展开）。
// 动画时长：旋转/浮现 --dur-base 200ms、磁吸 --dur-slow 300ms，点击后 waitForTimeout 覆盖。
// 红线：旋转/磁吸/浮现只动 transform/opacity —— 断言走 data-orientation 类翻转 +
// flex-direction（transform 计算值恒为 matrix，见 src/CLAUDE.md 常见坑）。

const STRIP_URL = '/?mode=strip';
const SETTLE_MS = 400; // 覆盖 300ms 磁吸 + 200ms 浮现/旋转相位

test('渲染：.c-strip 存在 + token 监测内容（数值/状态点/趋势条）', async ({ page }) => {
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  await expect(strip).toHaveCount(1);
  await expect(strip.locator('.c-tmon__value')).toContainText('97.2%');
  await expect(strip.locator('.c-tmon__dot.c-tmon__dot--ok')).toHaveCount(1);
  await expect(strip.locator('.c-tmon__trend-bar')).toHaveCount(7);
  await expect(strip.locator('.c-tmon__trend-bar').first()).toBeVisible();
});

test('旋转切换：初始 horizontal → 点旋转按钮 → orientation 类翻转 + 内容布局变化', async ({ page }) => {
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  await expect(strip).toHaveClass(/c-strip--horizontal/);
  await expect(strip).toHaveAttribute('data-orientation', 'horizontal');
  // hover 使控制条浮现（pointer-events none → auto）后再点旋转按钮
  await strip.hover();
  await page.waitForTimeout(SETTLE_MS);
  await strip.locator('.c-strip__rotate').click();
  await page.waitForTimeout(SETTLE_MS);
  await expect(strip).toHaveClass(/c-strip--vertical/);
  await expect(strip).toHaveAttribute('data-orientation', 'vertical');
  // 内容布局随形态变化：flex-direction 横向 → 纵向
  const dir = await strip.locator('.c-strip__content').evaluate((el) => getComputedStyle(el).flexDirection);
  expect(dir).toBe('column');
});

test('四边磁吸：拖动到视口左边缘 → 吸附类 + 贴边定位生效（transform 定位）', async ({ page }) => {
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  const box = await strip.boundingBox();
  // 从内容区左侧（可拖区域）拖到视口左边缘
  const startX = box.x + 20;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(12, startY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(SETTLE_MS);
  await expect(strip).toHaveClass(/c-strip--snapped/);
  const after = await strip.boundingBox();
  expect(Math.abs(after.x)).toBeLessThanOrEqual(2); // 贴左边缘
});

test('无边框 hover 浮现：默认无边框 → hover 出现控制条/边框', async ({ page }) => {
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  const ctrl = strip.locator('.c-strip__ctrl');
  // Playwright toBeVisible 对 opacity:0 仍判可见，改用计算样式断言
  const defaultOpacity = await ctrl.evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(defaultOpacity)).toBe(0);
  const defaultBorder = await strip.evaluate((el) => getComputedStyle(el).borderColor);
  expect(defaultBorder).toBe('rgba(0, 0, 0, 0)'); // transparent 常态零边框
  await strip.hover();
  await page.waitForTimeout(SETTLE_MS);
  const hoverOpacity = await ctrl.evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(hoverOpacity)).toBe(1);
  const hoverBorder = await strip.evaluate((el) => getComputedStyle(el).borderColor);
  expect(hoverBorder).not.toBe('rgba(0, 0, 0, 0)'); // hover 浮现半透明细边框
});

test('双击内容区旋转（第二通道）', async ({ page }) => {
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  await expect(strip).toHaveClass(/c-strip--horizontal/);
  await strip.locator('.c-strip__content').dblclick();
  await page.waitForTimeout(SETTLE_MS);
  await expect(strip).toHaveClass(/c-strip--vertical/);
  await expect(strip).toHaveAttribute('data-orientation', 'vertical');
});

test('app 壳：右下 FloatBall → 点击展开 FloatStrip 演示（右下贴边可拖）', async ({ page }) => {
  await page.goto('/?mode=app');
  const ball = page.locator('.app-main__float-ball .c-float-ball');
  await expect(ball).toHaveCount(1);
  await ball.click();
  await page.waitForTimeout(SETTLE_MS);
  const strip = page.locator('.c-strip');
  await expect(strip).toHaveCount(1);
  await expect(strip.locator('.c-tmon__value')).toContainText('97.2%');
  await expect(strip.locator('.c-strip__rotate')).toHaveCount(1);
  // 演示实例右下贴边（默认吸附位 bottom-right）
  const box = await strip.boundingBox();
  expect(box.x + box.width).toBeGreaterThan(700); // 贴右边缘附近
});

test('strip 窗口：拖动走系统拖拽、旋转贴合尺寸、位置持久化、X 隐藏窗口', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    window.__TAURI__ = { window: { getCurrentWindow: () => ({
      startDragging: () => { calls.push('startDragging'); return Promise.resolve(); },
      setSize: (s) => { calls.push(['setSize', s]); return Promise.resolve(); },
      setPosition: (p) => { calls.push(['setPosition', p]); return Promise.resolve(); },
      outerPosition: () => { calls.push('outerPosition'); return Promise.resolve({ x: 300, y: 200 }); },
      onMoved: (fn) => { window.__stripMovedFn__ = fn; return Promise.resolve(() => {}); },
      hide: () => { calls.push('hide'); return Promise.resolve(); },
    }) } };
    window.__stripWinCalls__ = calls;
    localStorage.setItem('ui-design-strip-pos', JSON.stringify({ x: 120, y: 80 }));
  });
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip')).toBeVisible();
  // 位置恢复：setPosition 被调用且为存档值
  let calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContainEqual(['setPosition', { x: 120, y: 80 }]);
  // 位置保存：触发 onMoved → outerPosition → localStorage 更新为 300/200
  await page.evaluate(() => window.__stripMovedFn__());
  await page.waitForTimeout(350); // 去抖 200ms
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ui-design-strip-pos')));
  expect(saved).toEqual({ x: 300, y: 200 });
  // 拖动 → startDragging（不跟踪指针/不磁吸）
  await page.locator('.c-strip__drag').dispatchEvent('pointerdown', { button: 0, pointerId: 1 });
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('startDragging');
  // 旋转 → setSize 贴合（先 hover 使控制条浮现可点，与既有用例同模式；
  // 真实 Tauri 窗口=内容尺寸，指针恒在 strip 上 → hover 恒成立）
  const before = calls.filter((c) => c[0] === 'setSize').length;
  const strip = page.locator('.c-strip');
  await strip.hover();
  await page.waitForTimeout(SETTLE_MS);
  await page.locator('.c-strip__rotate').click();
  await page.waitForTimeout(300); // 交叉淡入淡出 240ms
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls.filter((c) => c[0] === 'setSize').length).toBeGreaterThan(before);
  // X 关闭 → hide（预注册窗口隐藏可重开，不销毁）
  await page.locator('.c-strip__close').click();
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('hide');
});
