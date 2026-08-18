import { test, expect } from '@playwright/test';

const APP_URL = '/?mode=app';

// 浏览器（无 Tauri）：tokenTool 显示「需桌面端使用」空态，且作为 token-tool 模块可导航
test('tokenTool：浏览器空态 + 左窗 token-tool 模块 + 概览快捷卡', async ({ page }) => {
  await page.goto(APP_URL);
  // 概览快捷卡存在（先于切页断言：概览页非 active 时 display:none 不可见）
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview.locator('.app-main__shortcut[data-shortcut="token-tool"]')).toBeVisible();
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'token-tool');
  await expect(active).toContainText('需桌面端使用');
});

// mock __TAURI__：桌面端进入 token-tool → 余量页（只读卡片）+ 账户管理页（行操作）
test('tokenTool：桌面端（mock __TAURI__）余量页只读渲染 + 账户管理页操作', async ({ page }) => {
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
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);

  // 默认落余量页：只读卡片（两账户数据渲染，无操作按钮）
  await expect(page.locator('.tt__card')).toHaveCount(2);
  await expect(page.locator('.tt__card', { hasText: 'DeepSeek 主号' })).toContainText('88.50');
  await expect(page.locator('.tt__card', { hasText: 'OpenCode Go' })).toContainText('29.2%');
  await expect(page.locator('.tt__card', { hasText: 'OpenCode Go' })).toContainText('剩余 $8.50 / $12');
  // 只读：余量页不出现任何 data-tt-action 操作按钮
  await expect(page.locator('[data-tt-action]')).toHaveCount(0);

  // 挂载即拉配置 + 快照
  let invokes = await page.evaluate(() => window.__tokenToolInvokes__);
  expect(invokes.map((i) => i.cmd)).toContain('get_config');
  expect(invokes.map((i) => i.cmd)).toContain('get_balances');

  // 立即刷新 → invoke refresh_all
  await page.locator('.tt__toolbar .c-btn', { hasText: '立即刷新' }).click();
  await page.waitForTimeout(100);
  invokes = await page.evaluate(() => window.__tokenToolInvokes__);
  expect(invokes.map((i) => i.cmd)).toContain('refresh_all');

  // 右窗目录切到「账户管理」→ 账户行（含测试/编辑/删除）
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="accounts"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.tt__row')).toHaveCount(2);
  await expect(page.locator('.tt__row', { hasText: 'DeepSeek 主号' }).locator('[data-tt-action="edit"]')).toBeVisible();
  await expect(page.locator('.tt__row', { hasText: 'OpenCode Go' }).locator('[data-tt-action="test"]')).toBeVisible();
});

test('tokenTool：Codex 本机额度卡 + 账户编辑器', async ({ page }) => {
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
              accounts: [{ id: 'codex-1', name: '本机 Codex', kind: 'codex', baseUrl: '', apiKey: '', workspaceId: null, authCookie: null, warnThreshold: 10 }],
            };
          }
          if (cmd === 'get_balances') {
            return [{
              accountId: 'codex-1',
              accountName: '本机 Codex',
              kind: 'codex',
              balance: null,
              currency: null,
              windows: [{ key: 'primary', label: '7天', limit: 100, used: 11, usedPct: 11, resetsIn: 7200, resetsAt: '' }],
              planType: 'plus',
              credits: { hasCredits: false, unlimited: false, balance: '0' },
              ok: true,
              error: null,
              lastUpdated: Math.floor(Date.now() / 1000),
            }];
          }
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);

  const card = page.locator('.tt__card', { hasText: '本机 Codex' });
  await expect(card).toContainText('Codex');
  await expect(card).toContainText('plus');
  await expect(card).toContainText('7天');
  await expect(card).toContainText('11.0%');
  await expect(card).toContainText('无额外 credits');

  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="accounts"]').click();
  await page.waitForTimeout(400);
  await page.locator('.tt__toolbar .c-btn', { hasText: '添加账户' }).click();
  await page.locator('[data-tt-field="kind"] .c-select').selectOption('codex');
  await expect(page.locator('[data-tt-row="codex"]')).toBeVisible();
  const deepseekRows = page.locator('[data-tt-row="deepseek"]');
  const opencodeRows = page.locator('[data-tt-row="opencode_go"]');
  await expect(deepseekRows).toHaveCount(2);
  await expect(opencodeRows).toHaveCount(2);
  for (const rows of [deepseekRows, opencodeRows]) {
    for (let i = 0; i < await rows.count(); i += 1) await expect(rows.nth(i)).toBeHidden();
  }
  await expect(page.locator('[data-tt-row="codex"]')).toContainText('无需填写密钥');
});

