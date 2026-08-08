# 应用壳 B4 收尾修复实施计划（悬浮窗尺寸贴合 + 主窗关闭可配置）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复两个桌面真机问题——① 竖排悬浮窗底部被窗口裁掉（DPI 尺寸语义）；② 主窗关闭卡死 bug，并把主窗关闭行为做成可配置（退出应用 / 保留后台）。**本计划由下一轮对话执行（交接产物）。**

**Architecture:** ① `fit()` 用显式 `LogicalSize`（CSS px = 逻辑 px），尺寸计算抽纯函数 `computeFitSize` 可单测；② 主窗关闭逻辑从脆弱的 JS `onCloseRequested`（异步关 strip 卡死）移到 **Rust `on_window_event`**（`exit` → `app.exit(0)` / `background` → `prevent_close`+`hide`），行为经 Rust `AppState` + `set_close_behavior` command 由 JS 配置同步；`closeBehavior` 进 defaults + 设置「通用」分区选择器；后台模式靠 strip「恢复主窗」按钮唤回。

**Tech Stack:** Vite + 原生 JS + Vitest + Playwright + Tauri 2.11（现有；零运行时依赖；Rust 侧新增 AppState + command + on_window_event）。

## Global Constraints

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 src/CLAUDE.md 风格。
- 禁止升级核心依赖。
- 视觉基线零漂移（本迭代不改变浏览器路径渲染；若漂移先解码比对再 update-snapshots）。
- 每任务 TDD（先红后绿）、独立评审、修复循环（≤5 轮）；留痕入 `docs/superpowers/sdd/progress-b4-fix.md`。
- **每任务结束时 `npm test` + `npm run test:e2e` + `npm run build` 全绿**（Rust 任务加 `cargo check`）。
- 规格：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。

---

### Task B4F-1: 悬浮窗尺寸贴合（LogicalSize + computeFitSize + 诊断）

**Files:**
- Modify: `src/app/strip-main.js`（`computeFitSize` 纯函数 + `fit()` 用 LogicalSize + 诊断 log）
- Test: `tests/unit/strip-sizing.test.js`（新建）

**Interfaces:**
- Produces: `export function computeFitSize(rect) => { width, height }`（ceil + 至少 1px，纯函数可单测）—— 后续任务不依赖，独立交付

- [ ] **Step 1: 写失败单测**（tests/unit/strip-sizing.test.js）

```js
import { describe, it, expect } from 'vitest';
import { computeFitSize } from '../../src/app/strip-main.js';

describe('computeFitSize（B4 收尾：悬浮窗尺寸贴合）', () => {
  it('ceil 到整数 + 至少 1px', () => {
    expect(computeFitSize({ width: 212.3, height: 34.7 })).toEqual({ width: 213, height: 35 });
    expect(computeFitSize({ width: 0, height: 0 })).toEqual({ width: 1, height: 1 });
    expect(computeFitSize({ width: 48, height: 48 })).toEqual({ width: 48, height: 48 });
  });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx vitest run tests/unit/strip-sizing.test.js`
Expected: FAIL（`computeFitSize` 未导出/不存在）

- [ ] **Step 3: strip-main.js 加 computeFitSize 纯函数**

在 `mountStripMode` 前（模块顶部）导出：

```js
/** 悬浮窗窗口尺寸（纯函数，可单测）：CSS 像素 → {width,height}（ceil + 至少 1px） */
export function computeFitSize(rect) {
  return {
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height)),
  };
}
```

- [ ] **Step 4: fit() 用 LogicalSize + 诊断 log**

`fit` 改为（关键：显式 LogicalSize，规避 `{width,height}` 普通对象在非 100% DPI 下被当物理像素、窗口小于内容 → 底部被裁）：

```js
    const fit = () => {
      const r = strip.getBoundingClientRect();
      const { LogicalSize } = window.__TAURI__.window;
      const size = computeFitSize(r);
      win.setSize(new LogicalSize(size.width, size.height)).catch(() => {});
      // 诊断（B4 收尾）：确认窗口尺寸与内容一致 + DPI 缩放
      win.outerSize?.().then((os) => {
        win.scaleFactor?.().then((sf) => {
          console.log('[strip] fit', JSON.stringify(size), 'outer', JSON.stringify(os), 'scaleFactor', sf);
        }).catch(() => {});
      }).catch(() => {});
    };
```

