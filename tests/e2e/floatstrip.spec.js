import { test, expect } from '@playwright/test';

// FloatStrip 悬浮条（Task A5，规格 §5）：横竖双形态 / 四边磁吸 / 无边框 hover 浮现。
// 入口 `?mode=strip`（body 级独立渲染）；app 壳演示经 `?mode=app`（右下 FloatBall → 展开）。
// 动画时长：旋转/浮现 --dur-base 200ms、磁吸 --dur-slow 300ms，点击后 waitForTimeout 覆盖。
// 红线：旋转/磁吸/浮现只动 transform/opacity —— 断言走 data-orientation 类翻转 +
// flex-direction（transform 计算值恒为 matrix，见 src/CLAUDE.md 常见坑）。

const STRIP_URL = '/?mode=strip';
const SETTLE_MS = 400; // 覆盖 300ms 磁吸 + 200ms 浮现/旋转相位

test('渲染：.c-strip 存在 + token 实时监测（浏览器无后端 → 暂无账户占位）', async ({ page }) => {
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  await expect(strip).toHaveCount(1);
  // 浏览器 ?mode=strip 路径不渲染「恢复主窗」按钮（showRestore 仅 Tauri 独立窗口为 true）——
  // 在 .c-strip 已确认存在后断言，避免空 DOM 上 toHaveCount(0) 真空通过
  await expect(page.locator('.c-strip__restore')).toHaveCount(0);
  // 内容走真实数据路径：浏览器无 Tauri 后端 → 「暂无账户」占位
  await expect(strip.locator('.c-strip-tk')).toBeVisible();
  await expect(strip.locator('.c-strip-tk')).toContainText('暂无账户');
});

test('strip：mock __TAURI__ 渲染真实账户余量（get_config + get_balances 快照）', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI__ = {
      window: {
        LogicalSize: class { constructor(width, height) { this.width = width; this.height = height; } },
        getCurrentWindow: () => ({
          setSize: () => Promise.resolve(), setPosition: () => Promise.resolve(),
          onMoved: () => Promise.resolve(() => {}), hide: () => Promise.resolve(),
        }),
      },
      core: {
        invoke: async (cmd) => {
          if (cmd === 'get_config') {
            return {
              accounts: [
                { id: 'a1', name: 'DeepSeek 主号', kind: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-x', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
                { id: 'a2', name: 'OpenCode Go', kind: 'opencode_go', baseUrl: 'https://opencode.ai', apiKey: '', workspaceId: 'wrk', authCookie: 'ck', refreshIntervalSecs: 300, warnThreshold: 10 },
              ],
            };
          }
          if (cmd === 'get_balances') {
            return [
              { accountId: 'a1', balance: 88.5, currency: 'CNY', ok: true, error: null, lastUpdated: 0 },
              { accountId: 'a2', balance: null, currency: null, windows: [
                  { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: '' },
                  { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
                ], ok: true, error: null, lastUpdated: 0 },
            ];
          }
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
  });
  await page.goto(STRIP_URL);
  const strip = page.locator('.c-strip');
  const chips = strip.locator('.c-strip-tk__chip');
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toContainText('DeepSeek 主号');
  await expect(chips.nth(0)).toContainText('88.50');
  await expect(chips.nth(0)).toContainText('CNY');
  await expect(chips.nth(1)).toContainText('OpenCode Go');
  await expect(chips.nth(1)).toContainText('本月 80%');
  await expect(chips.nth(1).locator('.c-strip-tk__dot')).not.toHaveClass(/dot--err/);
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
    window.__TAURI__ = { window: { LogicalSize: class { constructor(width, height) { this.width = width; this.height = height; } }, getCurrentWindow: () => ({
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
  // 注：B4F-5 控制条多一个恢复按钮 → 旋转后窗口高度缩小，鼠标可能落出 strip
  // （真实 Tauri 窗口同样如此：窗口=内容尺寸，指针在按钮位可能超出新窗口）——
  // 点击前重新 hover，确保控制条浮现可点
  await page.locator('.c-strip').hover();
  await page.waitForTimeout(SETTLE_MS);
  await page.locator('.c-strip__close').click();
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('hide');
});

test('strip 窗口：恢复主窗按钮 → main show+setFocus', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    window.__TAURI__ = { window: {
      LogicalSize: class { constructor(width, height) { this.width = width; this.height = height; } },
      getCurrentWindow: () => ({
        setSize: () => Promise.resolve(), setPosition: () => Promise.resolve(),
        onMoved: () => Promise.resolve(() => {}), hide: () => Promise.resolve(),
      }),
      getAllWindows: () => Promise.resolve([{
        label: 'main',
        show: () => { calls.push('main.show'); return Promise.resolve(); },
        setFocus: () => { calls.push('main.setFocus'); return Promise.resolve(); },
      }]),
    } };
    window.__restoreCalls__ = calls;
  });
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip__restore')).toBeVisible();
  await page.locator('.c-strip').hover();
  await page.waitForTimeout(300);
  await page.locator('.c-strip__restore').click();
  const calls = await page.evaluate(() => window.__restoreCalls__);
  expect(calls).toContain('main.show');
  expect(calls).toContain('main.setFocus');
});
