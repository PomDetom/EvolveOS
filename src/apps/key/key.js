// 密码管理器应用页。桌面优先：浏览器（无 __TAURI__）渲染「需桌面端使用」空态；
// 桌面经 window.__TAURI__.core.invoke 调后端命令。锁态/目录页由 mount 按运行时状态填充 data-key-body。
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import './key.css';

export function keyPage(ctx) {
  if (typeof window.__TAURI__ === 'undefined') {
    return `
      <div class="app-main__page-head">
        <h2 class="app-main__page-title">密码</h2>
      </div>
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'key',
          title: '需桌面端使用',
          desc: '密码管理器依赖 Tauri 桌面后端（Argon2id + AES-256-GCM 加密保险库），请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  const sub = ctx.dirName ? ` › ${ctx.dirName}` : '';
  return `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">密码</h2>
      ${ctx.dirName ? `<span class="app-main__page-sub">${sub}</span>` : ''}
    </div>
    <div class="app-main__page-body" data-key-body></div>`;
}

// —— 交互挂载（Task A4 实现）——
const disposes = new WeakMap();
export function mountKey(pageEl, ctx) {
  // Task A4 填充
}
