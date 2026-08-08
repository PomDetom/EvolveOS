# Task B4F-2 简报 — closeBehavior 配置 + 设置「通用」分区选择器

- **计划**：docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md（唯一实施需求源）
- **规格**：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源，§4.3）
- **Branch**：worktree-b4-close-sizing
- **任务定位**：B4 收尾修复第二个任务。为「主窗关闭行为可配置」（退出应用 / 保留后台）铺配置层 + 设置页 UI。后续 B4F-3（Rust 消费 cfg.closeBehavior）、B4F-4（JS 同步 Rust）依赖本任务产出的 `cfg.closeBehavior`。

## 背景

主窗关闭行为需可配置：`exit` = 点主窗关闭直接退出整个应用；`background` = 主窗隐藏、应用常驻、strip 悬浮窗继续工作。本任务只做**配置链路 + 设置页选择器**（defaults → store → apply），Rust 侧消费在 B4F-3。

## Files

- Modify: `src/config/defaults.js`（DEFAULTS 加 `closeBehavior: 'exit'`）
- Modify: `src/scenes/settings-window/settings-pages.js`（通用分区加「关闭主窗口时」两态选择器 + 接线）
- Modify: `src/app/app-main.js`（**控制器裁定修复**：`syncSettingsThemeModes` 主题同步循环收敛到 `[data-mode]` 按钮 —— 见下方「控制器裁定」）
- Test: `tests/e2e/app-shell.spec.js`（新用例）

## Interfaces

- Produces: `cfg.closeBehavior: 'exit' | 'background'`（defaults 默认 `'exit'`）；设置页 `.csettings__modes[data-close-behavior-group]` 两态选择器 + `[data-close-behavior]` 按钮 —— Task B4F-3/4 消费 `cfg.closeBehavior` 与 Rust 同步

## 控制器裁定（用户批准，本任务必须执行）

**Pre-flight 冲突 ②**：settings-pages.js 主题三态 click handler 与 app-main.js `syncSettingsThemeModes` 均用 `querySelectorAll('.csettings__mode')` 按 `b.dataset.mode === next.theme` 清 active；本任务新增的 close-behavior 按钮同用 `.csettings__mode` 类 → 主题变更/任何 subscribe 会把 close-behavior 按钮 active 高亮误清。

**修法（两处）**：主题同步循环选择器加 `[data-mode]` 限定，只作用于主题按钮：
- `src/scenes/settings-window/settings-pages.js` 主题三态 click handler 内 `root.querySelectorAll('.csettings__mode')` → `root.querySelectorAll('.csettings__mode[data-mode]')`
- `src/app/app-main.js` `syncSettingsThemeModes` 内 `document.querySelectorAll('.csettings__mode')` → `document.querySelectorAll('.csettings__mode[data-mode]')`

close-behavior 按钮自身的高亮管理用独立 `[data-close-behavior-group]`/`[data-close-behavior]` 选择器（下述 Step 4），不受主题循环影响。

## Step 1: 写失败 e2e（app-shell.spec.js 追加）

```js
test('通用分区：关闭主窗口时选择器存在且可切换（写 store）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(0).click(); // 通用
  const group = page.locator('[data-close-behavior-group]');
  await expect(group).toBeVisible();
  await expect(group.locator('.csettings__mode')).toHaveCount(2);
  // 默认 exit 高亮
  await expect(group.locator('[data-close-behavior="exit"]')).toHaveClass(/csettings__mode--active/);
  await group.locator('[data-close-behavior="background"]').click();
  const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem('ui-design-config')).closeBehavior);
  expect(cfg).toBe('background');
});
```

> 注：e2e 里 `.app-main__nav-r .c-navwheel__item` 第 0 项为「通用」（APP_SECTIONS[0]）。**不可用 `hasText`**（nav-wheel 纯图标，栏内文字隐藏——见 src/CLAUDE.md 常见坑）。若有元素选择障碍，用 `[data-id="general"]` 定位。

## Step 2: 运行确认红

`npx playwright test tests/e2e/app-shell.spec.js -g "关闭主窗口时"`
Expected: FAIL（`[data-close-behavior-group]` 不存在）

## Step 3: defaults.js 加 closeBehavior

`DEFAULTS` 末尾追加：

```js
  closeBehavior: 'exit', // 主窗关闭：exit=退出应用 / background=保留后台（悬浮窗常驻）
```

## Step 4: settings-pages.js 通用分区加选择器

文件顶部加常量：

```js
const CLOSE_BEHAVIORS = [
  { id: 'exit', label: '退出应用' },
  { id: 'background', label: '保留后台' },
];
```

`generalPage()` 主题字段后追加：

```js
    <div class="csettings__field">
      <span class="csettings__field-label">关闭主窗口时</span>
      <p class="csettings__field-desc">点主窗关闭按钮：退出整个应用，或隐藏到后台保留悬浮窗</p>
      <div class="csettings__modes csettings__modes--close" data-close-behavior-group role="group" aria-label="关闭行为">
        ${CLOSE_BEHAVIORS.map((b) => `
          <button type="button" class="csettings__mode${cfg.closeBehavior === b.id ? ' csettings__mode--active' : ''}"
            data-close-behavior="${b.id}" aria-pressed="${cfg.closeBehavior === b.id}">${b.label}</button>`).join('')}
      </div>
    </div>
```

`mountSettingsInteractions(root)` 内（主题三态 handler 之后）加接线：

```js
  // 关闭主窗口时（B4 收尾）：两态选择器 → store
  root.querySelector('[data-close-behavior-group]')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-close-behavior]');
    if (!btn) return;
    const next = saveConfig({ closeBehavior: btn.dataset.closeBehavior });
    applyConfig(next);
    root.querySelectorAll('[data-close-behavior]').forEach((b) => {
      const on = b.dataset.closeBehavior === next.closeBehavior;
      b.classList.toggle('csettings__mode--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });
```

> 注意：用 `[data-close-behavior-group]` 独立选择器，避免与主题 `.csettings__modes`（`querySelector('.csettings__modes')` 取首个）冲突。close-behavior 按钮 class 复用 `.csettings__mode`（样式复用），但主题循环已按控制器裁定收敛到 `[data-mode]`，互不干扰。

## Step 5: 控制器裁定修复（两处主题循环收敛 [data-mode]）

见上「控制器裁定」——把 settings-pages.js 与 app-main.js 两处主题同步循环的选择器从 `.csettings__mode` 改为 `.csettings__mode[data-mode]`。此为防误清 close-behavior 高亮的必要修复，随本任务提交。

## Step 6: e2e 红→绿

`npx playwright test tests/e2e/app-shell.spec.js -g "关闭主窗口时"` → 红 → 实现 → 绿；再跑全文件零回归

## Step 7: 全量回归 + 提交

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿

```bash
git add src/config/defaults.js src/scenes/settings-window/settings-pages.js src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "feat: 主窗关闭行为可配置（closeBehavior 退出应用/保留后台，通用分区选择器，B4 收尾）"
```

> 注：本任务 commit 含 app-main.js 的主题循环收敛修复（控制器裁定），git add 清单已含该文件。

## 全局约束（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量（本任务 saveConfig/applyConfig 链路即此）。
- 零运行时依赖；组件无抽象封装；遵循 src/CLAUDE.md 风格。
- 禁止升级核心依赖。
- 视觉基线零漂移（本任务不改变浏览器路径渲染；若漂移先解码比对再 update-snapshots）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。
- 提交前检查 `git status`/`git diff --stat`，防 Cargo.toml 等被构建触碰文件的行尾噪声混入提交。
