import { test, expect } from '@playwright/test';

const APP_URL = '/?mode=app';

// 浏览器（无 Tauri）：tokenTool 显示「需桌面端使用」空态，且作为第 8 个模块可导航
test('tokenTool：浏览器空态 + 左窗第 8 项 + 概览快捷卡', async ({ page }) => {
  await page.goto(APP_URL);
  // 概览快捷卡存在（先于切页断言：概览页非 active 时 display:none 不可见）
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview.locator('.app-main__shortcut[data-shortcut="token-tool"]')).toBeVisible();
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(7).click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'token-tool');
  await expect(active).toContainText('需桌面端使用');
});

// mock __TAURI__：验证桌面端 invoke 调用形态 + 账户卡渲染 + 立即刷新
test('tokenTool：桌面端（mock __TAURI__）加载账户、渲染卡片、触发刷新', async ({ page }) => {
  await page.addInitScript(() => {
    const invokes = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: {
        invoke: async (cmd, args) => {
          invokes.push({ cmd, args });
          if (cmd === 'get_config') {
            return {
              accounts: [
                { id: 'a1', name: 'DeepSeek 主号', kind: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-x', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
                { id: 'a2', name: 'OpenCode Go', kind: 'opencode_go', baseUrl: 'https://opencode.ai', apiKey: '', workspaceId: 'wrk_1', authCookie: 'ck', refreshIntervalSecs: 300, warnThreshold: 10 },
              ],
            };
          }
          if (cmd === 'get_balances') {
            const ts = Math.floor(Date.now() / 1000);
            return [
              { accountId: 'a1', accountName: 'DeepSeek 主号', kind: 'deepseek', balance: 88.5, currency: 'CNY', windows: null, ok: true, error: null, lastUpdated: ts },
              { accountId: 'a2', accountName: 'OpenCode Go', kind: 'opencode_go', balance: null, currency: null, windows: [
                  { key: 'rolling', label: '5小时', limit: 12, used: 3.5, usedPct: 29.2, resetsIn: 3600, resetsAt: '' },
                  { key: 'weekly', label: '本周', limit: 30, used: 15, usedPct: 50, resetsIn: 43200, resetsAt: '' },
                  { key: 'monthly', label: '本月', limit: 60, used: 48, usedPct: 80, resetsIn: 99999, resetsAt: '' },
                ], ok: true, error: null, lastUpdated: ts },
            ];
          }
          if (cmd === 'test_account') {
            return { ...args.account, balance: 77.0, currency: 'CNY', ok: true, error: null, lastUpdated: Math.floor(Date.now() / 1000) };
          }
          if (cmd === 'refresh_all' || cmd === 'save_config') return null;
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
    window.__tokenToolInvokes__ = invokes;
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(7).click();
  await page.waitForTimeout(400);

  // 两账户卡渲染（DeepSeek 余额 + OpenCode 三窗口）
  await expect(page.locator('.tt__card')).toHaveCount(2);
  await expect(page.locator('.tt__card', { hasText: 'DeepSeek 主号' })).toContainText('88.50');
  await expect(page.locator('.tt__card', { hasText: 'OpenCode Go' })).toContainText('29.2%');
  await expect(page.locator('.tt__card', { hasText: 'OpenCode Go' })).toContainText('剩余 $8.50 / $12');

  // 挂载即拉配置 + 快照
  let invokes = await page.evaluate(() => window.__tokenToolInvokes__);
  expect(invokes.map((i) => i.cmd)).toContain('get_config');
  expect(invokes.map((i) => i.cmd)).toContain('get_balances');

  // 立即刷新 → invoke refresh_all
  await page.locator('.tt__toolbar .c-btn', { hasText: '立即刷新' }).click();
  await page.waitForTimeout(100);
  invokes = await page.evaluate(() => window.__tokenToolInvokes__);
  expect(invokes.map((i) => i.cmd)).toContain('refresh_all');
});

// 编辑对话框表单值转义：账户名含 `"` 时，name 输入框 value 必须完整回显且原始属性为转义形态
// （旧代码直接插值破坏属性 → 自 XSS 路径 + 编辑回显错误；浏览器实体解码属性值，
// 故解码后 getAttribute('value') = `a"b`，原始转义形态看序列化 outerHTML）
test('tokenTool：编辑对话框表单值转义（含引号账户名不破坏属性）', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: {
        invoke: async (cmd) => {
          if (cmd === 'get_config') {
            return {
              accounts: [
                { id: 'a1', name: 'a"b', kind: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-x', workspaceId: null, authCookie: null, refreshIntervalSecs: 300, warnThreshold: 10 },
              ],
            };
          }
          if (cmd === 'get_balances') return [];
          if (cmd === 'save_config') return null;
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item').nth(7).click();
  await page.waitForTimeout(400);

  // 打开含引号账户的编辑对话框 → 名称值完整回显 + 原始属性为转义形态。
  // 注：浏览器解析 HTML 时实体解码属性值，getAttribute('value') 返回解码后的 `a"b`；
  // 原始转义形态需看序列化 outerHTML（`"` → `&quot;`）。旧代码属性被 `"` 截断为 `a`。
  await page.locator('.tt__card', { hasText: 'a"b' }).locator('[data-tt-action="edit"]').click();
  const nameInput = page.locator('[data-tt-field="name"] .c-input');
  await expect(nameInput).toHaveAttribute('value', 'a"b');
  expect(await nameInput.evaluate((el) => el.outerHTML)).toContain('value="a&quot;b"');
});
