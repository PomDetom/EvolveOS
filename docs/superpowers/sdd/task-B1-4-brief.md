# Task B1-4: 模式简化 + docs 渲染删除

**Files:**
- Modify: `src/main.js`（删 docs 分支 + docs 专属 CSS import）
- Modify: `src/app/mode.js`（resolveMode 简化为 app/strip 两态）
- Modify: `tests/unit/mode.test.js`
- Delete: `src/docs/docs-mode.js`
- Delete（docs 专属孤儿，删除 docs-mode.js 后无引用，核对后删）：`src/demo/theme-switcher.js`、`src/demo/token-showcase.js`、`src/scenes/main-window/main-window.js`、`src/scenes/settings-window/settings-window.js`（注意：`settings-pages.js` 是共享模块，**必须保留**——app-main.js 用它）
- 保留（应用壳/B1-1 复用）：`src/demo/component-showcase-full.js`、`src/demo/motion-lab.js`、`src/scenes/clipboard-float/clipboard-float.js`、`src/demo/customizer-panel.js`
- Modify: `tests/e2e/visual-regression.spec.js`（docs 基线删除/改造 + 组件/动效分区基线）
- Modify: `README.md`（模式说明：浏览器直进应用壳，无 docs）

**Interfaces:**
- Consumes: B1-3 迁移后的 e2e（已全部走 `?mode=app`）；B1-1 展示模块已自 import CSS
- Produces: `resolveMode(params, hasTauri)` 只返回 `'app'|'strip'`：显式 `?mode=app|strip` 优先；非法/无参数 → `'app'`（浏览器与 Tauri 一致）；`main.js` 只留 app/strip 动态 import，无 docs 分支

- [ ] **Step 1: 写失败单测**（mode.test.js）

```js
it('无参数浏览器 → app（不再回落 docs）', () => {
  expect(resolveMode(new URLSearchParams(''), false)).toBe('app');
});
it('非法值 → 回落 app', () => {
  expect(resolveMode(new URLSearchParams('?mode=bogus'), false)).toBe('app');
});
it('?mode=docs 不再特殊 → app', () => {
  expect(resolveMode(new URLSearchParams('?mode=docs'), false)).toBe('app');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npm test`
Expected: FAIL（resolveMode 现返回 docs）

- [ ] **Step 3: mode.js 简化**

```js
export function resolveMode(params, hasTauri) {
  const sp = toSearchParams(params);
  const mode = sp?.get('mode') ?? null;
  if (mode === 'app' || mode === 'strip') return mode;
  return 'app'; // 无参数 / 非法 / docs → 一律应用壳
}
```

- [ ] **Step 4: main.js 删除 docs 分支与 docs CSS**

删 `import { mountDocsMode } from './docs/docs-mode.js';`、`else { mountDocsMode(); }` 分支（`mode` 只可能是 app/strip）。**CSS import 分类处理**：
  - **移除**（docs 专属，B1-1 已移入各展示模块或已无宿主）：`demo/token-showcase.css`（令牌展示不保留）、`demo/component-showcase-full.css`（已入 component-showcase-full.js）、`styles/motion-lab.css`（已入 motion-lab.js）、`scenes/main-window.css`（docs 场景删除）、`scenes/clipboard-float.css`（已入 clipboard-float.js）
  - **保留**（应用壳启动即需，勿删）：`scenes/settings-window.css`（`.csettings__*` 在 mountAppMode 内 `renderSettingsPages()` 启动即渲染）、`styles/customizer.css`（外观分区定制器）
  - 若某展示模块 CSS 未自 import，先补入该模块再删 main.js 静态 import。

模式分支收敛为：

```js
if (mode === 'app') {
  import('./app/app-main.js').then(({ mountAppMode }) => mountAppMode(document.querySelector('#app')));
} else {
  import('./app/strip-main.js').then(({ mountStripMode }) => mountStripMode());
}
```

- [ ] **Step 5: 删除 docs 渲染**

`git rm src/docs/docs-mode.js`。核对 build 无引用残留（`git grep docs-mode src/` 应只留注释性提及——app-main.js:88 注释可顺手更新为不再引用 docs-mode）。

- [ ] **Step 6: 视觉基线重构**

`visual-regression.spec.js`：删除 docs 专属 SHOTS（tokens/components/scenes/main-window/settings-window/clipboard 六组 —— 页面已无 docs 宿主）；保留 `['app-main', '.app-main', '/?mode=app']`；新增「组件」「动效」分区基线（进入设置对应分区截图，data-motion=off + animations disabled 稳定化）。删除 docs 专属基线 png（`tests/e2e/visual-regression.spec.js-snapshots/` 下非 app-main 的既有 png）。基线数量以实际 SHOTS 核定并记入报告。

- [ ] **Step 7: 全量回归**

Run: `npm test`（mode 单测绿）+ `npm run test:e2e`（全部迁移用例 + app-shell/floatstrip/mobile-nav 绿）+ `npm run test:visual`（新基线稳定）+ `npm run build`
Expected: 全绿；`git grep -l "mountDocsMode" src/` 无残留（注释性 docs-mode 提及可保留）

- [ ] **Step 8: README 更新**

README 模式说明：浏览器 `/` 直进应用壳（不再 docs）；`?mode=strip` 悬浮条；docs 设计系统展示已收进设置「组件」「动效」分区。

- [ ] **Step 9: 提交**

```bash
git add src/main.js src/app/mode.js tests/unit/mode.test.js tests/e2e/visual-regression.spec.js README.md
git rm src/docs/docs-mode.js
git commit -m "feat: 模式简化（浏览器直进应用壳）+ docs 渲染删除"
```
