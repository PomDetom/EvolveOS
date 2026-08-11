// tokenTool 应用页：余额 / OpenCode Go 套餐用量监测（复用 codeplan-usage Rust 后端）。
// 桌面（Tauri）经 invoke 调 5 命令 + 收 balances-updated 事件；浏览器（无 __TAURI__）只渲染
// 「需桌面端使用」空态。壳契约：render(ctx) → HTML；mount(pageEl, ctx) → 交互挂载。
import { renderButton } from '../../components/button/button.js';
import { renderEmptyState } from '../../components/empty-state/empty-state.js';
import './token-tool.css';

export function tokenToolPage() {
  const head = `
    <div class="app-main__page-head">
      <h2 class="app-main__page-title">TokenTool</h2>
    </div>`;
  if (typeof window.__TAURI__ === 'undefined') {
    return `${head}
      <div class="app-main__page-body">
        ${renderEmptyState({
          iconName: 'bolt',
          title: '需桌面端使用',
          desc: 'tokenTool 依赖 Tauri 后端抓取 DeepSeek / OpenCode 余额，请在 EvolveOS 桌面端打开。',
        })}
      </div>`;
  }
  return `${head}
    <div class="app-main__page-body">
      <div class="tt__toolbar">
        <span class="tt__toolbar-hint">账户余额 / OpenCode Go 套餐用量监测</span>
        <div class="tt__toolbar-actions">
          ${renderButton({ label: '立即刷新', iconName: 'refresh' })}
          ${renderButton({ label: '添加账户', variant: 'secondary', iconName: 'plus' })}
        </div>
      </div>
      <div class="tt__grid" data-tt-grid>
        ${renderEmptyState({ iconName: 'box', title: '加载中…' })}
      </div>
    </div>`;
}

// Task 8 填充完整交互；本任务先占位保证 module.mount 为函数、单测可跑绿。
export function mountTokenTool() {}