- [ ] **Step 5: 单测确认绿**

Run: `npx vitest run tests/unit/strip-sizing.test.js`
Expected: PASS

- [ ] **Step 6: 更新 B4-6 e2e mock（提供 LogicalSize）**

`tests/e2e/floatstrip.spec.js` 的 strip 窗口 e2e mock，`window.__TAURI__.window` 追加：

```js
      LogicalSize: class { constructor(width, height) { this.width = width; this.height = height; } },
```

（现有断言按 setSize 调用次数计数，不受对象类型影响。）

- [ ] **Step 7: 全量回归 + 提交**

Run: `npx playwright test tests/e2e/floatstrip.spec.js` → 全绿；`npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿（视觉 24 零漂移——浏览器路径渲染不变）

```bash
git add src/app/strip-main.js tests/unit/strip-sizing.test.js tests/e2e/floatstrip.spec.js
git commit -m "fix: 悬浮窗尺寸用显式 LogicalSize 贴合内容（DPI 下底部不再被裁）+ computeFitSize 单测（B4 收尾）"
```

> 桌面验证：`npm run tauri:dev` 后 log 应显示 outer≈strip box、scaleFactor 与系统一致；竖排底部不再被裁。

---

### Task B4F-2: closeBehavior 配置 + 设置「通用」分区选择器

**Files:**
- Modify: `src/config/defaults.js`（DEFAULTS 加 `closeBehavior: 'exit'`）
- Modify: `src/scenes/settings-window/settings-pages.js`（通用分区加「关闭主窗口时」两态选择器 + 接线）
- Test: `tests/e2e/app-shell.spec.js`（新用例）

**Interfaces:**
- Produces: `cfg.closeBehavior: 'exit' | 'background'`（defaults 默认 `'exit'`）；设置页 `.csettings__modes[data-close-behavior-group]` 两态选择器 + `[data-close-behavior]` 按钮 —— Task B4F-3/4 消费 `cfg.closeBehavior` 与 Rust 同步

- [ ] **Step 1: 写失败 e2e**（app-shell.spec.js）

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

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "关闭主窗口时"`
Expected: FAIL（`[data-close-behavior-group]` 不存在）

- [ ] **Step 3: defaults.js 加 closeBehavior**

`DEFAULTS` 末尾追加：

```js
  closeBehavior: 'exit', // 主窗关闭：exit=退出应用 / background=保留后台（悬浮窗常驻）
```

- [ ] **Step 4: settings-pages.js 通用分区加选择器**

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

> 注意：用 `[data-close-behavior-group]` 独立选择器，避免与主题 `.csettings__modes`（`querySelector('.csettings__modes')` 取首个）冲突。

- [ ] **Step 5: e2e 红→绿**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "关闭主窗口时"` → 红 → 实现 → 绿；再跑全文件零回归

- [ ] **Step 6: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿

```bash
git add src/config/defaults.js src/scenes/settings-window/settings-pages.js tests/e2e/app-shell.spec.js
git commit -m "feat: 主窗关闭行为可配置（closeBehavior 退出应用/保留后台，通用分区选择器，B4 收尾）"
```

---

### Task B4F-3: Rust 关闭行为（AppState + set_close_behavior + on_window_event）

**Files:**
- Modify: `src-tauri/src/lib.rs`（AppState + command + on_window_event + state.manage）

**Interfaces:**
- Consumes: Task B4F-2 的 `cfg.closeBehavior`（'exit' | 'background'）
- Produces: Rust `AppState { close_behavior: Mutex<String> }` + `#[tauri::command] set_close_behavior(state, behavior)` + 主窗 `CloseRequested` 处理（exit → `app.exit(0)`；background → `prevent_close`+`hide`）—— Task B4F-4 的 JS `core.invoke('set_close_behavior', ...)` 消费

- [ ] **Step 1: 写 Rust 实现**（src-tauri/src/lib.rs）

完整替换 `lib.rs`：

