# Task B2-R8: 导航栏顶部割裂修复（遮罩改内容遮罩）+ 标题栏快捷深浅切换按钮

（用户反馈：两个导航栏顶部背景与整体割裂、不完整，web/桌面都有；加一个设置按钮左边的深浅切换快捷按钮）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（背景/遮罩静态、blur 不动画、过渡只走 color/background 豁免 + transform/opacity）；配置链路经 saveConfig→applyConfig。
- 零运行时依赖；遵循 src/CLAUDE.md。
- 视觉基线会变（导航栏顶部遮罩机制变化 + 标题栏新增按钮，app-main 6 + components-partition 6 预期）→ 确认差异由本次改动引起后 `--update-snapshots`。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## 背景（控制器诊断，2026-08-07）

用户反馈「两个导航栏的顶部背景和整体割裂」。控制器像素采样实证：标题栏背景 235,239,252，导航栏顶部（`.c-navwheel__mask` 遮罩带内）242,245,249——明显更亮更白。根因：`.c-navwheel__mask` 是 `linear-gradient(var(--glass-bg), transparent)` 的**叠加渐变层**，`--glass-bg` 为 48% 半透明 → 叠在导航栏自己 48% 背景上 = 顶部 48px 双倍着色，把模糊后的背景洗白，形成与标题栏割裂的色带（R6 降透明度后更明显）。

**修法**：把「叠加渐变遮罩」换成 **CSS mask-image 内容遮罩**——淡出滚动内容但不叠加颜色层，彻底消除色带。用户同时要求：标题栏设置按钮左边加快捷深浅切换按钮。

## Files

- Modify: `src/components/navigation-wheel/nav-wheel.js`（删除遮罩 div 插入）
- Modify: `src/components/navigation-wheel/nav-wheel.css`（删叠加遮罩规则，改 mask-image 内容遮罩）
- Modify: `src/app/app-main.css`（删 app-shell 遮罩位置覆盖死规则）
- Modify: `src/components/title-bar/title-bar.js`（renderTitleBar 加 themeToggle 选项 + 按钮）
- Modify: `src/app/app-main.js`（模板传 themeToggle:true + 接线切换主题 + 图标随主题）
- Modify: `tests/e2e/app-shell.spec.js`（深浅切换快捷按钮用例）
- Test: 视觉基线重生成（app-main 6 + components-partition 6）

## Interfaces

- Consumes: `renderTitleBar({ title, iconName, settings, themeToggle })`（title-bar.js）；`saveConfig`/`getConfig`（store.js）；`applyConfig`/`prefersDark`（apply.js）；`icon(name, size)`；`mountTitleBar(root)`（app-main.js 调用）
- Produces: 竖向 nav-wheel 列表 `mask-image` 内容遮罩（顶部 48px + 底部 48px 淡出，无叠加色带）；`.c-titlebar__control--theme` 快捷按钮（设置按钮左边，点击切换深浅，图标随当前主题 sun/moon）

## Part A: 导航栏顶部割裂修复（遮罩 → 内容遮罩）

### Step 1: 写失败 e2e（app-shell.spec.js，遮罩不带色带的守卫）

```js
test('导航栏顶部无叠加遮罩色带（内容遮罩）', async ({ page }) => {
  await page.goto('/?mode=app');
  // 顶部遮罩不再是叠加渐变层（.c-navwheel__mask 元素不存在）
  await expect(page.locator('.c-navwheel__mask')).toHaveCount(0);
  // 竖向列表有 mask-image 内容遮罩
  const maskImg = await page.locator('.app-main__nav-l .c-navwheel__list').evaluate((el) => getComputedStyle(el).maskImage);
  expect(maskImg).toContain('linear-gradient');
});
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "顶部无叠加遮罩"`
Expected: FAIL（`.c-navwheel__mask` 存在、mask-image 为 none）

### Step 3: nav-wheel.js 删遮罩插入

删除 36-41 行（`.c-navwheel__mask` 两 div 的 `insertAdjacentHTML` 块 + holder 查找逻辑）。竖向/横向都不再插入遮罩元素。

### Step 4: nav-wheel.css 删叠加遮罩规则 + 加 mask-image

删除：
- `.c-navwheel__mask` 与 `.c-navwheel__mask--bottom` 的 gradient 规则（约 79-83 行）
- `:root[data-glass="off"] .c-navwheel__mask` 与 `--bottom` 规则（约 84-87 行）

