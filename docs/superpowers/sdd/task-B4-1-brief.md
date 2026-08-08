# Task B4-1: 窗口控制权限修复

## 任务定位

应用壳 B4（桌面真实化）第一个任务。Tauri 桌面模式下标题栏三按钮（最小化/最大化/关闭）"完全没反应"、窗口无法拖动。**根因**：`src-tauri/capabilities/default.json` 只授权 `core:default`，Tauri 2 的窗口**变更**操作（minimize/maximize/toggle_maximize/close/start_dragging）不在默认集内，被权限层拒绝；JS `bindWindowControls`（src/demo/window-controls.js）的 `.catch(()=>{})` 静默吞掉拒绝 → 无现象；`data-tauri-drag-region` 内部走 `start_dragging` 命令同样被拒 → 拖不动。**代码接线本身正确，本任务只改 capability 配置。**

## 需求（唯一需求源，逐字执行）

**1. 新建单测** `tests/unit/window-capabilities.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Tauri 窗口能力（B4-1）', () => {
  const caps = JSON.parse(
    readFileSync(new URL('../../src-tauri/capabilities/default.json', import.meta.url), 'utf8'),
  );
  it('授权窗口变更操作（min/max/close/拖拽）', () => {
    const required = [
      'core:window:allow-minimize',
      'core:window:allow-maximize',
      'core:window:allow-unmaximize',
      'core:window:allow-toggle-maximize',
      'core:window:allow-close',
      'core:window:allow-is-maximized',
      'core:window:allow-start-dragging',
    ];
    for (const p of required) expect(caps.permissions).toContain(p);
  });
});
```

**2. `src-tauri/capabilities/default.json`** 的 `permissions` 数组改为：

```json
  "permissions": [
    "core:default",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-close",
    "core:window:allow-is-maximized",
    "core:window:allow-start-dragging"
  ]
```

其余字段（`$schema`/`identifier`/`description`/`windows`）不动。

## 流程（TDD）

1. 先写单测 → `npx vitest run tests/unit/window-capabilities.test.js` 确认红（现仅 `core:default`，7 项均缺）
2. 改 capabilities → 复跑确认绿
3. 全量回归：`npm test` + `npm run test:e2e`（含视觉 24，应零漂移——纯配置）+ `npm run build`

## 注意

- 不改任何 JS（`bindWindowControls` 接线已验证正确）。
- 工作树 `src-tauri/Cargo.toml` 行尾噪声不动、不提交。
- 桌面真机由用户目检（改配置后需重新 build）。

## 提交

一个 commit：`fix: Tauri 窗口控制权限（min/max/close/拖拽 capability 授权，闭环 B4-1）`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B4-1-report.md`：改动说明、测试命令与输出摘要、self-review、提交哈希。回复本会话只需：状态（DONE/DONE_WITH_CONCERNS/BLOCKED）+ 提交哈希 + 一行测试摘要 + 疑虑（如有）。
