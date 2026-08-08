# Task B4-6 执行报告：独立悬浮窗 —— strip 窗口行为

- 任务：B4-6（B4 桌面真实化第 6 个、即最后一个任务）
- 状态：DONE（评审前修正：窗口模式旋转后内容常隐 bug 已修复，见「八、Fix Note」）
- 提交：`7b3e5a7`（feat，评审前 amend 含修复；brief 与 docs 留痕按 repo 惯例随评审后提交）
- 日期：2026-08-08

## 一、变更总览

strip 窗口**窗口内**行为落地：铺满窗口 + 系统拖拽移动窗口 + 尺寸贴合内容 + 位置持久化/恢复 + X 关闭窗口。**浏览器 strip 模式（无 `__TAURI__`）行为零变化**（`windowMode` 默认 `false`，`onResize` 默认 noop，既有调用点向后兼容）。

| 文件 | 变更 |
|---|---|
| `src/components/float-strip/float-strip.js` | `mountFloatStrip` 签名加 `windowMode = false, onResize = () => {}`；`startDrag` 顶部加窗口模式分支（系统拖拽，不跟踪指针/不磁吸）；`toggleOrientation` setTimeout 末尾加窗口模式分支（`onResize()` 后 return，跳过 `setPos`） |
| `src/app/strip-main.js` | `mountStripMode` 加 Tauri 分支：`root.classList.add('strip-root--window')` + 位置恢复（`localStorage` `ui-design-strip-pos`）→ `setPosition`；尺寸贴合 `fit()`（初始 + 旋转 `onResize`）；`onMoved` 去抖 200ms → `outerPosition` → 写回 `localStorage`；`mountFloatStrip(root, { windowMode: true, onResize: fit, onClose: () => win.close() })`；无 `__TAURI__` 走既有 else |
| `src/components/float-strip/float-strip.css` | 追加 `.strip-root--window .c-strip { position: static; right: auto; bottom: auto; max-width: none; max-height: none; }`（铺满窗口，去底右 dock） |
| `tests/e2e/floatstrip.spec.js` | 末尾追加 e2e「strip 窗口：拖动走系统拖拽、旋转贴合尺寸、位置持久化、X 关闭窗口」（brief 逐字 + 1 处 hover 适配，见第三节） |

配置链路、动画红线、capability（B4-1/B4-5 已含 strip 窗口权限）均零触碰。

## 二、TDD 执行记录

### 1. e2e 先红 → 实现 → 绿

写 e2e（brief 逐字）后 `npx playwright test tests/e2e/floatstrip.spec.js -g "strip 窗口"`：

```
Error: expect(received).toContainEqual(...) // deep equality
Expected value: ["setPosition", {"x": 120, "y": 80}]
Received array: []
```

红符合预期（现 strip 模式无 Tauri 分支，`__stripWinCalls__` 空）。实现三文件后复跑：

```
Error: waiting for element to be visible, enabled and stable
  - <div data-orientation="horizontal" class="c-strip c-strip--horizontal">…</div> intercepts pointer events
```

旋转 `.click()` 超时 —— `.c-strip__ctrl` 常态 `pointer-events: none`（hover 才 `auto`，既有行为），brief 逐字用例未先 hover。加 hover（既有用例同模式）后复跑：

```
1 passed (2.8s)
```

（dev 服务已在 5173 运行，Playwright `reuseExistingServer` 复用。）

### 2. 浏览器 strip 模式回归

`npx playwright test tests/e2e/floatstrip.spec.js`（全量）：

```
7 passed (8.3s)
```

含「渲染」「旋转切换」「四边磁吸」「hover 浮现」「双击旋转」「app 壳 FloatBall 演示」—— 浏览器路径零回归（`position: static` 仅作用于 `.strip-root--window`；`windowMode=false` 路径行为不变）。

### 3. 全量回归

```
npm test            → 11 files / 57 tests passed（3.08s）
npm run test:e2e    → 103 passed（4.1m，含视觉基线 24/24 零漂移）
npm run build       → ✓ built in 423ms
```

视觉基线 **24/24 零漂移**：strip 窗口不在视觉基线集合内；`.strip-root--window` CSS 仅当该 class 出现（仅 Tauri 分支添加）时生效，浏览器基线截图不触发。未跑 `--update-snapshots`。

## 三、Mock 注入兼容性确认

`addInitScript` 注入 mock `__TAURI__`：`getCurrentWindow` 提供 `startDragging`/`setSize`/`setPosition`/`outerPosition`/`onMoved`/`close`（均返回 Promise，`.catch?.()`/`.then()` 链路可用，记录进 `__stripWinCalls__`），并预置 `localStorage` `ui-design-strip-pos`。`mountStripMode` 的 `window.__TAURI__?.window?.getCurrentWindow?.()` 探测命中 mock → 走窗口分支；`.strip-root--window` class 添加、`setPosition` 恢复、`fit()` 初始 `setSize`、`onMoved` → `outerPosition` → localStorage 更新、拖动 → `startDragging`、旋转 → `setSize`、X → `close` 全链路断言通过。

