// 账本应用（占位）。
import { placeholderPage } from '../../scenes/placeholder-page.js';

export const module = {
  id: 'account', name: '账本', icon: 'wallet', order: 8,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
