# Task B1-1: 设置分区扩展（组件/动效分区 + 展示内容内化）

**Files:**
- Modify: `src/scenes/settings-window/settings-pages.js`（新增 APP_SECTIONS + pageBody 分支，SECTIONS 保持 8）
- Modify: `src/app/app-main.js`（设置轮/ctx/手机 tabs 统一切 APP_SECTIONS + 分区惰性挂载）
- Modify: `src/demo/component-showcase-full.js`、`src/demo/motion-lab.js`、`src/scenes/clipboard-float/clipboard-float.js`（自身 import 各自 CSS）
- Modify: `tests/e2e/app-shell.spec.js`（新用例）
- Create: `src/app/partitions.css`（分区内布局/间距，局部类名）

**Interfaces:**
- Consumes: `mountComponentsShowcase(root)`（component-showcase-full.js，现写 `<h2>组件</h2>` + 6 组矩阵）、`mountMotionLab(root)`（motion-lab.js，5 演示卡 + 试玩器）、`mountClipboardFloat(root)`（clipboard-float.js，悬浮窗组合示例）
- Produces: **`SECTIONS`（共享 8 分区）保持不变**——docs 设置场景 `settings-window.js` 与 `scene-settings.spec`（断言 count 8）零冲击；settings-pages.js 新增导出 **`APP_SECTIONS` = `[...SECTIONS, { id:'components', name:'组件', icon:'box' }, { id:'motion', name:'动效', icon:'sparkles' }]`** 供应用壳用；`pageBody` 增加 `components`/`motion` 分支返回含 `.app-partition` 容器的 HTML（场景不渲染这两 id，分支为应用壳专用）；`app-main.js` 设置轮改用 `APP_SECTIONS`，在 `setSettingsPageActive` 惰性 `import()` 各展示模块挂载

- [ ] **Step 1: 写失败 e2e**（app-shell.spec.js）

```js
test('设置分区包含组件/动效且挂载展示内容', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  // 10 分区（共享 8 + 组件 + 动效 —— 应用壳专用 APP_SECTIONS）
  await expect(page.locator('.app-main__nav-r .c-navwheel__item')).toHaveCount(10);
  // 组件分区：点击「组件」→ 内容区出现组件矩阵组（6 组）
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(2).click(); // APP_SECTIONS 序：通用0/外观1/组件2/动效3
  await expect(page.locator('.app-main__settings [data-page="components"] .csg')).toHaveCount(6);
  // 动效分区
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(3).click();
  await expect(page.locator('.app-main__settings [data-page="motion"] .ml-grid')).toBeVisible();
  await expect(page.locator('.app-main__settings [data-page="motion"] .ml-card')).toHaveCount(5);
});
```

  注：nth 索引以 `APP_SECTIONS` 实际顺序为准（通用/外观/组件/动效/界面/…），实现时核对。

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js`
Expected: FAIL（10 分区断言收到 8；组件/动效分区无内容）

- [ ] **Step 3: settings-pages.js 新增 APP_SECTIONS + pageBody 分支（SECTIONS 保持 8 不动）**

```js
// 应用壳专用：共享 8 分区 + 组件/动效（docs 设置场景仍用 SECTIONS，count 8 不变）
export const APP_SECTIONS = [
  ...SECTIONS,
  { id: 'components', name: '组件', icon: 'box' },
  { id: 'motion', name: '动效', icon: 'sparkles' },
];
```

`pageBody` 增加分支（场景不渲染这两 id，仅应用壳触发）：

```js
case 'components': return `<div class="app-partition" data-partition="components"></div>`;
case 'motion':     return `<div class="app-partition" data-partition="motion"></div>`;
```

  核对 `settings-window.js` 仍用 `SECTIONS`（8 分区，scene-settings.spec count 8 回归绿）。

- [ ] **Step 4: app-main.js 切换 APP_SECTIONS + 分区惰性挂载**

`app-main.js` import 改 `import { APP_SECTIONS, renderSettingsPages, mountSettingsInteractions } from '../scenes/settings-window/settings-pages.js';`。**app-main.js 内全部 `SECTIONS` 引用统一切 `APP_SECTIONS`**（设置轮 line 157、桌面 ctx 查找 line 215、手机设置 tabs line 341-342、手机 ctx 查找 line 415）——保证组件/动效分区在桌面右窗轮和手机设置 tabs 都出现。

在 `setSettingsPageActive`（~app-main.js:194-200，现外观分区 custMounted 惰性挂载处）扩展：`components`/`motion` 分区首次激活时动态 `import()` 对应展示模块并挂到 `[data-partition=...]`，模块级 `partitionMounted` 标志防重复（与 `custMounted` 同模式）。手机路径 `renderSettingsMobile`（~line 341）同样在 `components`/`motion` tab 激活时惰性挂载（动态 import + 标志，与桌面共用模块级标志即可——两路径共享同一 `.csettings__page[data-page=components/motion]` DOM，仅首次激活挂载一次）：

```js
if (id === 'components' && !componentsMounted) {
  const { mountComponentsShowcase } = await import('../demo/component-showcase-full.js');
  mountComponentsShowcase(sec.querySelector('[data-partition="components"]'));
  componentsMounted = true;
}
if (id === 'motion' && !motionMounted) {
  const { mountMotionLab } = await import('../demo/motion-lab.js');
  mountMotionLab(sec.querySelector('[data-partition="motion"]'));
  motionMounted = true;
}
```

  `setSettingsPageActive` 若现为同步函数需改 async（或动态 import 后 .then 挂载，保持同步签名）。手机路径如为独立函数，同样处理同步/异步签名。

- [ ] **Step 5: 展示模块自身 import CSS（解耦 docs）**

- `component-showcase-full.js` 顶部加 `import './component-showcase-full.css';`
- `motion-lab.js` 顶部加 `import '../../styles/motion-lab.css';`
- `clipboard-float.js` 顶部加 `import './clipboard-float.css';`
- `settings-pages.js` 顶部确认已 import 所需 CSS（.csettings__ 样式来自 settings-window.css——由调用方或自身引入，保证 app 分区渲染样式完整）

- [ ] **Step 6: 组件分区挂剪贴板悬浮窗组合示例**

`components` 分区激活时在分区容器末尾追加一个「组合示例：剪贴板悬浮窗」小节并挂 `mountClipboardFloat`（复用既有场景模块；隔离局部类名避免计数冲突）。若 e2e 步骤 1 未断言此示例，加一条 `toContainText('剪贴板悬浮窗')` 或 `.cfloat` 可见断言。

- [ ] **Step 7: 运行回归**

Run: `npm run test:e2e`（app-shell 新用例绿 + docs 84 零冲击）+ `npm test` + `npm run build`
Expected: 全绿（docs 模式未动，仍有 8 分区；app 模式 10 分区）

- [ ] **Step 8: 提交**

```bash
git add src/scenes/settings-window/settings-pages.js src/app/app-main.js src/app/partitions.css src/demo/component-showcase-full.js src/demo/motion-lab.js src/scenes/clipboard-float/clipboard-float.js tests/e2e/app-shell.spec.js
git commit -m "feat: 设置分区扩展（组件/动效分区 + 展示内容内化）"
```