## 四、偏差修正（verbatim 适配）

1. **e2e 加 hover**：brief 逐字用例在 `.c-strip__rotate`/`.c-strip__close` 前未 hover，而 `.c-strip__ctrl` 常态 `pointer-events: none`（既有 CSS），Playwright `.click()` 需元素可接收事件 → 逐字跑会 30s 超时。本文件既有用例（旋转切换等）一律先 `strip.hover()` 再点控制条。**真实 Tauri 窗口 = 内容尺寸，指针恒在 strip 上 → hover 恒成立**，故 hover 是浏览器侧忠实建模。在旋转点击前补 `await strip.hover(); await page.waitForTimeout(SETTLE_MS);`（与既有用例同模式），行为断言不变。
2. **brief 文件未纳入 feat 提交**：按本次执行指令（仅 stage 4 个改动文件，排除 `src-tauri/Cargo.toml` 行尾噪声与 untracked brief），feat 提交仅含代码 + 测试；brief 与报告按 repo 惯例随 docs 留痕提交。

## 五、Concerns（评审前已处理）

1. **窗口模式旋转后内容常隐（真机预判）**：~~brief 逐字代码 `if (windowMode) { onResize(); return; }` 位于 `setPos` 前，`return` 会跳过其后的 `strip.classList.remove('c-strip--rotating')` 与 `onStateChange`，真实 Tauri 窗口旋转后内容永久隐藏。~~ 经评审指示，已修复（见「八、Fix Note」），本节不再成立。
2. **真机验证留白（项目既定口径）**：拖动系统拖拽、尺寸贴合、位置持久化为真实 Tauri 行为，本项目规范「不做 webview 真机验证」——已由 mock e2e 覆盖调用链，桌面内实际手感由用户自行测试。

## 六、自评（self-review）

- **规格符合**：需求 1-4 逐字落地（`windowMode`/`onResize` 选项、startDrag 分支、toggleOrientation 分支、strip-main Tauri 分支、CSS 铺满规则、e2e）；`mountFloatStrip` 浏览器路径默认 `false`/noop 向后兼容（app-main FloatBall 与 strip-main else 调用点零改动零回归）。
- **质量**：与既有 `window.__TAURI__?.window?.getCurrentWindow?.()` 探测模式一致；位置存档损坏 try/catch 忽略；去抖 200ms 防高频写 localStorage；`fit()` 以 `Math.ceil` + `Math.max(1,…)` 防零尺寸。
- **测试**：单测 57/57、e2e 103/103（含视觉 24/24 零漂移）、build 通过。
- **遗留**：无（评审前 concern 1 已修复，见「八、Fix Note」）。

## 七、提交记录

- `7b3e5a7` `feat: strip 窗口行为（系统拖拽/尺寸贴合/位置持久化/关闭，B4-6）`（4 files，+90/-3；评审前 amend 含 Fix Note 修复）
- docs 提交（本报告 + 简报 + 台账 progress-b4.md，随评审后留痕）

## 八、Fix Note（评审前修正，2026-08-08）

**问题**：brief 逐字代码 `if (windowMode) { onResize(); return; }` 在 `toggleOrientation` 的 setTimeout 中提前 `return`，跳过 `strip.classList.remove('c-strip--rotating')`（内容 `opacity:0` 淡入恢复）与 `onStateChange`。真实 Tauri 窗口旋转后 strip 内容将永久隐藏；且与 brief 括注「`onStateChange` 照常回调 orientation」相矛盾。

**修复**（评审指示的最小修正）：仅 `setPos` vs `onResize` 的决策进入分支，class 移除与 `onStateChange` 两模式恒执行：

```js
if (windowMode) { onResize(); } else { setPos(x, y); }
strip.classList.remove('c-strip--rotating');
onStateChange({ orientation, snapped: strip.dataset.snapped || null });
```

浏览器模式（`windowMode=false`）走 `else { setPos(x, y); }`，后续两条与原始代码逐字一致——**浏览器路径行为零变化**（按构造等价）。

**回归**：

```
npx playwright test tests/e2e/floatstrip.spec.js   → 7 passed（9.1s，含 strip 窗口用例 + 浏览器 6 例）
npm test                                          → 11 files / 57 tests passed（3.04s）
npm run build                                     → ✓ built in 442ms
```

提交已 amend：`1df5f19` → `7b3e5a7`（同 4 文件，+90/-3）。
