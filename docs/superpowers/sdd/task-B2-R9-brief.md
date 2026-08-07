# Task B2-R9: 标题栏深浅按钮三态循环（浅色/深色/跟随系统）+ 与设置同步

（用户反馈：标题栏深浅状态要维护为和设置中的同步，三个状态：系统）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；配置链路经 saveConfig→applyConfig；零运行时依赖；遵循 src/CLAUDE.md。
- 命名保留：`.c-titlebar__control--theme` 类名不变（R8 已建，e2e 依赖）。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## 背景（用户反馈，2026-08-07）

R8 的标题栏深浅按钮当前只在 浅/深 间两态翻转。用户要求：**三态循环（浅色/深色/跟随系统）**，且与设置分区（通用 → 主题三态选择器：浅色/深色/跟随系统）**同步**——同一份 store，任一入口改动另一处 UI 状态随之更新。

## Files

- Modify: `src/app/app-main.js`（深浅按钮三态循环 + 图标三态 + 主题订阅同步设置选择器）
- Modify: `tests/e2e/app-shell.spec.js`（深浅切换用例改三态循环断言）
- Test: 视觉基线（app-main 图标可能随三态变化——仅当按钮初始图标从 sun/moon 改为 monitor 时变；先确认）

## Interfaces

- Consumes: `getConfig`/`saveConfig`/`subscribe`（store.js）；`applyConfig`（apply.js）；`icon(name, size)`；`.c-titlebar__control--theme`（R8）；`.csettings__mode[data-mode]`（settings-pages.js THEME_MODES：浅色/深色/跟随系统）
- Produces: 标题栏按钮三态循环 `light → dark → system → light`；图标 `sun`(浅)/`moon`(深)/`monitor`(系统)；store 主题变更时同步标题栏图标 + 设置分区三态选择器高亮

## 当前状态（R8 落地后实测事实）

- `src/app/app-main.js`（R8 加，约 140-148 行）：
  - `updateThemeIcon`：`resolved = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme`，`themeBtn.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon', 16)`——即把 system 解析成深浅、只显示 sun/moon 两态。
  - 点击 handler：`applyConfig(saveConfig({ theme: resolved === 'dark' ? 'light' : 'dark' }))`——两态翻转。
  - `subscribe(() => updateThemeIcon())`——主题变更同步按钮图标。
- `src/scenes/settings-window/settings-pages.js` THEME_MODES（46-50 行）：`light 浅色 / dark 深色 / system 跟随系统`，图标 `sun/moon/monitor`。点击 handler（216-226 行）更新 `.csettings__mode--active`/aria-pressed。
- 设置分区三态选择器是**预渲染静态 HTML**（renderSettingsPages 一次生成），外部改主题不会自动更新其高亮——需本任务补同步。

## Steps

### Step 1: 写失败 e2e（app-shell.spec.js，改造 R8 的深浅切换用例）

```js
test('标题栏快捷主题按钮：三态循环 light→dark→system 且与设置同步', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.evaluate(() => localStorage.setItem('ui-design-config', JSON.stringify({ theme: 'light' })));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // light → dark
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // dark → system（system 解析为当前系统偏好，断言 data-theme 为 light|dark 之一）
  await page.locator('.c-titlebar__control--theme').click();
  const systemResolved = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(systemResolved);
  // system → light（回到起点）
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "三态循环"`
Expected: FAIL（现两态翻转：light→dark 后第二下回 light，不是 system）

### Step 3: app-main.js 三态循环 + 图标三态

把 R8 的 updateThemeIcon 与点击 handler 改为：

```js
const THEME_CYCLE = ['light', 'dark', 'system'];
const THEME_ICONS = { light: 'sun', dark: 'moon', system: 'monitor' };
const updateThemeIcon = () => {
  themeBtn.innerHTML = icon(THEME_ICONS[getConfig().theme] ?? 'sun', 16);
};
themeBtn.addEventListener('click', () => {
  const cur = getConfig().theme;
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length];
  applyConfig(saveConfig({ theme: next }));
  updateThemeIcon();
});
```
（`THEME_ICONS[getConfig().theme]` 直接显示三态：浅 sun / 深 moon / 系统 monitor；`getConfig().theme` 恒为 light|dark|system 三者之一）

### Step 4: 主题订阅同步设置分区选择器

把 `subscribe(() => updateThemeIcon())` 扩展为同时同步设置分区三态高亮：

```js
// 主题从任何入口变更（标题栏快捷按钮 / 设置分区选择器）都双向同步：
// 标题栏图标 + 设置分区 .csettings__mode 高亮/aria-pressed
const syncSettingsThemeModes = () => {
  const cfg = getConfig();
  document.querySelectorAll('.csettings__mode').forEach((b) => {
    const on = b.dataset.mode === cfg.theme;
    b.classList.toggle('csettings__mode--active', on);
    b.setAttribute('aria-pressed', String(on));
  });
};
subscribe(() => { updateThemeIcon(); syncSettingsThemeModes(); });
```

### Step 5: 运行绿

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "三态循环"` → PASS

### Step 6: 全量回归 + 基线检查

Run: `npm run test:e2e`（含新三态用例 + R8 遮罩守卫 + 其余零冲击）+ `npm test` + `npm run build`；视觉基线：标题栏按钮初始图标——R8 默认 light 初始显示 sun（未变），若三态图标改造后初始仍 sun 则基线零变化；若 monitor/其他则重生成 app-main 6 张（解码比对确认差异=按钮图标）。
Expected: 全绿；基线优先期望零漂移（默认 light 初始图标不变）

### Step 7: 提交

```bash
git add src/app/app-main.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 标题栏主题按钮三态循环（浅/深/跟随系统）+ 与设置分区双向同步"
```
