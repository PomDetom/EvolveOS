// 剪贴板应用（占位）—— MODULES 契约见 docs/app-integration.md。
// 接入真实功能：把 render 替换为本应用页面渲染函数（可复用框架组件）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'clipboard', name: '剪贴板', icon: 'clipboard', order: 1,
  dir: [
    { id: 'history', name: '历史', icon: 'list' },
    { id: 'pinned', name: '固定', icon: 'pin' },
    { id: 'groups', name: '分组', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