// 编辑对话框表单值转义：账户名含 `"` 时，name 输入框 value 必须完整回显且原始属性为转义形态
test('tokenTool：账户管理页编辑对话框表单值转义（含引号账户名）', async ({ page }) => {
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
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="accounts"]').click();
  await page.waitForTimeout(400);

  // 打开含引号账户的编辑对话框 → 名称值完整回显 + 原始属性为转义形态。
  await page.locator('.tt__row', { hasText: 'a"b' }).locator('[data-tt-action="edit"]').click();
  const nameInput = page.locator('[data-tt-field="name"] .c-input');
  await expect(nameInput).toHaveAttribute('value', 'a"b');
  expect(await nameInput.evaluate((el) => el.outerHTML)).toContain('value="a&quot;b"');
});

// 零账户：余量页空态引导去账户管理；账户管理页空态 CTA 打开添加账户编辑对话框
test('tokenTool：零账户余量页空态 + 账户管理页 CTA 打开编辑对话框', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: {
        invoke: async (cmd) => {
          if (cmd === 'get_config') return { accounts: [] };
          if (cmd === 'get_balances') return [];
          if (cmd === 'save_config') return null;
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);

  // 余量页空态：暂无账户，无操作按钮
  const usageEmpty = page.locator('.tt__grid');
  await expect(usageEmpty).toContainText('暂无账户');
  await expect(page.locator('[data-tt-action]')).toHaveCount(0);

  // 切到账户管理页：空态 CTA「添加账户」→ 打开添加账户编辑对话框
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="accounts"]').click();
  await page.waitForTimeout(400);
  const cta = page.locator('.tt__accounts .c-btn', { hasText: '添加账户' });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.locator('.c-dialog')).toBeVisible();
  await expect(page.locator('.c-dialog__header')).toContainText('添加账户');
});

// 回归（用户报 bug）：新增账户选 OpenCode 必须带出 workspace + cookie 字段；
// 编辑器对话框为实底材质（非透明毛玻璃，与主页面一致）。
test('tokenTool：账户管理页新增账户选 OpenCode 带出 workspace+cookie；对话框实底材质', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: {
        invoke: async (cmd) => {
          if (cmd === 'get_config') return { accounts: [] };
          if (cmd === 'get_balances') return [];
          if (cmd === 'refresh_all' || cmd === 'save_config') return null;
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="accounts"]').click();
  await page.waitForTimeout(400);
  // 打开「添加账户」
  await page.locator('.tt__toolbar .c-btn', { hasText: '添加账户' }).click();
  const dialog = page.locator('.c-dialog');
  await expect(dialog).toBeVisible();
  // 实底材质：无毛玻璃 backdrop-filter 模糊
  await expect(dialog).toHaveCSS('backdrop-filter', 'none');
  // 选 OpenCode Go 套餐 → workspace + cookie 两行都带出（旧代码只带出 workspace）
  await page.locator('[data-tt-field="kind"] .c-select').selectOption('opencode_go');
  await expect(page.locator('[data-tt-field="workspace"]')).toBeVisible();
  await expect(page.locator('[data-tt-field="cookie"]')).toBeVisible();
});

// 新增账户弹窗在矮窗内适配：不高出视口 + 表单可滚动（移除「刷新间隔」字段后表单变短，
// 原 480 视口不再溢出 → 视口压到 360 仍验证 max-height+滚动机制）。
// 回归：.c-dialog 无 max-height + body 不滚动时，弹窗溢出、底部按钮贴边
//（与密码管理器 key 编辑器弹窗同类缺陷，同步修复）。
test('tokenTool：新增账户弹窗窄窗适配（不高出视口 + 表单可滚动）', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 360 });
  await page.addInitScript(() => {
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([]),
      },
      core: {
        invoke: async (cmd) => {
          if (cmd === 'get_config') return { accounts: [] };
          if (cmd === 'get_balances') return [];
          return null;
        },
      },
      event: { listen: async () => () => {} },
    };
  });
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="token-tool"]').click();
  await page.waitForTimeout(400);
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="accounts"]').click();
  await page.waitForTimeout(400);
  await page.locator('.tt__toolbar .c-btn', { hasText: '添加账户' }).click();
  await expect(page.locator('.c-dialog')).toBeVisible();
  await page.waitForTimeout(400); // 等 dialog-in 动画结束再量几何
  const metrics = await page.evaluate(() => {
    const d = document.querySelector('.c-dialog').getBoundingClientRect();
    const body = document.querySelector('.c-dialog__body');
    return {
      fits: d.top >= 0 && d.bottom <= window.innerHeight,
      scrollable: body.scrollHeight > body.clientHeight,
    };
  });
  expect(metrics.fits).toBe(true);
  expect(metrics.scrollable).toBe(true);
});
