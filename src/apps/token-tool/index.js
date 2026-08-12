// tokenTool 应用 —— 复用 codeplan-usage Rust 后端（DeepSeek 余额 / OpenCode Go 三窗口用量）。
// 桌面优先：浏览器显示「需桌面端使用」空态；交互挂载见 token-tool.js mountTokenTool。
import { tokenToolPage, mountTokenTool } from './token-tool.js';

export const module = {
  id: 'token-tool', name: 'TokenTool', icon: 'bolt', order: 2, dir: [],
  render: (ctx) => tokenToolPage(ctx),
  mount: (pageEl, ctx) => mountTokenTool(pageEl, ctx),
};
