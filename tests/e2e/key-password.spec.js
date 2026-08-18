import { test, expect } from '@playwright/test';

const APP_URL = '/?mode=app';
const SEED = [
  { id: 'e1', name: 'GitHub', url: 'https://github.com', username: 'alice', password: 'p@ss-w0rd!', notes: null, tags: ['work', 'dev'], created_at: 1000, updated_at: 1000 },
  { id: 'e2', name: 'Email', url: 'https://mail.example.com', username: 'a@x.com', password: 'secret-mail', notes: null, tags: ['personal'], created_at: 1000, updated_at: 2000 },
];

// mock __TAURI__：内存 vault 实现 13 命令，记录 invokes 供断言；seed 可覆盖（独立用例）
function installMock(seed = SEED) {
  return `
  const state = { session: null, defaultPath: 'C:/mock/appdata/vault.json' };
  const invokes = [];
  window.__keyInvokes__ = invokes;
  window.__keyMock__ = state;
  const seed = ${JSON.stringify(seed)};
  window.__TAURI__ = {
    window: {
      getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
      getAllWindows: () => Promise.resolve([]),
    },
    event: { listen: async () => () => {} },
    core: {
      invoke: async (cmd, args = {}) => {
        invokes.push({ cmd, args });
        const s = state.session;
        switch (cmd) {
          case 'default_vault_path': return state.defaultPath;
          case 'pick_vault_path': return 'C:/mock/picked/vault.json';
          case 'current_vault_path':
            if (!s) throw 'vault locked';
            return s.path;
          case 'list_entries': {
            if (!s) throw 'vault locked';
            const q = (args.query || '').trim().toLowerCase();
            const tags = args.tags || [];
            return s.entries.filter((e) =>
              (!q || e.name.toLowerCase().includes(q) || (e.url || '').toLowerCase().includes(q) || e.username.toLowerCase().includes(q)) &&
              (!tags.length || tags.some((t) => (e.tags || []).includes(t))));
          }
          case 'unlock_vault':
            if (args.masterPassword !== 'master') throw 'incorrect master password';
            state.session = { path: args.path, entries: structuredClone(seed) };
            return null;
          case 'create_vault':
            state.session = { path: args.path, entries: [] };
            return null;
          case 'lock_vault': state.session = null; return null;
          case 'create_entry': s.entries.push({ id: 'new-' + s.entries.length, ...args }); return null;
          case 'update_entry': {
            const e = s.entries.find((x) => x.id === args.id);
            if (e) Object.assign(e, { name: args.name, url: args.url, username: args.username, password: args.password, notes: args.notes, tags: args.tags });
            return null;
          }
          case 'delete_entry': s.entries = s.entries.filter((x) => x.id !== args.id); return null;
          case 'generate_password': return 'Abc123!xyz789#';
          case 'export_vault': return null;
          case 'import_vault': s.entries.push({ id: 'imp', name: 'Imported', url: null, username: 'u', password: 'p', notes: null, tags: ['imported'], created_at: 0, updated_at: 0 }); return 1;
          default: return null;
        }
      },
    },
  };
  `;
}

test('密码：浏览器空态（无 __TAURI__）+ 三目录 + 快捷卡', async ({ page }) => {
  await page.goto(APP_URL);
  const overview = page.locator('.app-main__page[data-page="home"]');
  await expect(overview.locator('.app-main__shortcut[data-shortcut="key"]')).toBeVisible();
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await expect(active).toHaveAttribute('data-page', 'key');
  await expect(active).toContainText('需桌面端使用');
});