```rust
use tauri::Manager;
use std::sync::Mutex;

// 主窗关闭行为（B4 收尾）：JS 配置经 set_close_behavior 同步；on_window_event 消费
pub struct AppState {
    pub close_behavior: Mutex<String>,
}

#[tauri::command]
fn set_close_behavior(state: tauri::State<'_, AppState>, behavior: String) {
    *state.close_behavior.lock().unwrap() = behavior;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState { close_behavior: Mutex::new("exit".into()) })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_close_behavior])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let behavior = window
                        .app_handle()
                        .state::<AppState>()
                        .close_behavior
                        .lock()
                        .unwrap()
                        .clone();
                    if behavior == "background" {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        // exit：整个应用退出（含 strip 悬浮窗）——不依赖 JS 异步关窗
                        window.app_handle().exit(0);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: cargo check 确认编译**

Run: `cargo check`（在 `src-tauri/` 目录）
Expected: 编译通过，无错误。若工具链不可用，记录并说明（不阻塞，Rust 改动由桌面 `tauri dev` 最终验证）

- [ ] **Step 3: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`（JS 侧零改动，应全绿）
Expected: 全绿

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: 主窗关闭行为 Rust 侧（exit→app.exit / background→prevent_close+hide，set_close_behavior 命令，B4 收尾）"
```

> 桌面验证：`tauri dev` 编译通过；主窗关闭走 Rust 处理（不卡死）。

---

### Task B4F-4: JS 同步与清理（移除脆弱 onCloseRequested handler + set_close_behavior 同步）

**Files:**
- Modify: `src/app/app-main.js`（移除 JS `onCloseRequested` 关 strip handler；加 `syncCloseBehavior` 并在挂载/配置变更时调用）
- Modify: `tests/e2e/app-shell.spec.js`（更新 strip e2e：移除主窗关闭连带关 strip 断言，改断言 set_close_behavior 同步）

**Interfaces:**
- Consumes: Task B4F-3 的 Rust `set_close_behavior` command（经 `window.__TAURI__.core.invoke`）；Task B4F-2 的 `cfg.closeBehavior`
- Produces: 移除 app-main 的 JS `onCloseRequested` handler（当前「主窗关不掉」bug 根源）；`syncCloseBehavior(cfg)` 在挂载 + 每次配置变更时 invoke Rust —— 后续任务不依赖

- [ ] **Step 1: 更新 e2e**（app-shell.spec.js 的 `Tauri：FloatBall 展开显示/聚焦独立 strip 窗口` 用例）

mock 改（`getCurrentWindow` 去掉 onCloseRequested 存储、`getAllWindows` strip 去掉 close；加 `core.invoke` 记录；移除 `__mainCloseFn__` 触发断言）：

```js
test('Tauri：FloatBall 展开显示/聚焦独立 strip 窗口；配置同步 set_close_behavior', async ({ page }) => {
  await page.addInitScript(() => {
    const shown = [];
    const invokes = [];
    window.__TAURI__ = {
      window: {
        getCurrentWindow: () => ({ minimize() {}, toggleMaximize() {}, isMaximized() { return Promise.resolve(false); }, close() {} }),
        getAllWindows: () => Promise.resolve([{
          label: 'strip',
          show: () => { shown.push('show'); return Promise.resolve(); },
          setFocus: () => { shown.push('setFocus'); return Promise.resolve(); },
        }]),
      },
      core: { invoke: (cmd, args) => { invokes.push({ cmd, args }); return Promise.resolve(); } },
    };
    window.__stripShown__ = shown;
    window.__stripInvokes__ = invokes;
  });
  await page.goto('/?mode=app');
  await page.locator('.app-main__float-ball').click();
  const shown = await page.evaluate(() => window.__stripShown__);
  expect(shown).toContain('show');
  expect(shown).toContain('setFocus');
  // 配置同步到 Rust（默认 exit）
  const invokes = await page.evaluate(() => window.__stripInvokes__);
  expect(invokes).toContainEqual({ cmd: 'set_close_behavior', args: { behavior: 'exit' } });
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip"`
Expected: FAIL（现 JS 仍含 onCloseRequested，invoke 未调用 → `invokes` 空）

- [ ] **Step 3: app-main.js 移除 onCloseRequested handler + 加 syncCloseBehavior**

删除现有 `onCloseRequested` 块（`mountAppMode` 末尾，约 740 行）：

```js
  // 主窗关闭 → 连带关闭 strip 悬浮窗...（整块删除）
```

在 `mountAppMode` 末尾（FloatBall 之后）加：

```js
  // 主窗关闭行为同步到 Rust（B4 收尾）：exit/background 由 Rust on_window_event 消费；
  //   移除 JS onCloseRequested 异步关 strip 的脆弱逻辑（曾导致主窗关不掉）
  const syncCloseBehavior = (cfg) => {
    if (typeof window.__TAURI__ === 'undefined') return;
    window.__TAURI__.core?.invoke?.('set_close_behavior', { behavior: cfg.closeBehavior ?? 'exit' }).catch(() => {});
  };
  syncCloseBehavior(getConfig());
  subscribe((cfg) => { syncCloseBehavior(cfg); });
```

> 注：`subscribe((cfg) => syncCloseBehavior(cfg))` 每次配置变更同步；与既有主题 subscribe 并存（各自闭包，无冲突）。

- [ ] **Step 4: e2e 红→绿**

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip"` → 绿；再跑全文件零回归

- [ ] **Step 5: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿

```bash
git add src/app/app-main.js tests/e2e/app-shell.spec.js
git commit -m "fix: 移除 JS onCloseRequested 异步关 strip（主窗关不掉根因），配置经 set_close_behavior 同步 Rust（B4 收尾）"
```

---

### Task B4F-5: strip 悬浮窗「恢复主窗」按钮（后台模式出路）

**Files:**
- Modify: `src/components/float-strip/float-strip.js`（`renderFloatStrip` 加 `showRestore` 选项 → 控制条最前渲染恢复主窗按钮）
- Modify: `src/app/strip-main.js`（Tauri 分支渲染 `showRestore: true` + 接线恢复按钮 → main show+setFocus）
- Test: `tests/e2e/floatstrip.spec.js`（新用例）

**Interfaces:**
- Consumes: Task B4F-2 的 `closeBehavior: 'background'`（后台模式下用户靠此按钮唤回主窗）；`getAllWindows()`（既有）
- Produces: `.c-strip__restore` 按钮（`showRestore` 为真才渲染，浏览器演示零冲击）—— 独立交付

- [ ] **Step 1: 写失败 e2e**（floatstrip.spec.js）

```js
test('strip 窗口：恢复主窗按钮 → main show+setFocus', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    window.__TAURI__ = { window: {
      getCurrentWindow: () => ({
        setSize: () => Promise.resolve(), setPosition: () => Promise.resolve(),
        onMoved: () => Promise.resolve(() => {}), hide: () => Promise.resolve(),
      }),
      getAllWindows: () => Promise.resolve([{
        label: 'main',
        show: () => { calls.push('main.show'); return Promise.resolve(); },
        setFocus: () => { calls.push('main.setFocus'); return Promise.resolve(); },
      }]),
    } };
    window.__restoreCalls__ = calls;
  });
  await page.goto('/?mode=strip');
  await expect(page.locator('.c-strip__restore')).toBeVisible();
  await page.locator('.c-strip').hover();
  await page.waitForTimeout(300);
  await page.locator('.c-strip__restore').click();
  const calls = await page.evaluate(() => window.__restoreCalls__);
  expect(calls).toContain('main.show');
  expect(calls).toContain('main.setFocus');
});
```

- [ ] **Step 2: 运行确认红**

Run: `npx playwright test tests/e2e/floatstrip.spec.js -g "恢复主窗"`
Expected: FAIL（`.c-strip__restore` 不存在）

- [ ] **Step 3: renderFloatStrip 加 showRestore 选项**

`renderFloatStrip`（float-strip.js）签名改 `{ content = '', showRestore = false }`，控制条 ctrl 内（rotate 按钮前）加：

```js
      ${showRestore ? `<button class="c-strip__restore" type="button" title="恢复主窗" aria-label="恢复主窗">${icon('layout', 14)}</button>` : ''}
```

- [ ] **Step 4: strip-main.js 渲染 + 接线**

`mountStripMode` 改为先探测 win 再渲染（Tauri 分支传 `showRestore: true`）：

```js
export function mountStripMode() {
  applyConfig(getConfig()); // 独立 strip 窗口跟随保存的主题/强调色（Fix 3）
  const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
  const root = document.createElement('div');
  root.className = 'strip-root';
  root.innerHTML = renderFloatStrip({
    content: renderTokenMonitor({
      value: '97.2%',
      status: 'ok',
      trend: [0.3, 0.45, 0.5, 0.62, 0.7, 0.78, 0.9],
    }),
    showRestore: !!win, // 仅 Tauri 独立窗口渲染「恢复主窗」按钮
  });
  document.body.appendChild(root);
  // ...既有 win 探测分支不变（root/win 已提前）；恢复按钮接线：
  const restoreBtn = root.querySelector('.c-strip__restore');
  restoreBtn?.addEventListener('click', () => {
    window.__TAURI__.window.getAllWindows()
      .then((wins) => {
        const main = wins.find((w) => w.label === 'main');
        if (main) { main.show().catch(() => {}); main.setFocus().catch(() => {}); }
      })
      .catch(() => {});
  });
```

> 注：`const win = ...` 提前到渲染前（原在渲染后），`if (win)` 分支逻辑不变；浏览器 `?mode=strip`（无 `__TAURI__`）`win` 为 null → `showRestore:false` → 无恢复按钮，既有 floatstrip 浏览器用例零冲击。

- [ ] **Step 5: e2e 红→绿**

Run: `npx playwright test tests/e2e/floatstrip.spec.js -g "恢复主窗"` → 绿；再跑全文件零回归

- [ ] **Step 6: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿（视觉 24 零漂移——浏览器路径无恢复按钮）

```bash
git add src/components/float-strip/float-strip.js src/app/strip-main.js tests/e2e/floatstrip.spec.js
git commit -m "feat: strip 悬浮窗恢复主窗按钮（后台模式下唤回主窗，B4 收尾）"
```

---

## 执行交接指引（给实施会话）

1. **起点**：在 `fix/b4-strip-open` 分支（含悬浮窗历轮修复）上叠加本计划，或自 main 检出新分支再 cherry-pick 历轮修复；规格 `docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md`（唯一需求源），本计划书为唯一实施需求源。
2. **流程**：superpowers:subagent-driven-development —— 每任务简报（`task-brief` 脚本只匹配 `Task <数字>`，本计划用 `Task B4F-N` 需手动写 brief）→ 派发（B4F-1 机械 haiku / B4F-2,4,5 集成 sonnet / B4F-3 Rust 用标准或更强模型）→ 报告 → 审查包 → 评审 → 修复循环 → 账本 `docs/superpowers/sdd/progress-b4-fix.md` 留痕。
3. **铁律**：禁止并行派发实施子代理；控制器不改码；每任务必须有独立评审；测试仅在 Web 环境执行；**每任务结束全量回归绿**。
4. **已知风险/注意**：
   - B4F-1：真实 DPI 语义需桌面 log 确认（`fit outer vs strip box vs scaleFactor`）；若日志显示 size 已匹配但仍裁 → 转向 `resizable:false` 阻塞 setSize / 子像素假设。
   - B4F-3：Rust 改动不可 web 测试——`cargo check` 验证编译，桌面 `tauri dev` 最终验证；`window.app_handle()` 需 `use tauri::Manager`；主窗 label 默认 `"main"`。
   - B4F-3：`invoke('set_close_behavior')` 为应用自定义命令，Tauri 2 默认允许；若桌面报权限拒绝，在 capabilities 追加该命令权限并披露。
   - B4F-4：移除 JS `onCloseRequested` 后，主窗关闭全走 Rust——若 Rust 未就绪时移除会造成「主窗关、strip 存活」残留，务必按顺序（B4F-3 先于 B4F-4）。
   - B4F-5：`showRestore` 仅 Tauri 分支；浏览器 `?mode=strip` 与 app 内窗口内 strip 零冲击。
   - 既有 e2e mock（app-shell strip、floatstrip）随各任务更新，勿留旧断言。
5. **完成后**：全量回归 + 最终整体评审（最强大模型 + `review-package MERGE_BASE HEAD`）→ 修复波 → merge main → 合并后全量回归；桌面真机由用户验收（① 竖排底部不裁、圆角完整 ② 关闭行为：退出应用全退 / 保留后台主窗隐藏 + 恢复按钮唤回）。
