import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Tauri 窗口能力（B4-1）', () => {
  // Vitest 3.2 + Vite 会将 `new URL(path, import.meta.url)` 字面量按 dev asset URL 解析
  // （import.meta.url 被改写为 dev server URL，导致 readFileSync 报非 file scheme）。
  // 先取到变量再作 base，命中磁盘上真实的 capability 文件。
  const moduleURL = import.meta.url;
  const caps = JSON.parse(
    readFileSync(new URL('../../src-tauri/capabilities/default.json', moduleURL), 'utf8'),
  );
  it('授权窗口变更操作（min/max/close/拖拽）', () => {
    const required = [
      'core:window:allow-minimize',
      'core:window:allow-is-minimized',
      'core:window:allow-unminimize',
      'core:window:allow-maximize',
      'core:window:allow-unmaximize',
      'core:window:allow-toggle-maximize',
      'core:window:allow-close',
      'core:window:allow-is-maximized',
      'core:window:allow-start-dragging',
    ];
    for (const p of required) expect(caps.permissions).toContain(p);
  });
  it('授权 strip 悬浮窗（显示/隐藏/聚焦 + 自定位/自缩放）', () => {
    expect(caps.windows).toContain('strip');
    const required = [
      'core:window:allow-show',
      'core:window:allow-hide',
      'core:window:allow-get-all-windows',
      'core:window:allow-set-position',
      'core:window:allow-outer-position',
      'core:window:allow-set-size',
      'core:window:allow-set-focus',
    ];
    for (const p of required) expect(caps.permissions).toContain(p);
  });
});