test('密码：mock 桌面解锁 → 列表 → 添加/编辑/删除 → 锁定全链路', async ({ page }) => {
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  // 锁定屏：默认路径预填 + 模式默认解锁
  await expect(active.locator('.key__lock')).toBeVisible();
  await expect(active.locator('.key__lock .c-input').first()).toHaveValue('C:/mock/appdata/vault.json');
  // 错误密码 → 解锁失败 toast
  await active.locator('.key__lock .c-input').nth(1).fill('wrong');
  await active.locator('.key__lock .c-btn').click();
  await expect(page.locator('.c-toast--danger')).toContainText('解锁失败');
  // 正确密码解锁
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  await expect(active.locator('.key__row', { hasText: 'GitHub' })).toContainText('alice');
  // 搜索过滤
  await active.locator('.c-search-bar__input').fill('git');
  await expect(active.locator('.key__row')).toHaveCount(1);
  await active.locator('.c-search-bar__input').fill('');
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 标签筛选
  await active.locator('.key__tag', { hasText: 'work' }).click();
  await expect(active.locator('.key__row')).toHaveCount(1);
  await active.locator('.key__tag', { hasText: 'work' }).click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 标签切换后搜索框值与过滤保持（评审 Fix 3：renderAll 重建后保留 query）
  await active.locator('.c-search-bar__input').fill('git');
  await expect(active.locator('.key__row')).toHaveCount(1);
  await active.locator('.key__tag', { hasText: 'work' }).click();
  await expect(active.locator('.c-search-bar__input')).toHaveValue('git');
  await expect(active.locator('.key__row')).toHaveCount(1); // 'git' + tag work → GitHub
  await active.locator('.key__tag', { hasText: 'work' }).click();
  await expect(active.locator('.key__row')).toHaveCount(1); // 仅 'git' 仍过滤 → GitHub
  await active.locator('.c-search-bar__input').fill('');
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 显示密码
  await active.locator('.key__row', { hasText: 'GitHub' }).locator('[data-key-act="reveal"]').click();
  await expect(active.locator('.key__row', { hasText: 'GitHub' })).toContainText('p@ss-w0rd!');
  // 添加条目（生成器 + 保存）
  await active.locator('.key__toolbar-actions .c-btn', { hasText: '添加' }).click();
  await expect(page.locator('.c-dialog')).toBeVisible();
  await expect(page.locator('.key__editor .c-dialog')).toHaveCSS('backdrop-filter', 'none');
  await page.locator('[data-key-field="name"] .c-input').fill('GitLab');
  await page.locator('[data-key-field="username"] .c-input').fill('bob');
  await page.locator('[data-key-field="tags"] .c-input').fill('work, dev');
  await page.locator('[data-key-gen]').click();
  // 生成后输入框转 type=text 预览生成的随机密码（原 type=password 被遮罩无法预览——用户反馈缺陷）
  await expect(page.locator('[data-key-field="password"] .c-input[type="text"]')).toHaveValue('Abc123!xyz789#');
  await page.locator('.c-dialog__footer .c-btn:last-child').click();
  await expect(active.locator('.key__row')).toHaveCount(3);
  await expect(active.locator('.key__row', { hasText: 'GitLab' })).toBeVisible();
  // 编辑
  await active.locator('.key__row', { hasText: 'GitLab' }).locator('[data-key-act="edit"]').click();
  await page.locator('[data-key-field="username"] .c-input').fill('bob2');
  await page.locator('.c-dialog__footer .c-btn:last-child').click();
  await expect(active.locator('.key__row', { hasText: 'GitLab' })).toContainText('bob2');
  // 删除（确认）
  page.once('dialog', (d) => d.accept());
  await active.locator('.key__row', { hasText: 'GitLab' }).locator('[data-key-act="del"]').click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 锁定
  await active.locator('.key__toolbar-actions .c-btn', { hasText: '锁定' }).click();
  await expect(active.locator('.key__lock')).toBeVisible();
});

// 添加条目弹窗在窄窗（960×560，对应桌面主窗）内适配：不高出视口 + 表单区可滚动 + 底部按钮未被裁。
// 回归：.c-dialog 无 max-height 且 body 不滚动时，弹窗 652px 超出 560 视口、保存/取消被裁不可达。
test('密码：添加条目弹窗窄窗适配（不高出视口 + 表单可滚动 + 保存按钮可见）', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 560 });
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await active.locator('.key__toolbar-actions .c-btn', { hasText: '添加' }).click();
  await expect(page.locator('.c-dialog')).toBeVisible();
  await page.waitForTimeout(400); // 等 dialog-in 动画结束再量几何
  const metrics = await page.evaluate(() => {
    const d = document.querySelector('.c-dialog').getBoundingClientRect();
    const body = document.querySelector('.c-dialog__body');
    return {
      fits: d.top >= 0 && d.bottom <= window.innerHeight,
      scrollable: body.scrollHeight > body.clientHeight,
      dialogBottom: Math.round(d.bottom),
      viewportH: window.innerHeight,
    };
  });
  expect(metrics.fits).toBe(true);
  expect(metrics.scrollable).toBe(true);
});

