# Task B3-P0: 概览「主题状态」卡陈旧修复（交接书 §5 P0，用户可见）

## 任务定位

应用壳 B3（设置完善）第一个任务。这是 B2 最终评审 Issue 1（parked）——标题栏三态主题快捷按钮（B2-R9 引入）切换主题后，概览页「主题状态」卡中的「当前主题：深/浅色」文本不更新，用户直接可见。桌面与手机两处都要修。

## 背景与根因（先理解，再动手）

标题栏主题按钮的点击处理链（src/app/app-main.js:143-147）：

```js
themeBtn.addEventListener('click', () => {
  const cur = getConfig().theme;
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length];
  applyConfig(saveConfig({ theme: next }));
});
```

`saveConfig` 内部先写 localStorage、再**同步**触发所有 store 订阅回调（store.js:43 `listeners.forEach((fn) => fn(next))`），然后 `applyConfig` 才写 `document.documentElement.dataset.theme`（apply.js:57）。

当前 app-main.js:159-166 的主题 subscribe 回调：

```js
subscribe(() => {
  updateThemeIcon();
  syncSettingsThemeModes();
  const themeLabel = document.querySelector('.app-main__page[data-page="home"].app-main__page--active .app-main__theme-row span');
  if (themeLabel) themeLabel.textContent = `当前主题：${document.documentElement.dataset.theme === 'dark' ? '深色' : '浅色'}`;
});
```

**Bug**：回调执行时 `data-theme` 还是旧值（applyConfig 还没跑），所以 label 读到旧值、不更新。**此修复无效**，必须改读配置本身。

## 正确修法（唯一需求，逐字执行）

subscribe 回调内改为读 `getConfig().theme` + `prefersDark()` 解析 system（与 app-main.js 已存在的 `updateThemeIcon` 模式一致——`updateThemeIcon` 就只读 `getConfig().theme`）。`getConfig()` 在 saveConfig 内已把新 theme 写进 store，回调同步执行时能读到**新**值。

解析逻辑：

```js
const cfg = getConfig();
const isDark = cfg.theme === 'system' ? prefersDark() : cfg.theme === 'dark';
const label = `当前主题：${isDark ? '深色' : '浅色'}`;
```

需要从 `../config/apply.js` 的 import 里补 `prefersDark`（现有 import 是 `import { applyConfig } from '../config/apply.js';`，apply.js 已导出 `prefersDark`，见 apply.js:4-7）。

## 要改的两处 label（R8 修复只覆盖了桌面，手机未覆盖）

1. **桌面**：`.app-main__page[data-page="home"].app-main__page--active .app-main__theme-row span`（现有选择器保留）
2. **手机**：`.app-main__stack-page[data-stack="overview"] .app-main__theme-row span`（新增，R8 未覆盖）

两处都在同一 subscribe 回调内更新（各用 querySelector + 空值守卫，同现有风格）。桌面守卫 `.app-main__page--active` 保留（仅在概览页激活时更新）；手机卡片无条件更新即可（值始终正确，pop 回概览时即正确）。

## 待修改文件

- `src/app/app-main.js`：import 补 `prefersDark`；subscribe 回调改读 config + 更新两处 label。
- `tests/e2e/app-shell.spec.js`：既有测试 `标题栏快捷主题按钮：三态循环 light→dark→system 且与设置同步`（约 456-490 行）补桌面概览 label 断言。
- `tests/e2e/mobile-nav.spec.js`：新增手机概览 label 断言测试。

## 测试（TDD：先写断言，确认红，再实现，确认绿）

**桌面断言**（app-shell.spec.js 该用例内，插在 light→dark 点击与 data-theme=dark 断言之后、进入设置模式之前）：

```js
// 概览「主题状态」卡同步（P0）：桌面概览页当前主题 label 随切换更新
await expect(page.locator('.app-main__page[data-page="home"] .app-main__theme-row span').first()).toHaveText('当前主题：深色');
```

注意：`.app-main__theme-row span` 匹配 3 个 span（当前主题/色板/强调色），必须 `.first()` 并断言精确文本 `当前主题：深色`（toHaveText 对多元素 locator 会报错）。

**手机断言**（mobile-nav.spec.js，viewport 390×844 已由 `test.use` 设定，加在既有 test.use 块内）：

```js
test('手机形态：概览主题状态卡随主题按钮实时更新', async ({ page }) => {
  await page.goto(APP_URL);
  await expect(page.locator('.app-main__stack-page[data-stack="overview"] .app-main__theme-row span').first()).toHaveText('当前主题：浅色');
  await page.locator('.c-titlebar__control--theme').click(); // light → dark
  await expect(page.locator('.app-main__stack-page[data-stack="overview"] .app-main__theme-row span').first()).toHaveText('当前主题：深色');
});
```

APP_URL 在 mobile-nav.spec.js 顶部已定义为 `'/?mode=app'`。

先跑这两个用例确认红（现实现桌面 label 不更新、手机完全没更新），再实现，复跑确认绿。

## 验证要求

- `npx playwright test tests/e2e/app-shell.spec.js -g "三态循环"`（含新断言）绿
- `npx playwright test tests/e2e/mobile-nav.spec.js`（含新用例）绿，且其余移动用例零冲击
- `npm test`（单元全量）绿 —— 不触碰任何单测，应零影响
- `npm run test:e2e`（全量交互）绿 —— 确认零回归
- `npm run build` 通过
- **无视觉基线变化**（本次改动只改文本同步，不碰布局/渲染；如视觉回归出现差异，报告但勿 update-snapshots）

## 提交

一个 commit，message 示例：`fix: 概览主题状态卡随主题切换实时更新（桌面+手机，闭环 B2 最终评审 Issue 1）`

## 报告

将完整报告写入 `docs/superpowers/sdd/task-B3-P0-report.md`，内容包括：改动说明、测试命令与输出摘要、self-review 结论、提交哈希。回复本会话只需：状态（DONE/DONE_WITH_CONCERNS/BLOCKED）+ 提交哈希 + 一行测试摘要 + 疑虑（如有）。
