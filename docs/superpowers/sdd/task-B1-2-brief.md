# Task B1-2: 窗口控制双通道（浏览器降级）

**Files:**
- Modify: `src/demo/window-controls.js`（浏览器无 Tauri API 时降级绑定）
- Modify: `src/app/app-main.js`（若需区分降级态）
- Modify: `tests/e2e/app-shell.spec.js`（新用例）

**Interfaces:**
- Consumes: `bindWindowControls(api?)`（现有：Tauri 探测注入，浏览器返回 false 不绑定）；`toast(message, { variant, duration })`（toast.js，全局右下角提示，`.c-toast`）
- Produces: `bindWindowControls` 浏览器分支——三按钮 click → `toast('此功能在桌面端生效')`；拖拽区浏览器给轻量视觉反馈；返回 `'browser'` 标记降级态

- [ ] **Step 1: 写失败 e2e**（app-shell.spec.js，浏览器 /?mode=app）

```js
test('浏览器模式下窗口控制按钮点击给出桌面端提示', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--close').click();
  await expect(page.locator('.c-toast')).toContainText('桌面端');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "浏览器模式"`
Expected: FAIL（close 点击无 toast）

- [ ] **Step 3: window-controls.js 浏览器降级**

`bindWindowControls` 在 `if (!win) return false;` 后补浏览器分支：遍历 `.c-titlebar__control`，min/max/close 各绑定 click → `toast('此功能在桌面端生效', { variant: 'info' })`，返回 `'browser'`。注意 `toast` 从 `../components/toast/toast.js` import（现有依赖）。拖拽区（`.c-titlebar__drag`）浏览器内 pointer 拖动给视觉反馈（如 `:active` 类/轻微缩放，只动 transform/opacity）。

- [ ] **Step 4: 运行回归**

Run: `npm run test:e2e`（新用例绿 + 其余零冲击，Tauri 路径不受影响）+ `npm test` + `npm run build`
Expected: 全绿

- [ ] **Step 5: 提交**

```bash
git add src/demo/window-controls.js src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "feat: 窗口控制浏览器降级通道（按钮保留 + 桌面端提示）"
```