test('密码：锁定屏选择路径按钮填充（mock pick_vault_path）', async ({ page }) => {
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  const pathInput = active.locator('.key__lock .c-input').first();
  await active.locator('[data-key-pick]').click();
  await expect(pathInput).toHaveValue('C:/mock/picked/vault.json');
});

test('密码：创建新保险库模式（空库）', async ({ page }) => {
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await active.locator('.key__mode-btn[data-key-mode="create"]').click();
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await expect(active.locator('.key__list .c-empty')).toBeVisible();
  await expect(active.locator('.key__list .c-empty')).toContainText('暂无条目');
});

test('密码：数据管理导出/导入 + 保险库信息', async ({ page }) => {
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  // 解锁
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  // 切到数据管理目录
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="data"]').click();
  await page.waitForTimeout(400);
  await expect(active.locator('.key__cards')).toBeVisible();
  await expect(active).toContainText('C:/mock/appdata/vault.json'); // 保险库信息路径
  await expect(active).toContainText('2'); // 条目数
  // 选择路径按钮（mock pick_vault_path）填充输入框
  await active.locator('[data-key-pick-export]').click();
  await expect(active.locator('.key__cards .key__field .c-input').first()).toHaveValue('C:/mock/picked/vault.json');
  await active.locator('[data-key-pick-import]').click();
  await expect(active.locator('.key__cards .key__field .c-input').nth(1)).toHaveValue('C:/mock/picked/vault.json');
  // 导出
  await active.locator('.key__cards .key__field .c-input').first().fill('C:/mock/export.json');
  await active.locator('.key__cards .c-btn', { hasText: '导出备份' }).click();
  await expect(page.locator('.c-toast')).toContainText('导出成功');
  // 导入
  await active.locator('.key__cards .key__field .c-input').nth(1).fill('C:/mock/import.json');
  await active.locator('.key__cards .c-btn', { hasText: '导入恢复' }).click();
  await expect(page.locator('.c-toast').filter({ hasText: '导入 1 条' })).toBeVisible();
  await expect(active.locator('.key__cards')).toContainText('3');
});

test('密码：设置记住路径开关 + 清除', async ({ page }) => {
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  // 解锁（设置目录在锁定态不可达——锁定屏优先渲染，需先解锁进入）
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  await page.locator('.app-main__nav-r .c-navwheel__item[data-id="settings"]').click();
  await page.waitForTimeout(400);
  const sw = active.locator('.c-switch');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  // 关掉记住路径
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => localStorage.getItem('pwm.rememberPath'))).toBe('false');
  // 清除记住的路径按钮
  await active.locator('.key__cards .c-btn', { hasText: '清除' }).click();
  await expect(page.locator('.c-toast')).toContainText('已清除');
});

test('密码：对话框点击遮罩（backdrop）关闭', async ({ page }) => {
  await page.addInitScript(installMock());
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  await expect(active.locator('.key__row')).toHaveCount(2);
  // 打开添加对话框
  await active.locator('.key__toolbar-actions .c-btn', { hasText: '添加' }).click();
  await expect(page.locator('.c-dialog')).toBeVisible();
  // 点击面板外暗区（backdrop 左上角，非对话框面板）→ 关闭
  await page.locator('.key__editor .c-dialog__mask').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.c-dialog')).toHaveCount(0);
  await expect(active.locator('.key__row')).toHaveCount(2); // 未保存，列表不变
});

test('密码：条目 id 含引号正常渲染与操作', async ({ page }) => {
  const seed = [
    { id: 'e"x', name: 'Quote', url: 'https://q.example', username: 'u', password: 'pw-secret', notes: null, tags: ['work'], created_at: 0, updated_at: 0 },
  ];
  await page.addInitScript(installMock(seed));
  await page.goto(APP_URL);
  await page.locator('.app-main__nav-l .c-navwheel__item[data-id="key"]').click();
  await page.waitForTimeout(400);
  const active = page.locator('.app-main__page--active');
  await active.locator('.key__lock .c-input').nth(1).fill('master');
  await active.locator('.key__lock .c-btn').click();
  const row = active.locator('.key__row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Quote');
  // data-key-id 属性转义后解析 round-trip 回原值
  await expect(row).toHaveAttribute('data-key-id', 'e"x');
  // 行操作可用：reveal 证明 dataset.keyId → entries.find 查找正常
  await row.locator('[data-key-act="reveal"]').click();
  await expect(row).toContainText('pw-secret');
});
