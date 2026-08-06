# Task B1-3: docs e2e 迁移（分区内验证 + 删除无宿主用例）

**Files:**
- Modify: `tests/e2e/components-basic.spec.js`、`tests/e2e/form-controls.spec.js`、`tests/e2e/data-display.spec.js`、`tests/e2e/float-components.spec.js`、`tests/e2e/overlays.spec.js`、`tests/e2e/motion-lab.spec.js`、`tests/e2e/token-showcase.spec.js`、`tests/e2e/tokens.spec.js`、`tests/e2e/customizer.spec.js`、`tests/e2e/theme-switcher.spec.js`、`tests/e2e/title-bar.spec.js`、`tests/e2e/nav-wheel.spec.js`、`tests/e2e/layout.spec.js`、`tests/e2e/scene-clipboard.spec.js`、`tests/e2e/scene-main-window.spec.js`、`tests/e2e/scene-settings.spec.js`、`tests/e2e/smoke.spec.js`
- Create: `tests/e2e/helpers.js`（进入应用壳设置分区的前置 helper）

**Interfaces:**
- Consumes: 应用壳 `?mode=app` + ⚙ 进入设置 + 分区轮点击（B1-1 产物：APP_SECTIONS 10 分区，组件=8、动效=9、外观=1）
- Produces: 迁移后的 e2e 全部基于 `?mode=app` 设置分区，不依赖 docs 页；`helpers.js` 导出 `openSettingsPartition(page, index)`（goto app → 点 ⚙ → 点第 index 个分区项）

- [ ] **Step 1: 建 helpers.js**

```js
import { expect } from '@playwright/test';
export async function openSettingsPartition(page, index) {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(index).click();
  await expect(page.locator('.csettings__page--active')).toBeVisible();
}
```

- [ ] **Step 2: 迁移组件矩阵类用例到「组件」分区**

`components-basic.spec.js` / `form-controls.spec.js` / `data-display.spec.js` / `float-components.spec.js` / `overlays.spec.js`：把 `goto('/')` 换成 `openSettingsPartition(page, 8)`（组件分区 index，B1-1 实测 APP_SECTIONS 组件=8），选择器保持 `.csg`/`.c-*`（组件矩阵内容不变）。逐文件运行确认绿。

- [ ] **Step 3: 迁移动效/令牌/定制器/主题类用例**

- `motion-lab.spec.js` → `openSettingsPartition(page, 9)`（动效分区，B1-1 实测 index=9）
- `token-showcase.spec.js` / `tokens.spec.js` → `openSettingsPartition(page, 1)`（外观分区；令牌展示内容已融外观——若外观分区当前不含令牌预览，则这两文件改为断言外观分区定制器存在或**删除**，报告说明取舍）
- `customizer.spec.js` → `openSettingsPartition(page, 1)`（外观分区）
- `theme-switcher.spec.js` → 删除（docs 顶栏主题切换器，应用壳内主题在设置通用分区，其行为由 app-shell 设置用例覆盖）

- [ ] **Step 4: 处理导航/布局/场景类用例**

- `nav-wheel.spec.js` → `openSettingsPartition(page, 8)`（组件分区矩阵内导航轮实例）或删除（矩阵演示轮行为已被 app-shell/floatstrip 覆盖，取其一，报告说明）
- `title-bar.spec.js` → `openSettingsPartition(page, 8)`（组件分区标题栏变体）——注意 B1-2 已改此文件的 bindWindowControls 返回值断言，迁移时保留该断言（在 app 分区标题栏变体上验证）
- `layout.spec.js` → 删除（docs 顶栏/折叠布局，无应用壳宿主）
- `scene-clipboard.spec.js` → `openSettingsPartition(page, 8)` 后断言组件分区内剪贴板悬浮窗组合示例（B1-1 已挂 `.cfloat`）
- `scene-main-window.spec.js` / `scene-settings.spec.js` → 删除（场景模板不单列，主窗口/设置页即应用壳本身，行为由 app-shell 用例覆盖）

- [ ] **Step 5: smoke.spec.js 迁移**

`goto('/')` → `goto('/?mode=app')`，断言应用壳骨架（`.app-main` 可见）而非 docs 页。

- [ ] **Step 6: 全量回归**

Run: `npm run test:e2e`（全部迁移用例绿）+ `npm test` + `npm run build`
Expected: 全绿（此任务结束时 docs 模式仍存在，但 docs 专属 e2e 已不再引用它）

- [ ] **Step 7: 提交**

```bash
git add tests/e2e/ tests/e2e/helpers.js
git commit -m "test: docs e2e 迁移至应用壳设置分区（组件/动效/外观）"
```
