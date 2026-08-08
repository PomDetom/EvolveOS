# Task B4F-1 简报 — 悬浮窗尺寸贴合（LogicalSize + computeFitSize + 诊断）

- **计划**：docs/superpowers/plans/2026-08-08-app-shell-b4-close-and-sizing.md（唯一实施需求源）
- **规格**：docs/superpowers/specs/2026-08-08-app-shell-b4-close-and-sizing-design.md（唯一需求源，§3 问题 1）
- **Branch**：worktree-b4-close-sizing（基于 fix/b4-strip-open HEAD 1d35504）
- **任务定位**：B4 收尾修复第一个任务。修复桌面真机竖排悬浮窗底部被窗口裁掉（DPI 尺寸语义）。

## 背景（根因）

`src/app/strip-main.js` 的 `fit()` 用 `win.setSize({ width, height })`（普通对象）。`getBoundingClientRect()` 返回 CSS（逻辑）像素；但 Tauri 2 的 `setSize` 对普通 `{width,height}` 对象的 Logical/Physical 语义不明确。在 Windows 非 100% DPI（常见 125%/150%）下，若被当作物理像素，窗口会小于 CSS 内容 → 内容（尤其竖排更高的底部）被窗口裁掉。

修复：`fit()` 改用显式 `LogicalSize`；尺寸计算抽纯函数 `computeFitSize` 可单测。

## Files

- Modify: `src/app/strip-main.js`（`computeFitSize` 纯函数 + `fit()` 用 LogicalSize + 诊断 log）
- Test: `tests/unit/strip-sizing.test.js`（新建）
- Modify: `tests/e2e/floatstrip.spec.js`（strip 窗口 e2e mock 追加 LogicalSize）

## Interfaces

- Produces: `export function computeFitSize(rect) => { width, height }`（ceil + 至少 1px，纯函数可单测）—— 后续任务不依赖，独立交付

## Step 1: 写失败单测（tests/unit/strip-sizing.test.js，新建）

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

## Step 2: 运行确认红

`npx vitest run tests/unit/strip-sizing.test.js`
Expected: FAIL（`computeFitSize` 未导出/不存在）

## Step 3: strip-main.js 加 computeFitSize 纯函数

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

## Step 4: fit() 用 LogicalSize + 诊断 log

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

## Step 5: 单测确认绿

`npx vitest run tests/unit/strip-sizing.test.js`
Expected: PASS

## Step 6: 更新 B4-6 e2e mock（提供 LogicalSize）

`tests/e2e/floatstrip.spec.js` 的 strip 窗口 e2e mock，`window.__TAURI__.window` 追加：

```js
      LogicalSize: class { constructor(width, height) { this.width = width; this.height = height; } },
```

（现有断言按 setSize 调用次数计数，不受对象类型影响。）

## Step 7: 全量回归 + 提交

Run: `npx playwright test tests/e2e/floatstrip.spec.js` → 全绿；`npm test` + `npm run test:e2e` + `npm run build`
Expected: 全绿（视觉 24 零漂移——浏览器路径渲染不变）

```bash
git add src/app/strip-main.js tests/unit/strip-sizing.test.js tests/e2e/floatstrip.spec.js
git commit -m "fix: 悬浮窗尺寸用显式 LogicalSize 贴合内容（DPI 下底部不再被裁）+ computeFitSize 单测（B4 收尾）"
```

> 桌面验证（用户目检）：`npm run tauri:dev` 后 log 应显示 outer≈strip box、scaleFactor 与系统一致；竖排底部不再被裁。

## 全局约束（本任务绑定）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev；Tauri 桌面行为由用户目检。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量。
- 零运行时依赖；组件无抽象封装；遵循 src/CLAUDE.md 风格。
- 禁止升级核心依赖。
- 视觉基线零漂移（本迭代不改变浏览器路径渲染；若漂移先解码比对再 update-snapshots）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。
- 提交前检查 `git status`/`git diff --stat`，防 Cargo.toml 等被构建触碰文件的行尾噪声混入提交。
