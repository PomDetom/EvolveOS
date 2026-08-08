# Task B4-5: 独立悬浮窗 —— 主窗创建 strip 窗口

## 任务定位

应用壳 B4 第五个任务。B4 功能 2 前半：主窗 FloatBall 在 **Tauri 环境**点击时，用 JS `WebviewWindow` 创建独立透明置顶小窗（label `'strip'`，加载 `?mode=strip`），替代现状窗口内 strip 演示。**浏览器环境行为不变**（仍走窗口内 strip）。B4-6 在此基础上实现 strip 窗口自身行为（拖动/贴合/位置持久化/关闭）。

## 现状关键文件

- `src/app/app-main.js`：`mountAppMode` 内 `mountFloatBall(ballHost, { onExpand: ... })`（约 697-714 行）——浏览器分支创建窗口内 strip（`if (stripHost) return;` + `stripHost = document.createElement('div')`...）
- `src-tauri/capabilities/default.json`：`windows: ["main"]`，permissions 已含 B4-1 的 7 项 `core:window:allow-*`
- `tests/unit/window-capabilities.test.js`：B4-1 建的单测守卫

## 需求（唯一需求源，逐字执行）

**1. capabilities/default.json**：
- `windows` 改 `["main", "strip"]`
- `permissions` 追加 4 项：

```json
    "core:webview:allow-create-webview-window",
    "core:window:allow-set-position",
    "core:window:allow-outer-position",
    "core:window:allow-set-size"
```

**2. window-capabilities.test.js** 追加 it：

```js
it('授权 strip 悬浮窗（创建 + 自定位/自缩放）', () => {
  expect(caps.windows).toContain('strip');
  const required = [
    'core:webview:allow-create-webview-window',
    'core:window:allow-set-position',
    'core:window:allow-outer-position',
    'core:window:allow-set-size',
  ];
  for (const p of required) expect(caps.permissions).toContain(p);
});
```

**3. app-main.js**：在 `mountAppMode` 顶部（ballHost 声明附近）加模块变量：

```js
let stripWindow = null; // B4-5：Tauri 独立 strip 窗口句柄（销毁后置空，重开可再建）
```

`mountFloatBall(ballHost, { onExpand: ... })` 的 onExpand 顶部加 Tauri 分支（现有窗口内 strip 逻辑保留在 else）：

```js
onExpand: () => {
  // Tauri：创建/聚焦独立 strip 窗口（B4-5）；浏览器：窗口内 strip 演示（既有）
  if (typeof window.__TAURI__ !== 'undefined') {
    const { WebviewWindow } = window.__TAURI__.window;
    if (stripWindow) { stripWindow.setFocus(); return; }
    stripWindow = new WebviewWindow('strip', {
      url: '/?mode=strip',
      width: 320,
      height: 64,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      resizable: false,
    });
    stripWindow.once('tauri://destroyed', () => { stripWindow = null; });
    return;
  }
  if (stripHost) return;
  // ...既有窗口内 strip 逻辑不变...
},
```

**4. app-shell.spec.js 末尾追加 e2e**（mock `__TAURI__` 注入 `WebviewWindow` 记录调用）：

```js
test('Tauri：FloatBall 展开创建独立 strip 窗口（透明置顶）', async ({ page }) => {
  await page.addInitScript(() => {
    const created = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        WebviewWindow: class {
          constructor(label, opts) { created.push({ label, opts }); }
          setFocus() {} once() {}
        },
      },
    };
    window.__stripWinCalls__ = created;
  });
  await page.goto('/?mode=app');
  await page.locator('.app-main__float-ball').click();
  const calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toHaveLength(1);
  expect(calls[0].label).toBe('strip');
  expect(calls[0].opts.transparent).toBe(true);
  expect(calls[0].opts.decorations).toBe(false);
  expect(calls[0].opts.alwaysOnTop).toBe(true);
  expect(calls[0].opts.url).toContain('mode=strip');
});
```

## 流程（TDD）

1. 先追加单测 it → `npx vitest run tests/unit/window-capabilities.test.js` 确认红（windows 无 strip / 权限缺）→ 改 capability → 绿
2. 写 e2e → `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip 窗口"` 确认红（现 FloatBall 走窗口内 strip，`__stripWinCalls__` 空）→ 改 app-main.js → 绿
3. 浏览器分支回归：`npx playwright test tests/e2e/floatstrip.spec.js` 全绿（无 `__TAURI__` → 仍走窗口内 strip）
4. 全量回归：`npm test` + `npm run test:e2e` + `npm run build`（视觉 24 应零漂移——本任务不改渲染；若漂移报告勿 update-snapshots）

## 注意

- `data-tauri` 属性检测（app-main 既有 `typeof window.__TAURI__ !== 'undefined'`）与 onExpand 分支同一模式。
- mock `__TAURI__` 注入后，`bindWindowControls` 也会探测 getCurrentWindow（mock 提供 minimize/toggleMaximize/isMaximized/close → no-op），正常。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

## 提交

一个 commit：`feat: 主窗 FloatBall 创建独立 strip 窗口（透明置顶，B4-5）`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B4-5-report.md`。回复本会话只需：状态 + 提交哈希 + 一行测试摘要 + 疑虑（如有）。
