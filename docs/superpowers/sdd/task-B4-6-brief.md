# Task B4-6: 独立悬浮窗 —— strip 窗口行为（拖动/贴合/位置持久化/关闭）

## 任务定位

应用壳 B4 第六个（最后）任务。B4 功能 2 后半：B4-5 已让主窗创建独立 strip 窗口（label `'strip'` 加载 `?mode=strip`）；本任务实现 **strip 窗口内** 的行为——铺满窗口 + 系统拖拽移动窗口 + 尺寸贴合内容 + 位置持久化 + X 关闭窗口。**浏览器 strip 模式（无 `__TAURI__`）行为必须零变化**。

## 现状关键文件

- `src/components/float-strip/float-strip.js`：`mountFloatStrip(root, { onStateChange, onClose })`——内部 `startDrag`（transform 窗口内拖拽 + 磁吸）、`toggleOrientation`（交叉淡入淡出 + `setPos`）、close 按钮 → onClose
- `src/app/strip-main.js`：`mountStripMode()`——body 级渲染 `.strip-root` + `mountFloatStrip(root, { onClose: () => root.remove() })`
- `src/components/float-strip/float-strip.css`：`.c-strip` position:fixed 底右 dock

## 需求（唯一需求源，逐字执行）

**1. float-strip.js `mountFloatStrip` 加 `windowMode`/`onResize` 选项**：

签名改 `export function mountFloatStrip(root, { onStateChange = () => {}, onClose, windowMode = false, onResize = () => {} } = {})`。改动两处：

`startDrag` 顶部加窗口模式分支（窗口模式：系统拖拽移动窗口，不跟踪指针/不磁吸）：

```js
function startDrag(e) {
  if (e.button !== 0) return;
  if (windowMode) {
    window.__TAURI__?.window?.getCurrentWindow?.()?.startDragging?.().catch?.(() => {});
    return;
  }
  // ...既有 transform 拖拽逻辑不变...
}
```

`toggleOrientation` 的 setTimeout 末尾（现 `setPos(x, y)` 之后）加窗口模式分支：

```js
if (windowMode) { onResize(); return; }
setPos(x, y);
```

（窗口模式跳过 `setPos`/`applySnapped`——窗口模型下无窗口内磁吸；`onStateChange` 照常回调 orientation。）

**2. strip-main.js `mountStripMode` 加 Tauri 分支**：

```js
export function mountStripMode() {
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: renderTokenMonitor({
      value: '97.2%',
      status: 'ok',
      trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
    }),
  });
  document.body.appendChild(root);
  const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
  if (win) {
    // —— Tauri 独立窗口（B4-6）：铺满窗口 + 系统拖拽 + 尺寸贴合 + 位置持久化 ——
    root.classList.add('strip-root--window');
    const strip = root.querySelector('.c-strip');
    const STORAGE_KEY = 'ui-design-strip-pos';
    // 位置恢复
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (Number.isFinite(x) && Number.isFinite(y)) win.setPosition({ x, y }).catch(() => {});
      }
    } catch { /* 损坏存档忽略 */ }
    // 尺寸贴合内容（初始 + 旋转）
    const fit = () => {
      const r = strip.getBoundingClientRect();
      win.setSize({ width: Math.max(1, Math.ceil(r.width)), height: Math.max(1, Math.ceil(r.height)) }).catch(() => {});
    };
    fit();
    // 位置持久化（去抖 200ms）
    let saveTimer = null;
    win.onMoved?.(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        win.outerPosition?.().then(({ x, y }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
        }).catch(() => {});
      }, 200);
    });
    mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.close().catch(() => {}) });
  } else {
    mountFloatStrip(root, { onClose: () => root.remove() });
  }
}
```

**3. float-strip.css 追加铺满规则**：

```css
/* B4-6：独立窗口模式 —— strip 铺满窗口（窗口尺寸=内容），去掉底右 dock 定位 */
.strip-root--window .c-strip {
  position: static; right: auto; bottom: auto;
  max-width: none; max-height: none;
}
```

**4. floatstrip.spec.js 追加 e2e**（mock `__TAURI__` 记录 strip 窗口调用）：

```js
test('strip 窗口：拖动走系统拖拽、旋转贴合尺寸、位置持久化、X 关闭窗口', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    window.__TAURI__ = { window: { getCurrentWindow: () => ({
      startDragging: () => { calls.push('startDragging'); return Promise.resolve(); },
      setSize: (s) => { calls.push(['setSize', s]); return Promise.resolve(); },
      setPosition: (p) => { calls.push(['setPosition', p]); return Promise.resolve(); },
      outerPosition: () => { calls.push('outerPosition'); return Promise.resolve({ x: 300, y: 200 }); },
      onMoved: (fn) => { window.__stripMovedFn__ = fn; return Promise.resolve(() => {}); },
      close: () => { calls.push('close'); return Promise.resolve(); },
    }) } };
    window.__stripWinCalls__ = calls;
    localStorage.setItem('ui-design-strip-pos', JSON.stringify({ x: 120, y: 80 }));
  });
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip')).toBeVisible();
  // 位置恢复：setPosition 被调用且为存档值
  let calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContainEqual(['setPosition', { x: 120, y: 80 }]);
  // 位置保存：触发 onMoved → outerPosition → localStorage 更新为 300/200
  await page.evaluate(() => window.__stripMovedFn__());
  await page.waitForTimeout(350); // 去抖 200ms
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ui-design-strip-pos')));
  expect(saved).toEqual({ x: 300, y: 200 });
  // 拖动 → startDragging（不跟踪指针/不磁吸）
  await page.locator('.c-strip__drag').dispatchEvent('pointerdown', { button: 0, pointerId: 1 });
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('startDragging');
  // 旋转 → setSize 贴合
  const before = calls.filter((c) => c[0] === 'setSize').length;
  await page.locator('.c-strip__rotate').click();
  await page.waitForTimeout(300); // 交叉淡入淡出 240ms
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls.filter((c) => c[0] === 'setSize').length).toBeGreaterThan(before);
  // X 关闭 → close
  await page.locator('.c-strip__close').click();
  calls = await page.evaluate(() => window.__stripWinCalls__);
  expect(calls).toContain('close');
});
```

## 流程（TDD）

1. 写 e2e 新用例 → `npx playwright test tests/e2e/floatstrip.spec.js -g "strip 窗口"` 确认红（现 strip 模式走窗口内行为，无 window 调用）
2. 改 float-strip.js + strip-main.js + float-strip.css → 复跑 e2e 绿
3. 浏览器 strip 模式回归：`npx playwright test tests/e2e/floatstrip.spec.js` 全绿（`position: static` 只作用于 `.strip-root--window`；`mountFloatStrip` 浏览器路径 windowMode=false 行为不变）
4. 全量回归：`npm test` + `npm run test:e2e` + `npm run build`（视觉 24 应零漂移——strip 窗口不在视觉基线内；若漂移报告勿 update-snapshots）

## 注意

- 动画红线：`toggleOrientation` 交叉淡入淡出只动 transform/opacity（既有逻辑不动）。
- 浏览器路径 `mountFloatStrip(root, { onClose })` 调用点（strip-main else + app-main FloatBall）签名向后兼容（新选项默认 false/空函数）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

## 提交

一个 commit：`feat: strip 窗口行为（系统拖拽/尺寸贴合/位置持久化/关闭，B4-6）`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B4-6-report.md`。回复本会话只需：状态 + 提交哈希 + 一行测试摘要 + 疑虑（如有）。
