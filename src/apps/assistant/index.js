// 小助理应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'assistant', name: '小助理', icon: 'sparkles', order: 7,
  dir: [
    { id: 'chat', name: '会话', icon: 'help' },
    { id: 'config', name: '配置', icon: 'settings' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