新增（竖向列表内容遮罩，顶部 48px + 底部 48px 淡出；横向 dock 不加）：
```css
.c-navwheel__list:not(.c-navwheel__list--horizontal) {
  -webkit-mask-image: linear-gradient(transparent, black 48px, black calc(100% - 48px), transparent);
  mask-image: linear-gradient(transparent, black 48px, black calc(100% - 48px), transparent);
}
```
> 说明：mask-image 淡出的是列表内容（滚动项），不叠加颜色层 → 无双倍着色带。竖向列表底部 48px 淡出与原底部遮罩（app-shell 底 0 / 默认底 56px 对应列表底 48px）位置一致。横向 dock 无竖向遮罩需求，不加。

### Step 5: app-main.css 删遮罩位置覆盖死规则

删除 `.app-main__nav-l .c-navwheel__mask--bottom { bottom: 0 }`（30 行）与 `.app-main__nav-r .c-navwheel__mask--bottom { bottom: 0 }`（53 行）——遮罩元素已删除，这些覆盖成为死规则。

### Step 6: 运行绿（A 部分）

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "顶部无叠加遮罩"` → PASS

## Part B: 标题栏快捷深浅切换按钮

### Step 7: title-bar.js 加 themeToggle 选项

`renderTitleBar({ title, iconName, settings, themeToggle = false })`——controls 区设置按钮之前加（settings 可选已存在）：
```js
${themeToggle ? `<button class="c-titlebar__control c-titlebar__control--theme" aria-label="切换深浅主题" title="切换深浅主题">${icon('sun', 16)}</button>` : ''}
```
默认 false → 其他调用方（如未来 strip）逐字节不变。

### Step 8: 写失败 e2e（app-shell.spec.js，深浅切换）

```js
test('标题栏快捷深浅切换按钮：点击翻转 data-theme', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.evaluate(() => localStorage.setItem('ui-design-config', JSON.stringify({ theme: 'light' })));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.c-titlebar__control--theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
```

### Step 9: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "深浅切换"`
Expected: FAIL（`.c-titlebar__control--theme` 不存在）

### Step 10: app-main.js 接线

模板 `renderTitleBar({ title: '概览', iconName: 'box', settings: true })` 加 `themeToggle: true`。

挂载后（settingsBtn 之后）加：
```js
const themeBtn = appMain.querySelector('.c-titlebar__control--theme');
const updateThemeIcon = () => {
  const cfg = getConfig();
  const resolved = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme;
  themeBtn.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon', 16);
};
updateThemeIcon();
themeBtn.addEventListener('click', () => {
  const cfg = getConfig();
  const resolved = cfg.theme === 'system' ? (prefersDark() ? 'dark' : 'light') : cfg.theme;
  applyConfig(saveConfig({ theme: resolved === 'dark' ? 'light' : 'dark' }));
  updateThemeIcon();
});
// 主题从设置分区等源变更时同步图标
const themeUnsub = subscribe(() => updateThemeIcon());
```
> 图标语义：当前深色显示 sun（点切浅），当前浅色显示 moon（点切深）。`saveConfig`/`getConfig`（store.js）、`applyConfig`/`prefersDark`（apply.js）、`subscribe`（store.js）均已在 app-main.js 顶部 import——核对现有 import，缺的补上。`themeUnsub` 桌面常驻订阅无需退订（应用壳单次挂载）；若有移动端重建路径需注意，但标题栏为桌面专属，移动端不重建标题栏。

### Step 11: 运行绿（B 部分）

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "深浅切换"` → PASS

## 收尾

### Step 12: 全量回归 + 基线重生成

Run: `npm run test:e2e`（含两个新用例 + 其余零冲击：mobile-nav/app-shell 点击路径不依赖遮罩元素，nav-wheel 滚轮吸附不依赖遮罩）+ `npm test` + `npm run build`；视觉基线 `--update-snapshots`（app-main 6——标题栏按钮 + 导航栏顶部色带消除；components-partition 6——nav-wheel 演示实例遮罩机制变化；motion-partition 6 应零漂移）。若 no-op，删对应快照强制重生成。
Expected: 全绿

### Step 13: 提交

```bash
git add src/components/navigation-wheel/nav-wheel.js src/components/navigation-wheel/nav-wheel.css src/app/app-main.css src/components/title-bar/title-bar.js src/app/app-main.js tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: 导航栏遮罩改内容遮罩（消除顶部色带）+ 标题栏快捷深浅切换按钮"
```
